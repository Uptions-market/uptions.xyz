import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { ApiError } from "@/components/errors/api.error.ts";
import type { ApiResponse } from "@/packages/types/api.types.ts";
import type {
	AutomationAlert,
	AutomationAssistantRequest,
	AutomationStatus,
	PublishAutomationRequest,
	TestRunAutomationRequest,
} from "@/packages/types/automation.types.ts";
import { getAuthToken } from "@/services/auth-token.service.ts";
import { automationService } from "@/services/automation.service.ts";
import { automationAlertStreamService } from "@/services/automation-alert-stream.service.ts";
import { mcpApprovalService } from "@/services/mcp-approval.service.ts";
import { getRequestErrorMessage } from "@/util/errors.ts";

export const automationsQueryKey = ["automations"] as const;
export const automationAlertsQueryKey = ["automation-alerts"] as const;
export const mcpApprovalsQueryKey = ["mcp-approvals"] as const;

export function useAutomations() {
	const query = useQuery({
		enabled: Boolean(getAuthToken()),
		queryFn: () => automationService.list(),
		queryKey: automationsQueryKey,
	});

	return {
		automations: query.data?.data ?? [],
		error: getRequestErrorMessage(query.error, "Unable to fetch automations"),
		isLoading: query.isLoading,
		refetch: query.refetch,
	};
}

export function useAutomationAssistant() {
	return useMutation({
		mutationFn: (payload: AutomationAssistantRequest) =>
			automationService.assistant(payload),
	});
}

export function useAutomationAlerts() {
	const query = useQuery({
		enabled: Boolean(getAuthToken()),
		queryFn: () => automationService.alerts(),
		queryKey: automationAlertsQueryKey,
	});

	return {
		alerts: query.data?.data ?? [],
		error: getRequestErrorMessage(query.error, "Unable to fetch alerts"),
		isLoading: query.isLoading,
		refetch: query.refetch,
	};
}

export function usePublishAutomation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			idempotencyKey,
			payload,
		}: {
			idempotencyKey: string;
			payload: PublishAutomationRequest;
		}) => automationService.publish(payload, idempotencyKey),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: automationsQueryKey });
		},
	});
}

export function useUpdateAutomation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			automationId,
			payload,
		}: {
			automationId: string;
			payload: PublishAutomationRequest;
		}) => automationService.update(automationId, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: automationsQueryKey });
		},
	});
}

export function useSetAutomationStatus() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			automationId,
			status,
		}: {
			automationId: string;
			status: AutomationStatus;
		}) => automationService.setStatus(automationId, { status }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: automationsQueryKey });
		},
	});
}

export function useDeleteAutomation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (automationId: string) =>
			automationService.delete(automationId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: automationsQueryKey });
			queryClient.invalidateQueries({ queryKey: automationAlertsQueryKey });
		},
	});
}

export function useTestRunAutomation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: TestRunAutomationRequest) =>
			automationService.testRun(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: automationsQueryKey });
			queryClient.invalidateQueries({ queryKey: automationAlertsQueryKey });
		},
	});
}

export function useClearAutomationAlerts() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => automationService.clearAlerts(),
		onSuccess: () => {
			queryClient.setQueryData<ApiResponse<AutomationAlert[]>>(
				automationAlertsQueryKey,
				(current) => ({
					data: [],
					message: current?.message ?? "Automation alerts fetched successfully",
					status_code: current?.status_code ?? 200,
				}),
			);
		},
	});
}

export function useMarkAutomationAlertRead() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (alertId: string) => automationService.markAlertRead(alertId),
		onSuccess: (response) => {
			queryClient.setQueryData<ApiResponse<AutomationAlert[]>>(
				automationAlertsQueryKey,
				(current) => updateAlertReadState(current, response.data),
			);
		},
	});
}

export function useMarkAllAutomationAlertsRead() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => automationService.markAlertsRead(),
		onSuccess: () => {
			queryClient.setQueryData<ApiResponse<AutomationAlert[]>>(
				automationAlertsQueryKey,
				markAllAlertsReadInCache,
			);
			queryClient.invalidateQueries({ queryKey: automationAlertsQueryKey });
		},
	});
}

