import { createFileRoute, Navigate } from "@tanstack/react-router";
import { resolveRoutedProvider } from "@/hooks/use-provider-config.ts";
import MarketDetail from "@/pages/market-detail.tsx";
import { requireAuth } from "@/routes/-require-auth.ts";

export const Route = createFileRoute("/markets_/$provider/$marketId")({
	beforeLoad: requireAuth,
	component: RouteComponent,
});

function RouteComponent() {
	const { marketId, provider: providerRoute } = Route.useParams();
	const provider = resolveRoutedProvider(providerRoute);

	if (!provider) {
		return <Navigate replace to="/markets" />;
	}

	return <MarketDetail marketId={marketId} provider={provider} />;
}
