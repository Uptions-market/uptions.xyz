import { Link } from "@tanstack/react-router";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { formatUnits } from "viem";
import { DashboardLayout } from "@/components/layout/dashboard-layout.tsx";
import { Typography } from "@/components/typography/typography.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
	useCancelTrade,
	useReconcileTrade,
	useTrades,
} from "@/hooks/use-trades.ts";
import { cn } from "@/lib/utils.ts";
import { getProviderConfig } from "@/packages/providers/provider-config.ts";
import {
	type TradeIntent,
	tradeSide,
	tradeStatus,
} from "@/packages/types/trade.types.ts";
import { getRequestErrorMessage } from "@/util/errors.ts";
import { formatDate } from "@/util/formatters.ts";

const statusOrder = [
	tradeStatus.reconciliationRequired,
	tradeStatus.cancellationRequested,
	tradeStatus.live,
	tradeStatus.matched,
	tradeStatus.mined,
	tradeStatus.confirmed,
	tradeStatus.filled,
	tradeStatus.cancelled,
];

export function OrdersContent({ embedded = false }: { embedded?: boolean }) {
	const { error, isLoading, refetch, trades } = useTrades();
	const cancelTrade = useCancelTrade();
	const reconcileTrade = useReconcileTrade();
	const sortedTrades = [...trades].sort((left, right) => {
		const statusDifference = statusRank(left.status) - statusRank(right.status);
		if (statusDifference !== 0) {
			return statusDifference;
		}
		return (
			new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
		);
	});

	const handleCancel = async (trade: TradeIntent) => {
		try {
			await cancelTrade.mutateAsync(trade.id);
			toast.success("Cancellation requested");
		} catch (requestError) {
			toast.error(
				getRequestErrorMessage(requestError, "Unable to cancel order"),
			);
		}
	};

	const handleReconcile = async (trade: TradeIntent) => {
		try {
			await reconcileTrade.mutateAsync(trade.id);
			toast.success("Order reconciliation requested");
		} catch (requestError) {
			toast.error(
				getRequestErrorMessage(requestError, "Unable to reconcile order"),
			);
		}
	};

	return (
		<div
			className={cn("grid w-full gap-5", !embedded && "mx-auto max-w-[1500px]")}
		>
			<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<Typography className="text-app-fg" variant="h1">
						Orders
					</Typography>
					<Typography className="mt-2 text-app-muted-fg" variant="bodySm">
						Track provider order lifecycle, cancellations, and reconciliation.
					</Typography>
				</div>
				<Button
					className="border border-app-border bg-app-card text-app-fg hover:bg-app-muted"
					disabled={isLoading}
					onClick={() => refetch()}
					type="button"
					variant="ghost"
				>
					<RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
					Refresh
				</Button>
			</header>

			{isLoading ? <OrdersLoading /> : null}
			{!isLoading && error ? (
				<section className="grid min-h-64 place-items-center border border-danger/40 bg-danger/10 p-6 text-center">
					<div className="max-w-md">
						<ShieldAlert className="mx-auto size-8 text-danger" />
						<Typography className="mt-4 text-app-fg" variant="h3">
							Orders unavailable
						</Typography>
						<Typography className="mt-2 text-app-muted-fg" variant="bodySm">
							{error}
						</Typography>
					</div>
				</section>
			) : null}
			{!isLoading && !error && sortedTrades.length === 0 ? (
				<section className="grid min-h-64 place-items-center border border-app-border bg-app-card p-6 text-center">
					<div>
						<Typography className="text-app-fg" variant="h3">
							No orders yet
						</Typography>
						<Typography className="mt-2 text-app-muted-fg" variant="bodySm">
							Orders placed from market trade tickets will appear here.
						</Typography>
						<Button asChild className="mt-5">
							<Link to="/markets">Browse markets</Link>
						</Button>
					</div>
				</section>
			) : null}
			{!isLoading && !error && sortedTrades.length > 0 ? (
				<div className="grid gap-3">
					{sortedTrades.map((trade) => (
						<OrderCard
							cancelPending={
								cancelTrade.isPending && cancelTrade.variables === trade.id
							}
							key={trade.id}
							onCancel={handleCancel}
							onReconcile={handleReconcile}
							reconcilePending={
								reconcileTrade.isPending &&
								reconcileTrade.variables === trade.id
							}
							trade={trade}
						/>
					))}
				</div>
			) : null}
		</div>
	);
}

export function OrdersPage() {
	return (
		<DashboardLayout contentClassName="px-5 py-8 sm:px-8">
			<OrdersContent />
		</DashboardLayout>
	);
}

