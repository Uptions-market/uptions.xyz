export const tradingModes = {
	mainnet: "mainnet",
	testnet: "testnet",
} as const;

export type TradingMode = (typeof tradingModes)[keyof typeof tradingModes];

function resolveTradingMode(value: string | undefined): TradingMode {
	if (!value || value === tradingModes.mainnet) {
		return tradingModes.mainnet;
	}

	if (value === tradingModes.testnet) {
		return tradingModes.testnet;
	}

	throw new Error(
		`VITE_TRADING_MODE must be "mainnet" or "testnet"; received "${value}"`,
	);
}

export const tradingMode = resolveTradingMode(
	import.meta.env.VITE_TRADING_MODE,
);
export const isTestnetTrading = tradingMode === tradingModes.testnet;
