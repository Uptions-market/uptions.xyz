import { type Address, parseAbi } from "viem";
import { isTestnetTrading } from "@/config/trading-environment.ts";

export const POLYGON_CHAIN_ID = isTestnetTrading ? 80_002 : 137;
export const POLYGON_USDC_E_DECIMALS = 6;

const polygonContracts = {
	conditionalTokens: "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045",
	ctfExchange: "0x4bFb41d5B3570Defd03C39a9A4D8dE6bd8B8982E",
	negRiskExchange: "0xC5d563A36AE78145C45a50134d48A1215220f80a",
	usdcE: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
} as const satisfies Record<string, Address>;

const amoyContracts = {
	conditionalTokens: "0x69308FB512518e39F9b16112fA8d994F4e2Bf8bB",
	ctfExchange: "0xdFE02Eb6733538f8Ea35D585af8DE5958AD99E40",
	negRiskExchange: "0xC5d563A36AE78145C45a50134d48A1215220f80a",
	usdcE: "0x9c4e1703476e875070ee25b56a58b008cfb8fa78",
} as const satisfies Record<string, Address>;

export const POLYMARKET_CONTRACTS = isTestnetTrading
	? amoyContracts
	: polygonContracts;

export const erc20TradingAbi = parseAbi([
	"function allowance(address owner, address spender) view returns (uint256)",
	"function approve(address spender, uint256 amount) returns (bool)",
	"function balanceOf(address account) view returns (uint256)",
	"function mint(address owner, uint256 amount)",
]);

export const erc1155TradingAbi = parseAbi([
	"function balanceOf(address account, uint256 id) view returns (uint256)",
	"function isApprovedForAll(address account, address operator) view returns (bool)",
	"function setApprovalForAll(address operator, bool approved)",
]);

export function getPolymarketExchange(negativeRisk: boolean): Address {
	return negativeRisk
		? POLYMARKET_CONTRACTS.negRiskExchange
		: POLYMARKET_CONTRACTS.ctfExchange;
}
