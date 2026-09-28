const API_VERSION = "/api/v1";

const route = (path: string) => `${API_VERSION}${path}`;

export const API_ROUTES = {
	analytics: {
		overview: route("/analytics/overview"),
	},
	llmProviders: {
		connection: (provider: string) =>
			route(`/llm-providers/${encodeURIComponent(provider)}/connection`),
		list: route("/llm-providers"),
	},
	automations: {
		assistant: route("/automations/assistant"),
		alert: (alertId: string) =>
			route(`/automation-alerts/${encodeURIComponent(alertId)}/read`),
		alerts: route("/automation-alerts"),
		alertsRead: route("/automation-alerts/read"),
		alertStream: route("/automation-alerts/stream"),
		item: (automationId: string) =>
			route(`/automations/${encodeURIComponent(automationId)}`),
		list: route("/automations"),
		publish: route("/automations"),
		status: (automationId: string) =>
			route(`/automations/${encodeURIComponent(automationId)}/status`),
		testRun: route("/automations/test-run"),
	},
	auth: {
		forgotPassword: route("/auth/forgot-password"),
		googleExchange: route("/auth/social/google/exchange"),
		googleStart: route("/auth/social/google/start"),
		login: route("/auth/login"),
		logout: route("/auth/logout"),
		logoutAll: route("/auth/logout-all"),
		me: route("/auth/me"),
		resetPassword: route("/auth/reset-password"),
		signup: route("/auth/signup"),
		socialProviders: route("/auth/social/providers"),
		verifyEmail: route("/auth/verify-email"),
	},
	mcp: {
		approval: (approvalId: string) =>
			route(`/mcp/approvals/${encodeURIComponent(approvalId)}`),
		approvals: route("/mcp/approvals"),
		approve: (approvalId: string) =>
			route(`/mcp/approvals/${encodeURIComponent(approvalId)}/approve`),
		reject: (approvalId: string) =>
			route(`/mcp/approvals/${encodeURIComponent(approvalId)}/reject`),
	},
	providers: {
		catalog: route("/providers"),
		dflowOrder: route("/providers/dflow/order"),
		dflowOrderStatus: route("/providers/dflow/order-status"),
		commentStream: (provider: string, marketId: string) =>
			route(
				`/providers/${encodeURIComponent(provider)}/markets/${encodeURIComponent(marketId)}/comments/stream`,
			),
		comments: (provider: string, marketId: string) =>
			route(
				`/providers/${encodeURIComponent(provider)}/markets/${encodeURIComponent(marketId)}/comments`,
			),
		favorite: (provider: string, marketId: string) =>
			route(
				`/providers/${encodeURIComponent(provider)}/markets/${encodeURIComponent(marketId)}/favorite`,
			),
		favorites: (provider: string) =>
			route(`/providers/${encodeURIComponent(provider)}/markets/favorites`),
		market: (provider: string, marketId: string) =>
			route(
				`/providers/${encodeURIComponent(provider)}/markets/${encodeURIComponent(marketId)}`,
			),
		markets: (provider: string) =>
			route(`/providers/${encodeURIComponent(provider)}/markets`),
		orderBook: (provider: string, marketId: string) =>
			route(
				`/providers/${encodeURIComponent(provider)}/markets/${encodeURIComponent(marketId)}/order-book`,
			),
		connection: (provider: string) =>
			route(`/providers/${encodeURIComponent(provider)}/connection`),
	},
	trades: {
		cancel: (tradeId: string) =>
			route(`/trades/${encodeURIComponent(tradeId)}/cancel`),
		item: (tradeId: string) => route(`/trades/${encodeURIComponent(tradeId)}`),
		list: route("/trades"),
		cancelMarket: route("/trades/cancel-market"),
		preflight: route("/trades/preflight"),
		reconcile: (tradeId: string) =>
			route(`/trades/${encodeURIComponent(tradeId)}/reconcile`),
		submit: (tradeId: string) =>
			route(`/trades/${encodeURIComponent(tradeId)}/submit`),
	},

	users: {
		onboarding: route("/users/onboarding"),
		settings: {
			email: route("/users/settings/email"),
			password: route("/users/settings/password"),
			username: route("/users/settings/username"),
		},
		tradingProvider: route("/users/trading-provider"),
		wallet: route("/users/wallet"),
		walletChallenge: route("/users/wallet/challenge"),
		waitlist: route("/users/waitlist"),
	},
} as const;
