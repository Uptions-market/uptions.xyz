import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { VersionedTransaction } from "@solana/web3.js";
import { Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Typography } from "@/components/typography/typography.tsx";
import { Button } from "@/components/ui/button.tsx";
import type { MarketOutcome } from "@/packages/types/market.types.ts";
import { dflowTradingService } from "@/services/dflow-trading.service.ts";
import { getRequestErrorMessage } from "@/util/errors.ts";

type DflowTradeTicketProps = {
	marketId: string;
	marketResolved: boolean;
	marketTitle: string;
	onSelectedTokenIdChange: (tokenId: string) => void;
	outcomes: readonly MarketOutcome[];
	selectedTokenId: string;
};

const USDC_DECIMALS = 6;

export function DflowTradeTicket({
	marketId,
	marketResolved,
	marketTitle,
	onSelectedTokenIdChange,
	outcomes,
	selectedTokenId,
}: DflowTradeTicketProps) {
	const [amount, setAmount] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { connection } = useConnection();
	const { connected, publicKey, sendTransaction } = useWallet();
	const { setVisible } = useWalletModal();
	const selectedOutcome = useMemo(
		() =>
			outcomes.find((outcome) => outcome.tokenId === selectedTokenId) ??
			outcomes[0],
		[outcomes, selectedTokenId],
	);
	const numericAmount = Number(amount);
	const estimatedShares =
		selectedOutcome?.price && numericAmount > 0
			? numericAmount / selectedOutcome.price
			: 0;

	const submit = async () => {
		if (!connected || !publicKey) {
			setVisible(true);
			return;
		}
		if (
			!selectedOutcome ||
			!Number.isFinite(numericAmount) ||
			numericAmount <= 0
		) {
			toast.error("Enter a valid USDC amount and select an outcome.");
			return;
		}

		setIsSubmitting(true);
		try {
			const response = await dflowTradingService.createOrder({
				amount: Math.round(numericAmount * 10 ** USDC_DECIMALS),
				marketId,
				outcomeMint: selectedOutcome.tokenId,
				predictionMarketSlippageBps: 100,
				userPublicKey: publicKey.toBase58(),
			});
			const order = response.data.upstream;
			if (!order.transaction) {
				throw new Error("DFlow did not return a transaction for this wallet.");
			}
			if (order.transactionVersion !== "v0") {
				throw new Error("Unsupported DFlow transaction version.");
			}
			const bytes = Uint8Array.from(atob(order.transaction), (character) =>
				character.charCodeAt(0),
			);
			const transaction = VersionedTransaction.deserialize(bytes);
			const signature = await sendTransaction(transaction, connection, {
				skipPreflight: false,
			});
			await connection.confirmTransaction(signature, "confirmed");
			const status = await dflowTradingService.waitForTerminalStatus(
				signature,
				order.lastValidBlockHeight,
			);
			setAmount("");
			if (!status) {
				toast.info(
					`DFlow order submitted (${shortSignature(signature)}). It is still processing on Solana.`,
				);
			} else if (status.status === "closed") {
				toast.success("DFlow order filled on Solana.");
			} else {
				toast.error(`DFlow order ${status.status}.`);
			}
		} catch (error) {
			toast.error(
				getRequestErrorMessage(error, "Unable to submit DFlow order"),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<aside className="border border-app-border bg-app-card p-5">
			<Typography className="text-app-muted-fg" variant="bodySm">
				{marketTitle}
			</Typography>
			<Typography className="mt-1 text-app-fg" variant="h3">
				Buy outcome tokens on Solana
			</Typography>
			<div className="mt-5 grid grid-cols-2 gap-3">
				{outcomes.map((outcome) => (
					<Button
						className={
							outcome.tokenId === selectedOutcome?.tokenId
								? "bg-success text-white hover:bg-success/90"
								: "border border-app-border bg-app-muted text-app-muted-fg"
						}
						key={outcome.tokenId}
						onClick={() => onSelectedTokenIdChange(outcome.tokenId)}
						type="button"
					>
						{outcome.label} {formatPrice(outcome.price)}
					</Button>
				))}
			</div>
			<label
				className="mt-5 block text-sm font-bold text-app-fg"
				htmlFor="dflow-amount"
			>
				Amount (USDC)
			</label>
			<input
				className="mt-2 h-14 w-full border border-app-border bg-app-muted px-4 text-right text-xl font-bold text-app-fg outline-none focus:border-primary"
				id="dflow-amount"
				inputMode="decimal"
				onChange={(event) => setAmount(event.target.value)}
				placeholder="$0"
				value={amount}
			/>
			<div className="my-5 flex items-center justify-between border-y border-app-border py-4 text-sm font-semibold">
				<span className="text-app-muted-fg">Estimated outcome tokens</span>
				<span className="text-app-fg">
					{estimatedShares ? estimatedShares.toFixed(2) : "—"}
				</span>
			</div>
			<Button
				className="h-14 w-full bg-primary text-base font-bold text-primary-foreground hover:bg-primary/90"
				disabled={marketResolved || isSubmitting}
				onClick={submit}
				type="button"
			>
				{!connected ? <Wallet className="size-4" /> : null}
				{marketResolved
					? "Market resolved"
					: isSubmitting
						? "Preparing Solana transaction..."
						: connected
							? `Buy ${selectedOutcome?.label ?? "outcome"}`
							: "Connect Solana wallet"}
			</Button>
			<p className="mt-3 text-center text-xs font-medium text-app-muted-fg">
				DFlow prepares the transaction; your wallet signs and submits it on
				Solana.
			</p>
		</aside>
	);
}

function formatPrice(price: number | null) {
	return price === null ? "" : `${Math.round(price * 100)}¢`;
}

function shortSignature(signature: string) {
	return `${signature.slice(0, 6)}…${signature.slice(-6)}`;
}
