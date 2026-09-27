import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { ProviderConfig } from "@/packages/providers/provider-config.ts";
import type { ApiResponse } from "@/packages/types/api.types.ts";
import type {
	MarketOrderBook,
	MarketsQuery,
} from "@/packages/types/market.types.ts";
import { marketService } from "@/services/market.service.ts";
import {
	applyPolymarketOrderBookEvent,
	eventTargetsAsset,
	getPolymarketEventFingerprint,
	getPolymarketEventTimestamp,
	getPolymarketMarketResolution,
	getPolymarketTickSizeChange,
	normalizePolymarketOrderBook,
	type PolymarketMarketEvent,
	type PolymarketMarketResolution,
	type PolymarketOrderBookConnectionStatus,
	type PolymarketTickSizeChange,
	polymarketOrderBookStreamService,
} from "@/services/polymarket-order-book-stream.service.ts";
import { getRequestErrorMessage } from "@/util/errors.ts";

export const providerQueryRoot = ["providers"] as const;

export const providerQueryKeys = {
	market: (provider: ProviderConfig, marketId: string) =>
		[...providerQueryRoot, provider.routeId, "market", marketId] as const,
	markets: (provider: ProviderConfig, query: MarketsQuery) =>
		[...providerQueryRoot, provider.routeId, "markets", query] as const,
	orderBook: (provider: ProviderConfig, marketId: string, outcomeId: string) =>
		[
			...providerQueryRoot,
			provider.routeId,
			"market",
			marketId,
			"order-book",
			outcomeId,
		] as const,
	readiness: (provider: ProviderConfig) =>
		[...providerQueryRoot, provider.routeId, "readiness"] as const,
};

type EventTimestampGroup = "order-book" | "resolution" | "tick-size";

export function useOrderBook(
	provider: ProviderConfig,
	marketId: string,
	outcomeId?: string,
) {
	const queryClient = useQueryClient();
	const [connectionStatus, setConnectionStatus] =
		useState<PolymarketOrderBookConnectionStatus>(
			outcomeId ? "connecting" : "disconnected",
		);
	const [marketResolution, setMarketResolution] =
		useState<PolymarketMarketResolution | null>(null);
	const [tickSizeChange, setTickSizeChange] =
		useState<PolymarketTickSizeChange | null>(null);
	const eventTimestamps = useRef<Partial<Record<EventTimestampGroup, number>>>(
		{},
	);
	const seenEvents = useRef(new Set<string>());
	const socketRevision = useRef(0);
	const orderBookQueryKey = providerQueryKeys.orderBook(
		provider,
		marketId,
		outcomeId ?? "",
	);
	const orderBookQuery = useQuery({
		enabled: Boolean(marketId && outcomeId && provider.capabilities.orderBook),
		queryFn: async ({ signal }) => {
			const requestRevision = socketRevision.current;
			const response = await marketService.fetchOrderBook(
				provider,
				marketId,
				outcomeId ?? "",
				{ signal },
			);

			if (requestRevision !== socketRevision.current) {
				const current =
					queryClient.getQueryData<ApiResponse<MarketOrderBook>>(
						orderBookQueryKey,
					);
				if (current) return current;
			}

			return {
				...response,
				data: normalizePolymarketOrderBook(response.data),
			};
		},
		queryKey: orderBookQueryKey,
		refetchInterval: connectionStatus === "connected" ? false : 2500,
	});

	useEffect(() => {
		eventTimestamps.current = {};
		seenEvents.current.clear();
		socketRevision.current = 0;
		setMarketResolution(null);
		setTickSizeChange(null);

		if (!marketId || !outcomeId || !provider.capabilities.orderBook) {
			setConnectionStatus("disconnected");
			return;
		}

		setConnectionStatus("connecting");
		const queryKey = providerQueryKeys.orderBook(provider, marketId, outcomeId);
		const refetchSnapshot = () => {
			void queryClient.refetchQueries({
				exact: true,
				queryKey,
				type: "active",
			});
		};

		return polymarketOrderBookStreamService.connect({
			assetId: outcomeId,
			onEvent: (event) => {
				if (!eventTargetsAsset(event, outcomeId)) return;
				const fingerprint = getPolymarketEventFingerprint(event);
				if (seenEvents.current.has(fingerprint)) return;
				const timestampGroup = getEventTimestampGroup(event);
				const timestamp = getPolymarketEventTimestamp(event);
				const lastTimestamp = eventTimestamps.current[timestampGroup];
				if (
					timestamp !== null &&
					lastTimestamp !== undefined &&
					timestamp < lastTimestamp
				) {
					return;
				}

				rememberEvent(seenEvents.current, fingerprint);
				if (timestamp !== null)
					eventTimestamps.current[timestampGroup] = timestamp;

				if (event.event_type === "tick_size_change") {
					setTickSizeChange(getPolymarketTickSizeChange(event));
					return;
				}
				if (event.event_type === "market_resolved") {
					setMarketResolution(getPolymarketMarketResolution(event));
					return;
				}

				const current =
					queryClient.getQueryData<ApiResponse<MarketOrderBook>>(queryKey);
				if (!current && event.event_type !== "book") {
					refetchSnapshot();
					return;
				}

				socketRevision.current += 1;
				queryClient.setQueryData<ApiResponse<MarketOrderBook>>(
					queryKey,
					(cached) => {
						const orderBook = applyPolymarketOrderBookEvent(
							cached?.data,
							event,
							outcomeId,
						);
						if (!orderBook) return cached;
						return {
							data: orderBook,
							message:
								cached?.message ?? "Realtime order book received successfully",
							status_code: cached?.status_code ?? 200,
						};
					},
				);
			},
			onFallback: refetchSnapshot,
			onOpen: (isReconnect) => {
				if (isReconnect) refetchSnapshot();
			},
			onStatusChange: setConnectionStatus,
		});
	}, [marketId, outcomeId, provider, queryClient]);

	const orderBook = orderBookQuery.data?.data;
	return {
		connectionStatus,
		error: orderBook
			? null
			: getRequestErrorMessage(
					orderBookQuery.error,
					"Unable to fetch order book",
				),
		isLoading: orderBookQuery.isLoading && !orderBook,
		isStale: connectionStatus !== "connected",
		marketResolution,
		orderBook,
		refetch: orderBookQuery.refetch,
		tickSizeChange,
	};
}

