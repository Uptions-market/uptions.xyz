import { API_ROUTES } from "@/constant/api-routes.ts";
import type { ApiResponse } from "@/packages/types/api.types.ts";
import type {
	CancelMarketTradesRequest,
	CancelTradesResponse,
	CreateTradeIntentRequest,
	CreateTradeIntentResponse,
	ReconcileTradeResponse,
	SubmitSignedTradeRequest,
	SubmitSignedTradeResponse,
	TradeIntent,
} from "@/packages/types/trade.types.ts";
import { uptionsRequest } from "@/services/api.service.ts";

export class TradeService {
	cancelMarket(payload: CancelMarketTradesRequest) {
		return uptionsRequest.POST<
			ApiResponse<CancelTradesResponse>,
			CancelMarketTradesRequest
		>(API_ROUTES.trades.cancelMarket, payload);
	}

	cancel(tradeId: string) {
		return uptionsRequest.POST<ApiResponse<CancelTradesResponse>>(
			API_ROUTES.trades.cancel(tradeId),
		);
	}

	createIntent(payload: CreateTradeIntentRequest) {
		return uptionsRequest.POST<
			ApiResponse<CreateTradeIntentResponse>,
			CreateTradeIntentRequest
		>(API_ROUTES.trades.preflight, payload);
	}

	list() {
		return uptionsRequest.GET<ApiResponse<TradeIntent[]>>(
			API_ROUTES.trades.list,
		);
	}

	reconcile(tradeId: string) {
		return uptionsRequest.POST<ApiResponse<ReconcileTradeResponse>>(
			API_ROUTES.trades.reconcile(tradeId),
		);
	}

	submitSignedOrder(tradeId: string, payload: SubmitSignedTradeRequest) {
		return uptionsRequest.POST<
			ApiResponse<SubmitSignedTradeResponse>,
			SubmitSignedTradeRequest
		>(API_ROUTES.trades.submit(tradeId), payload);
	}
}

export const tradeService = new TradeService();
