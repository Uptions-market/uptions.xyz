import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
	ConnectLlmProviderRequest,
	LlmProvider,
} from "@/packages/types/llm-provider.types.ts";
import { getAuthToken } from "@/services/auth-token.service.ts";
import { llmProviderService } from "@/services/llm-provider.service.ts";
import { getRequestErrorMessage } from "@/util/errors.ts";

export const llmProvidersQueryKey = ["llm-providers"] as const;

export function useLlmProviders() {
	const query = useQuery({
		enabled: Boolean(getAuthToken()),
		queryFn: () => llmProviderService.list(),
		queryKey: llmProvidersQueryKey,
	});

	return {
		error: getRequestErrorMessage(query.error, "Unable to fetch AI providers"),
		isLoading: query.isLoading,
		providers: query.data?.data ?? [],
	};
}

export function useConnectLlmProvider() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			payload,
			provider,
		}: {
			payload: ConnectLlmProviderRequest;
			provider: LlmProvider;
		}) => llmProviderService.connect(provider, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: llmProvidersQueryKey });
		},
	});
}

export function useDisconnectLlmProvider() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (provider: LlmProvider) =>
			llmProviderService.disconnect(provider),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: llmProvidersQueryKey });
		},
	});
}
