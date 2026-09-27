import {
	Bell,
	Bot,
	Check,
	Heart,
	MessageCircle,
	Network,
	ShieldCheck,
	Wallet,
	Workflow,
} from "lucide-react";
import { useEffect, useState } from "react";
import { CustomModal } from "@/components/dialogs/custom-modal.tsx";
import { Typography } from "@/components/typography/typography.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
	useCompleteOnboarding,
	useCurrentUser,
	useTradingProviders,
	useUpdateTradingProvider,
} from "@/hooks/use-auth.ts";
import { cn } from "@/lib/utils.ts";
import {
	type ProviderApiId,
	providerCatalog,
} from "@/packages/providers/provider-config.ts";
import { getRequestErrorMessage } from "@/util/errors.ts";

const onboardingSlides = [
	{
		body: "Choose a market ecosystem. Uptions will use its chain, wallet, and settlement assets automatically.",
		title: "Where do you want to trade?",
	},
	{
		body: "Connect triggers, conditions, and actions to automate how your strategy responds.",
		title: "Automate with visual workflows",
	},
	{
		body: "Use your selected provider and wallet while Uptions verifies the required chain before trading.",
		title: "Trade with checks in place",
	},
	{
		body: "Follow favorites, join comments, and use alerts to track what needs your attention.",
		title: "Keep up with every market",
	},
] as const;

