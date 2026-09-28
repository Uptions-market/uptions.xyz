import { Bot, DraftingCompass, SlidersHorizontal } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { AppKeyword, BuilderFieldName } from "@/common";
import { Typography } from "@/components/typography/typography.tsx";
import type { WorkflowBlock } from "@/packages/builder/builder-data.ts";
import {
	formatWorkflowBlockValue,
	workflowBlockTone,
} from "@/packages/builder/builder-data.ts";
import type { Market } from "@/packages/markets/market-utils.ts";
import {
	type WorkflowParamValue,
	workflowActionType,
	workflowMessageChannel,
	workflowOutcome,
} from "@/packages/types/automation.types.ts";
import type { VenueId } from "@/packages/venues/venue-data.ts";
import { getVenueConfig } from "@/packages/venues/venue-data.ts";

type InspectorPanelProps = {
	assistant: ReactNode;
	market?: Market | null;
	onUpdateBlock: (updates: Partial<WorkflowBlock>) => void;
	selectedBlock?: WorkflowBlock;
	venue: VenueId;
};

export function InspectorPanel({
	assistant,
	market,
	onUpdateBlock,
	selectedBlock,
	venue,
}: InspectorPanelProps) {
	const [activePanel, setActivePanel] = useState<"assistant" | "inspector">(
		"assistant",
	);
	const activeVenue = getVenueConfig(venue);

	useEffect(() => {
		if (selectedBlock) {
			setActivePanel("inspector");
		}
	}, [selectedBlock]);
	const updateParams = (updates: Record<string, WorkflowParamValue>) => {
		if (!selectedBlock) {
			return;
		}

		const params = { ...selectedBlock.params, ...updates };
		onUpdateBlock({
			params,
			value: formatWorkflowBlockValue({
				action: selectedBlock.action,
				params,
			}),
		});
	};

	return (
		<aside className="relative z-10 hidden min-h-0 w-[360px] border-l border-[var(--app-border)] bg-builder-panel/90 backdrop-blur xl:flex xl:flex-col">
			<div className="grid grid-cols-2 border-b border-[var(--app-border)] p-2">
				<PanelTab
					active={activePanel === "assistant"}
					icon={Bot}
					label="AI Builder"
					onClick={() => setActivePanel("assistant")}
				/>
				<PanelTab
					active={activePanel === "inspector"}
					icon={SlidersHorizontal}
					label="Inspector"
					onClick={() => setActivePanel("inspector")}
				/>
			</div>
			{activePanel === "assistant" ? (
				assistant
			) : selectedBlock ? (
				<div className="p-6">
					<Typography className="text-[var(--app-fg)]" variant="h3">
						{AppKeyword.ConfigureNode}
					</Typography>
					<div className="mt-8 border border-[var(--app-border)] bg-[var(--app-muted)] p-4">
						<Typography
							className="text-[var(--app-muted-fg)]"
							variant="caption"
						>
							{workflowBlockTone[selectedBlock.kind].label}
						</Typography>
						<Typography className="mt-2 text-[var(--app-fg)]" variant="h3">
							{selectedBlock.title}
						</Typography>
						<Typography
							className="mt-3 text-[var(--app-muted-fg)]"
							variant="bodySm"
						>
							{selectedBlock.description}
						</Typography>
						<div className="mt-6">
							<ConfigInput
								label="Node name"
								onChange={(value) => onUpdateBlock({ title: value })}
								value={selectedBlock.title}
							/>
						</div>
						<div className="mt-6">
							<ConfigTextarea
								label="Description"
								onChange={(value) => onUpdateBlock({ description: value })}
								value={selectedBlock.description}
							/>
						</div>
						<div className="mt-6 grid gap-2">
							<span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-muted-fg)]">
								{AppKeyword.Market}
							</span>
							<div className="h-12 border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-3 text-sm text-[var(--app-fg)]">
								{activeVenue.label}
							</div>
						</div>
						<WorkflowParamFields
							block={selectedBlock}
							onUpdateParams={updateParams}
						/>
						<div className="mt-6">
							<ConfigInput
								disabled
								label={AppKeyword.Value}
								name={BuilderFieldName.Value}
								onChange={() => undefined}
								value={selectedBlock.value}
							/>
						</div>
					</div>
				</div>
			) : (
				<div className="grid flex-1 place-items-center px-6 text-center">
					<div className="w-full">
						<DraftingCompass className="mx-auto size-12 text-[var(--app-fg)]" />
						<Typography className="mt-8 text-[var(--app-fg)]" variant="h3">
							Select Node To Configure
						</Typography>
						<Typography
							className="mt-3 text-[var(--app-muted-fg)]"
							variant="body"
						>
							Or drag blocks from the library
						</Typography>
						{market && (
							<div className="mt-8 border border-[var(--app-border)] bg-[var(--app-muted)] p-4 text-left">
								<Typography
									className="text-[var(--app-muted-fg)]"
									variant="caption"
								>
									{AppKeyword.SelectedMarket}
								</Typography>
								<Typography className="mt-2 text-[var(--app-fg)]" variant="h3">
									{market.title}
								</Typography>
								<div className="mt-5 grid grid-cols-2 gap-2">
									<MarketMetric label={AppKeyword.Yes} value={market.yes} />
									<MarketMetric label={AppKeyword.No} value={market.no} />
								</div>
								<MarketMetric
									className="mt-2"
									label={AppKeyword.Volume}
									value={market.volume}
								/>
							</div>
						)}
					</div>
				</div>
			)}
		</aside>
	);
}

