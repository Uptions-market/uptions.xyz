import {
	defaultProvider,
	type ProviderRouteId,
	providerCatalog,
} from "@/packages/providers/provider-config.ts";

export const venueIds = {
	dflow: "dflow",
	polymarket: defaultProvider.venue.id,
} as const satisfies Record<string, ProviderRouteId>;

export type VenueId = ProviderRouteId;

export type VenueConfig = {
	description: string;
	id: VenueId;
	label: string;
};

export const venues = providerCatalog.map((provider) => ({
	description: provider.description,
	id: provider.venue.id,
	label: provider.venue.label,
})) satisfies readonly VenueConfig[];

export const defaultVenueId = defaultProvider.venue.id;

export function getVenueConfig(venue: VenueId) {
	return venues.find((item) => item.id === venue) ?? venues[0];
}
