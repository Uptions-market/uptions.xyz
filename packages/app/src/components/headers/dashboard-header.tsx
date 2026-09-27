import { Link, useNavigate } from "@tanstack/react-router";
import Avatar from "boring-avatars";
import { ChevronDown, LogOut, Menu, Settings, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { CustomModal } from "@/components/dialogs/custom-modal.tsx";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet.tsx";

import { WalletConnectButton } from "@/components/wallet/wallet-connect-button.tsx";

import { useCurrentUser, useLogout } from "@/hooks/use-auth.ts";
import {
	useApproveMcpApproval,
	useAutomationAlerts,
	useClearAutomationAlerts,
	useMarkAllAutomationAlertsRead,
	useMarkAutomationAlertRead,
	useRejectMcpApproval,
} from "@/hooks/use-automations.ts";
import {
	dashboardActions,
	dashboardNavigationItems,
} from "@/packages/navigation/dashboard-navigation";
import type { AutomationAlert } from "@/packages/types/automation.types.ts";
import type { ProviderConfig } from "@/packages/providers/provider-config.ts";
import { formatDate } from "@/util/formatters.ts";
import Logo from "../misc/logo";

export default function DashboardHeader({
	walletProvider,
}: {
	walletProvider?: ProviderConfig;
}) {
	const NotificationsIcon = dashboardActions.notificationsIcon;
	const { user } = useCurrentUser();
	const logout = useLogout();
	const {
		alerts,
		error: alertsError,
		isLoading: alertsLoading,
	} = useAutomationAlerts();
	const approveMcpApproval = useApproveMcpApproval();
	const clearAlerts = useClearAutomationAlerts();
	const markAlertRead = useMarkAutomationAlertRead();
	const markAllAlertsRead = useMarkAllAutomationAlertsRead();
	const rejectMcpApproval = useRejectMcpApproval();
	const navigate = useNavigate();
	const [authOpen, setAuthOpen] = useState(false);
	const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
	const [logoutOpen, setLogoutOpen] = useState(false);
	const [notificationsOpen, setNotificationsOpen] = useState(false);
	const [selectedAlert, setSelectedAlert] = useState<AutomationAlert | null>(
		null,
	);
	const accountLabel = user?.username ?? user?.email ?? "Sign in";
	const unreadCount = useMemo(
		() => alerts.filter((alert) => !alert.read_at).length,
		[alerts],
	);

	const handleConfirmLogout = () => {
		logout();
		setLogoutOpen(false);
		navigate({ to: "/" });
	};

	const handleNotificationsOpenChange = (open: boolean) => {
		setNotificationsOpen(open);
	};

	const handleOpenNotification = (alert: AutomationAlert) => {
		setSelectedAlert(alert);

		if (!alert.read_at) {
			markAlertRead.mutate(alert.id);
		}
	};

	const selectedApprovalId = getApprovalId(selectedAlert);
	const selectedApprovalPending = selectedAlert
		? getMetaString(selectedAlert.meta, "type") === "mcp_approval_requested" &&
			selectedAlert.status === "pending"
		: false;

	return (
		<header className="sticky top-0 z-30 border-b border-[var(--app-border)] bg-[var(--dashboard-bg)]/95 backdrop-blur">
			<div className="mx-auto flex h-16 w-full max-w-[1500px] items-center justify-between px-5 sm:px-8">
				<Logo />

				<nav
					aria-label="Dashboard navigation"
					className="hidden items-center gap-9 md:flex"
				>
					{dashboardNavigationItems.map((item) => {
						const Icon = item.icon;

						return (
							<Link
								className="inline-flex items-center gap-2 text-xs font-medium text-[var(--app-muted-fg)] no-underline transition hover:text-[var(--app-fg)]"
								key={item.label}
								to={item.href}
							>
								<Icon className="size-3.5" />
								{item.label}
							</Link>
						);
					})}
				</nav>

				<div className="flex items-center gap-2 sm:gap-3">
					<Sheet
						onOpenChange={setMobileNavigationOpen}
						open={mobileNavigationOpen}
					>
						<SheetTrigger asChild>
							<Button
								aria-label="Open dashboard navigation"
								className="size-9 border-0 bg-transparent text-app-muted-fg hover:bg-app-muted hover:text-app-fg md:hidden"
								size="icon"
								type="button"
								variant="ghost"
							>
								<Menu className="size-5" />
							</Button>
						</SheetTrigger>
						<SheetContent
							className="border-app-border bg-app-card text-app-fg md:hidden"
							side="left"
						>
							<SheetHeader className="border-b border-app-border px-5 py-5">
								<SheetTitle className="text-app-fg">Dashboard menu</SheetTitle>
								<SheetDescription className="text-app-muted-fg">
									Navigate the Uptions dashboard.
								</SheetDescription>
							</SheetHeader>
							<nav
								aria-label="Mobile dashboard navigation"
								className="grid gap-1 p-4"
							>
								{dashboardNavigationItems.map((item) => {
									const Icon = item.icon;

									return (
										<Link
											className="flex min-h-11 items-center gap-3 px-3 text-sm font-semibold text-app-muted-fg no-underline transition hover:bg-app-muted hover:text-app-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
											key={item.label}
											onClick={() => setMobileNavigationOpen(false)}
											to={item.href}
										>
											<Icon className="size-4" />
											{item.label}
										</Link>
									);
								})}
							</nav>
						</SheetContent>
					</Sheet>
					<Sheet
						onOpenChange={handleNotificationsOpenChange}
						open={notificationsOpen}
					>
						<SheetTrigger asChild>
							<Button
								aria-label={dashboardActions.notificationsLabel}
								className="relative size-9 border-0 bg-transparent text-[var(--app-muted-fg)] hover:bg-[var(--app-muted)] hover:text-[var(--app-fg)]"
								size="icon"
								type="button"
								variant="ghost"
							>
								<NotificationsIcon className="size-4" />
								{unreadCount > 0 ? (
									<span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
										{unreadCount > 9 ? "9+" : unreadCount}
									</span>
								) : null}
							</Button>
						</SheetTrigger>
						<SheetContent className="border-app-border bg-app-card text-app-fg">
							<SheetHeader className="border-b border-app-border px-5 py-5">
								<div className="flex items-start justify-between gap-4">
									<div>
										<SheetTitle className="text-app-fg">
											Notifications
										</SheetTitle>
										<SheetDescription className="text-app-muted-fg">
											Recent automation activity and alerts.
										</SheetDescription>
									</div>
									<div className="flex flex-wrap justify-end gap-2">
										{alerts.length > 0 ? (
											<Button
												className="h-8 border border-app-border bg-transparent px-3 text-xs text-app-fg hover:bg-app-muted"
												disabled={clearAlerts.isPending}
												onClick={() => clearAlerts.mutate()}
												type="button"
												variant="ghost"
											>
												{clearAlerts.isPending ? "Clearing..." : "Clear all"}
											</Button>
										) : null}
										{unreadCount > 0 ? (
											<Button
												className="h-8 border border-app-border bg-transparent px-3 text-xs text-app-fg hover:bg-app-muted"
												disabled={markAllAlertsRead.isPending}
												onClick={() => markAllAlertsRead.mutate()}
												type="button"
												variant="ghost"
											>
												{markAllAlertsRead.isPending
													? "Saving..."
													: "Mark all read"}
											</Button>
										) : null}
									</div>
								</div>
							</SheetHeader>
							<div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
								{alertsLoading ? (
									<div className="mt-5 grid gap-3">
										<div className="h-24 animate-pulse bg-app-muted" />
										<div className="h-24 animate-pulse bg-app-muted" />
										<div className="h-24 animate-pulse bg-app-muted" />
									</div>
								) : alertsError ? (
									<div className="grid min-h-60 place-items-center px-5 text-center">
										<div>
											<p className="text-sm font-semibold text-danger">
												Unable to load notifications
											</p>
											<p className="mt-2 text-sm text-app-muted-fg">
												{alertsError}
											</p>
										</div>
									</div>
								) : alerts.length > 0 ? (
									<div className="mt-5 grid gap-3">
										{alerts.map((alert) => (
											<NotificationItem
												alert={alert}
												isMarkingRead={markAlertRead.isPending}
												key={alert.id}
												onMarkRead={() => markAlertRead.mutate(alert.id)}
												onOpen={() => handleOpenNotification(alert)}
											/>
										))}
									</div>
								) : (
									<div className="grid min-h-60 place-items-center text-center">
										<div>
											<p className="text-sm font-semibold text-app-fg">
												No notifications yet
											</p>
											<p className="mt-2 text-sm text-app-muted-fg">
												Automation alerts will appear here.
											</p>
										</div>
									</div>
								)}
							</div>
						</SheetContent>
					</Sheet>
					<CustomModal
						className="border-app-border bg-app-card text-app-fg sm:max-w-2xl"
						description={
							selectedAlert
								? (formatDate(selectedAlert.created_at) ?? undefined)
								: undefined
						}
						onOpenChange={(open) => {
							if (!open) {
								setSelectedAlert(null);
							}
						}}
						open={Boolean(selectedAlert)}
						title={selectedAlert?.title ?? "Notification"}
					>
						{selectedAlert ? (
							<div className="space-y-5">
								<div className="flex flex-wrap items-center gap-2">
									<span className="rounded-full bg-app-muted px-3 py-1 text-xs font-semibold capitalize text-primary">
										{selectedAlert.status}
									</span>
									{selectedApprovalPending ? (
										<span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
											Approval required
										</span>
									) : null}
								</div>
								<p className="text-sm leading-6 text-app-muted-fg">
									{selectedAlert.message}
								</p>
								<NotificationMeta meta={selectedAlert.meta} />
								{selectedApprovalPending && selectedApprovalId ? (
									<div className="flex justify-end gap-3 border-t border-app-border pt-4">
										<Button
											className="border border-app-border bg-transparent text-app-fg hover:bg-app-muted"
											disabled={
												rejectMcpApproval.isPending ||
												approveMcpApproval.isPending
											}
											onClick={() =>
												rejectMcpApproval.mutate(selectedApprovalId, {
													onSuccess: () => setSelectedAlert(null),
												})
											}
											type="button"
											variant="ghost"
										>
											{rejectMcpApproval.isPending ? "Rejecting..." : "Reject"}
										</Button>
										<Button
											className="bg-primary text-primary-foreground hover:bg-primary/90"
											disabled={
												approveMcpApproval.isPending ||
												rejectMcpApproval.isPending
											}
											onClick={() =>
												approveMcpApproval.mutate(selectedApprovalId, {
													onSuccess: () => setSelectedAlert(null),
												})
											}
											type="button"
										>
											{approveMcpApproval.isPending
												? "Approving..."
												: "Approve"}
										</Button>
									</div>
								) : null}
							</div>
						) : null}
					</CustomModal>
					{user?.preferred_trading_provider ? (
						<WalletConnectButton provider={walletProvider} />
					) : null}
					{user ? (
						<details className="group relative">
							<summary className="flex h-9 max-w-[260px] cursor-pointer list-none items-center gap-2 px-3 text-xs font-semibold text-app-muted-fg transition hover:bg-app-muted hover:text-app-fg [&::-webkit-details-marker]:hidden">
								<Avatar name={accountLabel} size={30} />
								<ChevronDown className="size-3.5 shrink-0 transition group-open:rotate-180" />
							</summary>
							<div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-52 border border-app-border bg-app-card p-1.5 shadow-xl">
								<Link
									className="flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-app-muted-fg no-underline transition hover:bg-app-muted hover:text-app-fg"
									to="/dashboard"
								>
									<UserRound className="size-4" />
									Profile
								</Link>
								<Link
									className="flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-app-muted-fg no-underline transition hover:bg-app-muted hover:text-app-fg"
									to="/settings"
								>
									<Settings className="size-4" />
									Settings
								</Link>
								<ThemeToggle presentation="menu" />
								<div className="my-1 border-t border-app-border" />
								<CustomModal
									className="border-app-border bg-app-card text-app-fg"
									description="You will need to sign in again to manage automations and connected venues."
									onOpenChange={setLogoutOpen}
									open={logoutOpen}
									title="Sign out of Uptions?"
									trigger={
										<button
											className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs font-medium text-app-muted-fg transition hover:bg-app-muted hover:text-app-fg"
											type="button"
										>
											<LogOut className="size-4" />
											Logout
										</button>
									}
								>
									<div className="flex justify-end gap-3 pt-2">
										<Button
											className="border border-app-border bg-transparent text-app-fg hover:bg-app-muted"
											onClick={() => setLogoutOpen(false)}
											type="button"
											variant="ghost"
										>
											Cancel
										</Button>
										<Button
											className="bg-primary text-primary-foreground hover:bg-primary/90"
											onClick={handleConfirmLogout}
											type="button"
										>
											Confirm logout
										</Button>
									</div>
								</CustomModal>
							</div>
						</details>
					) : (
						<CustomModal
							className="border-app-border bg-[var(--dashboard-bg)] p-0 text-app-fg"
							onOpenChange={setAuthOpen}
							open={authOpen}
							showHeader={false}
							title="Uptions account"
							trigger={
								<Button
									className="h-9 bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
									type="button"
								>
									<UserRound className="size-3.5" />
									Sign in
								</Button>
							}
						>
							<AuthPanel
								className="border-0"
								onAuthenticated={() => setAuthOpen(false)}
							/>
						</CustomModal>
					)}
				</div>
			</div>
		</header>
	);
}

function NotificationItem({
	alert,
	isMarkingRead,
	onMarkRead,
	onOpen,
}: {
	alert: AutomationAlert;
	isMarkingRead: boolean;
	onMarkRead: () => void;
	onOpen: () => void;
}) {
	const unread = !alert.read_at;

	return (
		<div
			className={`border p-4 transition hover:border-primary/60 ${
				unread
					? "border-primary/50 bg-primary/10"
					: "border-app-border bg-app-muted"
			}`}
		>
			<button className="w-full text-left" onClick={onOpen} type="button">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<p className="text-sm font-semibold text-app-fg">{alert.title}</p>
							{unread ? (
								<span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary-foreground">
									New
								</span>
							) : null}
						</div>
						<p className="mt-2 text-sm leading-6 text-app-muted-fg">
							{alert.message}
						</p>
					</div>
					<span className="rounded-full bg-app-card px-3 py-1 text-xs font-semibold capitalize text-primary">
						{alert.status}
					</span>
				</div>
				<p className="mt-4 text-xs font-medium text-app-muted-fg">
					{formatDate(alert.created_at)}
				</p>
			</button>
			{unread ? (
				<div className="mt-4 flex justify-end">
					<Button
						className="h-8 border border-app-border bg-transparent px-3 text-xs text-app-fg hover:bg-app-card"
						disabled={isMarkingRead}
						onClick={onMarkRead}
						type="button"
						variant="ghost"
					>
						Mark read
					</Button>
				</div>
			) : null}
		</div>
	);
}

function NotificationMeta({ meta }: { meta: Record<string, unknown> }) {
	const entries = Object.entries(meta).filter(
		([, value]) => value !== undefined,
	);

	if (entries.length === 0) {
		return null;
	}

	return (
		<div className="rounded-lg border border-app-border bg-app-muted p-4">
			<p className="text-xs font-bold uppercase tracking-[0.12em] text-app-muted-fg">
				Details
			</p>
			<div className="mt-3 grid gap-3">
				{entries.map(([key, value]) => (
					<div className="grid gap-1" key={key}>
						<p className="text-xs font-semibold capitalize text-app-fg">
							{key.replaceAll("_", " ")}
						</p>
						<pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded bg-app-card p-3 text-xs leading-5 text-app-muted-fg">
							{formatMetaValue(value)}
						</pre>
					</div>
				))}
			</div>
		</div>
	);
}

function getApprovalId(alert: AutomationAlert | null) {
	if (!alert) {
		return null;
	}

	return getMetaString(alert.meta, "approval_id");
}

function getMetaString(meta: Record<string, unknown>, key: string) {
	const value = meta[key];

	return typeof value === "string" && value.trim() ? value : null;
}

function formatMetaValue(value: unknown) {
	if (typeof value === "string") {
		return value;
	}

	return JSON.stringify(value, null, 2);
}
