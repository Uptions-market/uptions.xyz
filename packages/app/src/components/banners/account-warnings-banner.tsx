import { AlertCircle, AlertTriangle, ArrowRight, Info } from "lucide-react";
import { useAccountWarnings } from "@/hooks/use-auth.ts";
import { cn } from "@/lib/utils.ts";
import type { AccountWarning } from "@/packages/types/auth.types.ts";

export function AccountWarningsBanner() {
	const warnings = useAccountWarnings();

	if (warnings.length === 0) {
		return null;
	}

	return (
		<section
			aria-label="Account warnings"
			aria-live="polite"
			className="border-b border-warning/30 bg-warning/5"
		>
			<div className="mx-auto grid w-full max-w-[1500px] gap-2 px-5 py-3 sm:px-8">
				{warnings.map((warning) => (
					<AccountWarningItem key={warning.code} warning={warning} />
				))}
			</div>
		</section>
	);
}

function AccountWarningItem({ warning }: { warning: AccountWarning }) {
	const Icon = warningIcon(warning.severity);

	return (
		<article
			className={cn(
				"flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between",
				warningTone(warning.severity),
			)}
		>
			<div className="flex min-w-0 items-start gap-3">
				<div className="grid size-9 shrink-0 place-items-center bg-app-card/70">
					<Icon className="size-5" />
				</div>
				<div className="min-w-0">
					<p className="text-sm font-semibold text-app-fg">{warning.title}</p>
					<p className="mt-1 text-sm leading-5 text-app-muted-fg">
						{warning.message}
					</p>
				</div>
			</div>
			<a
				className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 border border-current px-3 text-xs font-semibold no-underline transition hover:bg-app-card/70"
				href={warning.action_href}
			>
				{warning.action_label}
				<ArrowRight className="size-3.5" />
			</a>
		</article>
	);
}

function warningIcon(severity: string) {
	if (severity === "error" || severity === "danger") {
		return AlertCircle;
	}

	if (severity === "info") {
		return Info;
	}

	return AlertTriangle;
}

function warningTone(severity: string) {
	if (severity === "error" || severity === "danger") {
		return "border-danger/40 bg-danger/10 text-danger";
	}

	if (severity === "info") {
		return "border-info/40 bg-info/10 text-info";
	}

	return "border-warning/40 bg-warning/10 text-warning";
}
