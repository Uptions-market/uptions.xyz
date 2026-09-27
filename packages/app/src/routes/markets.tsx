import { createFileRoute, Navigate } from "@tanstack/react-router";
import { LoaderScreen } from "@/components/skeleton/loader-screen.tsx";
import { useSelectedProvider } from "@/hooks/use-provider-config.ts";
import { requireAuth } from "@/routes/-require-auth.ts";

export const Route = createFileRoute("/markets")({
	beforeLoad: requireAuth,
	component: MarketsResolver,
});

function MarketsResolver() {
	const { isResolving, provider } = useSelectedProvider();

	if (isResolving) {
		return <LoaderScreen />;
	}

	return (
		<Navigate
			params={{ provider: provider.routeId }}
			replace
			to="/markets/$provider"
		/>
	);
}
