import Avatar from "boring-avatars";
import {
	BrainCircuit,
	CheckCircle2,
	CircleUserRound,
	type LucideIcon,
	Mail,
	ShieldCheck,
	Wallet,
} from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { DashboardLayout } from "@/components/layout/dashboard-layout.tsx";
import { Typography } from "@/components/typography/typography.tsx";
import { Button } from "@/components/ui/button.tsx";
import { providerAssets } from "@/components/wallet/provider-assets.ts";
import { WalletConnectButton } from "@/components/wallet/wallet-connect-button.tsx";
import {
	useCurrentUser,
	useTradingProviders,
	useUpdateEmail,
	useUpdatePassword,
	useUpdateTradingProvider,
	useUpdateUsername,
	useUpdateWallet,
} from "@/hooks/use-auth.ts";
import {
	useConnectLlmProvider,
	useDisconnectLlmProvider,
	useLlmProviders,
} from "@/hooks/use-llm-providers.ts";
import { cn } from "@/lib/utils.ts";
import {
	getProviderConfig,
	type ProviderConfig,
	resolveSelectedProvider,
} from "@/packages/providers/provider-config.ts";
import type {
	AuthUser,
	TradingProviderOption,
	VenueConnection,
} from "@/packages/types/auth.types.ts";
import {
	llmProvider,
	type LlmProvider,
} from "@/packages/types/llm-provider.types.ts";
import { getRequestErrorMessage } from "@/util/errors.ts";

const settingsSection = {
	account: "account",
	ai: "ai",
	profile: "profile",
	security: "security",
	trading: "trading",
} as const;

type SettingsSectionId = (typeof settingsSection)[keyof typeof settingsSection];

const settingsNavigation: Array<{
	description: string;
	icon: LucideIcon;
	id: SettingsSectionId;
	label: string;
}> = [
	{
		description: "Identity and account summary",
		icon: CircleUserRound,
		id: settingsSection.profile,
		label: "Profile",
	},
	{
		description: "Email and verification",
		icon: Mail,
		id: settingsSection.account,
		label: "Account",
	},
	{
		description: "Provider and wallet",
		icon: Wallet,
		id: settingsSection.trading,
		label: "Trading",
	},
	{
		description: "Your model credentials",
		icon: BrainCircuit,
		id: settingsSection.ai,
		label: "AI Providers",
	},
	{
		description: "Password and access",
		icon: ShieldCheck,
		id: settingsSection.security,
		label: "Security",
	},
];

