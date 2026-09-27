import { providerCatalog } from "@/packages/providers/provider-config.ts";
import type { TradingProvider } from "@/packages/types/auth.types.ts";

export const providerAssets = Object.fromEntries(
	providerCatalog.map((provider) => [
		provider.apiId,
		provider.apiId === "DFLOW"
			? "/app-icon.svg"
			: `/images/providers/${provider.assets.imageKey}.png`,
	]),
) as Record<TradingProvider, string>;
