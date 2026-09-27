import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CustomModal } from "@/components/dialogs/custom-modal.tsx";
import { NoDataFound } from "@/components/misc/no-data-found.tsx";
import { Typography } from "@/components/typography/typography.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
	useAutomations,
	useDeleteAutomation,
	useSetAutomationStatus,
} from "@/hooks/use-automations.ts";
import { getProviderRouteId } from "@/packages/providers/provider-config.ts";
import type { Automation } from "@/packages/types/automation.types.ts";
import { automationStatus } from "@/packages/types/automation.types.ts";
import { formatDate } from "@/util/formatters.ts";
import {
	createWorkflowPreviewFromPayload,
	normalizeAutomationWorkflow,
	type WorkflowPublishPreview,
} from "@/util/workflow.ts";

export function AutomationSection() {
	const { automations, error, isLoading } = useAutomations();

	return (
		<section className="min-w-0">
			<div className="mb-8 flex items-center justify-between gap-4">
				<Typography className="text-[var(--app-fg)]" variant="h2">
					Active Automations
				</Typography>
				<NewAutomationLink />
			</div>
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
				{isLoading ? (
					<AutomationLoadingCards />
				) : error ? (
					<div className="border border-danger/40 bg-danger/10 p-5 sm:col-span-2 xl:col-span-3 2xl:col-span-4">
						<Typography className="text-danger" variant="h3">
							Unable to load automations
						</Typography>
						<Typography className="mt-2 text-app-muted-fg" variant="bodySm">
							{error}
						</Typography>
					</div>
				) : automations.length > 0 ? (
					automations.map((automation) => (
						<AutomationCard automation={automation} key={automation.id} />
					))
				) : (
					<NoDataFound
						action={<NewAutomationLink />}
						className="sm:col-span-2 xl:col-span-3 2xl:col-span-4"
						description="Create your first automation from the builder."
						title="No automations found"
					/>
				)}
			</div>
		</section>
	);
}

function AutomationCard({ automation }: { automation: Automation }) {
	const [open, setOpen] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const setStatus = useSetAutomationStatus();
	const deleteAutomation = useDeleteAutomation();
	const marketLabel =
		automation.market_title ?? automation.market_id ?? "General workflow";
	const preview = useAutomationPreview(automation);
	const editTo = automation.market_id
		? "/markets/$provider/$marketId/builder"
		: "/builder";
	const isPaused = automation.status === automationStatus.paused;

	const handleSetStatus = async () => {
		try {
			await setStatus.mutateAsync({
				automationId: automation.id,
				status: isPaused ? automationStatus.active : automationStatus.paused,
			});
			toast.success(isPaused ? "Automation resumed" : "Automation stopped");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to update automation",
			);
		}
	};

	const handleDelete = async () => {
		try {
			await deleteAutomation.mutateAsync(automation.id);
			setOpen(false);
			setConfirmDelete(false);
			toast.success("Automation deleted");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to delete automation",
			);
		}
	};

	return (
		<>
			<article className="group border border-app-border bg-app-card p-5 text-app-fg shadow-sm transition hover:border-primary/60 hover:shadow-md">
				<div className="flex items-start justify-between gap-3">
					<span
						className={
							isPaused
								? "rounded-full bg-app-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-app-muted-fg"
								: "rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-success"
						}
					>
						{automation.status}
					</span>
					<button
						aria-label={isPaused ? "Resume automation" : "Pause automation"}
						aria-pressed={!isPaused}
						className={`relative h-6 w-11 shrink-0 rounded-full transition ${isPaused ? "bg-app-border" : "bg-primary"}`}
						disabled={setStatus.isPending}
						onClick={(event) => {
							event.stopPropagation();
							handleSetStatus();
						}}
						type="button"
					>
						<span
							className={`absolute top-1 size-4 rounded-full bg-white shadow transition ${isPaused ? "left-1" : "left-6"}`}
						/>
					</button>
				</div>
				<button
					aria-label={`View ${automation.title}`}
					className="block w-full cursor-pointer text-left"
					onClick={() => setOpen(true)}
					type="button"
				>
					<h3 className="mt-5 line-clamp-2 min-h-12 text-base font-semibold leading-6">
						{automation.title}
					</h3>
					<p className="mt-2 line-clamp-2 min-h-10 text-sm text-app-muted-fg">
						{marketLabel}
					</p>
					<div className="mt-5 grid gap-3 border-t border-app-border pt-4 text-xs text-app-muted-fg">
						<AutomationMeta
							label="Last triggered"
							value={
								automation.last_run_at
									? formatDate(automation.last_run_at)
									: "Not triggered yet"
							}
						/>
						<AutomationMeta
							label="Last status"
							value={automation.last_run_status ?? "No runs"}
						/>
						<AutomationMeta
							label="Provider"
							value={formatVenue(automation.venue)}
						/>
					</div>
					<p className="mt-5 text-sm font-semibold text-primary transition group-hover:translate-x-0.5">
						View details
					</p>
				</button>
			</article>
			<CustomModal
				className="max-h-[85dvh] overflow-y-auto border-app-border bg-app-card text-app-fg sm:max-w-150"
				description="Review the saved workflow, manage its status, or edit it in the builder."
				onOpenChange={(nextOpen) => {
					setOpen(nextOpen);

					if (!nextOpen) {
						setConfirmDelete(false);
					}
				}}
				open={open}
				title="Automation preview"
			>
				<div className="grid gap-6">
					<div className="grid gap-4 text-sm">
						<ReviewField label="Market" value={marketLabel} />
						<ReviewField label="Venue" value={formatVenue(automation.venue)} />
						<div className="grid gap-2 sm:grid-cols-3">
							<DateMetric
								label="Published"
								value={formatDate(automation.created_at)}
							/>
							<DateMetric
								label="Updated"
								value={formatDate(automation.updated_at)}
							/>
							<DateMetric
								label="Last run"
								value={
									automation.last_run_at
										? formatDate(automation.last_run_at)
										: "Not run yet"
								}
							/>
						</div>
					</div>

					{preview ? (
						<AutomationPreview preview={preview} />
					) : (
						<p className="text-sm text-app-muted-fg">
							This automation needs to be opened in the builder and saved with
							the current workflow format.
						</p>
					)}

					{confirmDelete ? (
						<div className="border border-app-border bg-app-muted p-4">
							<p className="text-sm font-semibold text-app-fg">
								Delete this automation?
							</p>
							<p className="mt-2 text-sm text-app-muted-fg">
								This removes it from your active automations and cannot be
								undone.
							</p>
							<div className="mt-4 flex justify-end gap-3">
								<Button
									className="border border-app-border bg-transparent text-app-fg hover:bg-app-card"
									onClick={() => setConfirmDelete(false)}
									type="button"
									variant="ghost"
								>
									Cancel
								</Button>
								<Button
									className="bg-primary text-primary-foreground hover:bg-primary/90"
									disabled={deleteAutomation.isPending}
									onClick={handleDelete}
									type="button"
								>
									{deleteAutomation.isPending ? "Deleting..." : "Delete"}
								</Button>
							</div>
						</div>
					) : null}

					<div className="flex flex-wrap justify-end gap-3">
						<Button
							asChild
							className="border border-app-border bg-transparent text-app-fg hover:bg-app-muted"
							variant="ghost"
						>
							<Link
								params={
									automation.market_id
										? {
												marketId: automation.market_id,
												provider: getProviderRouteId(automation.provider),
											}
										: undefined
								}
								search={{ automationId: automation.id }}
								to={editTo}
							>
								Edit
							</Link>
						</Button>
						<Button
							className="border border-app-border bg-transparent text-app-fg hover:bg-app-muted"
							disabled={setStatus.isPending}
							onClick={handleSetStatus}
							type="button"
							variant="ghost"
						>
							{setStatus.isPending ? "Saving..." : isPaused ? "Resume" : "Stop"}
						</Button>
						<Button
							className="bg-primary text-primary-foreground hover:bg-primary/90"
							onClick={() => setConfirmDelete(true)}
							type="button"
						>
							Delete
						</Button>
					</div>
				</div>
			</CustomModal>
		</>
	);
}

