import "@rainbow-me/rainbowkit/styles.css";
import "@solana/wallet-adapter-react-ui/styles.css";

import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import {
	ConnectionProvider,
	WalletProvider as SolanaAdapterProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { polygon, polygonAmoy } from "viem/chains";
import { WagmiProvider } from "wagmi";
import { isTestnetTrading } from "@/config/trading-environment.ts";

const walletConnectProjectId =
	import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "uptions-local";
const polygonAmoyRpcUrl =
	import.meta.env.VITE_POLYGON_AMOY_RPC_URL ??
	"https://polygon-amoy-bor-rpc.publicnode.com";
const configuredPolygonAmoy = {
	...polygonAmoy,
	rpcUrls: {
		...polygonAmoy.rpcUrls,
		default: { http: [polygonAmoyRpcUrl] },
	},
} as const;

export const walletConfig = getDefaultConfig({
	appName: "Uptions",
	chains: [isTestnetTrading ? configuredPolygonAmoy : polygon],
	projectId: walletConnectProjectId,
	ssr: true,
});

export function WalletProvider({ children }: { children: ReactNode }) {
	const solanaEndpoint =
		import.meta.env.VITE_SOLANA_RPC_URL ??
		clusterApiUrl(isTestnetTrading ? "devnet" : "mainnet-beta");
	const solanaWallets = useMemo(() => [new PhantomWalletAdapter()], []);

	return (
		<WagmiProvider config={walletConfig}>
			<RainbowKitProvider appInfo={{ appName: "Uptions" }} coolMode>
				<ConnectionProvider endpoint={solanaEndpoint}>
					<SolanaAdapterProvider autoConnect wallets={solanaWallets}>
						<WalletModalProvider>{children}</WalletModalProvider>
					</SolanaAdapterProvider>
				</ConnectionProvider>
			</RainbowKitProvider>
		</WagmiProvider>
	);
}
