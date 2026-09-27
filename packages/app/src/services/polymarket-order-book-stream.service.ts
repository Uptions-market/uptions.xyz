import type {
	MarketOrderBook,
	MarketOrderBookLevel,
} from "@/packages/types/market.types.ts";

const marketSocketUrl = "wss://ws-subscriptions-clob.polymarket.com/ws/market";
const heartbeatIntervalMs = 10_000;
const maximumReconnectDelayMs = 30_000;
const stableConnectionMs = 30_000;

export type PolymarketOrderBookConnectionStatus =
	| "connecting"
	| "connected"
	| "reconnecting"
	| "disconnected";

export type PolymarketTickSizeChange = {
	changedAt: string;
	newTickSize: number;
	oldTickSize: number;
};

export type PolymarketMarketResolution = {
	resolvedAt: string;
	winningAssetId: string | null;
	winningOutcome: string | null;
};

type PolymarketBookLevelUpdate = {
	price: string | number;
	size: string | number;
};

type PolymarketPriceChange = PolymarketBookLevelUpdate & {
	asset_id: string;
	best_ask?: string | number;
	best_bid?: string | number;
	hash?: string;
	side: "BUY" | "SELL";
};

type PolymarketBookEvent = {
	asks: PolymarketBookLevelUpdate[];
	asset_id: string;
	bids: PolymarketBookLevelUpdate[];
	event_type: "book";
	hash?: string;
	timestamp?: string | number;
};

type PolymarketPriceChangeEvent = {
	event_type: "price_change";
	price_changes: PolymarketPriceChange[];
	timestamp?: string | number;
};

type PolymarketLastTradePriceEvent = {
	asset_id: string;
	event_type: "last_trade_price";
	price: string | number;
	timestamp?: string | number;
};

type PolymarketBestBidAskEvent = {
	asset_id: string;
	best_ask: string | number;
	best_bid: string | number;
	event_type: "best_bid_ask";
	spread?: string | number;
	timestamp?: string | number;
};

type PolymarketTickSizeChangeEvent = {
	asset_id: string;
	event_type: "tick_size_change";
	new_tick_size: string | number;
	old_tick_size: string | number;
	timestamp?: string | number;
};

type PolymarketMarketResolvedEvent = {
	assets_ids?: string[];
	event_type: "market_resolved";
	timestamp?: string | number;
	winning_asset_id?: string;
	winning_outcome?: string;
};

export type PolymarketMarketEvent =
	| PolymarketBookEvent
	| PolymarketPriceChangeEvent
	| PolymarketLastTradePriceEvent
	| PolymarketBestBidAskEvent
	| PolymarketTickSizeChangeEvent
	| PolymarketMarketResolvedEvent;

type MarketStreamOptions = {
	assetId: string;
	onEvent: (event: PolymarketMarketEvent) => void;
	onFallback: () => void;
	onOpen: (isReconnect: boolean) => void;
	onStatusChange: (status: PolymarketOrderBookConnectionStatus) => void;
};

export class PolymarketOrderBookStreamService {
	connect(options: MarketStreamOptions) {
		if (typeof WebSocket === "undefined") {
			options.onStatusChange("disconnected");
			options.onFallback();
			return () => undefined;
		}

		let active = true;
		let hasConnected = false;
		let heartbeatId: number | undefined;
		let reconnectAttempt = 0;
		let reconnectId: number | undefined;
		let socket: WebSocket | null = null;
		let stabilityId: number | undefined;
		let waitingForPong = 0;

		const clearConnectionTimers = () => {
			if (heartbeatId !== undefined) {
				window.clearInterval(heartbeatId);
				heartbeatId = undefined;
			}

			if (stabilityId !== undefined) {
				window.clearTimeout(stabilityId);
				stabilityId = undefined;
			}
		};

		const scheduleReconnect = () => {
			if (!active || reconnectId !== undefined) {
				return;
			}

			options.onStatusChange("reconnecting");
			options.onFallback();
			const delay = Math.min(
				maximumReconnectDelayMs,
				1000 * 2 ** reconnectAttempt,
			);
			reconnectAttempt += 1;
			reconnectId = window.setTimeout(() => {
				reconnectId = undefined;
				openSocket();
			}, delay);
		};

		const openSocket = () => {
			if (!active) {
				return;
			}

			options.onStatusChange(hasConnected ? "reconnecting" : "connecting");

			try {
				socket = new WebSocket(marketSocketUrl);
			} catch {
				scheduleReconnect();
				return;
			}

			const currentSocket = socket;

			currentSocket.onopen = () => {
				if (!active || socket !== currentSocket) {
					currentSocket.close();
					return;
				}

				const isReconnect = hasConnected || reconnectAttempt > 0;
				currentSocket.send(
					JSON.stringify({
						assets_ids: [options.assetId],
						custom_feature_enabled: true,
						type: "market",
					}),
				);
				hasConnected = true;
				waitingForPong = 0;
				options.onStatusChange("connected");
				options.onOpen(isReconnect);
				heartbeatId = window.setInterval(() => {
					if (currentSocket.readyState !== WebSocket.OPEN) {
						return;
					}

					if (waitingForPong >= 2) {
						currentSocket.close();
						return;
					}

					waitingForPong += 1;
					currentSocket.send("PING");
				}, heartbeatIntervalMs);
				stabilityId = window.setTimeout(() => {
					reconnectAttempt = 0;
				}, stableConnectionMs);
			};

			currentSocket.onmessage = (message) => {
				if (typeof message.data !== "string") {
					return;
				}

				if (message.data === "PONG") {
					waitingForPong = 0;
					return;
				}

				for (const event of parseMarketEvents(message.data)) {
					options.onEvent(event);
				}
			};

			currentSocket.onerror = () => {
				currentSocket.close();
			};

			currentSocket.onclose = () => {
				if (socket === currentSocket) {
					socket = null;
				}
				clearConnectionTimers();
				scheduleReconnect();
			};
		};

		openSocket();

		return () => {
			active = false;
			clearConnectionTimers();

			if (reconnectId !== undefined) {
				window.clearTimeout(reconnectId);
			}

			socket?.close();
			socket = null;
		};
	}
}

