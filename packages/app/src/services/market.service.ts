import { API_ROUTES } from "@/constant/api-routes.ts";
import { marketCategories } from "@/packages/markets/markets-data.ts";
import type { ProviderConfig } from "@/packages/providers/provider-config.ts";
import type {
	ApiResponse,
	RequestOptions,
} from "@/packages/types/api.types.ts";
import type {
	Market,
	MarketOrderBook,
	MarketPage,
	MarketsQuery,
	NormalizedMarket,
	NormalizedMarketOrderBook,
	NormalizedMarketPage,
} from "@/packages/types/market.types.ts";
import {
	formatCompactCurrency,
	formatOutcomePercent,
	formatPercentageChange,
} from "@/util/formatters.ts";
import { uptionsRequest } from "./api.service";

export class MarketService {
	async fetchMarket(
		provider: ProviderConfig,
		marketId: string,
		options?: RequestOptions,
	): Promise<ApiResponse<Market>> {
		const response = await uptionsRequest.GET<ApiResponse<NormalizedMarket>>(
			API_ROUTES.providers.market(provider.routeId, marketId),
			options,
		);

		return { ...response, data: toMarket(response.data, provider) };
	}

	async fetchOrderBook(
		provider: ProviderConfig,
		marketId: string,
		outcomeId: string,
		options?: Omit<RequestOptions, "query">,
	): Promise<ApiResponse<MarketOrderBook>> {
		const response = await uptionsRequest.GET<
			ApiResponse<NormalizedMarketOrderBook>
		>(API_ROUTES.providers.orderBook(provider.routeId, marketId), {
			...options,
			query: { outcome_id: outcomeId },
		});
		assertProviderIdentity(
			provider,
			response.data.provider,
			response.data.chain,
			response.data.chain_id,
		);

		return {
			...response,
			data: {
				asks: response.data.asks,
				best_ask: response.data.best_ask,
				best_bid: response.data.best_bid,
				bids: response.data.bids,
				last_traded: response.data.last_traded,
				spread: response.data.spread,
				token_id: response.data.outcome_id,
				updated_at: response.data.updated_at,
			},
		};
	}

	async fetchMarketData(
		provider: ProviderConfig,
		query: MarketsQuery = {},
		options?: Omit<RequestOptions, "query">,
	): Promise<ApiResponse<MarketPage>> {
		const response = await uptionsRequest.GET<
			ApiResponse<NormalizedMarketPage>
		>(API_ROUTES.providers.markets(provider.routeId), {
			...options,
			query: {
				active: true,
				archived: false,
				closed: false,
				limit: 24,
				...query,
			},
		});
		assertProviderIdentity(
			provider,
			response.data.provider,
			response.data.chain,
			response.data.chain_id,
		);

		return {
			...response,
			data: {
				...response.data,
				markets: response.data.markets.map((market) =>
					toMarket(market, provider),
				),
			},
		};
	}
}

function toMarket(market: NormalizedMarket, provider: ProviderConfig): Market {
	assertProviderIdentity(
		provider,
		market.provider,
		market.chain,
		market.chain_id,
	);
	const outcomes = market.outcomes
		.filter((outcome): outcome is typeof outcome & { id: string } =>
			Boolean(outcome.id),
		)
		.map((outcome) => ({
			label: outcome.label,
			price: outcome.price,
			tokenId: outcome.id,
		}));
	const yesOutcome = findOutcome(market, "yes") ?? market.outcomes[0];
	const noOutcome = findOutcome(market, "no") ?? market.outcomes[1];
	const priceChange = market.price_change_24h;

	return {
		active: market.active,
		bestAsk: market.best_ask,
		bestBid: market.best_bid,
		category: marketCategory(market.category),
		change: priceChange === null ? "" : formatPercentageChange(priceChange),
		closed: market.closed,
		context: {
			chain: market.chain,
			chainId: provider.requiredChain.id,
			chainLabel: provider.requiredChain.label,
			provider: market.provider,
			providerLabel: provider.label,
			providerRoute: provider.routeId,
			venue: provider.venue.id,
			venueLabel: provider.venue.label,
		},
		description: market.description,
		endDate: market.end_at,
		id: market.id,
		image: market.image_url,
		lastTradePrice: market.last_trade_price,
		negativeRisk: market.trading.negative_risk,
		no: formatOutcomePercent(noOutcome?.price ?? undefined),
		orderPriceMinTickSize: market.trading.minimum_tick_size,
		outcomes,
		platformUrl: market.external_url,
		positive: priceChange === null || priceChange >= 0,
		resolutionSource: null,
		slug: null,
		startDate: market.start_at,
		title: market.title,
		volume: formatCompactCurrency(market.volume ?? undefined),
		yes: formatOutcomePercent(yesOutcome?.price ?? undefined),
	};
}

function findOutcome(market: NormalizedMarket, label: string) {
	return market.outcomes.find(
		(outcome) => outcome.label.toLowerCase() === label,
	);
}

function marketCategory(
	category: string | null,
): (typeof marketCategories)[number] {
	const normalized = category?.trim().toLowerCase();
	return (
		marketCategories.find(
			(candidate) => candidate.toLowerCase() === normalized,
		) ?? "All"
	);
}

// Reject identity drift before provider data enters trading and automation UI state.
function assertProviderIdentity(
	provider: ProviderConfig,
	providerId: string,
	chain: string,
	chainId: number,
) {
	if (
		providerId !== provider.apiId ||
		chain !== provider.marketDataChain.apiId ||
		chainId !== provider.marketDataChain.id
	) {
		throw new Error(
			"Market provider or chain does not match the selected trading provider",
		);
	}
}

export const marketService = new MarketService();
