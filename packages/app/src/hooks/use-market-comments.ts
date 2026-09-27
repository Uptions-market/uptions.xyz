import {
	type InfiniteData,
	useInfiniteQuery,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/components/errors/api.error.ts";
import type { ProviderConfig } from "@/packages/providers/provider-config.ts";
import type { ApiResponse } from "@/packages/types/api.types.ts";
import {
	MARKET_COMMENT_MAX_LENGTH,
	type MarketComment,
	type MarketCommentsPage,
} from "@/packages/types/market-comment.types.ts";
import { getAuthToken } from "@/services/auth-token.service.ts";
import { marketCommentStreamService } from "@/services/market-comment-stream.service.ts";
import { marketCommentsService } from "@/services/market-comments.service.ts";
import { getRequestErrorMessage } from "@/util/errors.ts";

export type MarketCommentConnectionStatus =
	| "connecting"
	| "live"
	| "offline"
	| "reconnecting";

type MarketCommentsQueryData = InfiniteData<
	ApiResponse<MarketCommentsPage>,
	string | null
>;

export const marketCommentsQueryKey = (
	provider: ProviderConfig,
	marketId: string,
) => ["providers", provider.routeId, "markets", marketId, "comments"] as const;

export function useMarketComments(provider: ProviderConfig, marketId: string) {
	const queryClient = useQueryClient();
	const queryKey = useMemo(
		() => marketCommentsQueryKey(provider, marketId),
		[marketId, provider],
	);
	const seenStreamCommentIds = useRef(new Set<string>());
	const [connectionStatus, setConnectionStatus] =
		useState<MarketCommentConnectionStatus>("connecting");
	const query = useInfiniteQuery<
		ApiResponse<MarketCommentsPage>,
		Error,
		MarketCommentsQueryData,
		ReturnType<typeof marketCommentsQueryKey>,
		string | null
	>({
		enabled: Boolean(
			marketId && getAuthToken() && provider.capabilities.comments,
		),
		getNextPageParam: (lastPage) => lastPage.data.next_cursor ?? undefined,
		initialPageParam: null as string | null,
		queryFn: ({ pageParam }) =>
			marketCommentsService.list(provider, marketId, pageParam),
		queryKey,
	});
	const postMutation = useMutation({
		mutationFn: (body: string) =>
			marketCommentsService.create(provider, marketId, { body: body.trim() }),
		onSuccess: (response) => {
			addCommentToCache(queryClient, queryKey, response.data);
		},
	});

	useEffect(() => {
		seenStreamCommentIds.current.clear();

		if (!marketId || !getAuthToken() || !provider.capabilities.comments) {
			setConnectionStatus("offline");
			return;
		}

		let active = true;
		let retryAttempt = 0;
		let retryTimeout: number | undefined;
		let controller = new AbortController();

		const connect = async () => {
			controller = new AbortController();
			setConnectionStatus(retryAttempt === 0 ? "connecting" : "reconnecting");

			try {
				await marketCommentStreamService.connect({
					marketId,
					provider,
					onComment: ({ comment }) => {
						if (
							comment.provider !== provider.apiId ||
							comment.market_id !== marketId ||
							seenStreamCommentIds.current.has(comment.id)
						) {
							return;
						}

						seenStreamCommentIds.current.add(comment.id);
						addCommentToCache(queryClient, queryKey, comment);
					},
					onConnected: () => {
						if (!active) {
							return;
						}

						retryAttempt = 0;
						setConnectionStatus("live");
						queryClient.invalidateQueries({ queryKey });
					},
					signal: controller.signal,
				});
			} catch (error) {
				if (!active || controller.signal.aborted) {
					return;
				}

				if (error instanceof ApiError && error.status === 401) {
					setConnectionStatus("offline");
					return;
				}
			}

			if (!active) {
				return;
			}

			setConnectionStatus("reconnecting");
			queryClient.invalidateQueries({ queryKey });
			const delay = Math.min(30_000, 1_000 * 2 ** retryAttempt);
			retryAttempt += 1;
			retryTimeout = window.setTimeout(connect, delay);
		};

		void connect();

		return () => {
			active = false;
			controller.abort();

			if (retryTimeout !== undefined) {
				window.clearTimeout(retryTimeout);
			}
		};
	}, [marketId, provider, queryClient, queryKey]);

	const comments = deduplicateComments(
		query.data?.pages.flatMap((page) => page.data.comments) ?? [],
	);

	return {
		comments,
		connectionStatus,
		error: getRequestErrorMessage(query.error, "Unable to load comments"),
		fetchOlderComments: query.fetchNextPage,
		hasOlderComments: Boolean(query.hasNextPage),
		isFetchingOlderComments: query.isFetchingNextPage,
		isLoading: query.isLoading,
		isPosting: postMutation.isPending,
		postComment: async (body: string) => {
			const trimmedBody = body.trim();

			if (!trimmedBody || trimmedBody.length > MARKET_COMMENT_MAX_LENGTH) {
				throw new Error(
					`Comments must be between 1 and ${MARKET_COMMENT_MAX_LENGTH.toLocaleString()} characters`,
				);
			}

			await postMutation.mutateAsync(trimmedBody);
		},
		postError: getRequestErrorMessage(
			postMutation.error,
			"Unable to post comment",
		),
		refetch: query.refetch,
		resetPostError: postMutation.reset,
	};
}

function addCommentToCache(
	queryClient: ReturnType<typeof useQueryClient>,
	queryKey: ReturnType<typeof marketCommentsQueryKey>,
	comment: MarketComment,
) {
	queryClient.setQueryData<MarketCommentsQueryData>(queryKey, (current) => {
		if (!current?.pages.length) {
			return {
				pageParams: [null],
				pages: [
					{
						data: { comments: [comment], next_cursor: null },
						message: "Market comments fetched successfully",
						status_code: 200,
					},
				],
			};
		}

		return {
			...current,
			pages: current.pages.map((page, index) => {
				const comments = page.data.comments.filter(
					(item) => item.id !== comment.id,
				);

				return {
					...page,
					data: {
						...page.data,
						comments: index === 0 ? [comment, ...comments] : comments,
					},
				};
			}),
		};
	});
}

function deduplicateComments(comments: MarketComment[]) {
	const seenIds = new Set<string>();

	return comments.filter((comment) => {
		if (seenIds.has(comment.id)) {
			return false;
		}

		seenIds.add(comment.id);
		return true;
	});
}
