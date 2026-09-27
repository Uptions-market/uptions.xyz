export const providerApiIds = {
	dflow: "DFLOW",
	polymarket: "POLYMARKET",
} as const;

export const providerRouteIds = {
	dflow: "dflow",
	polymarket: "polymarket",
} as const;

export const supportedChains = {
	polygon: "POLYGON",
	solana: "SOLANA",
} as const;

export type WalletFamily = "evm" | "solana";

export type ProviderApiId =
	(typeof providerApiIds)[keyof typeof providerApiIds];
export type ProviderRouteId =
	(typeof providerRouteIds)[keyof typeof providerRouteIds];
export type SupportedChain =
	(typeof supportedChains)[keyof typeof supportedChains];

export type ProviderCapabilities = Readonly<{
	automations: boolean;
	comments: boolean;
	favorites: boolean;
	marketData: boolean;
	orderBook: boolean;
	trading: boolean;
	venueConnection: boolean;
}>;

export type ProviderChainConfig = Readonly<{
	apiId: SupportedChain;
	id: number;
	label: string;
}>;

export type ProviderConfig = Readonly<{
	apiId: ProviderApiId;
	assets: Readonly<{
		collateral: string;
		gas: string;
		imageKey: string;
	}>;
	capabilities: ProviderCapabilities;
	description: string;
	label: string;
	marketDataChain: ProviderChainConfig;
	requiredChain: ProviderChainConfig;
	routeId: ProviderRouteId;
	supportedChains: readonly ProviderChainConfig[];
	venue: Readonly<{
		id: ProviderRouteId;
		label: string;
	}>;
	walletFamily: WalletFamily;
}>;

const polygonMainnetChain = {
	apiId: supportedChains.polygon,
	id: 137,
	label: "Polygon",
} as const satisfies ProviderChainConfig;

const polygonAmoyChain = {
	apiId: supportedChains.polygon,
	id: 80_002,
	label: "Polygon Amoy",
} as const satisfies ProviderChainConfig;

const polygonWalletChain = isTestnetTrading
	? polygonAmoyChain
	: polygonMainnetChain;

const solanaChain = {
	apiId: supportedChains.solana,
	id: 101,
	label: "Solana",
} as const satisfies ProviderChainConfig;

export const providerCatalog = [
	{
		apiId: providerApiIds.polymarket,
		assets: {
			collateral: "USDC.e",
			gas: "POL",
			imageKey: "polymarket",
		},
		capabilities: {
			automations: true,
			comments: true,
			favorites: true,
			marketData: true,
			orderBook: true,
			trading: true,
			venueConnection: true,
		},
		description: "Prediction markets and CLOB execution on Polygon.",
		label: "Polymarket",
		marketDataChain: polygonMainnetChain,
		requiredChain: polygonWalletChain,
		routeId: providerRouteIds.polymarket,
		supportedChains: [polygonWalletChain],
		venue: {
			id: providerRouteIds.polymarket,
			label: "Polymarket",
		},
		walletFamily: "evm",
	},
	{
		apiId: providerApiIds.dflow,
		assets: {
			collateral: "USDC",
			gas: "SOL",
			imageKey: "dflow",
		},
		capabilities: {
			automations: false,
			comments: true,
			favorites: true,
			marketData: true,
			orderBook: false,
			trading: true,
			venueConnection: false,
		},
		description: "Kalshi-backed prediction markets tokenized on Solana.",
		label: "DFlow",
		marketDataChain: solanaChain,
		requiredChain: solanaChain,
		routeId: providerRouteIds.dflow,
		supportedChains: [solanaChain],
		venue: {
			id: providerRouteIds.dflow,
			label: "DFlow",
		},
		walletFamily: "solana",
	},
] as const satisfies readonly ProviderConfig[];

export const defaultProvider = providerCatalog[0];

export function getProviderConfig(provider: ProviderApiId): ProviderConfig {
	return (
		providerCatalog.find((candidate) => candidate.apiId === provider) ??
		defaultProvider
	);
}

export function getProviderConfigByRoute(
	provider: string,
): ProviderConfig | null {
	return (
		providerCatalog.find((candidate) => candidate.routeId === provider) ?? null
	);
}

export function getProviderRouteId(provider: ProviderApiId): ProviderRouteId {
	return getProviderConfig(provider).routeId;
}

export function resolveSelectedProvider(
	preferredProvider: ProviderApiId | null | undefined,
): ProviderConfig {
	return preferredProvider
		? getProviderConfig(preferredProvider)
		: defaultProvider;
}

export type MarketProviderContext = Readonly<{
	chain: SupportedChain;
	chainId: number;
	chainLabel: string;
	provider: ProviderApiId;
	providerLabel: string;
	providerRoute: ProviderRouteId;
	venue: ProviderRouteId;
	venueLabel: string;
}>;
import { isTestnetTrading } from "@/config/trading-environment.ts";