export function useApproveMcpApproval() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (approvalId: string) => mcpApprovalService.approve(approvalId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: automationsQueryKey });
			queryClient.invalidateQueries({ queryKey: automationAlertsQueryKey });
			queryClient.invalidateQueries({ queryKey: mcpApprovalsQueryKey });
			toast.success("MCP request approved");
		},
		onError: (error) => {
			toast.error(
				getRequestErrorMessage(error, "Unable to approve MCP request"),
			);
		},
	});
}

export function useRejectMcpApproval() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (approvalId: string) => mcpApprovalService.reject(approvalId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: automationAlertsQueryKey });
			queryClient.invalidateQueries({ queryKey: mcpApprovalsQueryKey });
			toast.success("MCP request rejected");
		},
		onError: (error) => {
			toast.error(
				getRequestErrorMessage(error, "Unable to reject MCP request"),
			);
		},
	});
}

export function useAutomationAlertStream() {
	const queryClient = useQueryClient();
	const seenAlertIds = useRef(new Set<string>());

	useEffect(() => {
		if (!getAuthToken()) {
			return;
		}

		let active = true;
		let retryAttempt = 0;
		let timeoutId: number | undefined;
		let controller = new AbortController();

		const connect = async () => {
			controller = new AbortController();

			try {
				await automationAlertStreamService.connect({
					onAlert: (alert) => {
						if (seenAlertIds.current.has(alert.id)) {
							return;
						}

						seenAlertIds.current.add(alert.id);
						queryClient.setQueryData<ApiResponse<AutomationAlert[]>>(
							automationAlertsQueryKey,
							(current) => mergeAlert(current, alert),
						);
						queryClient.invalidateQueries({ queryKey: automationsQueryKey });
						showAlertToast(alert);
					},
					signal: controller.signal,
				});
				retryAttempt = 0;
			} catch (error) {
				if (!active || controller.signal.aborted) {
					return;
				}

				if (error instanceof ApiError && error.status === 401) {
					return;
				}
			}

			if (!active) {
				return;
			}

			const delay = Math.min(
				10_000,
				[1_000, 2_000, 5_000][retryAttempt] ?? 10_000,
			);
			retryAttempt += 1;
			timeoutId = window.setTimeout(connect, delay);
		};

		connect();

		return () => {
			active = false;
			controller.abort();

			if (timeoutId) {
				window.clearTimeout(timeoutId);
			}
		};
	}, [queryClient]);
}

function mergeAlert(
	current: ApiResponse<AutomationAlert[]> | undefined,
	alert: AutomationAlert,
): ApiResponse<AutomationAlert[]> {
	const currentAlerts = current?.data ?? [];
	const alerts = [
		alert,
		...currentAlerts.filter((item) => item.id !== alert.id),
	].slice(0, 20);

	return {
		data: alerts,
		message: current?.message ?? "Automation alerts fetched successfully",
		status_code: current?.status_code ?? 200,
	};
}

function updateAlertReadState(
	current: ApiResponse<AutomationAlert[]> | undefined,
	alert: AutomationAlert,
): ApiResponse<AutomationAlert[]> | undefined {
	if (!current) {
		return current;
	}

	return {
		...current,
		data: current.data.map((item) => (item.id === alert.id ? alert : item)),
	};
}

function markAllAlertsReadInCache(
	current: ApiResponse<AutomationAlert[]> | undefined,
): ApiResponse<AutomationAlert[]> | undefined {
	if (!current) {
		return current;
	}

	const readAt = new Date().toISOString();

	return {
		...current,
		data: current.data.map((alert) => ({
			...alert,
			read_at: alert.read_at ?? readAt,
		})),
	};
}

function showAlertToast(alert: AutomationAlert) {
	const description = alert.message;

	if (alert.status === "success") {
		toast.success(alert.title, { description });
		return;
	}

	if (alert.status === "error") {
		toast.error(alert.title, { description });
		return;
	}

	if (alert.status === "warning") {
		toast.warning(alert.title, { description });
		return;
	}

	toast.info(alert.title, { description });
}
