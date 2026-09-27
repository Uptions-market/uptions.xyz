import { createFileRoute, Navigate } from "@tanstack/react-router";
import { resolveRoutedProvider } from "@/hooks/use-provider-config.ts";
import Builder from "@/pages/builder.tsx";
import { requireAuth } from "@/routes/-require-auth.ts";

export const Route = createFileRoute("/markets_/$provider/$marketId_/builder")({
	beforeLoad: requireAuth,
	component: RouteComponent,
	validateSearch: (search: Record<string, unknown>) => ({
		automationId:
			typeof search.automationId === "string" ? search.automationId : undefined,
	}),
});

function RouteComponent() {
	const { marketId, provider: providerRoute } = Route.useParams();
	const { automationId } = Route.useSearch();
	const provider = resolveRoutedProvider(providerRoute);

	if (!provider) {
		return <Navigate replace to="/markets" />;
	}

	return (
		<Builder
			automationId={automationId}
			marketId={marketId}
			provider={provider}
		/>
	);
}