export function useMarket(provider: ProviderConfig, marketId?: string) {
	const marketQuery = useQuery({
		enabled: Boolean(marketId && provider.capabilities.marketData),
		queryFn: ({ signal }) =>
			marketService.fetchMarket(provider, marketId ?? "", { signal }),
		queryKey: providerQueryKeys.market(provider, marketId ?? ""),
	});

	return {
		error: getRequestErrorMessage(marketQuery.error, "Unable to fetch market"),
		isLoading: marketQuery.isLoading,
		market: marketQuery.data?.data,
		refetch: marketQuery.refetch,
	};
}

export function useMarkets(provider: ProviderConfig, query: MarketsQuery = {}) {
	const marketsQuery = useQuery({
		enabled: provider.capabilities.marketData,
		queryFn: ({ signal }) =>
			marketService.fetchMarketData(provider, query, { signal }),
		queryKey: providerQueryKeys.markets(provider, query),
	});

	return {
		error: getRequestErrorMessage(
			marketsQuery.error,
			"Unable to fetch markets",
		),
		isLoading: marketsQuery.isLoading,
		markets: marketsQuery.data?.data.markets ?? [],
		nextCursor: marketsQuery.data?.data.next_cursor ?? null,
		refetch: marketsQuery.refetch,
	};
}

function getEventTimestampGroup(
	event: PolymarketMarketEvent,
): EventTimestampGroup {
	if (event.event_type === "tick_size_change") return "tick-size";
	if (event.event_type === "market_resolved") return "resolution";
	return "order-book";
}

function rememberEvent(events: Set<string>, fingerprint: string) {
	if (events.size >= 500) {
		const oldest = events.values().next().value;
		if (oldest !== undefined) events.delete(oldest);
	}
	events.add(fingerprint);
}
