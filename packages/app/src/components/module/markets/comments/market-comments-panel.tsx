import { LoaderCircle, MessageSquareText, RefreshCw } from "lucide-react";
import { MarketCommentForm } from "@/components/module/markets/comments/market-comment-form.tsx";
import {
	MarketCommentList,
	MarketCommentsLoading,
} from "@/components/module/markets/comments/market-comment-list.tsx";
import { Typography } from "@/components/typography/typography.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
	type MarketCommentConnectionStatus,
	useMarketComments,
} from "@/hooks/use-market-comments.ts";
import { cn } from "@/lib/utils.ts";
import type { ProviderConfig } from "@/packages/providers/provider-config.ts";

type MarketCommentsPanelProps = {
	marketId: string;
	provider: ProviderConfig;
};

const connectionLabels: Record<MarketCommentConnectionStatus, string> = {
	connecting: "Connecting",
	live: "Live",
	offline: "Updates paused",
	reconnecting: "Reconnecting",
};

export function MarketCommentsPanel({
	marketId,
	provider,
}: MarketCommentsPanelProps) {
	const {
		comments,
		connectionStatus,
		error,
		fetchOlderComments,
		hasOlderComments,
		isFetchingOlderComments,
		isLoading,
		isPosting,
		postComment,
		postError,
		refetch,
		resetPostError,
	} = useMarketComments(provider, marketId);
	const hasComments = comments.length > 0;

	return (
		<section
			aria-labelledby="market-comments-heading"
			className="min-w-0 border border-app-border bg-app-card"
		>
			<header className="flex flex-col gap-3 border-b border-app-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
				<div>
					<div className="flex items-center gap-2">
						<MessageSquareText className="size-5 text-primary" />
						<Typography id="market-comments-heading" variant="h3">
							Comments
						</Typography>
					</div>
					<p className="mt-1 text-sm text-app-muted-fg">
						Discuss this market with other traders.
					</p>
				</div>
				<ConnectionBadge status={connectionStatus} />
			</header>

			<MarketCommentForm
				error={postError}
				isPosting={isPosting}
				onErrorReset={resetPostError}
				onSubmit={postComment}
			/>

			{isLoading ? (
				<MarketCommentsLoading />
			) : error && !hasComments ? (
				<CommentsError error={error} onRetry={refetch} />
			) : !hasComments ? (
				<div className="px-5 py-12 text-center">
					<MessageSquareText className="mx-auto size-8 text-app-muted-fg" />
					<p className="mt-3 font-semibold text-app-fg">No comments yet</p>
					<p className="mt-1 text-sm text-app-muted-fg">
						Start the conversation about this market.
					</p>
				</div>
			) : (
				<>
					<MarketCommentList comments={comments} />
					{error ? (
						<div
							className="border-t border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger sm:px-5"
							role="alert"
						>
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<span>{error}</span>
								<Button
									className="w-fit"
									onClick={() => void refetch()}
									size="sm"
									variant="outline"
								>
									<RefreshCw />
									Retry
								</Button>
							</div>
						</div>
					) : null}
					{hasOlderComments ? (
						<div className="border-t border-app-border px-4 py-4 text-center sm:px-5">
							<Button
								disabled={isFetchingOlderComments}
								onClick={() => void fetchOlderComments()}
								variant="outline"
							>
								{isFetchingOlderComments ? (
									<LoaderCircle className="animate-spin" />
								) : null}
								{isFetchingOlderComments ? "Loading…" : "Load older comments"}
							</Button>
						</div>
					) : null}
				</>
			)}
		</section>
	);
}

function CommentsError({
	error,
	onRetry,
}: {
	error: string;
	onRetry: () => unknown;
}) {
	return (
		<div className="px-5 py-10 text-center" role="alert">
			<p className="font-semibold text-danger">Unable to load comments</p>
			<p className="mx-auto mt-2 max-w-lg text-sm text-app-muted-fg">{error}</p>
			<Button className="mt-4" onClick={() => void onRetry()} variant="outline">
				<RefreshCw />
				Try again
			</Button>
		</div>
	);
}

function ConnectionBadge({
	status,
}: {
	status: MarketCommentConnectionStatus;
}) {
	return (
		<span className="inline-flex w-fit items-center gap-2 border border-app-border bg-app-muted px-2.5 py-1 text-xs font-semibold text-app-muted-fg">
			<span
				className={cn(
					"size-2 rounded-full",
					status === "live"
						? "bg-success"
						: status === "offline"
							? "bg-danger"
							: "animate-pulse bg-warning",
				)}
			/>
			{connectionLabels[status]}
		</span>
	);
}
