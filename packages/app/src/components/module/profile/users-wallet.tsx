import Avatar from "boring-avatars";
import { Pencil, ShieldCheck, Wallet } from "lucide-react";
import { useMemo } from "react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { Button } from "@/components/ui/button.tsx";
import { providerAssets } from "@/components/wallet/provider-assets.ts";
import {
	erc20TradingAbi,
	POLYGON_USDC_E_DECIMALS,
	POLYMARKET_CONTRACTS,
} from "@/constant/polymarket-contracts.ts";
import { useCurrentUser } from "@/hooks/use-auth.ts";
import { useAutomations } from "@/hooks/use-automations.ts";
import { resolveSelectedProvider } from "@/packages/providers/provider-config.ts";
import { automationStatus } from "@/packages/types/automation.types.ts";
import { formatDate } from "@/util/formatters.ts";

export default function UserPortfolioOverview() {
	const { user } = useCurrentUser();
	const { automations, isLoading: automationsLoading } = useAutomations();
	const { address, isConnected } = useAccount();
	const providerConfig = resolveSelectedProvider(
		user?.preferred_trading_provider,
	);
	const { data: polBalance, isLoading: polBalanceLoading } = useBalance({
		address,
		chainId: providerConfig.requiredChain.id,
		query: { enabled: Boolean(address && isConnected) },
	});
	const { data: usdcBalance, isLoading: usdcBalanceLoading } = useReadContract({
		abi: erc20TradingAbi,
		address: POLYMARKET_CONTRACTS.usdcE,
		args: address ? [address] : undefined,
		chainId: providerConfig.requiredChain.id,
		functionName: "balanceOf",
		query: { enabled: Boolean(address && isConnected) },
	});
	const activeCount = automations.filter(
		(automation) => automation.status === automationStatus.active,
	).length;
	const pausedCount = automations.filter(
		(automation) => automation.status === automationStatus.paused,
	).length;
	const lastTriggered = useMemo(() => {
		const timestamps = automations
			.map((automation) => automation.last_run_at)
			.filter((value): value is string => Boolean(value))
			.sort(
				(left, right) => new Date(right).getTime() - new Date(left).getTime(),
			);

		return timestamps[0] ? formatDate(timestamps[0]) : null;
	}, [automations]);
	const accountName = user?.username ?? user?.email ?? "Uptions account";
	const savedWallet = user?.primary_wallet_address ?? user?.wallet_address;
	const provider = user?.preferred_trading_provider;

	return (
		<section className="overflow-hidden border border-app-border bg-app-card shadow-sm">
			<div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)] xl:gap-8">
				<div className="min-w-0">
					<div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
						<div className="flex min-w-0 items-center gap-4">
							<div className="size-16 shrink-0 overflow-hidden rounded-full border-2 border-primary/40 bg-app-muted p-1">
								<Avatar
									colors={[
										"#ff6633",
										"#8b5cf6",
										"#22c55e",
										"#3b82f6",
										"#f59e0b",
									]}
									name={accountName}
									size="100%"
									variant="beam"
								/>
							</div>
							<div className="min-w-0">
								<p className="truncate text-xl font-semibold text-app-fg">
									{user?.username ? `@${user.username}` : accountName}
								</p>
								<p className="mt-1 truncate text-sm text-app-muted-fg">
									{user?.email ?? "No email connected"}
								</p>
								<p className="mt-1 font-mono text-xs text-app-muted-fg">
									{shortAddress(savedWallet)}
								</p>
							</div>
						</div>
						<Button asChild className="self-start">
							<a href="/settings#profile">
								<Pencil className="size-3.5" />
								Edit
							</a>
						</Button>
					</div>

					<div className="mt-7 grid grid-cols-2 gap-px overflow-hidden border border-app-border bg-app-border sm:grid-cols-4">
						<AccountMetric
							label="Automations"
							value={
								automationsLoading ? "Loading" : String(automations.length)
							}
						/>
						<AccountMetric
							label="Active"
							value={automationsLoading ? "Loading" : String(activeCount)}
						/>
						<AccountMetric
							label="Paused"
							value={automationsLoading ? "Loading" : String(pausedCount)}
						/>
						<AccountMetric
							label="Last triggered"
							value={
								automationsLoading ? "Loading" : (lastTriggered ?? "Not yet")
							}
						/>
					</div>
				</div>

				<div className="grid gap-4 border border-app-border bg-app-muted p-5 sm:grid-cols-2 xl:grid-cols-1">
					<div className="flex items-start gap-3">
						<div className="grid size-10 shrink-0 place-items-center bg-app-card text-primary">
							<Wallet className="size-5" />
						</div>
						<div className="min-w-0">
							<p className="text-xs font-bold uppercase tracking-[0.1em] text-app-muted-fg">
								{providerConfig.requiredChain.label} wallet
							</p>
							<p className="mt-2 text-sm font-semibold text-app-fg">
								{formatUsdcBalance(usdcBalance, usdcBalanceLoading)}
							</p>
							<p className="mt-1 text-xs text-app-muted-fg">
								{formatPolBalance(polBalance, polBalanceLoading)}
							</p>
							<p
								className={
									isConnected
										? "mt-2 text-xs text-success"
										: "mt-2 text-xs text-app-muted-fg"
								}
							>
								{isConnected ? "Connected" : "Wallet not connected"}
							</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<div className="grid size-10 shrink-0 place-items-center bg-app-card text-primary">
							{provider ? (
								<img
									alt=""
									className="size-6 rounded-full object-cover"
									src={providerAssets[provider]}
								/>
							) : (
								<ShieldCheck className="size-5" />
							)}
						</div>
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.1em] text-app-muted-fg">
								Trading provider
							</p>
							<p className="mt-2 text-sm font-semibold capitalize text-app-fg">
								{provider ? providerConfig.label : "Not selected"}
							</p>
							<p className="mt-1 text-xs text-app-muted-fg">
								{providerConfig.requiredChain.label} network
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

function AccountMetric({ label, value }: { label: string; value: string }) {
	return (
		<div className="min-w-0 bg-app-muted p-4">
			<p className="text-[11px] font-bold uppercase tracking-[0.1em] text-app-muted-fg">
				{label}
			</p>
			<p className="mt-2 truncate text-sm font-semibold text-app-fg">{value}</p>
		</div>
	);
}

function formatUsdcBalance(balance: bigint | undefined, isLoading: boolean) {
	if (isLoading) {
		return "Loading USDC.e...";
	}

	if (balance === undefined) {
		return "USDC.e unavailable";
	}

	return `${Number(formatUnits(balance, POLYGON_USDC_E_DECIMALS)).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC.e trading`;
}

function formatPolBalance(
	balance: { decimals: number; value: bigint } | undefined,
	isLoading: boolean,
) {
	if (isLoading) {
		return "Loading POL...";
	}

	if (!balance) {
		return "POL gas unavailable";
	}

	return `${Number(formatUnits(balance.value, balance.decimals)).toLocaleString(undefined, { maximumFractionDigits: 5 })} POL gas`;
}

function shortAddress(address: string | null | undefined) {
	if (!address) {
		return "No wallet saved";
	}

	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
