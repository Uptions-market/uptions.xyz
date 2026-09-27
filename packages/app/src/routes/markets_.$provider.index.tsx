import { createFileRoute, Navigate } from "@tanstack/react-router";
import { resolveRoutedProvider } from "@/hooks/use-provider-config.ts";
import Markets from "@/pages/markets.tsx";
import { requireAuth } from "@/routes/-require-auth.ts";

export const Route = createFileRoute("/markets_/$provider/")({
	beforeLoad: requireAuth,
	component: RouteComponent,
});

function RouteComponent() {
	const { provider: providerRoute } = Route.useParams();
	const provider = resolveRoutedProvider(providerRoute);

	if (!provider) {
		return <Navigate replace to="/markets" />;
	}

	return <Markets provider={provider} />;
}