export function FirstLoginOnboarding() {
	const { user } = useCurrentUser();
	const completeOnboarding = useCompleteOnboarding();
	const updateTradingProvider = useUpdateTradingProvider();
	const tradingProviders = useTradingProviders();
	const [activeSlide, setActiveSlide] = useState(0);
	const [dismissed, setDismissed] = useState(false);
	const [selectedProvider, setSelectedProvider] = useState<ProviderApiId>(
		user?.preferred_trading_provider ?? providerCatalog[0].apiId,
	);
	const slide = onboardingSlides[activeSlide];
	const isLastSlide = activeSlide === onboardingSlides.length - 1;
	const isOpen = user?.onboarding_completed === false && !dismissed;
	const mutationError = completeOnboarding.error ?? updateTradingProvider.error;
	const error = getRequestErrorMessage(
		mutationError,
		"We could not save your onboarding progress.",
	);
	const isPending =
		completeOnboarding.isPending || updateTradingProvider.isPending;

	useEffect(() => {
		if (!user?.id) {
			return;
		}

		setDismissed(
			window.sessionStorage.getItem(onboardingDismissalKey(user.id)) === "true",
		);
	}, [user?.id]);

	useEffect(() => {
		if (user?.preferred_trading_provider) {
			setSelectedProvider(user.preferred_trading_provider);
		}
	}, [user?.preferred_trading_provider]);

	function persistCompletion() {
		completeOnboarding.mutate();
	}

	async function continueOnboarding() {
		try {
			if (activeSlide === 0) {
				if (user?.preferred_trading_provider !== selectedProvider) {
					await updateTradingProvider.mutateAsync({
						provider: selectedProvider,
					});
				}
				setActiveSlide(1);
				return;
			}

			if (isLastSlide) {
				persistCompletion();
				return;
			}

			setActiveSlide((current) => current + 1);
		} catch {
			// Mutation state renders the actionable error without leaking a rejection.
		}
	}

	return (
		<CustomModal
			className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto border-app-border bg-app-card p-0 text-app-fg sm:max-w-xl"
			onOpenChange={(open) => {
				if (!open && completeOnboarding.isError) {
					setDismissed(true);
				}
			}}
			open={isOpen}
			showCloseButton={false}
			showHeader={false}
			title={slide.title}
		>
			<OnboardingPreview
				activeSlide={activeSlide}
				onProviderChange={setSelectedProvider}
				providerAvailability={Object.fromEntries(
					tradingProviders.providers.map((provider) => [
						provider.provider,
						provider.available,
					]),
				)}
				selectedProvider={selectedProvider}
			/>
			<div className="grid gap-5 p-5 sm:p-7">
				<div className="grid gap-3">
					<Typography variant="h2">{slide.title}</Typography>
					<Typography className="max-w-lg text-app-muted-fg" variant="bodySm">
						{slide.body}
					</Typography>
				</div>
				<div
					aria-label={`Step ${activeSlide + 1} of ${onboardingSlides.length}`}
					aria-valuemax={onboardingSlides.length}
					aria-valuemin={1}
					aria-valuenow={activeSlide + 1}
					className="grid grid-cols-4 gap-2"
					role="progressbar"
				>
					{onboardingSlides.map((item, index) => (
						<span
							aria-hidden="true"
							className={cn(
								"h-1 bg-app-muted",
								index <= activeSlide && "bg-primary",
							)}
							key={item.title}
						/>
					))}
				</div>
				{completeOnboarding.isError || updateTradingProvider.isError ? (
					<div
						className="grid gap-3 border border-danger/30 bg-danger/10 p-3"
						role="alert"
					>
						<Typography className="text-danger" variant="caption">
							{error}
						</Typography>
						<div className="flex flex-col gap-2 sm:flex-row">
							<Button
								className="h-9"
								onClick={() => {
									if (activeSlide === 0) {
										void continueOnboarding();
										return;
									}
									persistCompletion();
								}}
								type="button"
							>
								Retry
							</Button>
							<Button
								className="h-9 border-app-border bg-app-surface text-app-fg hover:bg-app-muted"
								onClick={() => {
									if (user?.id) {
										window.sessionStorage.setItem(
											onboardingDismissalKey(user.id),
											"true",
										);
									}
									setDismissed(true);
								}}
								type="button"
								variant="outline"
							>
								Continue to dashboard
							</Button>
						</div>
					</div>
				) : null}
				<div className="flex flex-col-reverse gap-2 border-t border-app-border pt-5 sm:flex-row sm:items-center sm:justify-between">
					<div>
						{activeSlide > 0 ? (
							<Button
								className="h-10 w-full sm:w-auto"
								disabled={isPending}
								onClick={() => setActiveSlide((current) => current - 1)}
								type="button"
								variant="ghost"
							>
								Back
							</Button>
						) : null}
					</div>
					<div className="flex flex-col-reverse gap-2 sm:flex-row">
						{activeSlide > 0 && !isLastSlide ? (
							<Button
								className="h-10"
								disabled={isPending}
								onClick={persistCompletion}
								type="button"
								variant="ghost"
							>
								{isPending ? "Saving" : "Skip"}
							</Button>
						) : null}
						<Button
							className="h-10"
							disabled={isPending}
							onClick={() => void continueOnboarding()}
							type="button"
						>
							{isPending
								? "Saving"
								: activeSlide === 0
									? `Use ${providerCatalog.find((provider) => provider.apiId === selectedProvider)?.label ?? "market"}`
									: isLastSlide
										? "Finish"
										: "Continue"}
						</Button>
					</div>
				</div>
			</div>
		</CustomModal>
	);
}

function onboardingDismissalKey(userId: string) {
	return `uptions-onboarding-dismissed:${userId}`;
}

function OnboardingPreview({
	activeSlide,
	onProviderChange,
	providerAvailability,
	selectedProvider,
}: {
	activeSlide: number;
	onProviderChange: (provider: ProviderApiId) => void;
	providerAvailability: Record<string, boolean>;
	selectedProvider: ProviderApiId;
}) {
	return (
		<div className="grid min-h-52 place-items-center border-b border-app-border bg-app-muted p-5 sm:min-h-60 sm:p-8">
			{activeSlide === 0 ? (
				<ProviderSelection
					onChange={onProviderChange}
					providerAvailability={providerAvailability}
					value={selectedProvider}
				/>
			) : null}
			{activeSlide === 1 ? <WorkflowPreview /> : null}
			{activeSlide === 2 ? <TradingPreview /> : null}
			{activeSlide === 3 ? <CommunityPreview /> : null}
		</div>
	);
}