function PanelTab({
	active,
	icon: Icon,
	label,
	onClick,
}: {
	active: boolean;
	icon: typeof Bot;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			className={`flex h-10 items-center justify-center gap-2 text-xs font-semibold transition-colors ${
				active
					? "bg-primary text-primary-foreground"
					: "text-[var(--app-muted-fg)] hover:bg-[var(--app-muted)] hover:text-[var(--app-fg)]"
			}`}
			onClick={onClick}
			type="button"
		>
			<Icon className="size-3.5" />
			{label}
		</button>
	);
}

function WorkflowParamFields({
	block,
	onUpdateParams,
}: {
	block: WorkflowBlock;
	onUpdateParams: (updates: Record<string, WorkflowParamValue>) => void;
}) {
	if (block.action === workflowActionType.triggerPriceMoves) {
		return <OutcomeField block={block} onUpdateParams={onUpdateParams} />;
	}

	if (block.action === workflowActionType.triggerVolumeMoves) {
		return (
			<div className="mt-6">
				<ConfigInput
					label="Minimum change %"
					onChange={(value) =>
						onUpdateParams({ minimum_change_percent: toNumber(value) })
					}
					type="number"
					value={String(block.params.minimum_change_percent ?? "")}
				/>
			</div>
		);
	}

	if (block.action === workflowActionType.triggerTimeCheck) {
		return (
			<div className="mt-6">
				<label className="grid gap-2">
					<span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-muted-fg)]">
						Interval
					</span>
					<select
						className="h-12 border border-[var(--app-border)] bg-[var(--app-bg)] px-3 text-sm text-[var(--app-fg)] outline-none focus:border-primary"
						onChange={(event) =>
							onUpdateParams({ interval: event.target.value })
						}
						value={String(block.params.interval ?? "1h")}
					>
						<option value="5m">5 minutes</option>
						<option value="15m">15 minutes</option>
						<option value="30m">30 minutes</option>
						<option value="1h">1 hour</option>
						<option value="4h">4 hours</option>
						<option value="12h">12 hours</option>
						<option value="24h">24 hours</option>
					</select>
				</label>
				<p className="mt-2 text-xs leading-5 text-[var(--app-muted-fg)]">
					The first observation starts the schedule; it does not send an action.
				</p>
			</div>
		);
	}

	if (
		block.action === workflowActionType.conditionOutcomePriceAbove ||
		block.action === workflowActionType.conditionOutcomePriceBelow
	) {
		return (
			<>
				<OutcomeField block={block} onUpdateParams={onUpdateParams} />
				<div className="mt-6">
					<ConfigInput
						label="Target price"
						onChange={(value) => onUpdateParams({ price: toNumber(value) })}
						type="number"
						value={String(block.params.price ?? "")}
					/>
				</div>
			</>
		);
	}

	if (block.action === workflowActionType.conditionVolumeAbove) {
		return (
			<div className="mt-6">
				<ConfigInput
					label="Target volume"
					onChange={(value) => onUpdateParams({ volume: toNumber(value) })}
					type="number"
					value={String(block.params.volume ?? "")}
				/>
			</div>
		);
	}

	if (
		block.action === workflowActionType.buy ||
		block.action === workflowActionType.sell
	) {
		return (
			<>
				<OutcomeField block={block} onUpdateParams={onUpdateParams} />
				<div className="mt-6">
					<ConfigInput
						label={
							block.action === workflowActionType.buy
								? "BUY amount (USDC)"
								: "SELL quantity (shares)"
						}
						onChange={(value) =>
							onUpdateParams(
								block.action === workflowActionType.buy
									? { usdc_amount: toNumber(value) }
									: { shares: toNumber(value) },
							)
						}
						type="number"
						value={String(
							block.action === workflowActionType.buy
								? (block.params.usdc_amount ?? "")
								: (block.params.shares ?? ""),
						)}
					/>
				</div>
				<div className="mt-6">
					<ConfigInput
						label="Required limit price"
						onChange={(value) =>
							onUpdateParams({ limit_price: toNumber(value) })
						}
						type="number"
						value={String(block.params.limit_price ?? "")}
					/>
				</div>
				<p className="mt-3 text-xs leading-5 text-[var(--app-muted-fg)]">
					This action only sends an approval notification. It never places or
					signs an order.
				</p>
			</>
		);
	}

	return (
		<>
			<div className="mt-6">
				<label className="grid gap-2">
					<span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-muted-fg)]">
						Channel
					</span>
					<select
						className="h-12 border border-[var(--app-border)] bg-[var(--app-bg)] px-3 text-sm text-[var(--app-fg)] outline-none focus:border-primary"
						onChange={(event) =>
							onUpdateParams({ channel: event.target.value })
						}
						value={String(block.params.channel ?? workflowMessageChannel.inApp)}
					>
						<option value={workflowMessageChannel.inApp}>In app</option>
					</select>
				</label>
			</div>
			<div className="mt-6">
				<ConfigTextarea
					label="Message"
					onChange={(value) => onUpdateParams({ message: value })}
					value={String(block.params.message ?? "")}
				/>
			</div>
		</>
	);
}

