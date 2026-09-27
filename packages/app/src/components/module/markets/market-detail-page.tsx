import { Link } from "@tanstack/react-router";
import { ArrowLeft, Bot, ChevronRight } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { AppKeyword, MarketDetailMetric } from "@/common";
import { DashboardLayout } from "@/components/layout/dashboard-layout.tsx";
import { NoDataFound } from "@/components/misc/no-data-found.tsx";
import { MarketCommentsPanel } from "@/components/module/markets/comments/market-comments-panel.tsx";
import { MarketFavoriteButton } from "@/components/module/markets/favorite/market-favorite-button.tsx";
import { MarketOrderBookPanel } from "@/components/module/markets/order-book-panel.tsx";
import { DflowTradeTicket } from "@/components/module/trading/dflow-trade-ticket.tsx";
import { MarketTradeTicket } from "@/components/module/trading/market-trade-ticket.tsx";
import { MarketPageSkeleton } from "@/components/skeleton/market-page-skeleton.tsx";
import { Typography } from "@/components/typography/typography.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useMarket, useOrderBook } from "@/hooks/use-markets.ts";
import { cn } from "@/lib/utils.ts";
import type { ProviderConfig } from "@/packages/providers/provider-config.ts";
import { formatMarketPrice, formatMarketWindow } from "@/util/formatters.ts";

type MarketDetailPageProps = {
	marketId: string;
	provider: ProviderConfig;
};

