import type {
  CountryTreatyParticipation,
  GraphNode,
  SystemMetric,
  GraphNodeKind,
  LocalizedCountryTreatyParticipation,
  LocalizedOrganizationOffice,
  LocalizedSystemAccessPath,
  LocalizedSystemDataDescriptor,
  LocalizedSystemGalleryItem,
  OrganizationOffice,
  ResolvedNodeLocalization,
  SourcedMetric,
  SupportedLocale,
  SystemAccessPath,
  SystemDataDescriptor,
  SystemGalleryItem,
} from "./domain";
import {
  defaultLocale,
  emptyLocalizationDetails,
  resolveNodeLocalization,
} from "./localization";
import { metricDefinitions } from "./domain";
import { dataDescriptorLabel, vocabularyLabel } from "./i18n";

export type ResolvedSystemAccessPath = SystemAccessPath & {
  label: string;
  description: string | null;
};

export type ResolvedSystemGalleryItem = SystemGalleryItem & {
  title: string | null;
  caption: string | null;
  altText: string | null;
};

export type ResolvedSourcedMetric = SourcedMetric & {
  label: string;
  description: string | null;
};

export type ResolvedSystemDataDescriptor = SystemDataDescriptor & {
  localizedLabel: string;
  description: string | null;
};

export type ResolvedCountryTreatyParticipation = CountryTreatyParticipation & {
  title: string;
  description: string | null;
  focalPoint: string | null;
};

export type ResolvedOrganizationOffice = OrganizationOffice & {
  location: string;
};

export function resolveNodeDisplay<N extends GraphNode>(
  node: N,
  locale: SupportedLocale = defaultLocale,
): ResolvedNodeLocalization<N["kind"]> {
  return resolveNodeLocalization(node, locale);
}

export function nodeTitle(node: GraphNode, locale: SupportedLocale = defaultLocale): string {
  return resolveNodeDisplay(node, locale).title;
}

export function localizationDetails<K extends GraphNodeKind>(
  localization: ResolvedNodeLocalization<K>,
): ResolvedNodeLocalization<K>["details"] {
  return localization.details ?? emptyLocalizationDetails();
}

function byId<T extends { id: string }>(values: T[] | undefined): Record<string, T> {
  return Object.fromEntries((values ?? []).map((value) => [value.id, value]));
}

export function countryTreatyParticipation(
  country: GraphNode<"country">,
  localization: ResolvedNodeLocalization<"country">,
): ResolvedCountryTreatyParticipation[] {
  const details = localizationDetails(localization);
  const localizedById = byId<LocalizedCountryTreatyParticipation>(
    "treatyParticipation" in details ? details.treatyParticipation : undefined,
  );

  return (country.properties.treatyParticipation ?? []).map((item) => ({
    ...item,
    title: localizedById[item.id]?.title ?? item.id,
    description: localizedById[item.id]?.description ?? null,
    focalPoint: localizedById[item.id]?.focalPoint ?? null,
  }));
}

export function systemGallery(
  system: GraphNode<"system">,
  localization: ResolvedNodeLocalization<"system">,
): ResolvedSystemGalleryItem[] {
  const details = localizationDetails(localization);
  const localizedById = byId<LocalizedSystemGalleryItem>("gallery" in details ? details.gallery : undefined);

  return (system.properties.gallery ?? []).map((item) => {
    const localized = localizedById[item.id];
    return {
      ...item,
      title: localized?.title ?? null,
      caption: localized?.caption ?? null,
      altText: localized?.altText ?? null,
    };
  });
}

export function systemAccessPaths(
  system: GraphNode<"system">,
  localization: ResolvedNodeLocalization<"system">,
): ResolvedSystemAccessPath[] {
  const details = localizationDetails(localization);
  const localizedById = byId<LocalizedSystemAccessPath>("access" in details ? details.access : undefined);

  return (system.properties.access ?? []).map((path) => {
    const localized = localizedById[path.id];
    return {
      ...path,
      label: localized?.label ?? path.methods.map(method => vocabularyLabel(localization.requestedLocale, "accessMethods", method)).join(", "),
      description: localized?.description ?? null,
    };
  });
}

export function systemDataDescriptors(
  system: GraphNode<"system">,
  localization: ResolvedNodeLocalization<"system">,
): ResolvedSystemDataDescriptor[] {
  const details = localizationDetails(localization);
  const localizedById = byId<LocalizedSystemDataDescriptor>(
    "data" in details ? details.data?.descriptors : undefined,
  );

  return (system.properties.data?.descriptors ?? []).map((descriptor) => {
    const localized = localizedById[descriptor.id];
    return {
      ...descriptor,
      localizedLabel: dataDescriptorLabel(localization.requestedLocale, descriptor),
      description: localized?.description ?? null,
    };
  });
}

export function systemMetrics(
  system: GraphNode<"system">,
  localization: ResolvedNodeLocalization<"system">,
): (SystemMetric & { label: string; description: string | null })[] {
  const details = localizationDetails(localization);
  const localizedById = byId("metrics" in details ? details.metrics : undefined);
  return (system.properties.metrics ?? []).map(metric => ({
    ...metric,
    label: vocabularyLabel(localization.requestedLocale, "metricKeys", metric.key),
    description: localizedById[metric.id]?.description ?? null,
  })).sort((a, b) => Object.keys(metricDefinitions).indexOf(a.key) - Object.keys(metricDefinitions).indexOf(b.key));
}

export function organizationMetrics(
  organization: GraphNode<"organization">,
  localization: ResolvedNodeLocalization<"organization">,
): ResolvedSourcedMetric[] {
  return (organization.properties.metrics ?? [])
    .map(metric => ({
      ...metric,
      label: vocabularyLabel(localization.requestedLocale, "metricKeys", metric.key),
      description: null,
    }));
}

export function organizationOffices(
  organization: GraphNode<"organization">,
  localization: ResolvedNodeLocalization<"organization">,
): ResolvedOrganizationOffice[] {
  const details = localizationDetails(localization);
  const localizedById = byId<LocalizedOrganizationOffice>("offices" in details ? details.offices : undefined);
  return (organization.properties.offices ?? []).map(office => ({
    ...office,
    location: localizedById[office.id]?.location ?? office.id,
  }));
}
