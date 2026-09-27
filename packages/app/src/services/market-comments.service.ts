import { API_ROUTES } from "@/constant/api-routes.ts";
import type { ProviderConfig } from "@/packages/providers/provider-config.ts";
import type { ApiResponse } from "@/packages/types/api.types.ts";
import type {
	CreateMarketCommentRequest,
	MarketComment,
	MarketCommentsPage,
} from "@/packages/types/market-comment.types.ts";
import { uptionsRequest } from "@/services/api.service.ts";

const COMMENTS_PAGE_SIZE = 50;

class MarketCommentsService {
	create(
		provider: ProviderConfig,
		marketId: string,
		payload: CreateMarketCommentRequest,
	) {
		return uptionsRequest.POST<
			ApiResponse<MarketComment>,
			CreateMarketCommentRequest
		>(API_ROUTES.providers.comments(provider.routeId, marketId), payload);
	}

	list(provider: ProviderConfig, marketId: string, before?: string | null) {
		return uptionsRequest.GET<ApiResponse<MarketCommentsPage>>(
			API_ROUTES.providers.comments(provider.routeId, marketId),
			{ query: { before, limit: COMMENTS_PAGE_SIZE } },
		);
	}
}

export const marketCommentsService = new MarketCommentsService();