function OutcomeField({
	block,
	onUpdateParams,
}: {
	block: WorkflowBlock;
	onUpdateParams: (updates: Record<string, WorkflowParamValue>) => void;
}) {
	return (
		<div className="mt-6">
			<label className="grid gap-2">
				<span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-muted-fg)]">
					Outcome
				</span>
				<select
					className="h-12 border border-[var(--app-border)] bg-[var(--app-bg)] px-3 text-sm text-[var(--app-fg)] outline-none focus:border-primary"
					onChange={(event) => onUpdateParams({ outcome: event.target.value })}
					value={String(block.params.outcome ?? workflowOutcome.yes)}
				>
					<option value={workflowOutcome.yes}>YES</option>
					<option value={workflowOutcome.no}>NO</option>
				</select>
			</label>
		</div>
	);
}

function ConfigInput({
	disabled,
	label,
	name,
	onChange,
	type = "text",
	value,
}: {
	disabled?: boolean;
	label: string;
	name?: string;
	onChange: (value: string) => void;
	type?: string;
	value: string;
}) {
	return (
		<label className="grid gap-2">
			<span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-muted-fg)]">
				{label}
			</span>
			<input
				className="h-12 border border-[var(--app-border)] bg-[var(--app-bg)] px-3 text-sm text-[var(--app-fg)] outline-none focus:border-primary disabled:opacity-70"
				disabled={disabled}
				name={name}
				onChange={(event) => onChange(event.target.value)}
				type={type}
				value={value}
			/>
		</label>
	);
}

function ConfigTextarea({
	label,
	onChange,
	value,
}: {
	label: string;
	onChange: (value: string) => void;
	value: string;
}) {
	return (
		<label className="grid gap-2">
			<span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-muted-fg)]">
				{label}
			</span>
			<textarea
				className="min-h-24 resize-none border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-3 text-sm text-[var(--app-fg)] outline-none focus:border-primary"
				onChange={(event) => onChange(event.target.value)}
				value={value}
			/>
		</label>
	);
}

function MarketMetric({
	className,
	label,
	value,
}: {
	className?: string;
	label: string;
	value: string;
}) {
	return (
		<div
			className={`border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 ${className ?? ""}`}
		>
			<Typography className="text-[var(--app-muted-fg)]" variant="caption">
				{label}
			</Typography>
			<Typography className="mt-1 text-[var(--app-fg)]" variant="label">
				{value}
			</Typography>
		</div>
	);
}

function toNumber(value: string) {
	const number = Number(value);

	return Number.isFinite(number) ? number : null;
}
