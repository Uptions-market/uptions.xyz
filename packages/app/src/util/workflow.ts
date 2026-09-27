import type { Edge, Node } from "@xyflow/react";
import {
	formatWorkflowBlockValue,
	initialWorkflowEdges,
	initialWorkflowNodes,
	type WorkflowBlock,
	workflowBlockKind,
	workflowBlocks,
} from "@/packages/builder/builder-data.ts";
import { providerApiIds } from "@/packages/providers/provider-config.ts";
import type {
	AutomationProvider,
	AutomationStepKind,
	WorkflowActionType,
	WorkflowPayload,
	WorkflowStepParams,
} from "@/packages/types/automation.types.ts";
import {
	automationStepKind,
	workflowActionType,
	workflowMessageChannel,
	workflowOperator,
	workflowOrderType,
	workflowOutcome,
} from "@/packages/types/automation.types.ts";

export type WorkflowNodeModel = Node<WorkflowBlock>;

export type WorkflowState = {
	edges: Edge[];
	nodes: WorkflowNodeModel[];
};

export type WorkflowPublishPreview = {
	actions: string[];
	conditions: string[];
	plainEnglish: string;
	triggers: string[];
};

export const workflowHistoryLimit = 50;

const kindOrder = {
	[automationStepKind.trigger]: 1,
	[automationStepKind.condition]: 2,
	[automationStepKind.action]: 3,
} as const;

export function createInitialWorkflowState(): WorkflowState {
	return {
		edges: initialWorkflowEdges.map((edge) => ({
			...edge,
			style: { ...edge.style },
		})),
		nodes: initialWorkflowNodes.map((node) => ({
			...node,
			data: { ...node.data, params: { ...node.data.params } },
			position: { ...node.position },
		})),
	};
}

export function appendWorkflowHistory(
	items: WorkflowState[],
	state: WorkflowState,
) {
	return items.concat(state).slice(-workflowHistoryLimit);
}

export function cloneWorkflowState(state: WorkflowState): WorkflowState {
	return {
		edges: state.edges.map((edge) => ({
			...edge,
			style: edge.style ? { ...edge.style } : undefined,
		})),
		nodes: state.nodes.map((node) => ({
			...node,
			data: { ...node.data, params: { ...node.data.params } },
			position: { ...node.position },
		})),
	};
}

export function serializeWorkflowState(state: WorkflowState) {
	return JSON.stringify(toWorkflowPayload(state));
}

export function createWorkflowStateFromPayload(
	payload: WorkflowPayload,
): WorkflowState {
	return {
		edges: payload.connections.map((connection) => ({
			id: `edge-${connection.from}-${connection.to}`,
			source: connection.from,
			style: { stroke: "var(--primary)", strokeWidth: 2 },
			target: connection.to,
			type: "smoothstep",
		})),
		nodes: payload.steps.map((step, index) => {
			const template = workflowBlocks.find(
				(block) => block.action === step.action,
			);
			const params = normalizeLoadedParams(step.action, step.params);
			const data = template
				? {
						...template,
						kind: step.kind,
						params,
						value: formatWorkflowBlockValue({
							action: step.action,
							params,
						}),
					}
				: fallbackWorkflowBlock(step.action, step.kind, step.params);

			return {
				data,
				id: step.id,
				position: {
					x: 160 + index * 260,
					y: 180 + index * 90,
				},
				type: "workflowBlock",
			};
		}),
	};
}

export function normalizeAutomationWorkflow(
	workflow: unknown,
): WorkflowPayload | null {
	if (!workflow || typeof workflow !== "object") {
		return null;
	}

	if (
		"version" in workflow &&
		"steps" in workflow &&
		Array.isArray(workflow.steps) &&
		"connections" in workflow &&
		Array.isArray(workflow.connections)
	) {
		return workflow as WorkflowPayload;
	}

	if ("nodes" in workflow && Array.isArray(workflow.nodes)) {
		const legacy = workflow as {
			edges?: Array<{ source?: string; target?: string }>;
			nodes: Array<{
				data?: { id?: string; kind?: string; value?: string };
				id?: string;
			}>;
		};
		const steps = legacy.nodes
			.map((node) => {
				const template = workflowBlocks.find(
					(block) => block.id === node.data?.id,
				);

				if (!template || !node.id) {
					return null;
				}

				return {
					action: template.action,
					id: node.id,
					kind: template.kind,
					params: { ...template.params },
				};
			})
			.filter((step): step is WorkflowPayload["steps"][number] =>
				Boolean(step),
			);

		return {
			connections: (legacy.edges ?? [])
				.filter((edge) => edge.source && edge.target)
				.map((edge) => ({
					from: edge.source ?? "",
					to: edge.target ?? "",
				})),
			steps,
			version: 1,
		};
	}

	return null;
}

