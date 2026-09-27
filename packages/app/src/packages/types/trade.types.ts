import type { TickSize } from "@polymarket/clob-client";
import type {
	SupportedChain,
	TradingProvider,
} from "@/packages/types/auth.types.ts";

export const tradeSide = {
	buy: "BUY",
	sell: "SELL",
} as const;

export const tradeOrderType = {
	limit: "LIMIT",
	market: "MARKET",
} as const;

export const polymarketExecutionType = {
	fak: "FAK",
	fok: "FOK",
	gtc: "GTC",
	gtd: "GTD",
} as const;

export type TradeSide = (typeof tradeSide)[keyof typeof tradeSide];
export type TradeOrderType =
	(typeof tradeOrderType)[keyof typeof tradeOrderType];
export type PolymarketExecutionType =
	(typeof polymarketExecutionType)[keyof typeof polymarketExecutionType];

export const tradeStatus = {
	cancelled: "cancelled",
	cancellationRequested: "cancellation_requested",
	confirmed: "confirmed",
	filled: "filled",
	live: "live",
	matched: "matched",
	mined: "mined",
	reconciliationRequired: "reconciliation_required",
} as const;

export type TradeStatus =
	| (typeof tradeStatus)[keyof typeof tradeStatus]
	| "failed"
	| "pending"
	| "submitted";

export type CreateTradeIntentRequest = {
	amount: number;
	automation_id?: string;
	defer_exec?: boolean;
	execution_type: PolymarketExecutionType;
	market_id: string;
	market_title: string;
	order_type: TradeOrderType;
	outcome: string;
	post_only?: boolean;
	price?: number | null;
	provider: TradingProvider;
	side: TradeSide;
	token_id: string;
	wallet_address: string;
};

export type PolymarketTokenMetadata = {
	fee_rate_bps: number;
	negative_risk: boolean;
	tick_size: TickSize;
	token_id: string;
};

export type TradeIntent = {
	amount: number;
	automation_id: string | null;
	chain: SupportedChain;
	chain_id: number;
	created_at: string;
	defer_exec: boolean;
	error: string | null;
	execution_type: PolymarketExecutionType;
	id: string;
	market_id: string;
	market_title: string;
	order_type: TradeOrderType;
	outcome: string;
	post_only: boolean;
	price: number | null;
	provider: TradingProvider;
	provider_order_id: string | null;
	provider_response: Record<string, unknown> | null;
	reconciliation_checked_at: string | null;
	signed_order_hash: string | null;
	signed_maker_amount_base: string | null;
	signed_taker_amount_base: string | null;
	normalized_amount_base: string | null;
	normalized_price_numerator: string | null;
	normalized_price_denominator: string | null;
	submission_started_at: string | null;
	cancellation_requested_at: string | null;
	cancelled_at: string | null;
	side: TradeSide;
	status: TradeStatus | string;
	submitted_at: string | null;
	token_id: string;
	updated_at: string;
	wallet_address: string;
};

export type CreateTradeIntentResponse = {
	token_metadata: PolymarketTokenMetadata;
	trade: TradeIntent;
};

export type CancelMarketTradesRequest = {
	market_id: string;
	provider: TradingProvider;
	token_id: string;
};

export type SubmitSignedTradeRequest = {
	defer_exec?: boolean;
	execution_type: PolymarketExecutionType;
	post_only?: boolean;
	signed_order: Record<string, unknown>;
};

export type SubmitSignedTradeResponse = {
	provider_response: Record<string, unknown>;
	trade: TradeIntent;
};

export type ReconcileTradeResponse = {
	provider_lookup_available: boolean;
	resolution: string;
	trade: TradeIntent;
};

export type CancelTradesResponse = {
	provider_response: Record<string, unknown>;
	trades: TradeIntent[];
};
