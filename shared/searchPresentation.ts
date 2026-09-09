import type {
  Discipline,
  GraphEdge,
  GraphNode,
  ResolvedNodeLocalization,
  ReviewState,
  RyuRoute,
  SourceRef,
  SupportedLocale,
  SystemDataDescriptorCategory,
} from "./domain";
import type { IndexedGraph } from "./indexGraph";
import { resolveSourceLocalization } from "./localization";
import { operatorNodesForSystem } from "./indexGraph";
import {
  facetLabel,
  humanizeCode,
  type FacetGroup,
} from "./i18n";
import {
  nodeTitle,
  resolveNodeDisplay,
  systemAccessPaths,
} from "./recordDisplay";

export type ClaimFilterKey = SystemDataDescriptorCategory;
export type LocalizationCoverageFilter =
  | "current_locale"
  | "missing_current_locale";

export type GraphSearchFilters = {
  disciplines: Discipline[];
  dataClaims: Record<ClaimFilterKey, string[]>;
  accessTypes: string[];
  accessMethods: string[];
  localizationCoverage: LocalizationCoverageFilter[];
  reviewState: ReviewState[];
};

export type GraphSearchIntent = {
  query: string;
  filters: GraphSearchFilters;
  searchAllLanguages?: boolean;
};

export type SearchMatchReason = {
  field: string;
  label: string;
  value: string;
  token: string;
  score: number;
};

export type SystemSearchRecord = {
  entity: GraphNode;
  system: GraphNode;
  title: string;
  summary: string | null;
  localization: ResolvedNodeLocalization;
  operatorName: string;
  disciplines: Discipline[];
  dataTypes: string[];
  dataFormats: string[];
  dataStandards: string[];
  accessTypes: string[];
  accessMethods: string[];
  accessLabels: string[];
  hasCurrentLocale: boolean;
  currentLocaleReviewState: ReviewState | null;
  sourceTitles: string[];
  connectedNames: string[];
  relationships: GraphEdge[];
  ryuRoutes: RyuRoute[];
  score: number;
  matchReasons: SearchMatchReason[];
};

export const claimFilterKeys = ["type", "format", "standard"] as const;

export function claimFilterLabel(locale: SupportedLocale, value: ClaimFilterKey): string {
  return facetLabel(locale, "dataClaim", value);
}

export function localizationCoverageFilterOptions(locale: SupportedLocale): Array<{
  label: string;
  value: LocalizationCoverageFilter;
}> {
  return [
    {
      label: facetLabel(locale, "localizationCoverage", "current_locale"),
      value: "current_locale",
    },
    {
      label: facetLabel(locale, "localizationCoverage", "missing_current_locale"),
      value: "missing_current_locale",
    },
  ];
}

export function reviewStateFilterOptions(
  locale: SupportedLocale,
): Array<{ label: string; value: ReviewState }> {
  return [
    { label: facetLabel(locale, "reviewState", "agent_researched"), value: "agent_researched" },
    { label: facetLabel(locale, "reviewState", "human_reviewed"), value: "human_reviewed" },
    { label: facetLabel(locale, "reviewState", "needs_revision"), value: "needs_revision" },
  ];
}

export const emptySearchFilters = (): GraphSearchFilters => ({
  disciplines: [],
  dataClaims: {
    type: [],
    format: [],
    standard: [],
  },
  accessTypes: [],
  accessMethods: [],
  localizationCoverage: [],
  reviewState: [],
});

export function labelize(value: string): string {
  return humanizeCode(value);
}

export function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
    .sort((left, right) => left.localeCompare(right));
}

export function selectOptions(
  values: Array<string | null | undefined>,
  locale: SupportedLocale,
  facetGroup?: FacetGroup,
) {
  return uniqueSorted(values).map((value) => ({
    label: facetGroup ? facetLabel(locale, facetGroup, value) : labelize(value),
    value,
  }));
}

export function countActiveFilters(filters: GraphSearchFilters): number {
  return [
    filters.disciplines,
    filters.accessTypes,
    filters.accessMethods,
    filters.localizationCoverage,
    filters.reviewState,
    ...Object.values(filters.dataClaims),
  ].filter((value) => value.length > 0).length;
}

export function getRelationships(entityId: string, graph: IndexedGraph): GraphEdge[] {
  return [
    ...(graph.outgoingByNodeId[entityId] ?? []),
    ...(graph.incomingByNodeId[entityId] ?? []),
  ].map((edgeId) => graph.edgeById[edgeId]);
}

export function getConnectedNames(
  entity: GraphNode,
  graph: IndexedGraph,
  locale: SupportedLocale,
): string[] {
  const entityTitle = nodeTitle(entity, locale);
  return uniqueSorted(
    getRelationships(entity.id, graph)
      .flatMap((edge) => [
        graph.nodeById[edge.sourceNodeId]
          ? nodeTitle(graph.nodeById[edge.sourceNodeId], locale)
          : null,
        graph.nodeById[edge.targetNodeId]
          ? nodeTitle(graph.nodeById[edge.targetNodeId], locale)
          : null,
      ])
      .filter((name): name is string => Boolean(name) && name !== entityTitle),
  );
}

