import {
	addEdge,
	applyEdgeChanges,
	applyNodeChanges,
	type Connection,
	type Edge,
	type EdgeChange,
	type NodeChange,
	type XYPosition,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { CustomModal } from "@/components/dialogs/custom-modal.tsx";
import { DashboardLayout } from "@/components/layout/dashboard-layout.tsx";
import { CheckerBackground } from "@/components/misc/checker-background.tsx";
import { Typography } from "@/components/typography/typography.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useCurrentUser, useUpdateWallet } from "@/hooks/use-auth.ts";
import {
	useAutomations,
	usePublishAutomation,
	useTestRunAutomation,
	useUpdateAutomation,
} from "@/hooks/use-automations.ts";
import { useMarket } from "@/hooks/use-markets.ts";
import {
	type WorkflowBlock,
	workflowBlocks,
} from "@/packages/builder/builder-data.ts";
import type { ProviderConfig } from "@/packages/providers/provider-config.ts";
import type { PublishAutomationRequest } from "@/packages/types/automation.types.ts";

import { getRequestErrorMessage } from "@/util/errors.ts";
import {
	appendWorkflowHistory,
	cloneWorkflowState,
	createInitialWorkflowState,
	createWorkflowPreview,
	createWorkflowStateFromPayload,
	normalizeAutomationWorkflow,
	serializeWorkflowBlock,
	serializeWorkflowState,
	toWorkflowPayload,
	validateWorkflowForPublish,
	type WorkflowNodeModel,
	type WorkflowPublishPreview,
	type WorkflowState,
	workflowHistoryLimit,
} from "@/util/workflow.ts";
import { BlockLibrary } from "./block-library.tsx";
import { InspectorPanel } from "./inspector-panel.tsx";
import { WorkflowCanvas } from "./workflow-canvas.tsx";
import { WorkflowToolbar } from "./workflow-toolbar.tsx";

type WorkflowBuilderProps = {
	automationId?: string;
	marketId?: string;
	provider: ProviderConfig;
};

export function WorkflowBuilder({
	automationId,
	marketId,
	provider,
}: WorkflowBuilderProps) {
	const [workflow, setWorkflow] = useState<WorkflowState>(
		createInitialWorkflowState,
	);
	const [past, setPast] = useState<WorkflowState[]>([]);
	const [future, setFuture] = useState<WorkflowState[]>([]);
	const [selectedNodeId, setSelectedNodeId] = useState<string>();
	const [publishedAutomationId, setPublishedAutomationId] = useState<string>();
	const [publishOpen, setPublishOpen] = useState(false);
	const [publishPayload, setPublishPayload] =
		useState<PublishAutomationRequest | null>(null);
	const [publishPreview, setPublishPreview] =
		useState<WorkflowPublishPreview | null>(null);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleteNodeId, setDeleteNodeId] = useState<string>();
	const [statusMessage, setStatusMessage] = useState<string | null>(null);
	const { address, chainId, isConnected } = useAccount();
	const { user } = useCurrentUser();
	const updateWallet = useUpdateWallet();
	const { automations } = useAutomations();
	const publishAutomation = usePublishAutomation();
	const updateAutomation = useUpdateAutomation();
	const testRunAutomation = useTestRunAutomation();
	const { market: selectedMarket } = useMarket(provider, marketId);
	const workflowRef = useRef(workflow);
	const dragStartRef = useRef<WorkflowState | null>(null);
	const hydratedAutomationIdRef = useRef<string | null>(null);
	const publishIdempotencyKeyRef = useRef<string | null>(null);
	const publishInFlightRef = useRef(false);
	const selectedBlock = useMemo(
		() => workflow.nodes.find((node) => node.id === selectedNodeId)?.data,
		[workflow.nodes, selectedNodeId],
	);
	const automationPayload = useMemo<PublishAutomationRequest | null>(() => {
		if (!marketId || !selectedMarket) {
			return null;
		}

		return {
			market: {
				id: selectedMarket.id,
				title: selectedMarket.title,
			},
			provider: provider.apiId,
			title: selectedMarket.title,
			workflow: toWorkflowPayload(workflow),
		};
	}, [marketId, provider.apiId, selectedMarket, workflow]);
	const editAutomation = useMemo(
		() => automations.find((automation) => automation.id === automationId),
		[automationId, automations],
	);
	const isSavingAutomation =
		publishAutomation.isPending || updateAutomation.isPending;
	const deleteNode = useMemo(
		() => workflow.nodes.find((node) => node.id === deleteNodeId),
		[deleteNodeId, workflow.nodes],
	);

	useEffect(() => {
		workflowRef.current = workflow;
	}, [workflow]);

	useEffect(() => {
		if (
			!automationId ||
			!editAutomation ||
			hydratedAutomationIdRef.current === automationId
		) {
			return;
		}

		if (
			editAutomation.provider !== provider.apiId ||
			editAutomation.market_id !== marketId
		) {
			toast.error("This automation does not match the routed market provider.");
			return;
		}

		const normalizedWorkflow = normalizeAutomationWorkflow(
			editAutomation.workflow,
		);

		if (!normalizedWorkflow) {
			toast.error("Unable to load this automation into the builder.");
			return;
		}

		setWorkflow(createWorkflowStateFromPayload(normalizedWorkflow));
		setPast([]);
		setFuture([]);
		setPublishedAutomationId(editAutomation.id);
		hydratedAutomationIdRef.current = automationId;
	}, [automationId, editAutomation, marketId, provider.apiId]);

	useEffect(() => {
		if (
			selectedNodeId &&
			!workflow.nodes.some((node) => node.id === selectedNodeId)
		) {
			setSelectedNodeId(undefined);
		}
	}, [selectedNodeId, workflow.nodes]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				(event.key !== "Delete" && event.key !== "Backspace") ||
				!selectedNodeId ||
				publishOpen ||
				deleteOpen ||
				isEditableTarget(event.target)
			) {
				return;
			}

			event.preventDefault();
			setDeleteNodeId(selectedNodeId);
			setDeleteOpen(true);
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [deleteOpen, publishOpen, selectedNodeId]);

	const commitWorkflow = useCallback(
		(updater: (current: WorkflowState) => WorkflowState, record = true) => {
			setWorkflow((current) => {
				const next = updater(current);

				if (
					current === next ||
					serializeWorkflowState(current) === serializeWorkflowState(next)
				) {
					return current;
				}

				if (record) {
					setPast((items) =>
						appendWorkflowHistory(items, cloneWorkflowState(current)),
					);
					setFuture([]);
				}

				return next;
			});
		},
		[],
	);

	const handleNodesChange = useCallback(
		(changes: NodeChange<WorkflowNodeModel>[]) => {
			const record = changes.some(
				(change) => change.type !== "select" && change.type !== "position",
			);

			commitWorkflow(
				(current) => ({
					...current,
					nodes: applyNodeChanges(changes, current.nodes),
				}),
				record,
			);
		},
		[commitWorkflow],
	);

	const handleEdgesChange = useCallback(
		(changes: EdgeChange<Edge>[]) => {
			const record = changes.some((change) => change.type !== "select");

			commitWorkflow(
				(current) => ({
					...current,
					edges: applyEdgeChanges(changes, current.edges),
				}),
				record,
			);
		},
		[commitWorkflow],
	);

	const handleConnect = useCallback(
		(connection: Connection) => {
			commitWorkflow((current) => ({
				...current,
				edges: addEdge(
					{
						...connection,
						type: "smoothstep",
						style: { stroke: "var(--primary)", strokeWidth: 2 },
					},
					current.edges,
				),
			}));
		},
		[commitWorkflow],
	);

	const handleAddNode = useCallback(
		(blockId: string, position: XYPosition) => {
			const block = workflowBlocks.find((item) => item.id === blockId);

			if (!block) {
				return;
			}

			const nodeId = `${block.id}-${crypto.randomUUID()}`;

			commitWorkflow((current) => ({
				...current,
				nodes: current.nodes.concat({
					data: {
						...block,
						params: { ...block.params },
						venue: provider.venue.id,
					},
					id: nodeId,
					position,
					type: "workflowBlock",
				}),
			}));
			setSelectedNodeId(nodeId);
		},
		[commitWorkflow, provider.venue.id],
	);

	const handleUpdateSelectedBlock = useCallback(
		(updates: Partial<WorkflowBlock>) => {
			if (!selectedNodeId) {
				return;
			}

			commitWorkflow((current) => {
				let changed = false;
				const nodes = current.nodes.map((node) => {
					if (node.id !== selectedNodeId) {
						return node;
					}

					const data = { ...node.data, ...updates };

					if (
						serializeWorkflowBlock(node.data) === serializeWorkflowBlock(data)
					) {
						return node;
					}

					changed = true;

					return { ...node, data };
				});

				return changed ? { ...current, nodes } : current;
			});
		},
		[commitWorkflow, selectedNodeId],
	);

	const handleNodeDragStart = useCallback(() => {
		dragStartRef.current = cloneWorkflowState(workflowRef.current);
	}, []);

	const handleNodeDragStop = useCallback(() => {
		const snapshot = dragStartRef.current;
		dragStartRef.current = null;

		if (
			!snapshot ||
			serializeWorkflowState(snapshot) ===
				serializeWorkflowState(workflowRef.current)
		) {
			return;
		}

		setPast((items) => appendWorkflowHistory(items, snapshot));
		setFuture([]);
	}, []);

	const handleUndo = useCallback(() => {
		setPast((items) => {
			if (items.length === 0) {
				return items;
			}

			const previous = items.at(-1);

			if (!previous) {
				return items;
			}

			setFuture((redoItems) =>
				[cloneWorkflowState(workflowRef.current), ...redoItems].slice(
					0,
					workflowHistoryLimit,
				),
			);
			setWorkflow(cloneWorkflowState(previous));

			return items.slice(0, -1);
		});
	}, []);

	const handleRedo = useCallback(() => {
		setFuture((items) => {
			if (items.length === 0) {
				return items;
			}

			const next = items[0];

			if (!next) {
				return items;
			}

			setPast((undoItems) =>
				appendWorkflowHistory(
					undoItems,
					cloneWorkflowState(workflowRef.current),
				),
			);
			setWorkflow(cloneWorkflowState(next));

			return items.slice(1);
		});
	}, []);

	const handlePublish = useCallback(async () => {
		setStatusMessage(null);

		if (!selectedMarket) {
			toast.error("Select a market before publishing.");
			return;
		}

		if (!automationPayload) {
			toast.error("Select a market before publishing.");
			return;
		}

		if (!provider.capabilities.automations) {
			toast.error(`${provider.label} automations are not available.`);
			return;
		}

		if (user?.preferred_trading_provider !== provider.apiId) {
			toast.error(
				`Select ${provider.label} in Trading settings before publishing this automation.`,
			);
			return;
		}

		if (!isConnected || !address) {
			toast.error("Connect your wallet before publishing automation.");
			return;
		}

		if (chainId !== provider.requiredChain.id) {
			toast.error(
				`Switch your wallet to ${provider.requiredChain.label} before publishing automation.`,
			);
			return;
		}

		try {
			if (
				!user.primary_wallet_address ||
				user.primary_wallet_address.toLowerCase() !== address.toLowerCase()
			) {
				await updateWallet.mutateAsync({
					chain: provider.requiredChain.apiId,
					chain_id: provider.requiredChain.id,
					provider: provider.apiId,
					wallet_address: address,
				});
			}
		} catch (error) {
			const message = getRequestErrorMessage(error, "Unable to save wallet");
			toast.error(message ?? "Unable to save wallet");
			return;
		}

		const validationError = validateWorkflowForPublish(
			workflow,
			provider.apiId,
		);

		if (validationError) {
			toast.error(validationError);
			return;
		}

		setPublishPayload(automationPayload);
		publishIdempotencyKeyRef.current = automationId
			? null
			: crypto.randomUUID();
		setPublishPreview(
			createWorkflowPreview(
				workflow,
				selectedMarket.title,
				provider.venue.label,
			),
		);
		setPublishOpen(true);
	}, [
		address,
		automationId,
		automationPayload,
		chainId,
		isConnected,
		selectedMarket,
		updateWallet,
		user,
		provider,
		workflow,
	]);

	const handleConfirmPublish = useCallback(async () => {
		if (publishInFlightRef.current) {
			return;
		}

		setStatusMessage(null);

		if (!publishPayload) {
			toast.error("Review this automation again before publishing.");
			return;
		}

		const idempotencyKey = publishIdempotencyKeyRef.current;

		if (!automationId && !idempotencyKey) {
			toast.error("Review this automation again before publishing.");
			return;
		}

		publishInFlightRef.current = true;

		try {
			const response = automationId
				? await updateAutomation.mutateAsync({
						automationId,
						payload: publishPayload,
					})
				: await publishAutomation.mutateAsync({
						idempotencyKey: idempotencyKey as string,
						payload: publishPayload,
					});
			setPublishedAutomationId(response.data.id);
			setPublishOpen(false);
			setPublishPayload(null);
			publishIdempotencyKeyRef.current = null;
			setStatusMessage(
				"Automation saved for monitoring. Trade steps only send approval notifications.",
			);
			toast.success(
				automationId
					? "Automation updated successfully"
					: "Automation published successfully",
			);
		} catch (error) {
			const message = getRequestErrorMessage(
				error,
				"Unable to publish automation",
			);
			setStatusMessage(message);
			toast.error(message ?? "Unable to publish automation");
		} finally {
			publishInFlightRef.current = false;
		}
	}, [automationId, publishAutomation, publishPayload, updateAutomation]);

	const handleConfirmDelete = useCallback(() => {
		if (!deleteNodeId) {
			return;
		}

		commitWorkflow((current) => ({
			edges: current.edges.filter(
				(edge) => edge.source !== deleteNodeId && edge.target !== deleteNodeId,
			),
			nodes: current.nodes.filter((node) => node.id !== deleteNodeId),
		}));
		setSelectedNodeId(undefined);
		setDeleteOpen(false);
		setDeleteNodeId(undefined);
		toast.success("Workflow node removed");
	}, [commitWorkflow, deleteNodeId]);

	const handleTestRun = useCallback(async () => {
		setStatusMessage(null);

		if (!automationPayload) {
			toast.error("Select a market before running this workflow.");
			return;
		}

		const validationError = validateWorkflowForPublish(
			workflow,
			provider.apiId,
		);

		if (validationError) {
			toast.error(validationError);
			return;
		}

		try {
			const response = await testRunAutomation.mutateAsync({
				...automationPayload,
				automation_id: publishedAutomationId,
			});
			setStatusMessage(response.data.message);
			toast.success("Workflow validation completed");
		} catch (error) {
			const message = getRequestErrorMessage(
				error,
				"Unable to test run automation",
			);
			setStatusMessage(message);
			toast.error(message ?? "Unable to test run automation");
		}
	}, [
		automationPayload,
		provider.apiId,
		publishedAutomationId,
		testRunAutomation,
		workflow,
	]);

	return (
		<DashboardLayout contentClassName="p-0" walletProvider={provider}>
			<div className="relative flex h-[calc(100dvh-4rem)] min-h-[720px] w-full overflow-hidden bg-builder-bg text-[var(--app-fg)]">
				<CheckerBackground className="opacity-70" variant="builder" />
				<BlockLibrary />
				<section className="relative z-10 flex min-w-0 flex-1 flex-col">
					<WorkflowToolbar
						canRedo={future.length > 0}
						canUndo={past.length > 0}
						isPublishing={isSavingAutomation}
						isTesting={testRunAutomation.isPending}
						market={selectedMarket}
						onPublish={handlePublish}
						onRedo={handleRedo}
						onTestRun={handleTestRun}
						onUndo={handleUndo}
						statusMessage={statusMessage}
						venueLabel={provider.venue.label}
					/>
					<WorkflowCanvas
						edges={workflow.edges}
						nodes={workflow.nodes}
						onAddNode={handleAddNode}
						onConnect={handleConnect}
						onEdgesChange={handleEdgesChange}
						onNodeDragStart={handleNodeDragStart}
						onNodeDragStop={handleNodeDragStop}
						onNodesChange={handleNodesChange}
						onSelectNode={setSelectedNodeId}
					/>
				</section>
				<InspectorPanel
					market={selectedMarket}
					onUpdateBlock={handleUpdateSelectedBlock}
					selectedBlock={selectedBlock}
					venue={provider.venue.id}
				/>
				<CustomModal
					className="max-h-[85dvh] overflow-y-auto border-app-border bg-app-card text-app-fg sm:max-w-150"
					description="Confirm the monitoring path and notification-only trade behavior."
					onOpenChange={(open) => {
						if (isSavingAutomation) {
							return;
						}

						setPublishOpen(open);

						if (!open) {
							setPublishPayload(null);
							publishIdempotencyKeyRef.current = null;
						}
					}}
					open={publishOpen}
					title="Review automation"
				>
					{selectedMarket && publishPreview ? (
						<PublishReview
							isPublishing={isSavingAutomation}
							marketTitle={selectedMarket.title}
							onCancel={() => setPublishOpen(false)}
							onConfirm={handleConfirmPublish}
							preview={publishPreview}
							venueLabel={provider.venue.label}
						/>
					) : null}
				</CustomModal>
				<CustomModal
					className="border-app-border bg-app-card text-app-fg"
					description={
						deleteNode
							? `This will remove "${deleteNode.data.title}" and its connected links from the workflow.`
							: "This node will be removed from the workflow."
					}
					onOpenChange={(open) => {
						setDeleteOpen(open);

						if (!open) {
							setDeleteNodeId(undefined);
						}
					}}
					open={deleteOpen}
					title="Remove node?"
				>
					<div className="flex justify-end gap-3 pt-2">
						<Button
							className="border border-app-border bg-transparent text-app-fg hover:bg-app-muted"
							onClick={() => {
								setDeleteOpen(false);
								setDeleteNodeId(undefined);
							}}
							type="button"
							variant="ghost"
						>
							Cancel
						</Button>
						<Button
							className="bg-primary text-primary-foreground hover:bg-primary/90"
							onClick={handleConfirmDelete}
							type="button"
						>
							Remove node
						</Button>
					</div>
				</CustomModal>
			</div>
		</DashboardLayout>
	);
}

function isEditableTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) {
		return false;
	}

	return Boolean(
		target.closest("input, textarea, select, [contenteditable='true']"),
	);
}

function PublishReview({
	isPublishing,
	marketTitle,
	onCancel,
	onConfirm,
	preview,
	venueLabel,
}: {
	isPublishing: boolean;
	marketTitle: string;
	onCancel: () => void;
	onConfirm: () => void;
	preview: WorkflowPublishPreview;
	venueLabel: string;
}) {
	return (
		<div className="grid gap-6">
			<div className="grid gap-4 text-sm">
				<ReviewField label="Market" value={marketTitle} />
				<ReviewField label="Venue" value={venueLabel} />
			</div>

			<div className="grid gap-5">
				<ReviewSection items={preview.triggers} title="When" />
				<ReviewSection items={preview.conditions} title="Only if" />
				<ReviewSection items={preview.actions} title="Then" />
			</div>

			<div className="border border-primary/40 bg-primary/10 p-4">
				<p className="text-sm font-semibold text-app-fg">
					No automatic trade execution
				</p>
				<p className="mt-2 text-sm leading-6 text-app-muted-fg">
					BUY and SELL steps send approval-only notifications. They do not sign,
					submit, or execute orders.
				</p>
			</div>

			<div className="border border-app-border bg-app-muted p-4">
				<Typography className="text-app-muted-fg" variant="caption">
					Plain English
				</Typography>
				<p className="mt-2 text-sm leading-6 text-app-fg">
					{preview.plainEnglish}
				</p>
			</div>

			<div className="flex justify-end gap-3">
				<Button
					className="border border-app-border bg-transparent text-app-fg hover:bg-app-muted"
					disabled={isPublishing}
					onClick={onCancel}
					type="button"
					variant="ghost"
				>
					Cancel
				</Button>
				<Button
					className="bg-primary text-primary-foreground hover:bg-primary/90"
					disabled={isPublishing}
					onClick={onConfirm}
					type="button"
				>
					{isPublishing ? "Publishing..." : "Publish automation"}
				</Button>
			</div>
		</div>
	);
}

function ReviewField({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<Typography className="text-app-muted-fg" variant="caption">
				{label}:
			</Typography>
			<p className="mt-1 text-base font-semibold text-app-fg">{value}</p>
		</div>
	);
}

function ReviewSection({ items, title }: { items: string[]; title: string }) {
	return (
		<section>
			<Typography className="text-app-muted-fg" variant="caption">
				{title}:
			</Typography>
			<ul className="mt-2 grid gap-2 text-sm text-app-fg">
				{items.map((item) => (
					<li className="flex gap-2" key={item}>
						<span className="text-primary">-</span>
						<span>{item}</span>
					</li>
				))}
			</ul>
		</section>
	);
}
