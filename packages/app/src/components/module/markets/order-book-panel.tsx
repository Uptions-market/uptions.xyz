import { useMemo } from "react";
import { Typography } from "@/components/typography/typography.tsx";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import type {
	MarketOrderBook,
	MarketOrderBookLevel,
} from "@/packages/types/market.types.ts";
import type {
	PolymarketMarketResolution,
	PolymarketOrderBookConnectionStatus,
	PolymarketTickSizeChange,
} from "@/services/polymarket-order-book-stream.service.ts";
import { formatDate } from "@/util/formatters.ts";

type MarketOrderBookOutcome = {
	label: string;
	tokenId: string;
};

type MarketOrderBookPanelProps = {
	connectionStatus: PolymarketOrderBookConnectionStatus;
	error?: string | null;
	isLoading?: boolean;
	isStale: boolean;
	marketResolution: PolymarketMarketResolution | null;
	onSelectedTokenIdChange: (tokenId: string) => void;
	orderBook?: MarketOrderBook | null;
	outcomes: readonly MarketOrderBookOutcome[];
	selectedTokenId: string;
	tickSizeChange: PolymarketTickSizeChange | null;
	volume: string;
};

export function MarketOrderBookPanel({
	connectionStatus,
	error,
	isLoading,
	isStale,
	marketResolution,
	onSelectedTokenIdChange,
	orderBook,
	outcomes,
	selectedTokenId,
	tickSizeChange,
	volume,
}: MarketOrderBookPanelProps) {
	const selectedOutcome = useMemo(
		() =>
			outcomes.find((outcome) => outcome.tokenId === selectedTokenId) ??
			outcomes[0],
		[outcomes, selectedTokenId],
	);
	const asks = orderBook?.asks.slice(0, 8) ?? [];
	const bids = orderBook?.bids.slice(0, 8) ?? [];

	return (
		<section className="border border-app-border bg-app-card p-5">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div>
					<div className="flex flex-wrap items-center gap-2">
						<Typography className="text-app-fg" variant="h3">
							Order Book
						</Typography>
						<OrderBookConnectionBadge
							isStale={isStale}
							status={connectionStatus}
						/>
					</div>
					<Typography className="mt-1 text-app-muted-fg" variant="bodySm">
						{selectedOutcome?.label ?? "Market outcome"}
					</Typography>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{outcomes.length > 1
						? outcomes.map((outcome) => (
								<Button
									className={cn(
										"h-9 border border-app-border px-3 text-xs font-semibold",
										outcome.tokenId === selectedOutcome?.tokenId
											? "bg-primary text-primary-foreground hover:bg-primary/90"
											: "bg-app-muted text-app-fg hover:bg-app-muted",
									)}
									key={outcome.tokenId}
									onClick={() => onSelectedTokenIdChange(outcome.tokenId)}
									type="button"
								>
									{outcome.label}
								</Button>
							))
						: null}
				</div>
			</div>

			{marketResolution ? (
				<div className="mt-4 border border-success/40 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
					Market resolved
					{marketResolution.winningOutcome
						? ` · ${marketResolution.winningOutcome} won`
						: ""}
				</div>
			) : null}

			{tickSizeChange ? (
				<div className="mt-4 border border-app-border bg-app-muted px-4 py-3 text-sm font-semibold text-app-muted-fg">
					Tick size changed from {formatTickSize(tickSizeChange.oldTickSize)} to{" "}
					{formatTickSize(tickSizeChange.newTickSize)}
				</div>
			) : null}

			<div className="mt-5 grid gap-3 border-y border-app-border py-4 sm:grid-cols-3">
				<OrderBookMetric
					label="Last traded"
					value={formatPrice(orderBook?.last_traded)}
				/>
				<OrderBookMetric
					label="Spread"
					value={formatPrice(orderBook?.spread)}
				/>
				<OrderBookMetric label="Volume" value={volume} />
			</div>

			{isLoading ? (
				<OrderBookSkeleton />
			) : error ? (
				<OrderBookState title="Order book unavailable" description={error} />
			) : asks.length || bids.length ? (
				<div className="mt-5 overflow-hidden border border-app-border">
					<OrderBookHeader />
					<div className="grid max-h-[520px] overflow-y-auto">
						{asks
							.slice()
							.reverse()
							.map((level) => (
								<OrderBookRow
									key={`ask-${level.price}-${level.shares}`}
									level={level}
									tone="ask"
								/>
							))}
						<div className="grid grid-cols-3 border-y border-app-border bg-app-card px-4 py-3 text-sm font-bold text-app-muted-fg">
							<span>Best Ask {formatPrice(orderBook?.best_ask)}</span>
							<span className="text-center">
								Spread {formatPrice(orderBook?.spread)}
							</span>
							<span className="text-right">
								Best Bid {formatPrice(orderBook?.best_bid)}
							</span>
						</div>
						{bids.map((level) => (
							<OrderBookRow
								key={`bid-${level.price}-${level.shares}`}
								level={level}
								tone="bid"
							/>
						))}
					</div>
				</div>
			) : (
				<OrderBookState
					description="There are no visible bids or asks for this outcome yet."
					title="No order book liquidity"
				/>
			)}

			{orderBook?.updated_at ? (
				<p className="mt-4 text-xs font-medium text-app-muted-fg">
					Updated {formatDate(orderBook.updated_at) ?? orderBook.updated_at}
				</p>
			) : null}
		</section>
	);
}