export function applyPolymarketOrderBookEvent(
	current: MarketOrderBook | null | undefined,
	event: PolymarketMarketEvent,
	assetId: string,
): MarketOrderBook | null {
	if (!eventTargetsAsset(event, assetId)) {
		return current ?? null;
	}

	if (event.event_type === "book") {
		const bids = normalizeLevels(event.bids, "descending");
		const asks = normalizeLevels(event.asks, "ascending");
		return createOrderBook(
			current,
			assetId,
			bids,
			asks,
			getEventUpdatedAt(event),
		);
	}

	if (!current) {
		return null;
	}

	if (event.event_type === "price_change") {
		let bids = current.bids;
		let asks = current.asks;
		let bestBid: number | undefined;
		let bestAsk: number | undefined;

		for (const change of event.price_changes) {
			if (change.asset_id !== assetId) {
				continue;
			}

			const price = readFiniteNumber(change.price);
			const size = readFiniteNumber(change.size);
			if (price === null || size === null || size < 0) {
				continue;
			}

			if (change.side === "BUY") {
				bids = updateLevel(bids, price, size, "descending");
			} else if (change.side === "SELL") {
				asks = updateLevel(asks, price, size, "ascending");
			}

			bestBid = readFiniteNumber(change.best_bid) ?? bestBid;
			bestAsk = readFiniteNumber(change.best_ask) ?? bestAsk;
		}

		return createOrderBook(
			current,
			assetId,
			bids,
			asks,
			getEventUpdatedAt(event),
			bestBid,
			bestAsk,
		);
	}

	if (event.event_type === "last_trade_price") {
		const lastTraded = readFiniteNumber(event.price);
		if (lastTraded === null) {
			return current;
		}

		return {
			...current,
			last_traded: lastTraded,
			updated_at: getEventUpdatedAt(event),
		};
	}

	if (event.event_type === "best_bid_ask") {
		const bestBid = readFiniteNumber(event.best_bid);
		const bestAsk = readFiniteNumber(event.best_ask);
		if (bestBid === null || bestAsk === null) {
			return current;
		}

		return {
			...current,
			best_ask: bestAsk,
			best_bid: bestBid,
			spread:
				readFiniteNumber(event.spread) ?? calculateSpread(bestBid, bestAsk),
			updated_at: getEventUpdatedAt(event),
		};
	}

	return current;
}

export function normalizePolymarketOrderBook(
	orderBook: MarketOrderBook,
): MarketOrderBook {
	const bids = normalizeLevels(orderBook.bids, "descending");
	const asks = normalizeLevels(orderBook.asks, "ascending");
	return createOrderBook(
		orderBook,
		orderBook.token_id,
		bids,
		asks,
		orderBook.updated_at,
	);
}

export function eventTargetsAsset(
	event: PolymarketMarketEvent,
	assetId: string,
) {
	if (event.event_type === "price_change") {
		return event.price_changes.some((change) => change.asset_id === assetId);
	}

	if (event.event_type === "market_resolved") {
		return event.assets_ids?.includes(assetId) ?? false;
	}

	return event.asset_id === assetId;
}

export function getPolymarketEventTimestamp(event: PolymarketMarketEvent) {
	if (event.timestamp === undefined) {
		return null;
	}

	const timestamp = readFiniteNumber(event.timestamp);
	if (timestamp !== null) {
		return timestamp;
	}

	if (typeof event.timestamp === "string") {
		const parsed = Date.parse(event.timestamp);
		return Number.isFinite(parsed) ? parsed : null;
	}

	return null;
}

export function getPolymarketEventFingerprint(event: PolymarketMarketEvent) {
	return JSON.stringify(event);
}

