import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { resolveRoutedProvider } from "@/hooks/use-provider-config.ts";
import { requireAuth } from "@/routes/-require-auth.ts";

export const Route = createFileRoute("/markets_/$provider")({
	beforeLoad: requireAuth,
	component: RouteComponent,
});

function RouteComponent() {
	const { provider: providerRoute } = Route.useParams();
	const provider = resolveRoutedProvider(providerRoute);

	if (!provider) {
		return <Navigate replace to="/markets" />;
	}

	return <Outlet />;
}
