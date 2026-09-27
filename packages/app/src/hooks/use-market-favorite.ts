import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProviderConfig } from "@/packages/providers/provider-config.ts";
import type { ApiResponse } from "@/packages/types/api.types.ts";
import type { MarketFavorite } from "@/packages/types/market-favorite.types.ts";
import { getAuthToken } from "@/services/auth-token.service.ts";
import { marketFavoriteService } from "@/services/market-favorite.service.ts";
import { getRequestErrorMessage } from "@/util/errors.ts";

export const marketFavoritesQueryKey = (provider: ProviderConfig) =>
	["providers", provider.routeId, "markets", "favorites"] as const;

export const marketFavoriteQueryKey = (
	provider: ProviderConfig,
	marketId: string,
) => ["providers", provider.routeId, "markets", marketId, "favorite"] as const;

export function useMarketFavorites(provider: ProviderConfig) {
	const query = useQuery({
		enabled: Boolean(getAuthToken() && provider.capabilities.favorites),
		queryFn: () => marketFavoriteService.list(provider),
		queryKey: marketFavoritesQueryKey(provider),
	});

	return {
		error: getRequestErrorMessage(query.error, "Unable to load favorites"),
		isLoading: query.isLoading,
		marketIds: query.data?.data.market_ids ?? [],
	};
}

export function useMarketFavorite(provider: ProviderConfig, marketId: string) {
	const queryClient = useQueryClient();
	const queryKey = marketFavoriteQueryKey(provider, marketId);
	const query = useQuery({
		enabled: Boolean(
			marketId && getAuthToken() && provider.capabilities.favorites,
		),
		queryFn: () => marketFavoriteService.get(provider, marketId),
		queryKey,
	});
	const mutation = useMutation<
		ApiResponse<MarketFavorite>,
		Error,
		boolean,
		{ previousFavorite: ApiResponse<MarketFavorite> | undefined }
	>({
		mutationFn: (favorited) =>
			favorited
				? marketFavoriteService.favorite(provider, marketId)
				: marketFavoriteService.unfavorite(provider, marketId),
		onError: (_error, _favorited, context) => {
			queryClient.setQueryData(queryKey, context?.previousFavorite);
		},
		onMutate: async (favorited) => {
			await queryClient.cancelQueries({ queryKey });
			const previousFavorite =
				queryClient.getQueryData<ApiResponse<MarketFavorite>>(queryKey);

			queryClient.setQueryData<ApiResponse<MarketFavorite>>(queryKey, {
				data: { favorited, market_id: marketId, provider: provider.apiId },
				message: previousFavorite?.message ?? "Market favorite updated",
				status_code: previousFavorite?.status_code ?? 200,
			});

			return { previousFavorite };
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey });
		},
		onSuccess: (response) => {
			queryClient.setQueryData(queryKey, response);
		},
	});
	const favorited = query.data?.data.favorited ?? false;
	const error = getRequestErrorMessage(
		mutation.error ?? query.error,
		"Unable to update favorite",
	);

	return {
		error,
		favorited,
		isLoading: query.isLoading,
		isUpdating: mutation.isPending,
		retry: () => {
			mutation.reset();
			return query.refetch();
		},
		toggle: () => mutation.mutate(!favorited),
	};
}
