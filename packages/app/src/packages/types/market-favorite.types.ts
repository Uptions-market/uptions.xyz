import type { ProviderApiId } from "@/packages/providers/provider-config.ts";

export type MarketFavoritesPage = {
	market_ids: string[];
	next_cursor: string | null;
	provider: ProviderApiId;
};

export type MarketFavorite = {
	provider: ProviderApiId;
	market_id: string;
	favorited: boolean;
};