function ProviderSelection({
	onChange,
	providerAvailability,
	value,
}: {
	onChange: (provider: ProviderApiId) => void;
	providerAvailability: Record<string, boolean>;
	value: ProviderApiId;
}) {
	return (
		<div className="grid w-full max-w-md gap-3 sm:grid-cols-2">
			{providerCatalog.map((provider) => {
				const selected = provider.apiId === value;
				const available =
					providerAvailability[provider.apiId] ??
					provider.apiId === providerCatalog[0].apiId;

				return (
					<button
						aria-pressed={selected}
						className={cn(
							"grid min-h-40 gap-4 border bg-app-surface p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
							selected
								? "border-primary shadow-[inset_0_0_0_1px_var(--primary)]"
								: "border-app-border hover:border-primary/60",
						)}
						disabled={!available}
						key={provider.apiId}
						onClick={() => onChange(provider.apiId)}
						type="button"
					>
						<div className="flex items-start justify-between gap-3">
							<div className="grid size-10 place-items-center bg-app-muted text-sm font-black text-primary">
								{provider.label.slice(0, 2).toUpperCase()}
							</div>
							{selected ? (
								<span className="grid size-6 place-items-center bg-primary text-primary-foreground">
									<Check className="size-4" />
								</span>
							) : null}
						</div>
						<div>
							<p className="font-semibold text-app-fg">{provider.label}</p>
							<p className="mt-1 text-xs leading-5 text-app-muted-fg">
								{provider.description}
							</p>
						</div>
						<div className="flex items-center gap-2 border-t border-app-border pt-3 text-xs text-app-muted-fg">
							<Network className="size-4" />
							{available ? (
								<>
									{provider.requiredChain.label}
									<span aria-hidden="true">/</span>
									{provider.assets.collateral}
								</>
							) : (
								"API setup required"
							)}
						</div>
					</button>
				);
			})}
		</div>
	);
}

function WorkflowPreview() {
	return (
		<div className="grid w-full max-w-sm grid-cols-[1fr_auto_1fr] items-center gap-3">
			<div className="border border-app-border bg-app-surface p-3">
				<Workflow className="size-5 text-info" />
				<p className="mt-2 text-xs font-semibold">Market trigger</p>
			</div>
			<div className="h-px w-6 bg-app-border" />
			<div className="border border-app-border bg-app-surface p-3">
				<Bot className="size-5 text-primary" />
				<p className="mt-2 text-xs font-semibold">Automated action</p>
			</div>
		</div>
	);
}

function TradingPreview() {
	const checks = [
		{ icon: Network, label: "Provider selected" },
		{ icon: Wallet, label: "Wallet connected" },
		{ icon: ShieldCheck, label: "Chain verified" },
	];

	return (
		<div className="w-full max-w-sm border border-app-border bg-app-surface p-4">
			<div className="grid gap-2">
				{checks.map(({ icon: Icon, label }) => (
					<div
						className="flex items-center justify-between border border-app-border bg-app-card px-3 py-2.5"
						key={label}
					>
						<span className="flex items-center gap-2 text-xs font-medium">
							<Icon className="size-4 text-app-muted-fg" />
							{label}
						</span>
						<span className="grid size-5 place-items-center bg-success text-success-foreground">
							<Check className="size-3" />
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

function CommunityPreview() {
	const actions = [
		{ icon: Heart, label: "Favorites" },
		{ icon: MessageCircle, label: "Comments" },
		{ icon: Bell, label: "Alerts" },
	];

	return (
		<div className="grid w-full max-w-sm grid-cols-3 gap-2">
			{actions.map(({ icon: Icon, label }) => (
				<div
					className="grid min-h-24 place-items-center border border-app-border bg-app-surface p-3 text-center"
					key={label}
				>
					<div>
						<Icon className="mx-auto size-5 text-primary" />
						<p className="mt-2 text-xs font-semibold">{label}</p>
					</div>
				</div>
			))}
		</div>
	);
}