export function MarketDetailPage({
	marketId,
	provider,
}: MarketDetailPageProps) {
	const [selectedTokenId, setSelectedTokenId] = useState("");
	const { error, isLoading, market } = useMarket(provider, marketId);
	const orderBookOutcomes = useMemo(() => market?.outcomes ?? [], [market]);
	const activeTokenId = selectedTokenId || orderBookOutcomes[0]?.tokenId || "";
	const {
		connectionStatus: orderBookConnectionStatus,
		error: orderBookError,
		isLoading: isOrderBookLoading,
		isStale: isOrderBookStale,
		marketResolution,
		orderBook,
		refetch: refetchOrderBook,
		tickSizeChange,
	} = useOrderBook(provider, marketId, activeTokenId);

	useEffect(() => {
		if (!orderBookOutcomes.length) {
			return;
		}

		if (
			!orderBookOutcomes.some((outcome) => outcome.tokenId === selectedTokenId)
		) {
			setSelectedTokenId(orderBookOutcomes[0]?.tokenId ?? "");
		}
	}, [orderBookOutcomes, selectedTokenId]);

	if (isLoading) {
		return (
			<DashboardLayout
				contentClassName="px-5 py-8 sm:px-8"
				walletProvider={provider}
			>
				<MarketPageSkeleton />
			</DashboardLayout>
		);
	}

	if (error) {
		return (
			<DashboardLayout
				contentClassName="px-5 py-8 sm:px-8"
				walletProvider={provider}
			>
				<Panel className="border-danger/40 bg-danger/10">
					<Typography className="text-danger" variant="h3">
						Unable to load market
					</Typography>
					<Typography className="mt-2 text-app-muted-fg" variant="bodySm">
						{error}
					</Typography>
				</Panel>
			</DashboardLayout>
		);
	}

	if (!market) {
		return (
			<DashboardLayout
				contentClassName="px-5 py-8 sm:px-8"
				walletProvider={provider}
			>
				<NoDataFound
					description="This market could not be found."
					title="Market unavailable"
				/>
			</DashboardLayout>
		);
	}

	const statusLabel =
		market.active && !market.closed ? AppKeyword.Live : AppKeyword.Inactive;
	const platformUrl = market.platformUrl;

	return (
		<DashboardLayout
			contentClassName="px-5 py-8 sm:px-8"
			walletProvider={provider}
		>
			<div
				className=" mx-auto grid w-full
        max-w-[1500px]
		 gap-5 text-app-fg"
			>
				<Link
					className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-app-muted-fg no-underline hover:text-app-fg"
					params={{ provider: provider.routeId }}
					to="/markets/$provider"
				>
					<ArrowLeft className="size-4" />
					{AppKeyword.Markets}
				</Link>

				<section
					className="grid gap-5

				"
				>
					<div className="grid gap-5">
						<Panel className="p-5">
							<div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
								<div className="flex min-w-0 items-start gap-5">
									<MarketIcon image={market.image} title={market.title} />
									<div className="min-w-0">
										<div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-app-muted-fg">
											<span>{market.category}</span>
											<span className="h-1 w-1 bg-app-muted5" />
											<span
												className={cn(
													"inline-flex items-center gap-1",
													statusLabel === AppKeyword.Live
														? "text-success"
														: "text-app-muted-fg",
												)}
											>
												<span className="h-2 w-2 bg-current" />
												{statusLabel}
											</span>
										</div>
										<Typography className="mt-3 text-app-fg" variant="h1">
											{market.title}
										</Typography>
										<Typography
											className="mt-2 text-app-muted-fg"
											variant="bodySm"
										>
											{formatMarketWindow(market)}
										</Typography>
									</div>
								</div>
								<MarketFavoriteButton
									className="w-full md:w-auto"
									marketId={market.id}
									provider={provider}
								/>
							</div>

							<div className="mt-8 grid gap-5 sm:grid-cols-3">
								<MarketValue
									label={MarketDetailMetric.BestBid}
									value={formatMarketPrice(market.bestBid ?? undefined)}
								/>
								<MarketValue
									label={MarketDetailMetric.BestAsk}
									value={formatMarketPrice(market.bestAsk ?? undefined)}
								/>
								<MarketValue
									label={MarketDetailMetric.LastTrade}
									trend={market.change}
									value={formatMarketPrice(market.lastTradePrice ?? undefined)}
								/>
							</div>
						</Panel>

						<Panel className="p-5">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<Typography className="text-app-fg" variant="h3">
									{AppKeyword.Market}
								</Typography>
								<div className="flex flex-wrap gap-2">
									{platformUrl && (
										<Button
											asChild
											className="h-10 border border-app-border bg-app-muted px-4 text-sm font-semibold hover:bg-app-muted"
										>
											<a href={platformUrl} rel="noreferrer" target="_blank">
												<span className="h-2 w-2 bg-danger" />
												{AppKeyword.GoToLiveMarket}
												<ChevronRight className="size-4" />
											</a>
										</Button>
									)}
									{provider.capabilities.automations ? (
										<Button
											asChild
											className="h-10 bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
										>
											<Link
												params={{
													marketId: market.id,
													provider: provider.routeId,
												}}
												search={{ automationId: undefined }}
												to="/markets/$provider/$marketId/builder"
											>
												<Bot className="size-4" />
												{AppKeyword.AutomateMarket}
											</Link>
										</Button>
									) : null}
								</div>
							</div>
							<PriceHistoryUnavailable />
						</Panel>

						{orderBookOutcomes.length > 0 && provider.apiId === "DFLOW" ? (
							<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
								<Panel className="p-5">
									<Typography className="text-app-fg" variant="h3">
										Outcome tokens on {provider.requiredChain.label}
									</Typography>
									<Typography
										className="mt-1 text-app-muted-fg"
										variant="bodySm"
									>
										DFlow routes market orders on Solana. Quotes and transaction
										payloads are prepared through the Uptions backend.
									</Typography>
								</Panel>
								<DflowTradeTicket
									marketId={market.id}
									marketResolved={Boolean(marketResolution)}
									marketTitle={market.title}
									onSelectedTokenIdChange={setSelectedTokenId}
									outcomes={orderBookOutcomes}
									selectedTokenId={activeTokenId}
								/>
							</div>
						) : orderBookOutcomes.length > 0 &&
							provider.capabilities.orderBook &&
							provider.capabilities.trading ? (
							<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
								<MarketOrderBookPanel
									connectionStatus={orderBookConnectionStatus}
									error={orderBookError}
									isLoading={isOrderBookLoading}
									isStale={isOrderBookStale}
									marketResolution={marketResolution}
									onSelectedTokenIdChange={setSelectedTokenId}
									orderBook={orderBook}
									outcomes={orderBookOutcomes}
									selectedTokenId={activeTokenId}
									tickSizeChange={tickSizeChange}
									volume={market.volume}
								/>

								<MarketTradeTicket
									marketContext={market.context}
									marketId={market.id}
									marketResolved={Boolean(marketResolution)}
									negativeRisk={market.negativeRisk}
									marketImage={market.image}
									marketTitle={market.title}
									onSelectedTokenIdChange={setSelectedTokenId}
									onTradeSubmitted={() => refetchOrderBook()}
									orderBook={orderBook}
									outcomes={orderBookOutcomes}
									selectedTokenId={activeTokenId}
									tickSize={
										tickSizeChange?.newTickSize ??
										market.orderPriceMinTickSize ??
										undefined
									}
								/>
							</div>
						) : orderBookOutcomes.length > 0 ? (
							<Panel className="p-5">
								<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
									<div>
										<Typography className="text-app-fg" variant="h3">
											Outcome tokens on {provider.requiredChain.label}
										</Typography>
										<Typography
											className="mt-1 max-w-2xl text-app-muted-fg"
											variant="bodySm"
										>
											Market discovery is active. Trading will unlock after a
											compatible Solana wallet and the DFlow backend order proxy
											are configured.
										</Typography>
									</div>
									<span className="w-fit border border-app-border bg-app-muted px-3 py-1 text-xs font-semibold text-app-muted-fg">
										{provider.label}
									</span>
								</div>
								<div className="mt-5 grid gap-3 sm:grid-cols-2">
									{orderBookOutcomes.map((outcome) => (
										<div
											className="border border-app-border bg-app-muted p-4"
											key={outcome.tokenId}
										>
											<Typography className="text-app-fg" variant="label">
												{outcome.label}
											</Typography>
											<Typography
												className="mt-1 text-app-muted-fg"
												variant="bodySm"
											>
												{formatMarketPrice(outcome.price ?? undefined)}
											</Typography>
										</div>
									))}
								</div>
							</Panel>
						) : null}

						<MarketCommentsPanel marketId={market.id} provider={provider} />

						<Panel className="p-5">
							<Typography
								className="border-b border-app-border pb-4 text-app-fg"
								variant="h3"
							>
								{AppKeyword.Rules}
							</Typography>
							<Typography
								className="max-w-4xl py-6 text-app-muted-fg"
								variant="body"
							>
								{market.resolutionSource ??
									market.description ??
									"Resolution details are provided by the source market venue."}
							</Typography>
						</Panel>
					</div>
				</section>
			</div>
		</DashboardLayout>
	);
}

