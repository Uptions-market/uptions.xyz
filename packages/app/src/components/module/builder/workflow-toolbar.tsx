import { ChevronDown, Play, Redo2, Undo2, Wallet, X } from "lucide-react";

import { AppKeyword } from "@/common";
import { Typography } from "@/components/typography/typography.tsx";
import { Button } from "@/components/ui/button.tsx";
import type { Market } from "@/packages/markets/market-utils.ts";

type WorkflowToolbarProps = {
	canRedo: boolean;
	canUndo: boolean;
	market?: Market | null;
	isPublishing?: boolean;
	isTesting?: boolean;
	onPublish: () => void;
	onRedo: () => void;
	onTestRun: () => void;
	onUndo: () => void;
	statusMessage?: string | null;
	venueLabel: string;
};

export function WorkflowToolbar({
	canRedo,
	canUndo,
	isPublishing = false,
	isTesting = false,
	market,
	onPublish,
	onRedo,
	onTestRun,
	onUndo,
	statusMessage,
	venueLabel,
}: WorkflowToolbarProps) {
	return (
		<header className="flex h-[68px] shrink-0 items-center justify-between gap-4 border-b border-[var(--app-border)] bg-builder-panel px-5">
			<div className="min-w-0">
				<Typography className="text-[var(--app-fg)]" variant="h3">
					{market ? market.title : AppKeyword.UntitledWorkflow}
				</Typography>
				<p className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-[var(--app-muted-fg)]">
					{AppKeyword.Market} · {venueLabel}
				</p>
				{statusMessage ? (
					<p className="mt-1 truncate text-xs font-medium text-primary">
						{statusMessage}
					</p>
				) : null}
			</div>

			<div className="flex items-center gap-6">
				<div className="hidden items-center gap-4 text-[var(--app-muted-fg)] sm:flex">
					<Button
						aria-label="Undo"
						className="size-8 border-0 bg-transparent text-[var(--app-muted-fg)] hover:bg-[var(--app-muted)] hover:text-[var(--app-fg)]"
						disabled={!canUndo}
						onClick={onUndo}
						size="icon"
						type="button"
						variant="ghost"
					>
						<Undo2 className="size-4" />
					</Button>
					<Button
						aria-label="Redo"
						className="size-8 border-0 bg-transparent text-[var(--app-muted-fg)] hover:bg-[var(--app-muted)] hover:text-[var(--app-fg)]"
						disabled={!canRedo}
						onClick={onRedo}
						size="icon"
						type="button"
						variant="ghost"
					>
						<Redo2 className="size-4" />
					</Button>
				</div>

				<Button
					className="hidden h-9 gap-2 border-0 bg-transparent px-2 text-sm font-medium text-[var(--app-fg)] hover:bg-[var(--app-muted)] md:inline-flex"
					type="button"
					variant="ghost"
				>
					105%
					<ChevronDown className="size-4" />
				</Button>

				<Button
					className="h-9 border-0 bg-transparent px-2 text-sm font-medium text-[var(--app-fg)] hover:bg-[var(--app-muted)]"
					disabled={isPublishing || isTesting}
					onClick={onTestRun}
					type="button"
					variant="ghost"
				>
					<Play className="size-4" />
					{isTesting ? "Validating..." : "Validate workflow"}
				</Button>

				<Button
					className="h-10 bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
					disabled={isPublishing || isTesting}
					onClick={onPublish}
					type="button"
				>
					<Wallet className="size-4 md:hidden" />
					<span className="hidden md:inline">
						{isPublishing ? "Publishing..." : AppKeyword.Publish}
					</span>
				</Button>

				<a
					aria-label="Close builder"
					className="hidden text-[var(--app-muted-fg)] no-underline hover:text-[var(--app-fg)] sm:block"
					href="/dashboard"
				>
					<X className="size-5" />
				</a>
			</div>
		</header>
	);
}
