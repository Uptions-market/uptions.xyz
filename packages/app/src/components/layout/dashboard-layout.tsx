import type { ReactNode } from "react";

import { AccountWarningsBanner } from "@/components/banners/account-warnings-banner.tsx";
import DashboardHeader from "@/components/headers/dashboard-header";
import { FirstLoginOnboarding } from "@/components/onboarding/first-login-onboarding.tsx";

import { useAutomationAlertStream } from "@/hooks/use-automations.ts";
import { cn } from "@/lib/utils.ts";
import type { ProviderConfig } from "@/packages/providers/provider-config.ts";

type DashboardLayoutProps = {
	children: ReactNode;
	className?: string;
	contentClassName?: string;
	walletProvider?: ProviderConfig;
};

export function DashboardLayout({
	children,
	className,
	contentClassName,
	walletProvider,
}: DashboardLayoutProps) {
	useAutomationAlertStream();

	return (
		<main
			className={cn(
				"flex min-h-screen flex-col bg-[var(--dashboard-bg)] text-[var(--app-fg)]",
				className,
			)}
		>
			<DashboardHeader walletProvider={walletProvider} />
			<AccountWarningsBanner />
			<FirstLoginOnboarding />
			<div className={cn("w-full flex-1", contentClassName)}>{children}</div>
		</main>
	);
}