export function toWorkflowPayload(state: WorkflowState): WorkflowPayload {
	return {
		connections: state.edges.map((edge) => ({
			from: edge.source,
			to: edge.target,
		})),
		steps: state.nodes.map((node) => ({
			action: node.data.action,
			id: node.id,
			kind: node.data.kind,
			params: cleanParams(node.data.params),
		})),
		version: 1,
	};
}

export function serializeWorkflowBlock(block: WorkflowBlock) {
	return JSON.stringify({
		action: block.action,
		description: block.description,
		id: block.id,
		kind: block.kind,
		params: cleanParams(block.params),
		title: block.title,
		value: block.value,
		venue: block.venue,
	});
}

export function validateWorkflowForPublish(
	state: WorkflowState,
	provider: AutomationProvider = providerApiIds.polymarket,
) {
	const graphError = validateWorkflowGraph(state);

	if (graphError) {
		return graphError;
	}

	if (provider !== providerApiIds.polymarket) {
		return "This automation includes a provider that is not supported yet.";
	}

	for (const node of state.nodes) {
		const paramError = validateActionParams(node.data.action, node.data.params);

		if (paramError) {
			return paramError;
		}
	}

	return null;
}

export function createWorkflowPreviewFromPayload(
	payload: WorkflowPayload,
	marketTitle: string,
	venueLabel: string,
): WorkflowPublishPreview {
	return createWorkflowPreview(
		createWorkflowStateFromPayload(payload),
		marketTitle,
		venueLabel,
	);
}

export function createWorkflowPreview(
	state: WorkflowState,
	marketTitle: string,
	venueLabel: string,
): WorkflowPublishPreview {
	const payload = toWorkflowPayload(state);
	const triggers = payload.steps
		.filter((step) => step.kind === workflowBlockKind.trigger)
		.map((step) => triggerPreview(step.action, step.params));
	const conditions = payload.steps
		.filter((step) => step.kind === workflowBlockKind.condition)
		.map((step) => conditionPreview(step.action, step.params));
	const actions = payload.steps
		.filter((step) => step.kind === workflowBlockKind.action)
		.map((step) => actionPreview(step.action, step.params));

	return {
		actions,
		conditions,
		plainEnglish: createPlainEnglishSummary(
			marketTitle,
			venueLabel,
			triggers,
			conditions,
			actions,
		),
		triggers,
	};
}

function fallbackWorkflowBlock(
	action: WorkflowActionType,
	kind: AutomationStepKind,
	params: WorkflowStepParams,
): WorkflowBlock {
	return {
		action,
		description: "Configured automation step",
		icon: workflowBlocks[0].icon,
		id: action.toLowerCase().replaceAll("_", "-"),
		kind,
		params,
		title: action
			.toLowerCase()
			.split("_")
			.map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
			.join(" "),
		value: formatWorkflowBlockValue({ action, params }),
		venue: workflowBlocks[0].venue,
	};
}

