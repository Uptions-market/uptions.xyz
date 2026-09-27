import type { Market } from "@/packages/types/market.types.ts";
import { getFiniteNumber } from "./numbers.ts";

type MarketPrices = Pick<Market, "bestAsk" | "bestBid" | "lastTradePrice">;

export function getNoPrice(market: MarketPrices) {
	const lastTradePrice = getFiniteNumber(market.lastTradePrice ?? undefined);

	if (lastTradePrice !== null) {
		return 1 - lastTradePrice;
	}

	const bestAsk = getFiniteNumber(market.bestAsk ?? undefined);

	if (bestAsk !== null) {
		return 1 - bestAsk;
	}

	return undefined;
}

export function getLeadingOutcome(
	market: MarketPrices,
	outcomeOne: string,
	outcomeTwo: string,
) {
	const yesPrice =
		getFiniteNumber(market.bestBid ?? market.lastTradePrice ?? undefined) ?? 0;
	const noPrice = getFiniteNumber(getNoPrice(market)) ?? 0;

	return yesPrice >= noPrice
		? { label: outcomeOne, price: yesPrice }
		: { label: outcomeTwo, price: noPrice };
}
