import {
	ArrowUp,
	Bot,
	Check,
	ChevronDown,
	Sparkles,
	User,
	Zap,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import { CustomModal } from "@/components/dialogs/custom-modal.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useAutomationAssistant } from "@/hooks/use-automations.ts";
import { useLlmProviders } from "@/hooks/use-llm-providers.ts";
import type {
	AutomationAssistantMessage,
	AutomationMarketPayload,
	AutomationProvider,
	WorkflowPayload,
} from "@/packages/types/automation.types.ts";
import {
	llmProvider,
	type LlmProvider,
} from "@/packages/types/llm-provider.types.ts";
import { getRequestErrorMessage } from "@/util/errors.ts";

type AutomationAssistantPanelProps = {
	currentWorkflow: WorkflowPayload;
	market?: AutomationMarketPayload | null;
	onApply: (workflow: WorkflowPayload) => void;
	provider: AutomationProvider;
};

const welcomeMessage: AutomationAssistantMessage = {
	role: "assistant",
	content:
		"Describe what should happen and I’ll build the workflow on this canvas. You can review every block before publishing.",
};

const suggestions = [
	"Every hour, notify me if YES falls below 35¢",
	"When volume moves 10%, send me an alert",
	"Check every 15 minutes and notify me if NO is above 60¢",
];

export function AutomationAssistantPanel({
	currentWorkflow,
	market,
	onApply,
	provider,
}: AutomationAssistantPanelProps) {
	const [draft, setDraft] = useState("");
	const [messages, setMessages] = useState<AutomationAssistantMessage[]>([
		welcomeMessage,
	]);
	const [selectedLlmProvider, setSelectedLlmProvider] =
		useState<LlmProvider>(llmProvider.chatGpt);
	const [providerModalOpen, setProviderModalOpen] = useState(false);
	const assistant = useAutomationAssistant();
	const { providers: llmProviders } = useLlmProviders();
	const selectedConnection = llmProviders.find(
		(provider) => provider.provider === selectedLlmProvider,
	);

	useEffect(() => {
		if (selectedConnection?.connected) {
			return;
		}

		const connectedProvider = llmProviders.find(
			(provider) => provider.connected,
		);

		if (connectedProvider) {
			setSelectedLlmProvider(connectedProvider.provider);
		}
	}, [llmProviders, selectedConnection?.connected]);

	const submit = async (event?: FormEvent) => {
		event?.preventDefault();
		const prompt = draft.trim();

		if (!prompt || !market || assistant.isPending) {
			return;
		}

		const priorMessages = messages.slice(1).slice(-10);
		const userMessage: AutomationAssistantMessage = {
			content: prompt,
			role: "user",
		};
		setMessages((items) => items.concat(userMessage));
		setDraft("");

		try {
			const response = await assistant.mutateAsync({
				current_workflow:
					currentWorkflow.steps.length > 0 ? currentWorkflow : undefined,
				market,
				llm_provider: selectedLlmProvider,
				messages: priorMessages,
				prompt,
				provider,
			});
			setMessages((items) =>
				items.concat({ content: response.data.reply, role: "assistant" }),
			);

			if (response.data.workflow) {
				onApply(response.data.workflow);
			}
		} catch (error) {
			setMessages((items) =>
				items.concat({
					content:
						getRequestErrorMessage(error, "I couldn’t build that workflow") ??
						"I couldn’t build that workflow",
					role: "assistant",
				}),
			);
		}
	};

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="border-b border-[var(--app-border)] px-5 py-4">
				<div className="flex items-start gap-3">
					<div className="grid size-9 shrink-0 place-items-center bg-primary text-primary-foreground">
						<Sparkles className="size-4" />
					</div>
					<div>
						<p className="text-sm font-semibold text-[var(--app-fg)]">
							Build with AI
						</p>
						<p className="mt-1 text-xs leading-5 text-[var(--app-muted-fg)]">
							Creates a draft. Publishing always stays in your control.
						</p>
					</div>
				</div>
			</div>

			<div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
				{messages.map((message) => (
					<div
						className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
						key={`${message.role}-${message.content}`}
					>
						<div
							className={`grid size-7 shrink-0 place-items-center ${
								message.role === "assistant"
									? "bg-primary text-primary-foreground"
									: "bg-[var(--app-muted)] text-[var(--app-fg)]"
							}`}
						>
							{message.role === "assistant" ? (
								<Bot className="size-3.5" />
							) : (
								<User className="size-3.5" />
							)}
						</div>
						<div
							className={`max-w-[82%] px-3 py-2 text-sm leading-6 ${
								message.role === "user"
									? "bg-primary text-primary-foreground"
									: "border border-[var(--app-border)] bg-[var(--app-muted)] text-[var(--app-fg)]"
							}`}
						>
							{message.content}
						</div>
					</div>
				))}
				{assistant.isPending && (
					<div className="flex items-center gap-3 text-sm text-[var(--app-muted-fg)]">
						<div className="grid size-7 place-items-center bg-primary text-primary-foreground">
							<Bot className="size-3.5" />
						</div>
						<span className="animate-pulse">Building your workflow…</span>
					</div>
				)}
			</div>

			<div className="border-t border-[var(--app-border)] p-4">
				{messages.length === 1 && (
					<div className="mb-3 flex gap-2 overflow-x-auto pb-1">
						{suggestions.map((suggestion) => (
							<button
								className="shrink-0 border border-[var(--app-border)] bg-[var(--app-muted)] px-3 py-2 text-left text-xs text-[var(--app-muted-fg)] transition-colors hover:border-primary hover:text-[var(--app-fg)]"
								key={suggestion}
								onClick={() => setDraft(suggestion)}
								type="button"
							>
								{suggestion}
							</button>
						))}
					</div>
				)}
				<div className="mb-3">
					<button
						aria-label="Choose AI provider"
						className="flex h-11 w-full items-center justify-between border border-[var(--app-border)] bg-[var(--app-bg)] px-3 text-left transition-colors hover:border-primary"
						onClick={() => setProviderModalOpen(true)}
						type="button"
					>
						<span className="flex min-w-0 items-center gap-2.5">
							<span className="grid size-7 shrink-0 place-items-center bg-[var(--app-muted)] text-[var(--app-fg)]">
								{selectedLlmProvider === llmProvider.chatGpt ? (
									<Bot className="size-3.5" />
								) : (
									<Zap className="size-3.5" />
								)}
							</span>
							<span className="min-w-0">
								<span className="block truncate text-xs font-semibold text-[var(--app-fg)]">
									{selectedConnection?.label ?? "Choose provider"}
								</span>
								<span className="block text-[10px] text-[var(--app-muted-fg)]">
									{selectedConnection?.connected ? "Connected" : "Not connected"}
								</span>
							</span>
						</span>
						<ChevronDown className="size-4 shrink-0 text-[var(--app-muted-fg)]" />
					</button>
				</div>
				<CustomModal
					className="sm:max-w-lg"
					description="Pick the model provider that should build this workflow."
					onOpenChange={setProviderModalOpen}
					open={providerModalOpen}
					showCloseButton
					title="Choose AI provider"
				>
					<div className="space-y-2 pt-2">
						{llmProviders.map((provider) => {
							const selected = provider.provider === selectedLlmProvider;

							return (
								<div
									className={`flex items-center gap-3 border p-4 ${
										selected
											? "border-primary bg-primary/5"
											: "border-[var(--app-border)] bg-[var(--app-bg)]"
									}`}
									key={provider.provider}
								>
									<div className="grid size-10 shrink-0 place-items-center bg-[var(--app-muted)] text-[var(--app-fg)]">
										{provider.provider === llmProvider.chatGpt ? (
											<Bot className="size-5" />
										) : (
											<Zap className="size-5" />
										)}
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<p className="text-sm font-semibold text-[var(--app-fg)]">
												{provider.label}
											</p>
											{selected ? (
												<span className="bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
													Selected
												</span>
											) : null}
										</div>
										<p className="mt-1 text-xs text-[var(--app-muted-fg)]">
											{provider.connected
												? "Ready to build automations"
												: "Connect this provider to continue"}
										</p>
									</div>
									{provider.connected ? (
										<Button
											disabled={selected}
											onClick={() => {
												setSelectedLlmProvider(provider.provider);
												setProviderModalOpen(false);
											}}
											size="sm"
											type="button"
										>
											{selected ? "Selected" : "Use"}
										</Button>
									) : (
										<a
											className="text-xs font-semibold text-primary hover:underline"
											href="/settings#ai"
										>
											Connect
										</a>
									)}
								</div>
							);
						})}
					</div>
				</CustomModal>
				<form className="relative" onSubmit={submit}>
					<textarea
						aria-label="Describe your automation"
						className="min-h-28 w-full resize-none border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-3 pr-12 text-sm leading-6 text-[var(--app-fg)] outline-none placeholder:text-[var(--app-muted-fg)] focus:border-primary"
						disabled={
							!market || !selectedConnection?.connected || assistant.isPending
						}
						maxLength={2000}
						onChange={(event) => setDraft(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter" && !event.shiftKey) {
								event.preventDefault();
								void submit();
							}
						}}
						placeholder={
							!market
								? "Loading market…"
								: selectedConnection?.connected
									? "Tell me what to automate…"
									: "Connect this provider in Settings"
						}
						value={draft}
					/>
					<Button
						aria-label="Build automation"
						className="absolute bottom-3 right-3 size-8 p-0"
						disabled={
							!draft.trim() ||
							!market ||
							!selectedConnection?.connected ||
							assistant.isPending
						}
						type="submit"
					>
						{assistant.isPending ? (
							<Sparkles className="size-4 animate-pulse" />
						) : (
							<ArrowUp className="size-4" />
						)}
					</Button>
				</form>
				<div className="mt-3 flex items-center gap-2 text-[11px] leading-4 text-[var(--app-muted-fg)]">
					<Check className="size-3.5 shrink-0 text-success" />
					<span>AI drafts are validated before they reach the canvas.</span>
				</div>
			</div>
		</div>
	);
}
