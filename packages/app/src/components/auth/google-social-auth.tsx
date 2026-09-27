import { Typography } from "@/components/typography/typography.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
	useSocialAuthProviders,
	useStartGoogleAuth,
} from "@/hooks/use-auth.ts";
import { getRequestErrorMessage } from "@/util/errors.ts";

export function GoogleSocialAuth() {
	const { error, googleAvailable, isError, isLoading } =
		useSocialAuthProviders();
	const startGoogle = useStartGoogleAuth();
	const startError = getRequestErrorMessage(startGoogle.error);

	if (!isLoading && !isError && !googleAvailable) {
		return null;
	}

	function handleGoogleAuth() {
		startGoogle.mutate(undefined, {
			onSuccess: ({ authorization_url }) => {
				window.location.assign(authorization_url);
			},
		});
	}

	const disabled = isLoading || isError || startGoogle.isPending;
	const label = isLoading
		? "Checking Google availability"
		: isError
			? "Google sign-in unavailable"
			: startGoogle.isPending
				? "Redirecting to Google"
				: "Continue with Google";

	return (
		<div className="grid gap-3">
			<div className="flex items-center gap-3" aria-hidden="true">
				<div className="h-px flex-1 bg-app-border" />
				<span className="text-[11px] font-semibold text-app-muted-fg">OR</span>
				<div className="h-px flex-1 bg-app-border" />
			</div>
			<Button
				className="h-10 w-full border-app-border bg-app-surface text-app-fg hover:bg-app-muted"
				disabled={disabled}
				onClick={handleGoogleAuth}
				type="button"
				variant="outline"
			>
				<span
					aria-hidden="true"
					className="grid size-5 place-items-center border border-app-border bg-app-inverse text-xs font-bold text-app-inverse-fg"
				>
					G
				</span>
				{label}
			</Button>
			{isError || startError ? (
				<Typography className="text-danger" variant="caption">
					{startError || error}
				</Typography>
			) : null}
		</div>
	);
}