function validateWorkflowGraph(state: WorkflowState) {
	if (state.nodes.length === 0) {
		return "Add workflow blocks before publishing.";
	}

	const ids = new Set<string>();
	const duplicateNode = state.nodes.find((node) => {
		if (ids.has(node.id)) {
			return true;
		}

		ids.add(node.id);
		return false;
	});

	if (duplicateNode) {
		return "Workflow contains duplicate block identifiers.";
	}

	const triggerCount = state.nodes.filter(
		(node) => node.data.kind === workflowBlockKind.trigger,
	).length;
	const hasTrigger = triggerCount > 0;
	const hasAction = state.nodes.some(
		(node) => node.data.kind === workflowBlockKind.action,
	);

	if (!hasTrigger) {
		return "Add one trigger before publishing.";
	}

	if (triggerCount !== 1) {
		return "Supported automations require exactly one trigger.";
	}

	if (!hasAction) {
		return "Add at least one action before publishing.";
	}

	if (state.nodes.length > 1 && state.edges.length === 0) {
		return "Connect your workflow blocks before publishing.";
	}

	const edgePairs = new Set<string>();

	for (const edge of state.edges) {
		if (!ids.has(edge.source) || !ids.has(edge.target)) {
			return "Remove workflow connections that point to missing blocks.";
		}

		if (edge.source === edge.target) {
			return "A workflow block cannot connect to itself.";
		}

		const pair = `${edge.source}:${edge.target}`;

		if (edgePairs.has(pair)) {
			return "Remove duplicate workflow connections.";
		}

		edgePairs.add(pair);
	}

	const nodeById = new Map(state.nodes.map((node) => [node.id, node]));

	for (const edge of state.edges) {
		const source = nodeById.get(edge.source);
		const target = nodeById.get(edge.target);

		if (!source || !target) {
			return "Remove workflow connections that point to missing blocks.";
		}

		if (kindOrder[source.data.kind] > kindOrder[target.data.kind]) {
			return "Workflow blocks must flow from trigger to condition to action.";
		}
	}

	if (hasCycle(state)) {
		return "Workflow cannot contain loops.";
	}

	if (state.edges.length + 1 !== state.nodes.length) {
		return "Supported automations require one linear path without branches.";
	}

	const incoming = new Map(state.nodes.map((node) => [node.id, 0]));
	const outgoing = new Map<string, string>();

	for (const edge of state.edges) {
		incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);

		if ((incoming.get(edge.target) ?? 0) > 1 || outgoing.has(edge.source)) {
			return "Supported automations require one linear path without branches.";
		}

		outgoing.set(edge.source, edge.target);
	}

	const roots = state.nodes.filter((node) => incoming.get(node.id) === 0);
	const sinks = state.nodes.filter((node) => !outgoing.has(node.id));

	if (
		roots.length !== 1 ||
		roots[0]?.data.kind !== workflowBlockKind.trigger ||
		sinks.length !== 1 ||
		sinks[0]?.data.kind !== workflowBlockKind.action
	) {
		return "Build one linear path from a trigger to an action.";
	}

	return null;
}

function validateActionParams(
	action: WorkflowActionType,
	params: WorkflowStepParams,
) {
	if (action === workflowActionType.triggerPriceMoves) {
		return validateOutcome(params.outcome);
	}

	if (action === workflowActionType.triggerVolumeMoves) {
		return positiveNumber(
			params.minimum_change_percent,
			"Enter a valid volume change percentage.",
		);
	}

	if (action === workflowActionType.triggerTimeCheck) {
		return validScheduleInterval(params.interval);
	}

	if (
		action === workflowActionType.conditionOutcomePriceAbove ||
		action === workflowActionType.conditionOutcomePriceBelow
	) {
		return (
			validateOutcome(params.outcome) ??
			validOperator(params.operator) ??
			probability(params.price, "Enter a valid price between 0 and 1.")
		);
	}

	if (action === workflowActionType.conditionVolumeAbove) {
		return (
			validOperator(params.operator) ??
			positiveNumber(params.volume, "Enter a valid target volume.")
		);
	}

	if (action === workflowActionType.buy) {
		return (
			validateOutcome(params.outcome) ??
			limitOrderType(params.order_type) ??
			positiveNumber(
				params.usdc_amount,
				"Set the BUY amount in USDC before publishing.",
			) ??
			probability(
				params.limit_price,
				"Set a required limit price between 0 and 1.",
			)
		);
	}

	if (action === workflowActionType.sell) {
		return (
			validateOutcome(params.outcome) ??
			limitOrderType(params.order_type) ??
			positiveNumber(
				params.shares,
				"Set the SELL quantity in shares before publishing.",
			) ??
			probability(
				params.limit_price,
				"Set a required limit price between 0 and 1.",
			)
		);
	}

	return (
		validMessageChannel(params.channel) ??
		nonEmptyString(params.message, "Set a message before publishing.")
	);
}

function hasCycle(state: WorkflowState) {
	const graph = new Map<string, string[]>();

	for (const node of state.nodes) {
		graph.set(node.id, []);
	}

	for (const edge of state.edges) {
		graph.get(edge.source)?.push(edge.target);
	}

	const visiting = new Set<string>();
	const visited = new Set<string>();

	const visit = (id: string): boolean => {
		if (visiting.has(id)) {
			return true;
		}

		if (visited.has(id)) {
			return false;
		}

		visiting.add(id);

		for (const next of graph.get(id) ?? []) {
			if (visit(next)) {
				return true;
			}
		}

		visiting.delete(id);
		visited.add(id);
		return false;
	};

	return state.nodes.some((node) => visit(node.id));
}

