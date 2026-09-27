import { Heart, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useMarketFavorite } from "@/hooks/use-market-favorite.ts";
import { cn } from "@/lib/utils.ts";
import type { ProviderConfig } from "@/packages/providers/provider-config.ts";

type MarketFavoriteButtonProps = {
	className?: string;
	marketId: string;
	provider: ProviderConfig;
};

export function MarketFavoriteButton({
	className,
	marketId,
	provider,
}: MarketFavoriteButtonProps) {
	const { error, favorited, isLoading, isUpdating, retry, toggle } =
		useMarketFavorite(provider, marketId);
	const isBusy = isLoading || isUpdating;

	return (
		<div
			className={cn(
				"flex shrink-0 flex-col items-start gap-2 md:items-end",
				className,
			)}
		>
			<Button
				aria-label={
					favorited ? "Remove market from favorites" : "Add market to favorites"
				}
				aria-pressed={favorited}
				className={cn(
					"w-full border-app-border bg-app-muted px-4 font-semibold text-app-fg hover:bg-app-muted/70 md:w-auto",
					favorited && "border-primary/50 text-primary",
				)}
				disabled={isBusy || Boolean(error && !favorited)}
				onClick={toggle}
				variant="outline"
			>
				{isBusy ? (
					<LoaderCircle className="animate-spin" />
				) : (
					<Heart className={cn(favorited && "fill-current")} />
				)}
				{isLoading ? "Loading…" : favorited ? "Favorited" : "Favorite"}
			</Button>
			{error ? (
				<div
					aria-live="polite"
					className="flex max-w-64 items-center gap-2 text-xs font-medium text-danger"
				>
					<span>{error}</span>
					<button
						aria-label="Retry loading favorite status"
						className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-app-fg underline underline-offset-2"
						onClick={() => void retry()}
						type="button"
					>
						<RefreshCw className="size-3" />
						Retry
					</button>
				</div>
			) : null}
		</div>
	);
}