function OrderBookConnectionBadge({
	isStale,
	status,
}: {
	isStale: boolean;
	status: PolymarketOrderBookConnectionStatus;
}) {
	const label =
		status === "connected"
			? "Realtime"
			: status === "connecting"
				? "Connecting · REST fallback"
				: status === "reconnecting"
					? "Reconnecting · REST fallback"
					: "REST fallback";

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em]",
				isStale
					? "border-warning/40 bg-warning/10 text-warning"
					: "border-success/40 bg-success/10 text-success",
			)}
		>
			<span className="size-1.5 bg-current" />
			{isStale ? `Stale · ${label}` : label}
		</span>
	);
}

function OrderBookHeader() {
	return (
		<div className="grid grid-cols-3 border-b border-app-border bg-app-muted px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-app-muted-fg">
			<span>Price</span>
			<span className="text-right">Shares</span>
			<span className="text-right">USD</span>
		</div>
	);
}

function OrderBookMetric({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<p className="text-xs font-bold uppercase tracking-[0.12em] text-app-muted-fg">
				{label}
			</p>
			<p className="mt-1 text-lg font-bold text-app-fg">{value}</p>
		</div>
	);
}

function OrderBookRow({
	level,
	tone,
}: {
	level: MarketOrderBookLevel;
	tone: "ask" | "bid";
}) {
	return (
		<div className="relative grid grid-cols-3 overflow-hidden border-b border-app-border px-4 py-2 text-sm font-semibold last:border-b-0">
			<div
				className={cn(
					"absolute inset-y-0 right-0 opacity-20",
					tone === "bid" ? "bg-success" : "bg-danger",
				)}
				style={{ width: `${level.depth_percent}%` }}
			/>
			<span
				className={cn(
					"relative",
					tone === "bid" ? "text-success" : "text-danger",
				)}
			>
				{formatPrice(level.price)}
			</span>
			<span className="relative text-right text-app-fg">
				{formatNumber(level.shares)}
			</span>
			<span className="relative text-right text-app-muted-fg">
				{formatUsd(level.usd)}
			</span>
		</div>
	);
}

function OrderBookSkeleton() {
	return (
		<div className="mt-5 grid gap-2">
			{Array.from({ length: 10 }).map((_, index) => (
				<div
					className="h-10 animate-pulse bg-app-muted"
					key={index.toString()}
				/>
			))}
		</div>
	);
}

function OrderBookState({
	description,
	title,
}: {
	description: string;
	title: string;
}) {
	return (
		<div className="mt-5 border border-app-border bg-app-muted p-6 text-center">
			<p className="text-sm font-bold text-app-fg">{title}</p>
			<p className="mt-2 text-sm text-app-muted-fg">{description}</p>
		</div>
	);
}

function formatPrice(value: number | null | undefined) {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return "—";
	}

	return `${(value * 100).toFixed(value < 0.01 ? 2 : 1)}¢`;
}

function formatTickSize(value: number) {
	return `${(value * 100).toFixed(value < 0.01 ? 2 : 1)}¢`;
}

function formatNumber(value: number) {
	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 2,
	}).format(value);
}

function formatUsd(value: number) {
	return new Intl.NumberFormat("en-US", {
		currency: "USD",
		maximumFractionDigits: 2,
		style: "currency",
	}).format(value);
}
