import {
	type ApiKeyCreds,
	Chain,
	ClobClient,
	OrderType,
	Side,
	SignatureType,
	type SignedOrder,
	type TickSize,
} from "@polymarket/clob-client";
import type { WalletClient } from "viem";
import { isTestnetTrading } from "@/config/trading-environment.ts";
import type {
	PolymarketExecutionType,
	TradeOrderType,
	TradeSide,
} from "@/packages/types/trade.types.ts";

const polymarketClobHost =
	import.meta.env.VITE_POLYMARKET_CLOB_HOST ?? "https://clob.polymarket.com";

const roundingConfig: Record<
	TickSize,
	{ amount: number; price: number; size: number }
> = {
	"0.0001": { amount: 6, price: 4, size: 2 },
	"0.001": { amount: 5, price: 3, size: 2 },
	"0.01": { amount: 4, price: 2, size: 2 },
	"0.1": { amount: 3, price: 1, size: 2 },
};

export type PolymarketOrderSigningInput = {
	amount: number;
	executionType: PolymarketExecutionType;
	feeRateBps: number;
	negativeRisk: boolean;
	orderType: TradeOrderType;
	price?: number | null;
	side: TradeSide;
	tickSize: TickSize;
	tokenId: string;
};

export function createPolymarketClient(
	walletClient: WalletClient,
	creds?: ApiKeyCreds,
) {
	const account = walletClient.account?.address;

	if (!account) {
		throw new Error("Wallet account is unavailable");
	}

	return new ClobClient(
		polymarketClobHost,
		isTestnetTrading ? Chain.AMOY : Chain.POLYGON,
		walletClient,
		creds,
		SignatureType.EOA,
		account,
	);
}

export async function createOrDerivePolymarketCredentials(
	walletClient: WalletClient,
) {
	const client = createPolymarketClient(walletClient);
	return client.createOrDeriveApiKey();
}

export async function createSignedPolymarketOrder(
	walletClient: WalletClient,
	creds: ApiKeyCreds,
	input: PolymarketOrderSigningInput,
): Promise<SignedOrder> {
	const client = createPolymarketClient(walletClient, creds);
	const side = toPolymarketSide(input.side);
	const options = {
		negRisk: input.negativeRisk,
		tickSize: input.tickSize,
	};

	if (input.orderType === "MARKET") {
		return client.createMarketOrder(
			{
				amount: input.amount,
				feeRateBps: input.feeRateBps,
				orderType: toPolymarketMarketExecutionType(input.executionType),
				price: input.price ?? undefined,
				side,
				tokenID: input.tokenId,
			},
			options,
		);
	}

	const price = input.price;

	if (!price) {
		throw new Error("Limit price is required");
	}

	return client.createOrder(
		{
			feeRateBps: input.feeRateBps,
			price,
			side,
			size: input.amount,
			tokenID: input.tokenId,
		},
		options,
	);
}

export function getPolymarketLimitBuyPreview({
	collateralAmount,
	price,
	tickSize,
}: {
	collateralAmount: number;
	price: number;
	tickSize: TickSize;
}) {
	const config = roundingConfig[tickSize];
	const normalizedPrice = roundNormal(price, config.price);
	const shares =
		normalizedPrice > 0
			? roundDown(collateralAmount / normalizedPrice, config.size)
			: 0;
	const collateral = roundNormal(shares * normalizedPrice, config.amount);

	return { collateral, price: normalizedPrice, shares };
}

export function normalizePolymarketShares(value: number) {
	return roundDown(value, 2);
}

export function normalizePolymarketTickSize(
	value: number | string | null | undefined,
): TickSize {
	const tickSize = String(value ?? "0.01");

	if (
		tickSize === "0.1" ||
		tickSize === "0.01" ||
		tickSize === "0.001" ||
		tickSize === "0.0001"
	) {
		return tickSize;
	}

	return "0.01";
}

export function toPolymarketExecutionType(value: PolymarketExecutionType) {
	switch (value) {
		case "FAK":
			return OrderType.FAK;
		case "GTC":
			return OrderType.GTC;
		case "GTD":
			return OrderType.GTD;
		default:
			return OrderType.FOK;
	}
}

function toPolymarketMarketExecutionType(
	value: PolymarketExecutionType,
): OrderType.FAK | OrderType.FOK {
	if (value === "FAK") {
		return OrderType.FAK;
	}

	if (value === "FOK") {
		return OrderType.FOK;
	}

	throw new Error("Market orders require FAK or FOK execution");
}

function toPolymarketSide(value: TradeSide) {
	return value === "BUY" ? Side.BUY : Side.SELL;
}

function roundDown(value: number, decimals: number) {
	const factor = 10 ** decimals;
	return Math.floor(value * factor) / factor;
}

function roundNormal(value: number, decimals: number) {
	const factor = 10 ** decimals;
	return Math.round((value + Number.EPSILON) * factor) / factor;
}