function OrderCard({
	cancelPending,
	onCancel,
	onReconcile,
	reconcilePending,
	trade,
}: {
	cancelPending: boolean;
	onCancel: (trade: TradeIntent) => Promise<void>;
	onReconcile: (trade: TradeIntent) => Promise<void>;
	reconcilePending: boolean;
	trade: TradeIntent;
}) {
	const status = normalizeStatus(trade.status);
	const canCancel = [
		tradeStatus.live,
		tradeStatus.matched,
		tradeStatus.mined,
		"submitted",
		"partially_filled",
		"retrying",
	].includes(status);
	const canReconcile = status === tradeStatus.reconciliationRequired;

	return (
		<article className="border border-app-border bg-app-card p-4 sm:p-5">
			<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<StatusBadge status={status} />
						<span
							className={cn(
								"text-xs font-bold",
								trade.side === tradeSide.buy ? "text-success" : "text-danger",
							)}
						>
							{trade.side}
						</span>
						<span className="text-xs font-medium text-app-muted-fg">
							{getProviderConfig(trade.provider).label} · {trade.order_type} ·{" "}
							{trade.execution_type}
						</span>
					</div>
					<Typography className="mt-3 truncate text-app-fg" variant="h3">
						{trade.market_title}
					</Typography>
					<p className="mt-1 text-sm font-semibold text-app-muted-fg">
						{trade.outcome} · {formatTradeAmount(trade)}
						{trade.price ? ` at ${(trade.price * 100).toFixed(2)}¢` : ""}
					</p>
				</div>
				<div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:justify-end">
					<div className="text-xs text-app-muted-fg sm:text-right">
						<p>{formatDate(trade.created_at)}</p>
						<p className="mt-1 font-mono">
							{shortId(trade.provider_order_id ?? trade.id)}
						</p>
					</div>
					{canCancel ? (
						<Button
							className="border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20"
							disabled={cancelPending}
							onClick={() => onCancel(trade)}
							type="button"
							variant="ghost"
						>
							{cancelPending ? "Requesting..." : "Cancel order"}
						</Button>
					) : null}
					{canReconcile ? (
						<Button
							disabled={reconcilePending}
							onClick={() => onReconcile(trade)}
							type="button"
						>
							{reconcilePending ? "Reconciling..." : "Reconcile"}
						</Button>
					) : null}
				</div>
			</div>
			{trade.error ? (
				<p className="mt-4 border-t border-app-border pt-4 text-sm text-danger">
					{trade.error}
				</p>
			) : null}
		</article>
	);
}

function StatusBadge({ status }: { status: string }) {
	return (
		<span
			className={cn(
				"inline-flex px-2 py-1 text-[11px] font-bold uppercase tracking-wide",
				(status === tradeStatus.confirmed || status === tradeStatus.filled) &&
					"bg-success/15 text-success",
				(status === tradeStatus.live || status === tradeStatus.matched) &&
					"bg-info/15 text-info",
				status === tradeStatus.mined && "bg-violet/15 text-violet",
				status === tradeStatus.cancellationRequested &&
					"bg-warning/15 text-warning",
				status === tradeStatus.cancelled && "bg-app-muted text-app-muted-fg",
				status === tradeStatus.reconciliationRequired &&
					"bg-danger/15 text-danger",
				![...statusOrder, "failed", "pending", "submitted"].includes(
					status as never,
				) && "bg-app-muted text-app-muted-fg",
			)}
		>
			{status.replaceAll("_", " ")}
		</span>
	);
}

function OrdersLoading() {
	return (
		<div className="grid gap-3">
			{[0, 1, 2].map((item) => (
				<div
					className="h-36 animate-pulse border border-app-border bg-app-card"
					key={item}
				/>
			))}
		</div>
	);
}

function formatTradeAmount(trade: TradeIntent) {
	if (trade.side === tradeSide.buy && trade.order_type === "LIMIT") {
		if (trade.signed_maker_amount_base) {
			return `${Number(formatUnits(BigInt(trade.signed_maker_amount_base), 6)).toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC.e`;
		}
		return `${trade.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} shares`;
	}

	const suffix = trade.side === tradeSide.buy ? "USDC.e" : "shares";
	return `${trade.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${suffix}`;
}

function normalizeStatus(status: string) {
	return status.toLowerCase();
}

function shortId(id: string) {
	return id.length > 18 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id;
}

function statusRank(status: string) {
	const rank = statusOrder.indexOf(normalizeStatus(status) as never);
	return rank === -1 ? statusOrder.length : rank;
}
