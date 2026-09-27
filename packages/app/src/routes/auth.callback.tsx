import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import Logo from "@/components/misc/logo";
import { LoaderScreen } from "@/components/skeleton/loader-screen.tsx";
import { Typography } from "@/components/typography/typography.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useGoogleAuthExchange, useStartGoogleAuth } from "@/hooks/use-auth.ts";
import { getRequestErrorMessage } from "@/util/errors.ts";

type AuthCallbackSearch = {
	code?: string;
	error?: string;
	error_description?: string;
	state?: string;
};

export const Route = createFileRoute("/auth/callback")({
	component: AuthCallback,
	validateSearch: (search: Record<string, unknown>): AuthCallbackSearch => ({
		code: getSearchValue(search.code),
		error: getSearchValue(search.error),
		error_description: getSearchValue(search.error_description),
		state: getSearchValue(search.state),
	}),
});

function getSearchValue(value: unknown) {
	if (typeof value !== "string") {
		return undefined;
	}

	const normalized = value.trim();
	return normalized || undefined;
}

function AuthCallback() {
	const search = Route.useSearch();
	const navigate = useNavigate();
	const exchange = useGoogleAuthExchange();
	const startGoogle = useStartGoogleAuth();
	const attemptedRef = useRef(false);
	const oauthError = search.error
		? search.error_description ||
			`Google authentication failed: ${search.error}`
		: null;
	const validationError =
		!oauthError && (!search.code || !search.state)
			? "The Google callback is missing the required code or state."
			: null;

	useEffect(() => {
		if (
			oauthError ||
			validationError ||
			!search.code ||
			!search.state ||
			attemptedRef.current
		) {
			return;
		}

		attemptedRef.current = true;
		void exchange
			.mutateAsync({ code: search.code, state: search.state })
			.then(() => navigate({ replace: true, to: "/dashboard" }))
			.catch(() => undefined);
	}, [
		exchange.mutateAsync,
		navigate,
		oauthError,
		search.code,
		search.state,
		validationError,
	]);

	function retryAuthentication() {
		startGoogle.mutate(undefined, {
			onSuccess: ({ authorization_url }) => {
				window.location.assign(authorization_url);
			},
		});
	}

	const exchangeError = getRequestErrorMessage(
		exchange.error,
		"We could not complete Google authentication.",
	);
	const startError = getRequestErrorMessage(
		startGoogle.error,
		"We could not restart Google authentication.",
	);
	const error = oauthError || validationError || startError || exchangeError;

	if (!error) {
		return <LoaderScreen label="Completing Google sign-in" />;
	}

	return (
		<main className="grid min-h-screen place-items-center bg-app-bg px-4 py-10 text-app-fg">
			<section className="grid w-full max-w-md gap-6 border border-app-border bg-app-card p-6 sm:p-8">
				<Logo asLink={false} />
				<div className="grid gap-3">
					<div className="grid size-10 place-items-center border border-danger/30 bg-danger/10 text-danger">
						<AlertTriangle className="size-5" />
					</div>
					<Typography variant="h2">Sign-in could not be completed</Typography>
					<Typography className="text-app-muted-fg" variant="bodySm">
						{error}
					</Typography>
				</div>
				<div className="flex flex-col gap-2 sm:flex-row">
					<Button
						className="h-10 sm:flex-1"
						disabled={startGoogle.isPending}
						onClick={retryAuthentication}
						type="button"
					>
						<RotateCcw className="size-4" />
						{startGoogle.isPending ? "Restarting" : "Try again"}
					</Button>
					<Button
						asChild
						className="h-10 border-app-border bg-app-surface text-app-fg hover:bg-app-muted sm:flex-1"
						variant="outline"
					>
						<Link to="/">Back to home</Link>
					</Button>
				</div>
			</section>
		</main>
	);
}
