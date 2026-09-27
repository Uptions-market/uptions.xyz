import { ApiError } from "@/components/errors/api.error.ts";
import type {
	ApiServiceConfig,
	HttpMethod,
	RequestOptions,
} from "@/packages/types/api.types.ts";
import { clearAuthToken, getAuthToken } from "@/services/auth-token.service.ts";

export class ApiService {
	private readonly baseUrl: string;
	private readonly defaultHeaders: HeadersInit;
	private readonly getAccessToken?: ApiServiceConfig["getAccessToken"];
	private readonly timeoutMs: number;

	constructor(config: ApiServiceConfig = {}) {
		this.baseUrl = config.baseUrl ?? "";
		this.defaultHeaders = config.headers ?? {};
		this.getAccessToken = config.getAccessToken;
		this.timeoutMs = config.timeoutMs ?? 30_000;
	}

	GET<TResponse>(path: string, options?: RequestOptions) {
		return this.request<TResponse>(path, "GET", options);
	}

	POST<TResponse, TBody = unknown>(
		path: string,
		body?: TBody,
		options?: RequestOptions,
	) {
		return this.request<TResponse>(path, "POST", { ...options, body });
	}

	PUT<TResponse, TBody = unknown>(
		path: string,
		body?: TBody,
		options?: RequestOptions,
	) {
		return this.request<TResponse>(path, "PUT", { ...options, body });
	}

	PATCH<TResponse, TBody = unknown>(
		path: string,
		body?: TBody,
		options?: RequestOptions,
	) {
		return this.request<TResponse>(path, "PATCH", { ...options, body });
	}

	DELETE<TResponse>(path: string, options?: RequestOptions) {
		return this.request<TResponse>(path, "DELETE", options);
	}

	private async request<TResponse>(
		path: string,
		method: HttpMethod,
		options: RequestOptions = {},
	): Promise<TResponse> {
		const controller = new AbortController();
		const timeout = window.setTimeout(
			() => controller.abort(),
			options.timeoutMs ?? this.timeoutMs,
		);

		try {
			const response = await fetch(this.buildUrl(path, options.query), {
				...options,
				body: this.serializeBody(options.body),
				headers: await this.buildHeaders(options),
				method,
				signal: options.signal ?? controller.signal,
			});

			return await this.handleResponse<TResponse>(response);
		} finally {
			window.clearTimeout(timeout);
		}
	}

	private async buildHeaders(options: RequestOptions) {
		const headers = new Headers(this.defaultHeaders);
		const token = await this.getAccessToken?.();

		if (token) {
			headers.set("Authorization", `Bearer ${token}`);
		}

		if (options.body !== undefined && !(options.body instanceof FormData)) {
			headers.set("Content-Type", "application/json");
		}

		new Headers(options.headers).forEach((value, key) => {
			headers.set(key, value);
		});

		return headers;
	}

	private buildUrl(path: string, query?: RequestOptions["query"]) {
		const url = this.baseUrl
			? new URL(path, this.baseUrl)
			: new URL(path, window.location.origin);

		for (const [key, rawValue] of Object.entries(query ?? {})) {
			const values = Array.isArray(rawValue) ? rawValue : [rawValue];

			for (const value of values) {
				if (value !== null && value !== undefined) {
					url.searchParams.append(key, String(value));
				}
			}
		}

		return this.baseUrl ? url.toString() : `${url.pathname}${url.search}`;
	}

	private serializeBody(body: unknown) {
		if (body === undefined || body instanceof FormData) {
			return body as BodyInit | undefined;
		}

		return JSON.stringify(body);
	}

	private async handleResponse<TResponse>(
		response: Response,
	): Promise<TResponse> {
		const data = await this.parseResponse(response);

		if (!response.ok) {
			if (response.status === 401 && this.isSessionValidation(response)) {
				clearAuthToken();
			}

			throw new ApiError(
				this.getErrorMessage(data, response.statusText),
				response.status,
				data,
			);
		}

		return data as TResponse;
	}

	private isSessionValidation(response: Response) {
		try {
			return new URL(response.url).pathname === "/api/v1/auth/me";
		} catch {
			return false;
		}
	}

	private async parseResponse(response: Response) {
		if (response.status === 204) {
			return undefined;
		}

		const contentType = response.headers.get("Content-Type") ?? "";

		if (contentType.includes("application/json")) {
			return response.json();
		}

		return response.text();
	}

	private getErrorMessage(data: unknown, fallback: string) {
		if (
			data &&
			typeof data === "object" &&
			"message" in data &&
			typeof data.message === "string"
		) {
			return data.message;
		}

		return fallback || "Request failed";
	}
}

export const uptionsRequest = new ApiService({
	baseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
	getAccessToken: getAuthToken,
	headers: {},
});