export function getPolymarketTickSizeChange(
	event: PolymarketTickSizeChangeEvent,
): PolymarketTickSizeChange | null {
	const oldTickSize = readFiniteNumber(event.old_tick_size);
	const newTickSize = readFiniteNumber(event.new_tick_size);
	if (oldTickSize === null || newTickSize === null) {
		return null;
	}

	return {
		changedAt: getEventUpdatedAt(event),
		newTickSize,
		oldTickSize,
	};
}

export function getPolymarketMarketResolution(
	event: PolymarketMarketResolvedEvent,
): PolymarketMarketResolution {
	return {
		resolvedAt: getEventUpdatedAt(event),
		winningAssetId: event.winning_asset_id ?? null,
		winningOutcome: event.winning_outcome ?? null,
	};
}

function parseMarketEvents(data: string): PolymarketMarketEvent[] {
	let payload: unknown;

	try {
		payload = JSON.parse(data);
	} catch {
		return [];
	}

	const events = Array.isArray(payload) ? payload : [payload];
	return events.filter(isPolymarketMarketEvent);
}

function isPolymarketMarketEvent(
	value: unknown,
): value is PolymarketMarketEvent {
	if (!isRecord(value) || typeof value.event_type !== "string") {
		return false;
	}

	if (value.event_type === "book") {
		return (
			typeof value.asset_id === "string" &&
			Array.isArray(value.bids) &&
			Array.isArray(value.asks)
		);
	}

	if (value.event_type === "price_change") {
		return (
			Array.isArray(value.price_changes) &&
			value.price_changes.every(
				(change) => isRecord(change) && typeof change.asset_id === "string",
			)
		);
	}

	if (value.event_type === "market_resolved") {
		return (
			value.assets_ids === undefined ||
			(Array.isArray(value.assets_ids) &&
				value.assets_ids.every((assetId) => typeof assetId === "string"))
		);
	}

	return (
		["last_trade_price", "best_bid_ask", "tick_size_change"].includes(
			value.event_type,
		) && typeof value.asset_id === "string"
	);
}

function createOrderBook(
	current: MarketOrderBook | null | undefined,
	assetId: string,
	bids: MarketOrderBookLevel[],
	asks: MarketOrderBookLevel[],
	updatedAt: string,
	providedBestBid?: number,
	providedBestAsk?: number,
): MarketOrderBook {
	const bestBid = providedBestBid ?? bids[0]?.price ?? null;
	const bestAsk = providedBestAsk ?? asks[0]?.price ?? null;
	return {
		asks,
		best_ask: bestAsk,
		best_bid: bestBid,
		bids,
		last_traded: current?.last_traded ?? null,
		spread: calculateSpread(bestBid, bestAsk),
		token_id: assetId,
		updated_at: updatedAt,
	};
}

function updateLevel(
	levels: MarketOrderBookLevel[],
	price: number,
	size: number,
	direction: "ascending" | "descending",
) {
	const updatedLevels = levels
		.filter((level) => level.price !== price)
		.map((level) => ({ price: level.price, size: level.shares }));

	if (size > 0) {
		updatedLevels.push({ price, size });
	}

	return normalizeLevels(updatedLevels, direction);
}

function normalizeLevels(
	levels: unknown,
	direction: "ascending" | "descending",
): MarketOrderBookLevel[] {
	if (!Array.isArray(levels)) {
		return [];
	}

	const uniqueLevels = new Map<number, number>();
	for (const level of levels) {
		if (!isRecord(level)) {
			continue;
		}

		const price = readFiniteNumber(level.price);
		const shares = readFiniteNumber(level.size ?? level.shares);
		if (price === null || shares === null || shares <= 0) {
			continue;
		}

		uniqueLevels.set(price, shares);
	}

	const sortedLevels = [...uniqueLevels].sort(([left], [right]) =>
		direction === "ascending" ? left - right : right - left,
	);
	const maximumShares = Math.max(
		0,
		...sortedLevels.map(([, shares]) => shares),
	);

	return sortedLevels.map(([price, shares]) => ({
		depth_percent: maximumShares > 0 ? (shares / maximumShares) * 100 : 0,
		price,
		shares,
		usd: price * shares,
	}));
}

function calculateSpread(bestBid: number | null, bestAsk: number | null) {
	if (bestBid === null || bestAsk === null) {
		return null;
	}

	return Math.max(0, bestAsk - bestBid);
}

function getEventUpdatedAt(event: { timestamp?: string | number }) {
	const timestamp =
		event.timestamp === undefined ? null : readFiniteNumber(event.timestamp);
	if (timestamp !== null) {
		const date = new Date(timestamp);
		if (Number.isFinite(date.getTime())) {
			return date.toISOString();
		}
	}

	if (typeof event.timestamp === "string") {
		const parsed = Date.parse(event.timestamp);
		if (Number.isFinite(parsed)) {
			return new Date(parsed).toISOString();
		}
	}

	return new Date().toISOString();
}

function readFiniteNumber(value: unknown) {
	if (typeof value === "string" && value.trim() === "") {
		return null;
	}

	if (typeof value !== "string" && typeof value !== "number") {
		return null;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

export const polymarketOrderBookStreamService =
	new PolymarketOrderBookStreamService();