function AutomationPreview({ preview }: { preview: WorkflowPublishPreview }) {
	return (
		<div className="grid gap-5">
			<PreviewSection items={preview.triggers} title="When" />
			<PreviewSection items={preview.conditions} title="Only if" />
			<PreviewSection items={preview.actions} title="Then" />
			<div className="border border-app-border bg-app-muted p-4">
				<Typography className="text-app-muted-fg" variant="caption">
					Plain English
				</Typography>
				<p className="mt-2 text-sm leading-6 text-app-fg">
					{preview.plainEnglish}
				</p>
			</div>
		</div>
	);
}

function PreviewSection({ items, title }: { items: string[]; title: string }) {
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

function useAutomationPreview(automation: Automation) {
	return useMemo(() => {
		const workflow = normalizeAutomationWorkflow(automation.workflow);

		if (!workflow) {
			return null;
		}

		return createWorkflowPreviewFromPayload(
			workflow,
			automation.market_title ?? automation.title,
			formatVenue(automation.venue),
		);
	}, [automation]);
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

function DateMetric({ label, value }: { label: string; value: string | null }) {
	return (
		<div className="border border-app-border bg-app-muted p-3">
			<Typography className="text-app-muted-fg" variant="caption">
				{label}
			</Typography>
			<p className="mt-1 text-sm font-semibold text-app-fg">
				{value ?? "Not available"}
			</p>
		</div>
	);
}

function AutomationMeta({
	label,
	value,
}: {
	label: string;
	value: string | null;
}) {
	return (
		<div className="flex items-center justify-between gap-4">
			<span>{label}</span>
			<span className="truncate font-medium capitalize text-app-fg">
				{value ?? "Not available"}
			</span>
		</div>
	);
}

function AutomationLoadingCards() {
	return [
		"automation-loading-1",
		"automation-loading-2",
		"automation-loading-3",
		"automation-loading-4",
	].map((key) => (
		<div
			className="h-64 animate-pulse border border-app-border bg-app-muted"
			key={key}
		/>
	));
}

function NewAutomationLink() {
	return (
		<a
			className="inline-flex h-10 items-center gap-2 bg-primary px-4 text-sm font-semibold text-primary-foreground no-underline transition hover:bg-primary/90"
			href="/builder"
		>
			<Plus className="size-4" />
			New Automation
		</a>
	);
}

function formatVenue(value: string) {
	return value
		.split("-")
		.join(" ")
		.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
