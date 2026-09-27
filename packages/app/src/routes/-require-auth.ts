import { redirect } from "@tanstack/react-router";
import { getAuthToken } from "@/services/auth-token.service.ts";

export function requireAuth() {
	// Authentication is stored in localStorage, which is unavailable during SSR.
	// Defer the guard to hydration so authenticated deep links are not redirected
	// before the browser can read the access token.
	if (typeof window === "undefined") {
		return;
	}

	if (!getAuthToken()) {
		throw redirect({ to: "/" });
	}
}
