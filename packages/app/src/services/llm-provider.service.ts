import { API_ROUTES } from "@/constant/api-routes.ts";
import type { ApiResponse } from "@/packages/types/api.types.ts";
import type {
	ConnectLlmProviderRequest,
	LlmProvider,
	LlmProviderConnection,
} from "@/packages/types/llm-provider.types.ts";
import { uptionsRequest } from "@/services/api.service.ts";

class LlmProviderService {
	connect(provider: LlmProvider, payload: ConnectLlmProviderRequest) {
		return uptionsRequest.PUT<
			ApiResponse<LlmProviderConnection>,
			ConnectLlmProviderRequest
		>(API_ROUTES.llmProviders.connection(provider), payload, {
			timeoutMs: 30_000,
		});
	}

	disconnect(provider: LlmProvider) {
		return uptionsRequest.DELETE<ApiResponse<string>>(
			API_ROUTES.llmProviders.connection(provider),
		);
	}

	list() {
		return uptionsRequest.GET<ApiResponse<LlmProviderConnection[]>>(
			API_ROUTES.llmProviders.list,
		);
	}
}

export const llmProviderService = new LlmProviderService();