export function SettingsPage() {
	const { user } = useCurrentUser();
	const [activeSection, setActiveSection] = useState<SettingsSectionId>(
		settingsSection.profile,
	);
	const selectedProvider = resolveSelectedProvider(
		user?.preferred_trading_provider,
	);

	useEffect(() => {
		const syncSection = () => {
			setActiveSection(parseSettingsSection(window.location.hash));
		};

		syncSection();
		window.addEventListener("hashchange", syncSection);
		return () => window.removeEventListener("hashchange", syncSection);
	}, []);

	return (
		<DashboardLayout contentClassName="px-5 py-8 sm:px-8 sm:py-10">
			<div className="mx-auto grid w-full max-w-6xl gap-7">
				<header>
					<Typography className="text-app-fg" variant="h1">
						Settings
					</Typography>
					<Typography className="mt-2 text-app-muted-fg" variant="bodySm">
						Manage your profile, account, trading setup, and security.
					</Typography>
				</header>

				<div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-9">
					<nav
						aria-label="Settings sections"
						className="-mx-5 overflow-x-auto border-y border-app-border px-5 sm:-mx-8 sm:px-8 lg:sticky lg:top-24 lg:mx-0 lg:self-start lg:overflow-visible lg:border-0 lg:px-0"
					>
						<div className="flex min-w-max gap-2 py-3 lg:grid lg:min-w-0 lg:gap-1 lg:py-0">
							{settingsNavigation.map((item) => {
								const Icon = item.icon;
								const active = item.id === activeSection;

								return (
									<a
										aria-current={active ? "page" : undefined}
										className={cn(
											"flex min-h-11 items-center gap-3 border px-4 text-sm font-semibold no-underline transition lg:min-h-16 lg:items-start lg:p-3",
											active
												? "border-primary bg-primary/10 text-app-fg"
												: "border-app-border bg-app-card text-app-muted-fg hover:border-primary/50 hover:text-app-fg lg:border-transparent lg:bg-transparent",
										)}
										href={`#${item.id}`}
										key={item.id}
										onClick={() => setActiveSection(item.id)}
									>
										<Icon className="mt-0.5 size-4 shrink-0" />
										<span>
											<span className="block">{item.label}</span>
											<span className="mt-1 hidden text-xs font-normal text-app-muted-fg lg:block">
												{item.description}
											</span>
										</span>
									</a>
								);
							})}
						</div>
					</nav>

					<div className="min-w-0">
						{activeSection === settingsSection.profile ? (
							<ProfileSettings user={user} />
						) : null}
						{activeSection === settingsSection.account ? (
							<EmailSettings
								email={user?.email ?? ""}
								verified={Boolean(user?.email_verified)}
							/>
						) : null}
						{activeSection === settingsSection.trading ? (
							<div className="grid gap-6">
								<TradingProviderSettings
									selectedProvider={user?.preferred_trading_provider ?? null}
								/>
								<WalletSettings
									connection={user?.venue_connections.find(
										(connection) =>
											connection.venue === selectedProvider.venue.id,
									)}
									provider={selectedProvider}
									savedWallet={user?.primary_wallet_address ?? null}
								/>
							</div>
						) : null}
						{activeSection === settingsSection.security ? (
							<PasswordSettings enabled={Boolean(user?.password_configured)} />
						) : null}
						{activeSection === settingsSection.ai ? (
							<LlmProviderSettings />
						) : null}
					</div>
				</div>
			</div>
		</DashboardLayout>
	);
}

