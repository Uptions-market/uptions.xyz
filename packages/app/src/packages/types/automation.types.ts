import type {
	ProviderApiId,
	SupportedChain,
} from "@/packages/providers/provider-config.ts";

export const automationStepKind = {
	action: "ACTION",
	condition: "CONDITION",
	trigger: "TRIGGER",
} as const;

export const workflowActionType = {
	buy: "BUY",
	conditionOutcomePriceAbove: "CONDITION_OUTCOME_PRICE_ABOVE",
	conditionOutcomePriceBelow: "CONDITION_OUTCOME_PRICE_BELOW",
	conditionVolumeAbove: "CONDITION_VOLUME_ABOVE",
	sell: "SELL",
	sendMessage: "SEND_MESSAGE",
	triggerPriceMoves: "TRIGGER_PRICE_MOVES",
	triggerTimeCheck: "TRIGGER_TIME_CHECK",
	triggerVolumeMoves: "TRIGGER_VOLUME_MOVES",
} as const;

export const workflowOutcome = {
	no: "NO",
	yes: "YES",
} as const;

export const workflowOperator = {
	above: "ABOVE",
	below: "BELOW",
	changes: "CHANGES",
	equals: "EQUALS",
} as const;

export const workflowOrderType = {
	limit: "LIMIT",
	market: "MARKET",
} as const;

export const workflowMessageChannel = {
	inApp: "IN_APP",
} as const;

export const automationStatus = {
	active: "active",
	paused: "paused",
} as const;

export type AutomationProvider = ProviderApiId;

export type AutomationStepKind =
	(typeof automationStepKind)[keyof typeof automationStepKind];

export type WorkflowActionType =
	(typeof workflowActionType)[keyof typeof workflowActionType];

export type WorkflowOutcome =
	(typeof workflowOutcome)[keyof typeof workflowOutcome];

export type WorkflowOperator =
	(typeof workflowOperator)[keyof typeof workflowOperator];

export type WorkflowOrderType =
	(typeof workflowOrderType)[keyof typeof workflowOrderType];

export type WorkflowMessageChannel =
	(typeof workflowMessageChannel)[keyof typeof workflowMessageChannel];

export type AutomationStatus =
	(typeof automationStatus)[keyof typeof automationStatus];

export type WorkflowParamValue = boolean | null | number | string;

export type WorkflowStepParams = Record<string, WorkflowParamValue>;

export type AutomationMarketPayload = {
	id: string;
	title: string;
};

export type WorkflowConnectionPayload = {
	from: string;
	to: string;
};

export type WorkflowStepPayload = {
	action: WorkflowActionType;
	id: string;
	kind: AutomationStepKind;
	params: WorkflowStepParams;
};

export type WorkflowPayload = {
	connections: WorkflowConnectionPayload[];
	steps: WorkflowStepPayload[];
	version: 1;
};

export type PublishAutomationRequest = {
	market: AutomationMarketPayload;
	provider: AutomationProvider;
	title: string;
	workflow: WorkflowPayload;
};

export type TestRunAutomationRequest = PublishAutomationRequest & {
	automation_id?: string;
};

export type UpdateAutomationStatusRequest = {
	status: AutomationStatus;
};

export type Automation = {
	created_at: string;
	id: string;
	last_run_at: string | null;
	last_run_status: string | null;
	market_id: string | null;
	market_title: string | null;
	provider: AutomationProvider;
	chain: SupportedChain;
	chain_id: number;
	status: AutomationStatus | string;
	title: string;
	updated_at: string;
	venue: string;
	workflow: WorkflowPayload;
};

export type AutomationAlert = {
	automation_id: string | null;
	created_at: string;
	id: string;
	message: string;
	meta: Record<string, unknown>;
	read_at: string | null;
	status: string;
	title: string;
};

export type MarkAlertsReadResponse = {
	updated: number;
};

export type ClearAlertsResponse = {
	deleted: number;
};

export type McpApproval = {
	created_at: string;
	decided_at: string | null;
	expires_at: string;
	id: string;
	payload: Record<string, unknown>;
	result: Record<string, unknown> | null;
	status: string;
	tool: string;
	updated_at: string;
};

export type McpApprovalDecisionResponse = {
	approval: McpApproval;
	result: Record<string, unknown> | null;
};

export type TestRunAutomationResponse = {
	alert: AutomationAlert;
	checked_blocks: number;
	message: string;
	status: string;
};
