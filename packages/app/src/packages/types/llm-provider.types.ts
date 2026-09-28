export const llmProvider = {
	chatGpt: "CHAT_GPT",
	grok: "GROK",
} as const;

export type LlmProvider = (typeof llmProvider)[keyof typeof llmProvider];

export type LlmProviderConnection = {
	connected: boolean;
	key_hint: string | null;
	label: string;
	provider: LlmProvider;
	status: string | null;
};

export type ConnectLlmProviderRequest = {
	api_key: string;
};