function LlmProviderSettings() {
	const { error, isLoading, providers } = useLlmProviders();
	const connectProvider = useConnectLlmProvider();
	const disconnectProvider = useDisconnectLlmProvider();
	const [keys, setKeys] = useState<Partial<Record<LlmProvider, string>>>({});

	const handleConnect = async (provider: LlmProvider) => {
		const apiKey = keys[provider]?.trim();

		if (!apiKey) {
			toast.error("Enter an API key");
			return;
		}

		try {
			await connectProvider.mutateAsync({
				payload: { api_key: apiKey },
				provider,
			});
			setKeys((current) => ({ ...current, [provider]: "" }));
			toast.success("AI provider connected");
		} catch (error) {
			toast.error(getRequestErrorMessage(error, "Unable to connect provider"));
		}
	};

	const handleDisconnect = async (provider: LlmProvider) => {
		try {
			await disconnectProvider.mutateAsync(provider);
			toast.success("AI provider disconnected");
		} catch (error) {
			toast.error(getRequestErrorMessage(error, "Unable to disconnect provider"));
		}
	};

	return (
		<SettingsSection
			description="Connect your own model account. Credentials are encrypted and used only for your AI Builder requests."
			icon={BrainCircuit}
			title="AI providers"
		>
			{isLoading ? (
				<div className="h-40 animate-pulse bg-app-muted" />
			) : error ? (
				<p className="border border-danger/40 bg-danger/10 p-4 text-sm font-semibold text-danger">
					{error}
				</p>
			) : (
				<div className="grid gap-4">
					{providers.map((provider) => {
						const consoleUrl =
							provider.provider === llmProvider.chatGpt
								? "https://platform.openai.com/api-keys"
								: "https://console.x.ai";

						return (
							<div
								className="border border-app-border bg-app-muted p-5"
								key={provider.provider}
							>
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div>
										<div className="flex items-center gap-2">
											<p className="font-bold text-app-fg">{provider.label}</p>
											<span
												className={cn(
													"text-xs font-bold uppercase tracking-[0.1em]",
													provider.connected ? "text-success" : "text-app-muted-fg",
												)}
											>
												{provider.connected ? "Connected" : "Not connected"}
											</span>
										</div>
										<p className="mt-2 text-sm text-app-muted-fg">
											{provider.connected
												? `Saved key ${provider.key_hint}`
												: "Use an API key from your provider account."}
										</p>
									</div>
									<a
										className="text-xs font-semibold text-primary hover:underline"
										href={consoleUrl}
										rel="noreferrer"
										target="_blank"
									>
										Get API key
									</a>
								</div>
								<div className="mt-5 flex flex-col gap-3 sm:flex-row">
									<input
										autoComplete="off"
										className="h-11 min-w-0 flex-1 border border-app-border bg-app-card px-3 text-sm text-app-fg outline-none focus:border-primary"
										onChange={(event) =>
											setKeys((current) => ({
												...current,
												[provider.provider]: event.target.value,
											}))
										}
										placeholder={provider.connected ? "Enter a replacement key" : "API key"}
										type="password"
										value={keys[provider.provider] ?? ""}
									/>
									<Button
										disabled={connectProvider.isPending || !keys[provider.provider]?.trim()}
										onClick={() => handleConnect(provider.provider)}
										type="button"
									>
										{connectProvider.isPending
											? "Verifying..."
											: provider.connected
												? "Replace key"
												: "Connect"}
									</Button>
									{provider.connected ? (
										<Button
											disabled={disconnectProvider.isPending}
											onClick={() => handleDisconnect(provider.provider)}
											type="button"
											variant="outline"
										>
											Disconnect
										</Button>
									) : null}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</SettingsSection>
	);
}

function ProfileSettings({ user }: { user: AuthUser | null | undefined }) {
	const accountName = user?.username ?? user?.email ?? "Uptions account";
	const [username, setUsername] = useState(user?.username ?? "");
	const updateUsername = useUpdateUsername();

	useEffect(() => {
		setUsername(user?.username ?? "");
	}, [user?.username]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		try {
			await updateUsername.mutateAsync({ username });
			toast.success(user?.username ? "Username updated" : "Username added");
		} catch (error) {
			toast.error(getRequestErrorMessage(error, "Unable to save username"));
		}
	};

	return (
		<SettingsSection
			description="Review the identity and trading details attached to your Uptions account."
			icon={CircleUserRound}
			title="Profile"
		>
			<div className="grid gap-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
					<div className="size-20 shrink-0 overflow-hidden rounded-full border-2 border-primary/40 bg-app-muted p-1">
						<Avatar
							colors={["#ff6633", "#8b5cf6", "#22c55e", "#3b82f6", "#f59e0b"]}
							name={accountName}
							size="100%"
							variant="beam"
						/>
					</div>
					<div className="min-w-0">
						<p className="truncate text-lg font-semibold text-app-fg">
							{user?.username ? `@${user.username}` : "Username not set"}
						</p>
						<p className="mt-1 truncate text-sm text-app-muted-fg">
							{user?.email ?? "No email connected"}
						</p>
					</div>
				</div>
				<div className="grid gap-px overflow-hidden border border-app-border bg-app-border sm:grid-cols-2">
					<ProfileValue label="Username" value={user?.username ?? "Not set"} />
					<ProfileValue label="Email" value={user?.email ?? "Not set"} />
					<ProfileValue
						label="Trading wallet"
						value={shortAddress(user?.primary_wallet_address)}
					/>
					<ProfileValue
						label="Trading provider"
						value={
							user?.preferred_trading_provider
								? getProviderConfig(user.preferred_trading_provider).label
								: "Not selected"
						}
					/>
				</div>
				<form
					className="grid gap-4 border-t border-app-border pt-6"
					onSubmit={handleSubmit}
				>
					<SettingsInput
						autoComplete="username"
						label={user?.username ? "Change username" : "Add username"}
						maxLength={20}
						minLength={3}
						onChange={setUsername}
						pattern="[A-Za-z][A-Za-z0-9_]*"
						placeholder="your_username"
						required
						type="text"
						value={username}
					/>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<p className="text-xs leading-5 text-app-muted-fg">
							Use 3-20 characters. Start with a letter and use letters, numbers,
							or underscores.
						</p>
						<Button
							disabled={
								updateUsername.isPending ||
								username.trim().length < 3 ||
								username.trim().toLowerCase() === user?.username
							}
							type="submit"
						>
							{updateUsername.isPending ? "Saving..." : "Save username"}
						</Button>
					</div>
				</form>
			</div>
		</SettingsSection>
	);
}

function EmailSettings({
	email,
	verified,
}: {
	email: string;
	verified: boolean;
}) {
	const [currentPassword, setCurrentPassword] = useState("");
	const [nextEmail, setNextEmail] = useState(email);
	const updateEmail = useUpdateEmail();

	useEffect(() => {
		setNextEmail(email);
	}, [email]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		try {
			await updateEmail.mutateAsync({
				current_password: currentPassword || undefined,
				email: nextEmail,
			});
			setCurrentPassword("");
			toast.success("Email updated. Check your inbox to verify it.");
		} catch (error) {
			toast.error(getRequestErrorMessage(error, "Unable to update email"));
		}
	};

	return (
		<SettingsSection
			description="Change the email used to sign in and receive account notifications."
			icon={Mail}
			title="Email address"
		>
			<form className="grid gap-4" onSubmit={handleSubmit}>
				<div className="grid gap-4 md:grid-cols-2">
					<SettingsInput
						autoComplete="email"
						label="Email"
						onChange={setNextEmail}
						required
						type="email"
						value={nextEmail}
					/>
					<SettingsInput
						autoComplete="current-password"
						label="Current password"
						onChange={setCurrentPassword}
						placeholder="Required for email accounts"
						type="password"
						value={currentPassword}
					/>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<span
						className={cn(
							"inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em]",
							verified ? "text-success" : "text-warning",
						)}
					>
						<CheckCircle2 className="size-4" />
						{verified ? "Verified" : "Verification required"}
					</span>
					<Button disabled={updateEmail.isPending || !nextEmail} type="submit">
						{updateEmail.isPending ? "Saving..." : "Update email"}
					</Button>
				</div>
			</form>
		</SettingsSection>
	);
}

function TradingProviderSettings({
	selectedProvider,
}: {
	selectedProvider: string | null;
}) {
	const { error, isLoading, providers } = useTradingProviders();
	const updateProvider = useUpdateTradingProvider();

	const handleSelect = async (provider: TradingProviderOption) => {
		if (
			!provider.available ||
			!getProviderConfig(provider.provider).capabilities.marketData ||
			provider.provider === selectedProvider
		) {
			return;
		}

		try {
			await updateProvider.mutateAsync({ provider: provider.provider });
			toast.success(`${provider.label} selected`);
		} catch (error) {
			toast.error(getRequestErrorMessage(error, "Unable to update provider"));
		}
	};

	return (
		<SettingsSection
			description="Choose the market provider used for market data, trading, and automations."
			icon={ShieldCheck}
			title="Trading provider"
		>
			{isLoading ? (
				<div className="h-24 animate-pulse bg-app-muted" />
			) : error ? (
				<p className="border border-danger/40 bg-danger/10 p-4 text-sm font-semibold text-danger">
					{error}
				</p>
			) : (
				<div className="grid gap-3">
					{providers.map((provider) => {
						const config = getProviderConfig(provider.provider);
						const available =
							provider.available && config.capabilities.marketData;
						const selected = provider.provider === selectedProvider;

						return (
							<button
								className={cn(
									"flex items-center gap-4 border bg-app-muted p-4 text-left transition",
									selected
										? "border-primary"
										: "border-app-border hover:border-primary/60",
									!available && "cursor-not-allowed opacity-60",
								)}
								disabled={!available || updateProvider.isPending}
								key={provider.provider}
								onClick={() => handleSelect(provider)}
								type="button"
							>
								<img
									alt=""
									className="size-12 border border-app-border bg-app-card object-cover"
									src={providerAssets[provider.provider]}
								/>
								<div className="min-w-0 flex-1">
									<p className="font-bold text-app-fg">{provider.label}</p>
									<p className="mt-1 text-sm text-app-muted-fg">
										{provider.description}
									</p>
									<p className="mt-2 text-xs font-bold uppercase tracking-[0.1em] text-app-muted-fg">
										{provider.chain_label} · Chain ID {provider.chain_id}
									</p>
								</div>
								{selected ? (
									<CheckCircle2 className="size-5 text-success" />
								) : null}
							</button>
						);
					})}
				</div>
			)}
		</SettingsSection>
	);
}

function WalletSettings({
	connection,
	provider,
	savedWallet,
}: {
	connection: VenueConnection | undefined;
	provider: ProviderConfig;
	savedWallet: string | null;
}) {
	const { address, chainId, isConnected } = useAccount();
	const updateWallet = useUpdateWallet();
	const connectedWalletSaved =
		Boolean(address) && address?.toLowerCase() === savedWallet?.toLowerCase();

	const handleSaveWallet = async () => {
		if (!address || !isConnected) {
			toast.error("Connect the wallet you want to save");
			return;
		}

		if (chainId !== provider.requiredChain.id) {
			toast.error(`Switch your wallet to ${provider.requiredChain.label}`);
			return;
		}

		try {
			await updateWallet.mutateAsync({
				chain: provider.requiredChain.apiId,
				chain_id: provider.requiredChain.id,
				provider: provider.apiId,
				wallet_address: address,
			});
			toast.success(
				savedWallet ? "Trading wallet replaced" : "Trading wallet saved",
			);
		} catch (error) {
			toast.error(getRequestErrorMessage(error, "Unable to save wallet"));
		}
	};

	return (
		<SettingsSection
			description={`Your wallet signs ${provider.label} orders. Uptions never stores your private key.`}
			icon={Wallet}
			title="Trading wallet"
		>
			<div className="grid gap-4">
				<div className="grid gap-3 border border-app-border bg-app-muted p-4 sm:grid-cols-2 xl:grid-cols-4">
					<StatusValue
						label="Connection"
						value={isConnected ? "Connected" : "Not connected"}
					/>
					<StatusValue
						label="Network"
						value={
							chainId === provider.requiredChain.id
								? provider.requiredChain.label
								: chainId
									? `Chain ${chainId}`
									: "Not available"
						}
					/>
					<StatusValue label="Saved wallet" value={shortAddress(savedWallet)} />
					<StatusValue
						label={`${provider.label} wallet`}
						value={shortAddress(connection?.account_identifier)}
					/>
				</div>
				{connection && connection.status !== "active" ? (
					<p className="border border-warning/40 bg-warning/10 p-4 text-sm leading-6 text-app-muted-fg">
						This provider connection needs attention. To restore a wallet
						mismatch, connect the {provider.label} wallet shown above and save
						it as your trading wallet. Other connection issues can be refreshed
						when you next authorize {provider.label} from a market.
					</p>
				) : null}
				<div className="flex flex-wrap items-center justify-between gap-3">
					<p className="text-xs text-app-muted-fg">
						{address
							? `Active wallet ${shortAddress(address)}`
							: `Connect the ${provider.requiredChain.label} wallet you want to use.`}
					</p>
					<WalletConnectButton syncWallet={false} />
				</div>
				<div className="flex flex-wrap items-center justify-between gap-3 border-t border-app-border pt-4">
					<p className="max-w-xl text-xs leading-5 text-app-muted-fg">
						Saving a different wallet requires a signature from that wallet.
						Uptions uses the signature only to verify ownership.
					</p>
					<Button
						disabled={
							!address ||
							!isConnected ||
							chainId !== provider.requiredChain.id ||
							connectedWalletSaved ||
							updateWallet.isPending
						}
						onClick={handleSaveWallet}
						type="button"
					>
						{updateWallet.isPending
							? "Waiting for signature..."
							: savedWallet
								? "Replace saved wallet"
								: "Save connected wallet"}
					</Button>
				</div>
			</div>
		</SettingsSection>
	);
}

function PasswordSettings({ enabled }: { enabled: boolean }) {
	const [confirmPassword, setConfirmPassword] = useState("");
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const updatePassword = useUpdatePassword();

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (newPassword !== confirmPassword) {
			toast.error("New passwords do not match");
			return;
		}

		try {
			await updatePassword.mutateAsync({
				current_password: currentPassword,
				new_password: newPassword,
			});
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
			toast.success("Password updated successfully");
		} catch (error) {
			toast.error(getRequestErrorMessage(error, "Unable to update password"));
		}
	};

	return (
		<SettingsSection
			description="Use a strong password that you do not reuse on other services."
			icon={ShieldCheck}
			title="Password"
		>
			{enabled ? (
				<form className="grid gap-4" onSubmit={handleSubmit}>
					<div className="grid gap-4 md:grid-cols-3">
						<SettingsInput
							autoComplete="current-password"
							label="Current password"
							onChange={setCurrentPassword}
							required
							type="password"
							value={currentPassword}
						/>
						<SettingsInput
							autoComplete="new-password"
							label="New password"
							minLength={8}
							onChange={setNewPassword}
							required
							type="password"
							value={newPassword}
						/>
						<SettingsInput
							autoComplete="new-password"
							label="Confirm password"
							minLength={8}
							onChange={setConfirmPassword}
							required
							type="password"
							value={confirmPassword}
						/>
					</div>
					<div className="flex justify-end">
						<Button disabled={updatePassword.isPending} type="submit">
							{updatePassword.isPending ? "Updating..." : "Update password"}
						</Button>
					</div>
				</form>
			) : (
				<p className="border border-app-border bg-app-muted p-4 text-sm text-app-muted-fg">
					Password management is available after an email is added to the
					account.
				</p>
			)}
		</SettingsSection>
	);
}

function SettingsSection({
	children,
	description,
	icon: Icon,
	title,
}: {
	children: ReactNode;
	description: string;
	icon: LucideIcon;
	title: string;
}) {
	return (
		<section className="border border-app-border bg-app-card">
			<div className="flex items-start gap-3 border-b border-app-border p-5 sm:p-6">
				<div className="grid size-10 shrink-0 place-items-center bg-app-muted text-primary">
					<Icon className="size-5" />
				</div>
				<div>
					<Typography className="text-app-fg" variant="h3">
						{title}
					</Typography>
					<Typography className="mt-1 text-app-muted-fg" variant="bodySm">
						{description}
					</Typography>
				</div>
			</div>
			<div className="p-5 sm:p-6">{children}</div>
		</section>
	);
}

function SettingsInput({
	autoComplete,
	label,
	maxLength,
	minLength,
	onChange,
	pattern,
	placeholder,
	required,
	type,
	value,
}: {
	autoComplete: string;
	label: string;
	maxLength?: number;
	minLength?: number;
	onChange: (value: string) => void;
	pattern?: string;
	placeholder?: string;
	required?: boolean;
	type: "email" | "password" | "text";
	value: string;
}) {
	return (
		<label className="grid gap-2">
			<span className="text-xs font-bold uppercase tracking-[0.1em] text-app-muted-fg">
				{label}
			</span>
			<input
				autoComplete={autoComplete}
				className="h-11 border border-app-border bg-app-muted px-3 text-sm text-app-fg outline-none focus:border-primary"
				maxLength={maxLength}
				minLength={minLength}
				onChange={(event) => onChange(event.target.value)}
				pattern={pattern}
				placeholder={placeholder}
				required={required}
				type={type}
				value={value}
			/>
		</label>
	);
}

function ProfileValue({ label, value }: { label: string; value: string }) {
	return (
		<div className="min-w-0 bg-app-muted p-4">
			<p className="text-xs font-bold uppercase tracking-[0.1em] text-app-muted-fg">
				{label}
			</p>
			<p className="mt-2 truncate text-sm font-semibold capitalize text-app-fg">
				{value}
			</p>
		</div>
	);
}

function StatusValue({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<p className="text-xs font-bold uppercase tracking-[0.1em] text-app-muted-fg">
				{label}
			</p>
			<p className="mt-2 truncate text-sm font-bold text-app-fg">{value}</p>
		</div>
	);
}

function parseSettingsSection(hash: string): SettingsSectionId {
	const value = hash.replace("#", "");
	return Object.values(settingsSection).includes(value as SettingsSectionId)
		? (value as SettingsSectionId)
		: settingsSection.profile;
}

function shortAddress(address: string | null | undefined) {
	if (!address) {
		return "Not available";
	}

	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
