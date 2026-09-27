import { getFiniteNumber } from "./numbers.ts";

export function formatCompactCurrency(value: number | string | undefined) {
	const numberValue = getFiniteNumber(value);

	if (numberValue === null) {
		return "$0";
	}

	return new Intl.NumberFormat("en-US", {
		compactDisplay: "short",
		currency: "USD",
		maximumFractionDigits: 1,
		notation: "compact",
		style: "currency",
	}).format(numberValue);
}

export function formatPrice(value: number | undefined) {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return "$0.00";
	}

	return `$${value.toFixed(value < 0.01 ? 3 : 2)}`;
}

export function formatPercentageChange(value: number) {
	const percentage = value * 100;
	const sign = percentage >= 0 ? "+" : "";

	return `${sign}${percentage.toFixed(1)}%`;
}

export function formatMarketPrice(value: number | string | undefined) {
	const numberValue = getFiniteNumber(value);

	if (numberValue === null) {
		return "—";
	}

	return `${(numberValue * 100).toFixed(numberValue < 0.01 ? 2 : 1)}¢`;
}

export function formatOutcomePercent(value: number | string | undefined) {
	const numberValue = getFiniteNumber(value);

	if (numberValue === null) {
		return "0%";
	}

	return `${Math.round(numberValue * 100)}%`;
}

export function formatMarketWindow(market: {
	endDate: string | null;
	startDate: string | null;
}) {
	const start = formatDate(market.startDate);
	const end = formatDate(market.endDate);

	if (start && end) {
		return `${start}-${end}`;
	}

	return start ?? end ?? "Market schedule unavailable";
}

export function formatDate(value: string | null | undefined) {
	if (!value) {
		return null;
	}

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}
