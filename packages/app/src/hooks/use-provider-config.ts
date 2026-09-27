import { useCurrentUser, useTradingProviders } from "@/hooks/use-auth.ts";
import {
	getProviderConfigByRoute,
	type ProviderConfig,
	providerCatalog,
	resolveSelectedProvider,
} from "@/packages/providers/provider-config.ts";

export function useSelectedProvider() {
	const currentUser = useCurrentUser();
	const { user } = currentUser;
	const providerOptions = useTradingProviders();
	const provider = resolveSelectedProvider(user?.preferred_trading_provider);
	const catalogEntry = providerOptions.providers.find(
		(entry) => entry.provider === provider.apiId,
	);

	return {
		catalogEntry,
		isLoading: currentUser.isLoading || providerOptions.isLoading,
		isResolving: currentUser.isLoading,
		isOperational:
			Boolean(catalogEntry?.available) && provider.capabilities.marketData,
		provider,
		providerError: providerOptions.error,
	};
}

export function resolveRoutedProvider(
	providerRoute: string,
): ProviderConfig | null {
	return getProviderConfigByRoute(providerRoute);
}

export function resolveApiProvider(provider: string): ProviderConfig | null {
	return (
		providerCatalog.find((candidate) => candidate.apiId === provider) ?? null
	);
}
