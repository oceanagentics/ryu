import type {
  GraphNode,
  LocalizedSystemAccessPath,
  LocalizedSystemDataDescriptor,
  LocalizedSystemGalleryItem,
  NodeLocalizationDetails,
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
  instructions: string | null;
  caveats: string[];
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

export function resolveNodeDisplay(
  node: GraphNode,
  locale: SupportedLocale = defaultLocale,
): ResolvedNodeLocalization {
  return resolveNodeLocalization(node, locale);
}

export function nodeTitle(node: GraphNode, locale: SupportedLocale = defaultLocale): string {
  return resolveNodeDisplay(node, locale).title;
}

export function localizationDetails(
  localization: ResolvedNodeLocalization,
): NodeLocalizationDetails {
  return localization.details ?? emptyLocalizationDetails();
}

function byId<T extends { id: string }>(values: T[] | undefined): Record<string, T> {
  return Object.fromEntries((values ?? []).map((value) => [value.id, value]));
}

export function systemGallery(
  system: GraphNode,
  localization: ResolvedNodeLocalization,
): ResolvedSystemGalleryItem[] {
  const localizedById = byId<LocalizedSystemGalleryItem>(localizationDetails(localization).gallery);

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
  system: GraphNode,
  localization: ResolvedNodeLocalization,
): ResolvedSystemAccessPath[] {
  const localizedById = byId<LocalizedSystemAccessPath>(localizationDetails(localization).access);

  return (system.properties.access ?? []).map((path) => {
    const localized = localizedById[path.id];
    return {
      ...path,
      label: localized?.label ?? path.method,
      description: localized?.description ?? null,
      instructions: localized?.instructions ?? null,
      caveats: localized?.caveats ?? [],
    };
  });
}

export function systemDataDescriptors(
  system: GraphNode,
  localization: ResolvedNodeLocalization,
): ResolvedSystemDataDescriptor[] {
  const localizedById = byId<LocalizedSystemDataDescriptor>(
    localizationDetails(localization).data.descriptors,
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
  system: GraphNode,
  localization: ResolvedNodeLocalization,
): ResolvedSourcedMetric[] {
  const localizedById = byId(localizationDetails(localization).metrics);
  return (system.properties.metrics ?? []).map(metric => ({
    ...metric,
    label: vocabularyLabel(localization.requestedLocale, "metricKeys", metric.key),
    description: localizedById[metric.id]?.description ?? null,
  })).sort((a, b) => Object.keys(metricDefinitions).indexOf(a.key) - Object.keys(metricDefinitions).indexOf(b.key));
}
