import { ApiError } from "@/components/errors/api.error.ts";
import { API_ROUTES } from "@/constant/api-routes.ts";
import type { ApiResponse } from "@/packages/types/api.types.ts";
import { uptionsRequest } from "@/services/api.service.ts";

export const SOLANA_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export type DflowOrderRequest = {
	amount: number;
	marketId: string;
	outcomeMint: string;
	predictionMarketSlippageBps?: number;
	userPublicKey: string;
};

export type DflowOrder = {
	inAmount: string;
	inputMint: string;
	lastValidBlockHeight?: number;
	minOutAmount: string;
	outAmount: string;
	outputMint: string;
	priceImpactPct: string;
	transaction?: string;
	transactionVersion: "v0" | "v1";
};

export type DflowOrderStatus = {
	inAmount: string;
	outAmount: string;
	status: "closed" | "expired" | "failed" | "open" | "pending" | "pendingClose";
};

type DflowProxyResponse<T> = { upstream: T };

export const dflowTradingService = {
	createOrder(payload: DflowOrderRequest) {
		return uptionsRequest.GET<ApiResponse<DflowProxyResponse<DflowOrder>>>(
			API_ROUTES.providers.dflowOrder,
			{ query: payload },
		);
	},
	getOrderStatus(signature: string, lastValidBlockHeight?: number) {
		return uptionsRequest.GET<
			ApiResponse<DflowProxyResponse<DflowOrderStatus>>
		>(API_ROUTES.providers.dflowOrderStatus, {
			query: { lastValidBlockHeight, signature },
		});
	},
	async waitForTerminalStatus(
		signature: string,
		lastValidBlockHeight?: number,
	) {
		const attempts = 30;
		for (let attempt = 0; attempt < attempts; attempt += 1) {
			try {
				const response = await this.getOrderStatus(
					signature,
					lastValidBlockHeight,
				);
				if (
					["closed", "expired", "failed"].includes(
						response.data.upstream.status,
					)
				) {
					return response.data.upstream;
				}
			} catch (error) {
				if (
					!(error instanceof ApiError) ||
					![404, 502].includes(error.status)
				) {
					throw error;
				}
			}
			await new Promise((resolve) => window.setTimeout(resolve, 2_000));
		}
		return null;
	},
};