function sourceRefs(system: GraphNode, graph: IndexedGraph): SourceRef[] {
  const sourceIds = [
    ...(Array.isArray(system.properties.sourceRefs) ? system.properties.sourceRefs : []),
    ...Object.values(system.localizations).flatMap((localization) => localization?.details.profile?.sourceRefs ?? []),
  ];
  return [
    ...sourceIds.flatMap((id) => {
      const source = typeof id === "string" ? graph.sourceById[id] : null;
      return source ? [{ id: source.id, url: source.url ?? "" }] : [];
    }),
    ...(system.properties.gallery ?? []).map((item) => item.source),
    ...(system.properties.data?.descriptors ?? []).flatMap((descriptor) =>
      descriptor.source ? [descriptor.source] : [],
    ),
    ...(system.properties.data?.recordCount ? [system.properties.data.recordCount.source] : []),
    ...(system.properties.data?.storageSize ? [system.properties.data.storageSize.source] : []),
    ...(system.properties.access ?? []).map((path) => path.source),
    ...(system.properties.usage ?? []).map((metric) => metric.source),
  ];
}

function descriptorLabels(
  system: GraphNode,
  category: SystemDataDescriptorCategory,
): string[] {
  return uniqueSorted(
    (system.properties.data?.descriptors ?? [])
      .filter((descriptor) => descriptor.category === category)
      .map((descriptor) => descriptor.label),
  );
}

export function buildSystemRecord(
  entity: GraphNode,
  graph: IndexedGraph,
  locale: SupportedLocale,
): SystemSearchRecord | null {
  if (entity.kind !== "system") {
    return null;
  }

  const system = entity;
  const localization = resolveNodeDisplay(system, locale);
  const currentLocalization = system.localizations[locale] ?? null;
  const accessPaths = systemAccessPaths(system, localization);
  const relationships = getRelationships(entity.id, graph);
  const connectedNames = getConnectedNames(entity, graph, locale);
  const operatorNodes = operatorNodesForSystem(graph, entity.id);
  const dataTypes = descriptorLabels(system, "type");
  const dataFormats = descriptorLabels(system, "format");
  const dataStandards = descriptorLabels(system, "standard");
  const ryuRoutes = graph.ryuRoutesByNodeId[entity.id] ?? [];

  return {
    entity,
    system,
    title: localization.title,
    summary: localization.summary,
    localization,
    operatorName: uniqueSorted(operatorNodes.map((node) => nodeTitle(node, locale))).join(", "),
    disciplines: system.properties.disciplines ?? [],
    dataTypes,
    dataFormats,
    dataStandards,
    accessTypes: uniqueSorted(accessPaths.map((path) => path.type)),
    accessMethods: uniqueSorted(accessPaths.map((path) => path.method)),
    accessLabels: uniqueSorted(accessPaths.map((path) =>
      path.label === path.method
        ? facetLabel(locale, "accessMethod", path.method)
        : path.label,
    )),
    hasCurrentLocale: Boolean(currentLocalization),
    currentLocaleReviewState: currentLocalization?.review.state ?? null,
    sourceTitles: uniqueSorted(sourceRefs(system, graph).map((source) => {
      const fullSource = graph.sourceById[source.id];
      return (fullSource ? resolveSourceLocalization(fullSource, locale)?.title : null) ?? source.id;
    })),
    connectedNames,
    relationships,
    ryuRoutes,
    score: 0,
    matchReasons: [],
  };
}

export function buildSystemRecords(
  graph: IndexedGraph,
  locale: SupportedLocale,
): SystemSearchRecord[] {
  return graph.nodes
    .filter((entity) => entity.kind === "system")
    .flatMap((entity) => {
      const record = buildSystemRecord(entity, graph, locale);
      return record ? [record] : [];
    });
}

export function getSystemFilterOptions(
  records: SystemSearchRecord[],
  locale: SupportedLocale,
) {
  return {
    disciplines: selectOptions(
      records.flatMap((record) => record.disciplines),
      locale,
      "discipline",
    ),
    dataClaims: {
      type: selectOptions(records.flatMap((record) => record.dataTypes), locale, "descriptorLabel"),
      format: selectOptions(records.flatMap((record) => record.dataFormats), locale, "descriptorLabel"),
      standard: selectOptions(records.flatMap((record) => record.dataStandards), locale, "descriptorLabel"),
    },
    accessTypes: selectOptions(records.flatMap((record) => record.accessTypes), locale, "accessType"),
    accessMethods: selectOptions(records.flatMap((record) => record.accessMethods), locale, "accessMethod"),
  };
}
