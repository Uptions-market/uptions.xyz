import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Wallet } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button.tsx";
import {
	useCurrentUser,
	useUpdateSolanaWallet,
	useUpdateWallet,
} from "@/hooks/use-auth.ts";
import { useSelectedProvider } from "@/hooks/use-provider-config.ts";
import { cn } from "@/lib/utils.ts";
import type { ProviderConfig } from "@/packages/providers/provider-config.ts";

export function WalletConnectButton({
	provider: providerOverride,
	syncWallet = true,
}: {
	provider?: ProviderConfig;
	syncWallet?: boolean;
}) {
	const { address, chainId, isConnected } = useAccount();
	const { user } = useCurrentUser();
	const { provider: selectedProvider } = useSelectedProvider();
	const provider = providerOverride ?? selectedProvider;
	const updateWallet = useUpdateWallet();
	const lastSyncKeyRef = useRef<string | undefined>(undefined);
	const supportsEvmWallet = provider.walletFamily === "evm";

	useEffect(() => {
		if (
			!syncWallet ||
			!supportsEvmWallet ||
			!isConnected ||
			!address ||
			chainId !== provider.requiredChain.id ||
			user?.preferred_trading_provider !== provider.apiId
		) {
			return;
		}

		const syncKey = `${user.id}:${address}:${chainId}`.toLowerCase();
		const currentWallet = user.primary_wallet_address?.toLowerCase();

		if (
			lastSyncKeyRef.current === syncKey ||
			currentWallet === address.toLowerCase()
		) {
			return;
		}

		lastSyncKeyRef.current = syncKey;
		updateWallet.mutate({
			chain: provider.requiredChain.apiId,
			chain_id: provider.requiredChain.id,
			provider: provider.apiId,
			wallet_address: address,
		});
	}, [
		address,
		chainId,
		isConnected,
		provider,
		supportsEvmWallet,
		syncWallet,
		updateWallet,
		user,
	]);

	if (!supportsEvmWallet) {
		return <SolanaWalletButton provider={provider} syncWallet={syncWallet} />;
	}

	return (
		<ConnectButton.Custom>
			{({
				account,
				chain,
				mounted,
				openAccountModal,
				openChainModal,
				openConnectModal,
			}) => {
				const ready = mounted;
				const connected = ready && account && chain;

				if (!connected) {
					return (
						<Button
							className="h-9 border border-app-border bg-app-card px-3 text-xs font-semibold text-app-fg hover:bg-app-muted"
							onClick={openConnectModal}
							type="button"
							variant="ghost"
						>
							<Wallet className="size-3.5 text-primary" />
							Connect wallet
						</Button>
					);
				}

				if (chain.unsupported || chain.id !== provider.requiredChain.id) {
					return (
						<Button
							className="h-9 border border-danger/40 bg-danger/10 px-3 text-xs font-semibold text-danger hover:bg-danger/15"
							onClick={openChainModal}
							type="button"
							variant="ghost"
						>
							Switch to {provider.requiredChain.label}
						</Button>
					);
				}

				return (
					<div className="flex items-center gap-2">
						<Button
							className="hidden h-9 border border-app-border bg-app-card px-3 text-xs font-semibold text-app-muted-fg hover:bg-app-muted sm:inline-flex"
							onClick={openChainModal}
							type="button"
							variant="ghost"
						>
							<span className="size-2 rounded-full bg-success" />
							{chain.name}
						</Button>
						<Button
							className={cn(
								"h-9 border border-app-border bg-app-card px-3 text-xs font-semibold text-app-fg hover:bg-app-muted",
							)}
							onClick={openAccountModal}
							type="button"
							variant="ghost"
						>
							<Wallet className="size-3.5 text-primary" />
							{account.displayName}
						</Button>
					</div>
				);
			}}
		</ConnectButton.Custom>
	);
}

function SolanaWalletButton({
	provider,
	syncWallet,
}: {
	provider: ProviderConfig;
	syncWallet: boolean;
}) {
	const { connected, connecting, publicKey, signMessage } = useWallet();
	const { setVisible } = useWalletModal();
	const { user } = useCurrentUser();
	const updateWallet = useUpdateSolanaWallet();
	const lastSyncKeyRef = useRef<string | undefined>(undefined);
	const walletAddress = publicKey?.toBase58();

	useEffect(() => {
		if (
			!syncWallet ||
			!connected ||
			!walletAddress ||
			!signMessage ||
			provider.walletFamily !== "solana" ||
			user?.preferred_trading_provider !== provider.apiId
		) {
			return;
		}

		const syncKey = `${user.id}:${walletAddress}:${provider.apiId}`;
		if (
			lastSyncKeyRef.current === syncKey ||
			user.primary_wallet_address === walletAddress
		) {
			return;
		}

		lastSyncKeyRef.current = syncKey;
		updateWallet.mutate(
			{
				chain: provider.requiredChain.apiId,
				chain_id: provider.requiredChain.id,
				provider: provider.apiId,
				wallet_address: walletAddress,
			},
			{
				onError: (error) => {
					lastSyncKeyRef.current = undefined;
					toast.error(
						error instanceof Error
							? error.message
							: "Unable to verify the Solana wallet.",
					);
				},
			},
		);
	}, [
		connected,
		provider,
		signMessage,
		syncWallet,
		updateWallet,
		user,
		walletAddress,
	]);

	if (!connected || !walletAddress) {
		return (
			<Button
				className="h-9 border border-app-border bg-app-card px-3 text-xs font-semibold text-app-fg hover:bg-app-muted"
				disabled={connecting}
				onClick={() => setVisible(true)}
				type="button"
				variant="ghost"
			>
				<Wallet className="size-3.5 text-primary" />
				{connecting ? "Connecting" : "Connect Solana wallet"}
			</Button>
		);
	}

	return (
		<Button
			className="h-9 border border-app-border bg-app-card px-3 text-xs font-semibold text-app-fg hover:bg-app-muted"
			disabled={updateWallet.isPending}
			onClick={() => setVisible(true)}
			type="button"
			variant="ghost"
		>
			<span className="size-2 rounded-full bg-success" />
			{updateWallet.isPending
				? "Verifying"
				: `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`}
		</Button>
	);
}
