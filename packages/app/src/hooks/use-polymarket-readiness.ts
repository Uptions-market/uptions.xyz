import { useEffect, useMemo, useState } from "react";
import { type Address, formatUnits, maxUint256, zeroAddress } from "viem";
import {
	useBytecode,
	useReadContract,
	useWaitForTransactionReceipt,
	useWriteContract,
} from "wagmi";
import { isTestnetTrading } from "@/config/trading-environment.ts";
import {
	erc20TradingAbi,
	erc1155TradingAbi,
	getPolymarketExchange,
	POLYGON_CHAIN_ID,
	POLYGON_USDC_E_DECIMALS,
	POLYMARKET_CONTRACTS,
} from "@/constant/polymarket-contracts.ts";
import { type TradeSide, tradeSide } from "@/packages/types/trade.types.ts";

type ApprovalKind = "mint" | "outcome" | "usdc";

type PolymarketReadinessInput = {
	address?: Address;
	chainId?: number;
	isConnected: boolean;
	negativeRisk: boolean;
	requiredCollateral: number;
	requiredShares: number;
	side: TradeSide;
	tokenId: string;
};

export function usePolymarketReadiness({
	address,
	chainId,
	isConnected,
	negativeRisk,
	requiredCollateral,
	requiredShares,
	side,
	tokenId,
}: PolymarketReadinessInput) {
	const enabled = Boolean(
		address && isConnected && chainId === POLYGON_CHAIN_ID,
	);
	const exchange = getPolymarketExchange(negativeRisk);
	const outcomeTokenId = toTokenId(tokenId);
	const owner = address ?? zeroAddress;
	const requiredCollateralUnits = toUnits(requiredCollateral);
	const requiredShareUnits = toUnits(requiredShares);
	const [approvalKind, setApprovalKind] = useState<ApprovalKind | null>(null);
	const [approvalHash, setApprovalHash] = useState<Address>();
	const bytecode = useBytecode({
		address: owner,
		chainId: POLYGON_CHAIN_ID,
		query: { enabled },
	});
	const usdcBalance = useReadContract({
		abi: erc20TradingAbi,
		address: POLYMARKET_CONTRACTS.usdcE,
		args: [owner],
		chainId: POLYGON_CHAIN_ID,
		functionName: "balanceOf",
		query: { enabled },
	});
	const usdcAllowance = useReadContract({
		abi: erc20TradingAbi,
		address: POLYMARKET_CONTRACTS.usdcE,
		args: [owner, exchange],
		chainId: POLYGON_CHAIN_ID,
		functionName: "allowance",
		query: { enabled: enabled && side === tradeSide.buy },
	});
	const outcomeBalance = useReadContract({
		abi: erc1155TradingAbi,
		address: POLYMARKET_CONTRACTS.conditionalTokens,
		args: [owner, outcomeTokenId],
		chainId: POLYGON_CHAIN_ID,
		functionName: "balanceOf",
		query: { enabled: enabled && Boolean(tokenId) },
	});
	const outcomeApproval = useReadContract({
		abi: erc1155TradingAbi,
		address: POLYMARKET_CONTRACTS.conditionalTokens,
		args: [owner, exchange],
		chainId: POLYGON_CHAIN_ID,
		functionName: "isApprovedForAll",
		query: { enabled: enabled && side === tradeSide.sell },
	});
	const writeApproval = useWriteContract();
	const approvalReceipt = useWaitForTransactionReceipt({
		chainId: POLYGON_CHAIN_ID,
		hash: approvalHash,
		query: { enabled: Boolean(approvalHash) },
	});

	useEffect(() => {
		if (!approvalReceipt.isSuccess || !approvalKind) {
			return;
		}

		if (approvalKind === "mint") {
			usdcBalance.refetch();
		} else if (approvalKind === "usdc") {
			usdcAllowance.refetch();
		} else {
			outcomeApproval.refetch();
		}
	}, [
		approvalKind,
		approvalReceipt.isSuccess,
		outcomeApproval.refetch,
		usdcAllowance.refetch,
		usdcBalance.refetch,
	]);

	const isEoa =
		enabled &&
		!bytecode.isLoading &&
		(!bytecode.data || bytecode.data === "0x");
	const isChecking =
		enabled &&
		(bytecode.isLoading ||
			usdcBalance.isLoading ||
			outcomeBalance.isLoading ||
			(side === tradeSide.buy
				? usdcAllowance.isLoading
				: outcomeApproval.isLoading));
	const collateralBalance = usdcBalance.data ?? 0n;
	const sharesBalance = outcomeBalance.data ?? 0n;
	const hasCollateral = collateralBalance >= requiredCollateralUnits;
	const hasShares = sharesBalance >= requiredShareUnits;
	const hasAllowance = (usdcAllowance.data ?? 0n) >= requiredCollateralUnits;
	const hasOutcomeApproval = outcomeApproval.data ?? false;
	const readiness = useMemo(() => {
		if (!isConnected || !address) {
			return { ready: false, reason: "Connect an EOA wallet to trade." };
		}
		if (chainId !== POLYGON_CHAIN_ID) {
			return {
				ready: false,
				reason: `Switch to ${isTestnetTrading ? "Polygon Amoy" : "Polygon"} to trade.`,
			};
		}
		if (bytecode.isError) {
			return {
				ready: false,
				reason: "Unable to verify this wallet is an EOA.",
			};
		}
		if (isChecking) {
			return { ready: false, reason: "Checking wallet readiness..." };
		}
		if (
			usdcBalance.isError ||
			outcomeBalance.isError ||
			(side === tradeSide.buy ? usdcAllowance.isError : outcomeApproval.isError)
		) {
			return {
				ready: false,
				reason: "Unable to verify Polygon balances and approvals. Try again.",
			};
		}
		if (!isEoa) {
			return {
				ready: false,
				reason:
					"Smart contract wallets are not supported in private beta. Connect an EOA.",
			};
		}
		if (requiredCollateralUnits === 0n && requiredShareUnits === 0n) {
			return { ready: false, reason: "Enter an amount to check readiness." };
		}
		if (approvalReceipt.isError) {
			return {
				ready: false,
				reason: "Approval failed or was reverted. Retry the approval.",
			};
		}
		if (side === tradeSide.buy) {
			if (!hasCollateral) {
				return {
					ready: false,
					reason: "Add USDC.e to this EOA before buying.",
				};
			}
			if (!hasAllowance) {
				return { ready: false, reason: "Approve USDC.e for this exchange." };
			}
			return { ready: true, reason: "EOA and USDC.e are ready." };
		}
		if (!hasShares) {
			return {
				ready: false,
				reason: "Not enough selected outcome shares to sell.",
			};
		}
		if (!hasOutcomeApproval) {
			return {
				ready: false,
				reason: "Approve outcome shares for this exchange.",
			};
		}
		return { ready: true, reason: "EOA and outcome shares are ready." };
	}, [
		address,
		approvalReceipt.isError,
		bytecode.isError,
		chainId,
		hasAllowance,
		hasCollateral,
		hasOutcomeApproval,
		hasShares,
		isChecking,
		isConnected,
		isEoa,
		outcomeApproval.isError,
		outcomeBalance.isError,
		requiredCollateralUnits,
		requiredShareUnits,
		side,
		usdcAllowance.isError,
		usdcBalance.isError,
	]);

	const approveUsdc = async () => {
		setApprovalKind("usdc");
		const hash = await writeApproval.writeContractAsync({
			abi: erc20TradingAbi,
			address: POLYMARKET_CONTRACTS.usdcE,
			args: [exchange, maxUint256],
			chainId: POLYGON_CHAIN_ID,
			functionName: "approve",
		});
		setApprovalHash(hash);
		return hash;
	};

	const mintTestCollateral = async () => {
		if (!isTestnetTrading) {
			throw new Error("Test collateral can only be minted on Polygon Amoy.");
		}

		setApprovalKind("mint");
		const hash = await writeApproval.writeContractAsync({
			abi: erc20TradingAbi,
			address: POLYMARKET_CONTRACTS.usdcE,
			args: [owner, 10n * 10n ** BigInt(POLYGON_USDC_E_DECIMALS)],
			chainId: POLYGON_CHAIN_ID,
			functionName: "mint",
		});
		setApprovalHash(hash);
		return hash;
	};

	const approveOutcome = async () => {
		setApprovalKind("outcome");
		const hash = await writeApproval.writeContractAsync({
			abi: erc1155TradingAbi,
			address: POLYMARKET_CONTRACTS.conditionalTokens,
			args: [exchange, true],
			chainId: POLYGON_CHAIN_ID,
			functionName: "setApprovalForAll",
		});
		setApprovalHash(hash);
		return hash;
	};

	return {
		approvalKind,
		approvalPending: writeApproval.isPending || approvalReceipt.isLoading,
		approvalSuccess: approvalReceipt.isSuccess,
		approveOutcome,
		approveUsdc,
		collateralBalance,
		collateralBalanceFormatted: formatUnits(
			collateralBalance,
			POLYGON_USDC_E_DECIMALS,
		),
		exchange,
		hasAllowance,
		hasCollateral,
		hasOutcomeApproval,
		hasShares,
		isChecking,
		isEoa,
		mintTestCollateral,
		outcomeBalance: sharesBalance,
		outcomeBalanceFormatted: formatUnits(
			sharesBalance,
			POLYGON_USDC_E_DECIMALS,
		),
		readiness,
		writeError: writeApproval.error ?? approvalReceipt.error,
	};
}

function toTokenId(tokenId: string) {
	try {
		return BigInt(tokenId || "0");
	} catch {
		return 0n;
	}
}

function toUnits(value: number) {
	if (!Number.isFinite(value) || value <= 0) {
		return 0n;
	}

	return BigInt(Math.ceil(value * 10 ** POLYGON_USDC_E_DECIMALS - 1e-7));
}
