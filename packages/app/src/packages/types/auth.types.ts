import {
	type ProviderApiId,
	providerApiIds,
	type SupportedChain,
	supportedChains,
} from "@/packages/providers/provider-config.ts";
import type { VenueId } from "@/packages/venues/venue-data.ts";

export type EmailAuthRequest = {
	email: string;
	password: string;
};

export type SignupRequest = EmailAuthRequest & {
	username: string;
};

export type ForgotPasswordRequest = {
	email: string;
};

export type ResetPasswordRequest = {
	token: string;
	password: string;
};

export type UpdateEmailRequest = {
	current_password?: string;
	email: string;
};

export type UpdateUsernameRequest = {
	username: string;
};

export type UpdatePasswordRequest = {
	current_password: string;
	new_password: string;
};

export type SettingsUpdateResponse = {
	message: string;
};

export type LogoutResponse = {
	revoked_sessions: number;
};

export type VerifyEmailRequest = {
	token: string;
};

export type SocialAuthProviders = {
	google: boolean;
};

export type GoogleAuthStartResponse = {
	authorization_url: string;
};

export type GoogleAuthExchangeRequest = {
	code: string;
	state: string;
};

export const tradingProvider = providerApiIds;
export const supportedChain = supportedChains;
export type TradingProvider = ProviderApiId;
export type { SupportedChain };

export type TradingProviderOption = {
	available: boolean;
	capabilities: string[];
	chain: SupportedChain;
	chain_id: number;
	chain_label: string;
	description: string;
	id: string;
	image_key: string;
	label: string;
	provider: TradingProvider;
};

export type UpdateTradingProviderRequest = {
	provider: TradingProvider;
};

export type UserTradingProviderResponse = {
	preferred_trading_provider: TradingProvider;
};

export type UpdateWalletRequest = {
	chain: SupportedChain;
	chain_id: number;
	provider: TradingProvider;
	wallet_address: string;
};

export type WalletChallengeRequest = {
	chain: SupportedChain;
	chain_id: number;
	provider: TradingProvider;
	wallet_address: string;
};

export type WalletChallengeResponse = WalletChallengeRequest & {
	expires_at: number;
	message: string;
	nonce: string;
	purpose: "associate_wallet";
};

export type VerifiedWalletRequest = UpdateWalletRequest & {
	nonce: string;
	signature: string;
};

export type UserWalletResponse = UpdateWalletRequest;

export type AccountWarning = {
	action_href: string;
	action_label: string;
	code: string;
	message: string;
	severity: string;
	title: string;
};

export type VenueConnection = {
	id: string;
	provider: TradingProvider;
	venue: VenueId;
	auth_type: string;
	account_identifier: string;
	enabled: boolean;
	limits: Record<string, unknown>;
	permissions: Record<string, unknown>;
	status: string;
};

export type AuthUser = {
	account_warnings?: AccountWarning[];
	id: string;
	onboarding_completed: boolean;
	primary_wallet_address: string | null;
	wallet_address: string | null;
	email: string | null;
	username: string | null;
	email_verified: boolean;
	password_configured: boolean;
	preferred_trading_provider: TradingProvider;
	venue_connections: VenueConnection[];
};

export type AuthSessionResponse = {
	access_token: string;
	token_type: "Bearer";
	expires_at: number;
	user: AuthUser;
};

export type ConnectPolymarketRequest = {
	account_identifier?: string;
	api_key: string;
	secret: string;
	passphrase: string;
	funder?: string;
	signature_type?: number;
	limits?: Record<string, unknown>;
	permissions?: Record<string, unknown>;
};
