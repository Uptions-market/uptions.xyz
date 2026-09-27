import { API_ROUTES } from "@/constant/api-routes.ts";
import type { ProviderConfig } from "@/packages/providers/provider-config.ts";
import type { ApiResponse } from "@/packages/types/api.types.ts";
import type {
	MarketFavorite,
	MarketFavoritesPage,
} from "@/packages/types/market-favorite.types.ts";
import { uptionsRequest } from "@/services/api.service.ts";

class MarketFavoriteService {
	list(provider: ProviderConfig, before?: string | null) {
		return uptionsRequest.GET<ApiResponse<MarketFavoritesPage>>(
			API_ROUTES.providers.favorites(provider.routeId),
			{ query: { before, limit: 100 } },
		);
	}

	get(provider: ProviderConfig, marketId: string) {
		return uptionsRequest.GET<ApiResponse<MarketFavorite>>(
			API_ROUTES.providers.favorite(provider.routeId, marketId),
		);
	}

	favorite(provider: ProviderConfig, marketId: string) {
		return uptionsRequest.PUT<ApiResponse<MarketFavorite>>(
			API_ROUTES.providers.favorite(provider.routeId, marketId),
		);
	}

	unfavorite(provider: ProviderConfig, marketId: string) {
		return uptionsRequest.DELETE<ApiResponse<MarketFavorite>>(
			API_ROUTES.providers.favorite(provider.routeId, marketId),
		);
	}
}

export const marketFavoriteService = new MarketFavoriteService();
