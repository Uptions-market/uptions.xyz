import { useWallet } from "@solana/wallet-adapter-react";
import {
	type QueryClient,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import bs58 from "bs58";
import { useSignMessage } from "wagmi";
import { providerQueryRoot } from "@/hooks/use-markets.ts";
import type {
	AuthUser,
	ConnectPolymarketRequest,
	EmailAuthRequest,
	ForgotPasswordRequest,
	GoogleAuthExchangeRequest,
	ResetPasswordRequest,
	SignupRequest,
	UpdateEmailRequest,
	UpdatePasswordRequest,
	UpdateTradingProviderRequest,
	UpdateUsernameRequest,
	UpdateWalletRequest,
	VerifyEmailRequest,
} from "@/packages/types/auth.types.ts";
import { authService } from "@/services/auth.service.ts";
import { clearAuthToken, getAuthToken } from "@/services/auth-token.service.ts";
import { getRequestErrorMessage } from "@/util/errors.ts";

export const authQueryKey = ["auth", "me"] as const;
export const socialAuthProvidersQueryKey = [
	"auth",
	"social-providers",
] as const;

function cacheAuthUser(queryClient: QueryClient, user: AuthUser) {
	queryClient.setQueryData(authQueryKey, {
		data: user,
		message: "Current user fetched successfully",
		status_code: 200,
	});
}

export function useCurrentUser() {
	const query = useQuery({
		enabled: Boolean(getAuthToken()),
		queryFn: () => authService.currentUser(),
		queryKey: authQueryKey,
	});

	return {
		error: getRequestErrorMessage(query.error, "Authentication request failed"),
		isLoading: query.isLoading,
		refetch: query.refetch,
		user: query.data?.data ?? null,
	};
}

export function useAccountWarnings() {
	const query = useQuery({
		enabled: Boolean(getAuthToken()),
		queryFn: () => authService.currentUser(),
		queryKey: authQueryKey,
		refetchInterval: 15_000,
	});

	return query.data?.data.account_warnings ?? [];
}

export function useSocialAuthProviders() {
	const query = useQuery({
		queryFn: () => authService.socialProviders(),
		queryKey: socialAuthProvidersQueryKey,
		staleTime: 5 * 60_000,
	});

	return {
		error: getRequestErrorMessage(
			query.error,
			"Google authentication is unavailable",
		),
		googleAvailable: query.data?.data.google ?? false,
		isError: query.isError,
		isLoading: query.isLoading,
	};
}

export function useStartGoogleAuth() {
	return useMutation({
		mutationFn: () => authService.startGoogle(),
	});
}

export function useGoogleAuthExchange() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: GoogleAuthExchangeRequest) =>
			authService.exchangeGoogle(payload),
		onSuccess: (user) => cacheAuthUser(queryClient, user),
	});
}

export function useCompleteOnboarding() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => authService.completeOnboarding(),
		onSuccess: (response) => cacheAuthUser(queryClient, response.data),
	});
}

export function useEmailSignup() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: SignupRequest) => authService.signup(payload),
		onSuccess: (user) => {
			queryClient.setQueryData(authQueryKey, {
				data: user,
				message: "Current user fetched successfully",
				status_code: 200,
			});
		},
	});
}

export function useEmailLogin() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: EmailAuthRequest) => authService.login(payload),
		onSuccess: (user) => {
			queryClient.setQueryData(authQueryKey, {
				data: user,
				message: "Current user fetched successfully",
				status_code: 200,
			});
		},
	});
}

export function useVerifyEmail() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: VerifyEmailRequest) =>
			authService.verifyEmail(payload),
		onSuccess: (user) => {
			queryClient.setQueryData(authQueryKey, {
				data: user,
				message: "Current user fetched successfully",
				status_code: 200,
			});
		},
	});
}

export function useForgotPassword() {
	return useMutation({
		mutationFn: (payload: ForgotPasswordRequest) =>
			authService.forgotPassword(payload),
	});
}

export function useResetPassword() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: ResetPasswordRequest) =>
			authService.resetPassword(payload),
		onSuccess: (user) => {
			queryClient.setQueryData(authQueryKey, {
				data: user,
				message: "Current user fetched successfully",
				status_code: 200,
			});
		},
	});
}

export function useTradingProviders() {
	const query = useQuery({
		queryFn: () => authService.listTradingProviders(),
		queryKey: ["trading-providers"],
	});

	return {
		error: getRequestErrorMessage(query.error, "Unable to fetch providers"),
		isLoading: query.isLoading,
		providers: query.data?.data ?? [],
		refetch: query.refetch,
	};
}

export function useUpdateEmail() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: UpdateEmailRequest) =>
			authService.updateEmail(payload),
		onSuccess: (response) => {
			queryClient.setQueryData(authQueryKey, response);
		},
	});
}

export function useUpdateUsername() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: UpdateUsernameRequest) =>
			authService.updateUsername(payload),
		onSuccess: (response) => {
			queryClient.setQueryData(authQueryKey, response);
		},
	});
}

export function useUpdatePassword() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: UpdatePasswordRequest) =>
			authService.updatePassword(payload),
		onSuccess: () => {
			clearAuthToken();
			queryClient.clear();
			window.location.assign("/");
		},
	});
}

export function useUpdateTradingProvider() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: UpdateTradingProviderRequest) =>
			authService.updateTradingProvider(payload),
		onSuccess: () => {
			queryClient.removeQueries({ queryKey: providerQueryRoot });
			queryClient.invalidateQueries({ queryKey: authQueryKey });
		},
	});
}

export function useUpdateWallet() {
	const queryClient = useQueryClient();
	const { signMessageAsync } = useSignMessage();

	return useMutation({
		mutationFn: async (payload: UpdateWalletRequest) => {
			const challenge = await authService.createWalletChallenge({
				chain: payload.chain,
				chain_id: payload.chain_id,
				provider: payload.provider,
				wallet_address: payload.wallet_address,
			});
			const signature = await signMessageAsync({
				message: challenge.data.message,
			});

			return authService.updateWallet({
				...payload,
				nonce: challenge.data.nonce,
				signature,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: authQueryKey });
		},
	});
}

export function useUpdateSolanaWallet() {
	const queryClient = useQueryClient();
	const { publicKey, signMessage } = useWallet();

	return useMutation({
		mutationFn: async (payload: UpdateWalletRequest) => {
			if (!publicKey || !signMessage) {
				throw new Error(
					"Connect a Solana wallet that supports message signing.",
				);
			}

			const walletAddress = publicKey.toBase58();
			if (walletAddress !== payload.wallet_address) {
				throw new Error("Connected Solana wallet changed before signing.");
			}

			const challenge = await authService.createWalletChallenge({
				chain: payload.chain,
				chain_id: payload.chain_id,
				provider: payload.provider,
				wallet_address: walletAddress,
			});
			const signature = await signMessage(
				new TextEncoder().encode(challenge.data.message),
			);

			return authService.updateWallet({
				...payload,
				nonce: challenge.data.nonce,
				signature: bs58.encode(signature),
				wallet_address: walletAddress,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: authQueryKey });
		},
	});
}

export function useLogout() {
	const queryClient = useQueryClient();

	return () => {
		void authService.logout().finally(() => {
			clearAuthToken();
			queryClient.clear();
		});
	};
}

export function useConnectPolymarket() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: ConnectPolymarketRequest) =>
			authService.connectPolymarket(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: authQueryKey });
		},
	});
}