function Panel({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<section className={cn("border border-app-border bg-app-card", className)}>
			{children}
		</section>
	);
}

function MarketIcon({ image, title }: { image: string | null; title: string }) {
	if (image) {
		return (
			<img
				alt=""
				className="size-20 shrink-0 object-cover md:size-24"
				src={image}
			/>
		);
	}

	const isBitcoin =
		title.toLowerCase().includes("btc") ||
		title.toLowerCase().includes("bitcoin");

	return (
		<div className="grid size-20 shrink-0 place-items-center bg-orange-500 text-4xl font-black text-app-fg md:size-24">
			{isBitcoin ? "B" : title.charAt(0).toUpperCase()}
		</div>
	);
}

function MarketValue({
	label,
	trend,
	value,
}: {
	label: string;
	trend?: string;
	value: string;
}) {
	return (
		<div className="border border-app-border bg-app-muted p-4">
			<Typography className="font-bold text-app-muted-fg" variant="bodySm">
				{label}
			</Typography>
			<div className="mt-1 flex items-center gap-3">
				<p className="text-3xl font-bold text-app-fg">{value}</p>
				{trend && (
					<span className="text-sm font-bold text-danger">{trend}</span>
				)}
			</div>
		</div>
	);
}

function PriceHistoryUnavailable() {
	return (
		<div className="mt-6 border-y border-app-border bg-app-muted px-5 py-12 text-center">
			<Typography className="text-app-fg" variant="h3">
				Price history unavailable
			</Typography>
			<Typography
				className="mx-auto mt-2 max-w-xl text-app-muted-fg"
				variant="bodySm"
			>
				Historical chart data is not available from the current market feed.
				Live prices and order book data are shown below.
			</Typography>
		</div>
	);
}
