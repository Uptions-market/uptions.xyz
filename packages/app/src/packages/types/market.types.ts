import type { marketCategories } from "@/packages/markets/markets-data.ts";
import type {
	MarketProviderContext,
	ProviderApiId,
	SupportedChain,
} from "@/packages/providers/provider-config.ts";

export type MarketsQuery = {
	active?: boolean;
	archived?: boolean;
	category?: string;
	closed?: boolean;
	cursor?: string;
	id?: string;
	limit?: number;
	offset?: number;
	slug?: string;
};

export type NormalizedMarketOutcome = Readonly<{
	id: string | null;
	label: string;
	price: number | null;
}>;

export type NormalizedMarketTradingMetadata = Readonly<{
	minimum_order_size: number | null;
	minimum_tick_size: number | null;
	negative_risk: boolean;
}>;

export type NormalizedMarket = Readonly<{
	accepting_orders: boolean;
	active: boolean;
	best_ask: number | null;
	best_bid: number | null;
	category: string | null;
	chain: SupportedChain;
	chain_id: number;
	closed: boolean;
	description: string | null;
	end_at: string | null;
	external_url: string | null;
	id: string;
	image_url: string | null;
	last_trade_price: number | null;
	liquidity: number | null;
	outcomes: readonly NormalizedMarketOutcome[];
	price_change_24h: number | null;
	provider: ProviderApiId;
	start_at: string | null;
	title: string;
	trading: NormalizedMarketTradingMetadata;
	volume: number | null;
}>;

export type NormalizedMarketPage = Readonly<{
	chain: SupportedChain;
	chain_id: number;
	markets: readonly NormalizedMarket[];
	next_cursor: string | null;
	provider: ProviderApiId;
}>;

export type MarketOutcome = Readonly<{
	label: string;
	price: number | null;
	tokenId: string;
}>;

export type Market = Readonly<{
	active: boolean;
	bestAsk: number | null;
	bestBid: number | null;
	category: (typeof marketCategories)[number];
	change: string;
	closed: boolean;
	context: MarketProviderContext;
	description: string | null;
	endDate: string | null;
	id: string;
	image: string | null;
	lastTradePrice: number | null;
	negativeRisk: boolean;
	no: string;
	orderPriceMinTickSize: number | string | null;
	outcomes: readonly MarketOutcome[];
	platformUrl: string | null;
	positive: boolean;
	resolutionSource: string | null;
	slug: string | null;
	startDate: string | null;
	title: string;
	volume: string;
	yes: string;
}>;

export type MarketPage = Omit<NormalizedMarketPage, "markets"> & {
	markets: readonly Market[];
};

export type MarketOrderBookLevel = {
	depth_percent: number;
	price: number;
	shares: number;
	usd: number;
};

export type NormalizedMarketOrderBook = {
	asks: MarketOrderBookLevel[];
	best_ask: number | null;
	best_bid: number | null;
	bids: MarketOrderBookLevel[];
	chain: SupportedChain;
	chain_id: number;
	last_traded: number | null;
	market_id: string;
	outcome: string;
	outcome_id: string;
	provider: ProviderApiId;
	spread: number | null;
	updated_at: string;
};

export type MarketOrderBook = {
	asks: MarketOrderBookLevel[];
	best_ask: number | null;
	best_bid: number | null;
	bids: MarketOrderBookLevel[];
	last_traded: number | null;
	spread: number | null;
	token_id: string;
	updated_at: string;
};
