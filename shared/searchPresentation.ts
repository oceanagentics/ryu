import type {
  DataFormat,
  DataStandard,
  DataType,
  Discipline,
  GraphEdge,
  GraphNode,
  ResolvedNodeLocalization,
  ReviewState,
  RyuRoute,
  SupportedLocale,
  SystemAccessType,
  AccessMethod,
  SystemDataDescriptorCategory,
} from "./domain";
import type { IndexedGraph } from "./indexGraph";
import { operatorNodesForSystem } from "./indexGraph";
import {
  vocabularyLabel,
  humanizeCode,
  t,
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
  accessTypes: SystemAccessType[];
  accessMethods: AccessMethod[];
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
  dataTypes: DataType[];
  dataFormats: DataFormat[];
  dataStandards: DataStandard[];
  accessTypes: SystemAccessType[];
  accessMethods: AccessMethod[];
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
  return t(locale, `directory.dataClaim.${value}`);
}

export function localizationCoverageFilterOptions(locale: SupportedLocale): Array<{
  label: string;
  value: LocalizationCoverageFilter;
}> {
  return [
    {
      label: t(locale, "directory.localizationCoverage.current_locale"),
      value: "current_locale",
    },
    {
      label: t(locale, "directory.localizationCoverage.missing_current_locale"),
      value: "missing_current_locale",
    },
  ];
}

export function reviewStateFilterOptions(
  locale: SupportedLocale,
): Array<{ label: string; value: ReviewState }> {
  return [
    { label: vocabularyLabel(locale, "reviewStates", "agent_researched"), value: "agent_researched" },
    { label: vocabularyLabel(locale, "reviewStates", "human_reviewed"), value: "human_reviewed" },
    { label: vocabularyLabel(locale, "reviewStates", "needs_revision"), value: "needs_revision" },
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

export function uniqueSorted<Value extends string>(values: Array<Value | null | undefined>): Value[] {
  return [...new Set(values.filter((value): value is Value => Boolean(value)))]
    .sort((left, right) => left.localeCompare(right));
}

export function selectOptions<Value extends string>(
  values: Array<Value | null | undefined>,
  label: (value: Value) => string,
) {
  return uniqueSorted(values).map((value) => ({
    label: label(value),
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
  const descriptors = system.properties.data?.descriptors ?? [];
  const dataTypes = uniqueSorted(descriptors.filter(d => d.category === "type").map(d => d.label));
  const dataFormats = uniqueSorted(descriptors.filter(d => d.category === "format").map(d => d.label));
  const dataStandards = uniqueSorted(descriptors.filter(d => d.category === "standard").map(d => d.label));
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
    accessMethods: uniqueSorted(accessPaths.flatMap((path) => path.methods)),
    accessLabels: uniqueSorted(accessPaths.map(path => path.label)),
    hasCurrentLocale: Boolean(currentLocalization),
    currentLocaleReviewState: currentLocalization?.review.state ?? null,
    sourceTitles: uniqueSorted([
      ...Object.values(system.sources),
      ...getRelationships(system.id, graph).flatMap(edge => Object.values(edge.sources)),
    ].map(source => source.title[locale] ?? source.id)),
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
      value => vocabularyLabel(locale, "disciplines", value),
    ),
    dataClaims: {
      type: selectOptions(records.flatMap((record) => record.dataTypes), value => vocabularyLabel(locale, "dataTypes", value)),
      format: selectOptions(records.flatMap((record) => record.dataFormats), value => vocabularyLabel(locale, "dataFormats", value)),
      standard: selectOptions(records.flatMap((record) => record.dataStandards), value => vocabularyLabel(locale, "dataStandards", value)),
    },
    accessTypes: selectOptions(records.flatMap((record) => record.accessTypes), value => vocabularyLabel(locale, "accessTypes", value)),
    accessMethods: selectOptions(records.flatMap((record) => record.accessMethods), value => vocabularyLabel(locale, "accessMethods", value)),
  };
}
