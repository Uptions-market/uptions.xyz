import { API_ROUTES } from "@/constant/api-routes.ts";
import { defaultProvider } from "@/packages/providers/provider-config.ts";
import type { ApiResponse } from "@/packages/types/api.types.ts";
import type {
	AuthSessionResponse,
	AuthUser,
	ConnectPolymarketRequest,
	EmailAuthRequest,
	ForgotPasswordRequest,
	GoogleAuthExchangeRequest,
	GoogleAuthStartResponse,
	LogoutResponse,
	ResetPasswordRequest,
	SettingsUpdateResponse,
	SignupRequest,
	SocialAuthProviders,
	TradingProviderOption,
	UpdateEmailRequest,
	UpdatePasswordRequest,
	UpdateTradingProviderRequest,
	UpdateUsernameRequest,
	UserTradingProviderResponse,
	UserWalletResponse,
	VenueConnection,
	VerifiedWalletRequest,
	VerifyEmailRequest,
	WalletChallengeRequest,
	WalletChallengeResponse,
} from "@/packages/types/auth.types.ts";
import { uptionsRequest } from "@/services/api.service.ts";
import { setAuthToken } from "@/services/auth-token.service.ts";

export class AuthService {
	currentUser() {
		return uptionsRequest.GET<ApiResponse<AuthUser>>(API_ROUTES.auth.me);
	}

	async signup(payload: SignupRequest) {
		const response = await uptionsRequest.POST<
			ApiResponse<AuthUser>,
			SignupRequest
		>(API_ROUTES.auth.signup, payload);

		return response.data;
	}

	async login(payload: EmailAuthRequest) {
		const response = await uptionsRequest.POST<
			ApiResponse<AuthSessionResponse>,
			EmailAuthRequest
		>(API_ROUTES.auth.login, payload);

		setAuthToken(response.data.access_token);

		return response.data.user;
	}

	async exchangeGoogle(payload: GoogleAuthExchangeRequest) {
		const response = await uptionsRequest.POST<
			ApiResponse<AuthSessionResponse>,
			GoogleAuthExchangeRequest
		>(API_ROUTES.auth.googleExchange, payload);

		setAuthToken(response.data.access_token);

		return response.data.user;
	}

	async startGoogle() {
		const response = await uptionsRequest.POST<
			ApiResponse<GoogleAuthStartResponse>,
			undefined
		>(API_ROUTES.auth.googleStart, undefined);

		return response.data;
	}

	socialProviders() {
		return uptionsRequest.GET<ApiResponse<SocialAuthProviders>>(
			API_ROUTES.auth.socialProviders,
		);
	}

	logout() {
		return uptionsRequest.POST<ApiResponse<LogoutResponse>, undefined>(
			API_ROUTES.auth.logout,
			undefined,
		);
	}

	async verifyEmail(payload: VerifyEmailRequest) {
		const response = await uptionsRequest.POST<
			ApiResponse<AuthSessionResponse>,
			VerifyEmailRequest
		>(API_ROUTES.auth.verifyEmail, payload);

		setAuthToken(response.data.access_token);

		return response.data.user;
	}

	forgotPassword(payload: ForgotPasswordRequest) {
		return uptionsRequest.POST<ApiResponse<string>, ForgotPasswordRequest>(
			API_ROUTES.auth.forgotPassword,
			payload,
		);
	}

	async resetPassword(payload: ResetPasswordRequest) {
		const response = await uptionsRequest.POST<
			ApiResponse<AuthSessionResponse>,
			ResetPasswordRequest
		>(API_ROUTES.auth.resetPassword, payload);

		setAuthToken(response.data.access_token);

		return response.data.user;
	}

	listTradingProviders() {
		return uptionsRequest.GET<ApiResponse<TradingProviderOption[]>>(
			API_ROUTES.providers.catalog,
		);
	}

	completeOnboarding() {
		return uptionsRequest.PATCH<ApiResponse<AuthUser>, undefined>(
			API_ROUTES.users.onboarding,
			undefined,
		);
	}

	updateEmail(payload: UpdateEmailRequest) {
		return uptionsRequest.PATCH<ApiResponse<AuthUser>, UpdateEmailRequest>(
			API_ROUTES.users.settings.email,
			payload,
		);
	}

	updatePassword(payload: UpdatePasswordRequest) {
		return uptionsRequest.PATCH<
			ApiResponse<SettingsUpdateResponse>,
			UpdatePasswordRequest
		>(API_ROUTES.users.settings.password, payload);
	}

	updateUsername(payload: UpdateUsernameRequest) {
		return uptionsRequest.PATCH<ApiResponse<AuthUser>, UpdateUsernameRequest>(
			API_ROUTES.users.settings.username,
			payload,
		);
	}

	updateTradingProvider(payload: UpdateTradingProviderRequest) {
		return uptionsRequest.PATCH<
			ApiResponse<UserTradingProviderResponse>,
			UpdateTradingProviderRequest
		>(API_ROUTES.users.tradingProvider, payload);
	}

	createWalletChallenge(payload: WalletChallengeRequest) {
		return uptionsRequest.POST<
			ApiResponse<WalletChallengeResponse>,
			WalletChallengeRequest
		>(API_ROUTES.users.walletChallenge, payload);
	}

	updateWallet(payload: VerifiedWalletRequest) {
		return uptionsRequest.PATCH<
			ApiResponse<UserWalletResponse>,
			VerifiedWalletRequest
		>(API_ROUTES.users.wallet, payload);
	}

	connectPolymarket(payload: ConnectPolymarketRequest) {
		return uptionsRequest.POST<
			ApiResponse<VenueConnection>,
			ConnectPolymarketRequest
		>(API_ROUTES.providers.connection(defaultProvider.routeId), payload);
	}
}

export const authService = new AuthService();
