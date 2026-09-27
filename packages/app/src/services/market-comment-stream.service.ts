import { ApiError } from "@/components/errors/api.error.ts";
import { API_ROUTES } from "@/constant/api-routes.ts";
import type { ProviderConfig } from "@/packages/providers/provider-config.ts";
import type { MarketCommentStreamEvent } from "@/packages/types/market-comment.types.ts";
import { getAuthToken } from "@/services/auth-token.service.ts";

type MarketCommentStreamOptions = {
	marketId: string;
	provider: ProviderConfig;
	onComment: (event: MarketCommentStreamEvent) => void;
	onConnected?: () => void;
	signal?: AbortSignal;
};

type SseMessage = {
	data: string;
	event: string;
};

class MarketCommentStreamService {
	async connect({
		marketId,
		provider,
		onComment,
		onConnected,
		signal,
	}: MarketCommentStreamOptions) {
		const token = getAuthToken();

		if (!token) {
			throw new ApiError("Sign in to receive comment updates", 401, null);
		}

		const response = await fetch(this.streamUrl(provider, marketId), {
			headers: {
				Accept: "text/event-stream",
				Authorization: `Bearer ${token}`,
			},
			signal,
		});

		if (!response.ok) {
			throw new ApiError(
				response.statusText || "Unable to connect comment updates",
				response.status,
				null,
			);
		}

		if (!response.body) {
			throw new Error("Comment stream is unavailable");
		}

		onConnected?.();
		await this.readStream(response.body, onComment, signal);
	}

	private handleMessage(
		raw: string,
		onComment: (event: MarketCommentStreamEvent) => void,
	) {
		const message = this.parseMessage(raw);

		if (!message || message.event !== "market_comment") {
			return;
		}

		try {
			const event = JSON.parse(message.data) as MarketCommentStreamEvent;

			if (
				event.event_type === "market_comment.created" &&
				typeof event.comment?.id === "string"
			) {
				onComment(event);
			}
		} catch {
			return;
		}
	}

	private parseMessage(raw: string): SseMessage | null {
		const lines = raw.split(/\r?\n/);
		let event = "message";
		const data: string[] = [];

		for (const line of lines) {
			if (!line || line.startsWith(":")) {
				continue;
			}

			if (line.startsWith("event:")) {
				event = line.slice(6).trim();
				continue;
			}

			if (line.startsWith("data:")) {
				data.push(line.slice(5).trimStart());
			}
		}

		if (data.length === 0) {
			return null;
		}

		return {
			data: data.join("\n"),
			event,
		};
	}

	private async readStream(
		body: ReadableStream<Uint8Array>,
		onComment: (event: MarketCommentStreamEvent) => void,
		signal?: AbortSignal,
	) {
		const reader = body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";

		try {
			while (!signal?.aborted) {
				const { done, value } = await reader.read();

				if (done) {
					break;
				}

				buffer += decoder.decode(value, { stream: true });
				const parts = buffer.split(/\r?\n\r?\n/);
				buffer = parts.pop() ?? "";

				for (const part of parts) {
					this.handleMessage(part, onComment);
				}
			}
		} finally {
			reader.releaseLock();
		}
	}

	private streamUrl(provider: ProviderConfig, marketId: string) {
		const path = API_ROUTES.providers.commentStream(provider.routeId, marketId);
		const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

		return baseUrl ? new URL(path, baseUrl).toString() : path;
	}
}

export const marketCommentStreamService = new MarketCommentStreamService();