function triggerPreview(
	action: WorkflowActionType,
	params: WorkflowStepParams,
) {
	if (action === workflowActionType.triggerPriceMoves) {
		return `${params.outcome} price changes after the initial observation`;
	}

	if (action === workflowActionType.triggerVolumeMoves) {
		return `Market volume changes by at least ${params.minimum_change_percent}% after the initial observation`;
	}

	return `The persisted schedule reaches ${params.interval} after the initial observation`;
}

function conditionPreview(
	action: WorkflowActionType,
	params: WorkflowStepParams,
) {
	if (action === workflowActionType.conditionOutcomePriceAbove) {
		return `${params.outcome} price is above $${params.price}`;
	}

	if (action === workflowActionType.conditionOutcomePriceBelow) {
		return `${params.outcome} price is below $${params.price}`;
	}

	return `Market volume is above $${params.volume}`;
}

function actionPreview(action: WorkflowActionType, params: WorkflowStepParams) {
	if (action === workflowActionType.buy) {
		return `Send an approval-only notification to review using ${params.usdc_amount} USDC to BUY ${params.outcome} at a ${params.limit_price} limit price; no order is executed`;
	}

	if (action === workflowActionType.sell) {
		return `Send an approval-only notification to review SELLING ${params.shares} ${params.outcome} shares at a ${params.limit_price} limit price; no order is executed`;
	}

	return `Send message: ${params.message}`;
}

function createPlainEnglishSummary(
	marketTitle: string,
	venueLabel: string,
	triggers: string[],
	conditions: string[],
	actions: string[],
) {
	const triggerText = joinPreviewItems(triggers).toLowerCase();
	const conditionText = conditions.length
		? ` It will only continue if ${joinPreviewItems(conditions).toLowerCase()}.`
		: "";
	const actionText = actions.length
		? ` If those checks pass, it will ${joinPreviewItems(actions).toLowerCase()}.`
		: "";

	return `Uptions will monitor ${marketTitle} on ${venueLabel}. When ${triggerText}, this automation will run.${conditionText}${actionText}`;
}

function normalizeLoadedParams(
	action: WorkflowActionType,
	params: WorkflowStepParams,
): WorkflowStepParams {
	if (action === workflowActionType.buy || action === workflowActionType.sell) {
		return { ...params, order_type: workflowOrderType.limit };
	}

	return { ...params };
}

function cleanParams(params: WorkflowStepParams): WorkflowStepParams {
	return Object.fromEntries(
		Object.entries(params).filter(([, value]) => value !== undefined),
	) as WorkflowStepParams;
}

function joinPreviewItems(items: string[]) {
	if (items.length <= 1) {
		return items[0] ?? "the configured rule matches";
	}

	return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function validateOutcome(value: unknown) {
	return value === workflowOutcome.yes || value === workflowOutcome.no
		? null
		: "Select YES or NO before publishing.";
}

function validOperator(value: unknown) {
	return value === workflowOperator.above ||
		value === workflowOperator.below ||
		value === workflowOperator.equals ||
		value === workflowOperator.changes
		? null
		: "Select a valid workflow operator.";
}

function limitOrderType(value: unknown) {
	return value === workflowOrderType.limit
		? null
		: "Safe private beta trade notifications require a limit order.";
}

function validScheduleInterval(value: unknown) {
	return ["5m", "15m", "30m", "1h", "4h", "12h", "24h"].includes(String(value))
		? null
		: "Select a supported schedule interval.";
}

function validMessageChannel(value: unknown) {
	return value === workflowMessageChannel.inApp
		? null
		: "Select a valid message channel.";
}

function positiveNumber(value: unknown, message: string) {
	return typeof value === "number" && Number.isFinite(value) && value > 0
		? null
		: message;
}

function probability(value: unknown, message: string) {
	return typeof value === "number" &&
		Number.isFinite(value) &&
		value > 0 &&
		value < 1
		? null
		: message;
}

function nonEmptyString(value: unknown, message: string) {
	return typeof value === "string" && value.trim().length > 0 ? null : message;
}
