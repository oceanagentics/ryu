import type { GraphNode, ResolvedNodeLocalization, Source, SupportedLocale, SystemDataDescriptorCategory } from "../../shared/domain";
import type { IndexedGraph } from "../../shared/indexGraph";
import type { RecordSearchQuery } from "../../shared/recordApi";
import { defaultLocale, supportedLocales } from "../../shared/localization";
import { nodeTitle, resolveNodeDisplay, systemAccessPaths, systemDataDescriptors, systemGallery } from "../../shared/recordDisplay";
import { facetLabel, t, type UiMessageKey } from "../../shared/i18n";
import { buildSystemRecords, getRelationships, getConnectedNames, type SearchMatchReason, type SystemSearchRecord } from "../../shared/searchPresentation";

export type EntitySearchResult = {
  entity: GraphNode;
  score: number;
  displayLocale: SupportedLocale | null;
  matchedLocale: SupportedLocale | null;
  isLocaleFallback: boolean;
  reasons: SearchMatchReason[];
};

type SearchFieldDefinition = {
  field: string;
  label: UiMessageKey;
  weight: number;
  getValues: (
    entity: GraphNode,
    graph: IndexedGraph,
    context: SearchContext,
    localization: ResolvedNodeLocalization,
  ) => unknown[];
};

type SearchContext = {
  systemRecordById: Record<string, SystemSearchRecord>;
  locale: SupportedLocale;
  localeMode: RecordSearchQuery["localeMode"];
  scope: RecordSearchQuery["scope"];
};

const countryAliasesByCode: Record<string, string[]> = {
  CAN: ["Canada", "Canadian"],
  DEU: ["Germany", "German"],
  EUR: ["Europe", "European", "European Union", "EU"],
  INT: ["International", "Global"],
  JPN: ["Japan", "Japanese"],
  USA: ["United States", "US", "U.S.", "USA", "American"],
};

export function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFKC");
}

function tokenize(value: string, locale?: SupportedLocale): string[] {
  const normalized = normalizeSearchValue(value);
  const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(locale, { granularity: "word" })
    : null;
  const tokens = segmenter
    ? Array.from(segmenter.segment(normalized))
        .filter((segment) => segment.isWordLike)
        .map((segment) => segment.segment)
    : normalized.match(/[\p{L}\p{N}]+/gu) ?? [];

  return [...new Set(tokens.filter(Boolean))];
}

function collectText(value: unknown): string[] {
  if (value == null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectText(item));
  }

  if (typeof value === "object") {
    return Object.values(value).flatMap((child) => collectText(child));
  }

  return [String(value)];
}

function getCountryValues(
  entity: GraphNode,
  graph: IndexedGraph,
  locale: SupportedLocale,
): string[] {
  if (!entity.countryCode) {
    return [];
  }

  const country = graph.nodes.find(
    (candidate) =>
      candidate.kind === "country" &&
      candidate.countryCode === entity.countryCode,
  );

  return collectText([
    entity.countryCode,
    country ? nodeTitle(country, locale) : null,
    countryAliasesByCode[entity.countryCode],
  ]);
}

function sourceRefs(entity: GraphNode, graph: IndexedGraph): Source[] {
  return [...Object.values(entity.sources), ...getRelationships(entity.id, graph).flatMap(edge => Object.values(edge.sources))];
}

function sourceValues(source: Source, locale: SupportedLocale, mode: RecordSearchQuery["localeMode"]): string[] {
  return collectText([source.url, mode === "all_locales" ? Object.values(source.title) : source.title[locale]]);
}

function descriptorValues(
  system: GraphNode | undefined,
  localization: ResolvedNodeLocalization,
  category: SystemDataDescriptorCategory,
  locale: SupportedLocale,
): string[] {
  return system
    ? systemDataDescriptors(system, localization)
    .filter((descriptor) => descriptor.category === category)
    .flatMap((descriptor) => [
      descriptor.label,
      descriptor.localizedLabel,
      descriptor.description,
      facetLabel(locale, "descriptorLabel", descriptor.label),
    ])
    .filter((value): value is string => Boolean(value))
    : [];
}

function withCommonFields(
  definitions: SearchFieldDefinition[],
): SearchFieldDefinition[] {
  return [
    {
      field: "name",
      label: "search.field.name",
      weight: 100,
      getValues: (_entity, _graph, _context, localization) => [localization.title],
    },
    {
      field: "kind",
      label: "search.field.nodeType",
      weight: 80,
      getValues: (entity, _graph, context) => [
        entity.kind,
        facetLabel(context.locale, "nodeKind", entity.kind),
      ],
    },
    {
      field: "country",
      label: "search.field.country",
      weight: 90,
      getValues: (entity, graph, context) => getCountryValues(entity, graph, context.locale),
    },
    {
      field: "sources",
      label: "search.field.source",
      weight: 18,
      getValues: (entity, graph, context) => sourceRefs(entity, graph)
        .flatMap((source) => sourceValues(source, context.locale, context.localeMode)),
    },
    {
      field: "aliases",
      label: "search.field.alias",
      weight: 90,
      getValues: (_entity, _graph, _context, localization) => localization.details.aliases,
    },
    {
      field: "id", label: "search.field.name", weight: 95,
      getValues: entity => [entity.id],
    },
    {
      field: "url", label: "search.field.accessDetail", weight: 30,
      getValues: entity => [entity.url],
    },
    {
      field: "details", label: "search.field.description", weight: 20,
      getValues: (_entity, _graph, _context, localization) => [localization.details],
    },
    {
      field: "summary",
      label: "search.field.summary",
      weight: 48,
      getValues: (_entity, _graph, _context, localization) => [localization.summary],
    },
    {
      field: "description",
      label: "search.field.description",
      weight: 24,
      getValues: (_entity, _graph, _context, localization) => [localization.description],
    },
    ...definitions,
  ];
}

const organizationFieldDefinitions = withCommonFields([
  {
    field: "relationships.connectedNames",
    label: "search.field.connectedNode",
    weight: 35,
    getValues: (entity, graph, context) =>
      getConnectedNames(entity, graph, context.locale),
  },
  {
    field: "relationships.type",
    label: "search.field.relationship",
    weight: 35,
    getValues: (entity, graph, context) =>
      getRelationships(entity.id, graph).flatMap((relationship) => [
        relationship.kind,
        facetLabel(context.locale, "edgeKind", relationship.kind),
      ]),
  },
  {
    field: "relationships.note",
    label: "search.field.relationshipNote",
    weight: 20,
    getValues: (entity, graph) =>
      getRelationships(entity.id, graph).map((relationship) => relationship.note),
  },
]);

const countryFieldDefinitions = withCommonFields([]);

const systemFieldDefinitions = withCommonFields([
  {
    field: "operator",
    label: "search.field.operator",
    weight: 75,
    getValues: (entity, _graph, context) => [
      context.systemRecordById[entity.id]?.operatorName,
    ],
  },

  {
    field: "system.disciplines",
    label: "search.field.discipline",
    weight: 62,
    getValues: (entity, graph, context) => {
      const values = graph.nodeById[entity.id]?.properties.disciplines ?? [];
      return values.flatMap(value => [value, facetLabel(context.locale, "discipline", value)]);
    },
  },


  {
    field: "data.descriptors.type",
    label: "search.field.dataType",
    weight: 74,
    getValues: (entity, graph, context, localization) =>
      descriptorValues(graph.nodeById[entity.id], localization, "type", context.locale),
  },
  {
    field: "data.descriptors.format",
    label: "search.field.dataFormat",
    weight: 72,
    getValues: (entity, graph, context, localization) =>
      descriptorValues(graph.nodeById[entity.id], localization, "format", context.locale),
  },
  {
    field: "data.descriptors.standard",
    label: "search.field.dataStandard",
    weight: 68,
    getValues: (entity, graph, context, localization) =>
      descriptorValues(graph.nodeById[entity.id], localization, "standard", context.locale),
  },
  {
    field: "data.metrics",
    label: "search.field.metric",
    weight: 55,
    getValues: (entity, graph, context) => {
      const system = graph.nodeById[entity.id];
      return [
        system?.properties.data?.recordCount,
        system?.properties.data?.storageSize,
        ...(system?.properties.usage ?? []),
      ].flatMap((metric) =>
        metric
          ? [
              metric.key,
              facetLabel(context.locale, "metricKey", metric.key),
              String(metric.value),
              metric.unit,
              facetLabel(context.locale, "unit", metric.unit),
            ]
          : [],
      );
    },
  },
  {
    field: "access.type",
    label: "search.field.accessType",
    weight: 62,
    getValues: (entity, graph, context, localization) => {
      const system = graph.nodeById[entity.id];
      return systemAccessPaths(system, localization).flatMap((path) => [
        path.type,
        facetLabel(context.locale, "accessType", path.type),
      ]);
    },
  },
  {
    field: "access.method",
    label: "search.field.accessMethod",
    weight: 64,
    getValues: (entity, graph, context, localization) => {
      const system = graph.nodeById[entity.id];
      return systemAccessPaths(system, localization).flatMap((path) => [
        path.method,
        facetLabel(context.locale, "accessMethod", path.method),
        path.label,
      ]);
    },
  },
  {
    field: "access.detail",
    label: "search.field.accessDetail",
    weight: 36,
    getValues: (entity, graph, _context, localization) => {
      const system = graph.nodeById[entity.id];
      return systemAccessPaths(system, localization).flatMap((path) => [
        path.description,
        path.instructions,
        path.caveats,
        path.url,
      ]);
    },
  },
  {
    field: "relationships.connectedNames",
    label: "search.field.connectedNode",
    weight: 32,
    getValues: (entity, _graph, context) =>
      context.systemRecordById[entity.id]?.connectedNames ?? [],
  },
  {
    field: "relationships.type",
    label: "search.field.relationship",
    weight: 35,
    getValues: (entity, graph, context) =>
      getRelationships(entity.id, graph).flatMap((relationship) => [
        relationship.kind,
        facetLabel(context.locale, "edgeKind", relationship.kind),
      ]),
  },
  {
    field: "relationships.note",
    label: "search.field.relationshipNote",
    weight: 20,
    getValues: (entity, graph) =>
      getRelationships(entity.id, graph).map((relationship) => relationship.note),
  },
  {
    field: "gallery",
    label: "search.field.gallery",
    weight: 28,
    getValues: (entity, graph, _context, localization) => {
      const system = graph.nodeById[entity.id];
      return systemGallery(system, localization).flatMap((item) => [
        item.title,
        item.caption,
      ]);
    },
  },
  {
    field: "ryu.routes",
    label: "search.field.agentRoute",
    weight: 40,
    getValues: (entity, graph, context) =>
      (graph.ryuRoutesByNodeId[entity.id] ?? []).flatMap((route) => [
        route.status,
        route.mode,
        route.capabilities,
        context.scope === "public" ? null : route.target,
        context.scope === "public" ? null : route.upstream,
        route.format,
        route.contractRef,
        route.caveat,
      ]) ?? [],
  },
]);

const searchFieldDefinitionsByKind = {
  country: countryFieldDefinitions,
  organization: organizationFieldDefinitions,
  system: systemFieldDefinitions,
} satisfies Record<GraphNode["kind"], SearchFieldDefinition[]>;

function editDistanceWithinOne(left: string, right: string): boolean {
  if (Math.abs(left.length - right.length) > 1) {
    return false;
  }

  let edits = 0;
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) {
      return false;
    }

    if (left.length > right.length) {
      leftIndex += 1;
    } else if (right.length > left.length) {
      rightIndex += 1;
    } else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }

  return edits + (left.length - leftIndex) + (right.length - rightIndex) <= 1;
}

function scoreTokenAgainstValue(
  token: string,
  value: string,
  locale: SupportedLocale,
): number | null {
  const normalizedValue = normalizeSearchValue(value);
  const words = tokenize(value, locale);

  if (words.length === 0) {
    return null;
  }

  if (normalizedValue === token) {
    return 1.1;
  }

  if (words.includes(token)) {
    return 1;
  }

  if (words.some((word) => word.startsWith(token))) {
    return 0.9;
  }

  if (token.length >= 3 && words.some((word) => word.includes(token))) {
    return 0.72;
  }

  if (
    token.length >= 4 &&
    words.some((word) => word.length >= 4 && editDistanceWithinOne(token, word))
  ) {
    return 0.64;
  }

  return null;
}

function uniqueReasons(reasons: SearchMatchReason[]): SearchMatchReason[] {
  const bestReasonByKey = new Map<string, SearchMatchReason>();

  for (const reason of reasons) {
    const key = `${reason.field}:${reason.value}`;
    const current = bestReasonByKey.get(key);
    if (!current || reason.score > current.score) {
      bestReasonByKey.set(key, reason);
    }
  }

  return [...bestReasonByKey.values()].sort((left, right) => right.score - left.score);
}

function scoreEntity(
  entity: GraphNode,
  graph: IndexedGraph,
  context: SearchContext,
  tokens: string[],
  localization: ResolvedNodeLocalization,
): EntitySearchResult | null {
  const bestReasonByToken = new Map<string, SearchMatchReason>();

  for (const definition of searchFieldDefinitionsByKind[entity.kind]) {
    for (const value of collectText(definition.getValues(entity, graph, context, localization))) {
      for (const token of tokens) {
        const tokenScore = scoreTokenAgainstValue(token, value, context.locale);
        if (tokenScore == null) {
          continue;
        }

        const score = definition.weight * tokenScore;
        const currentBestReason = bestReasonByToken.get(token);
        if (!currentBestReason || score > currentBestReason.score) {
          bestReasonByToken.set(token, {
            field: definition.field,
            label: t(context.locale, definition.label),
            value,
            token,
            score,
          });
        }
      }
    }
  }

  if (tokens.some((token) => !bestReasonByToken.has(token))) {
    return null;
  }

  const tokenReasons = [...bestReasonByToken.values()];
  return {
    entity,
    score: tokenReasons.reduce((sum, reason) => sum + reason.score, 0),
    displayLocale: resolveNodeDisplay(entity, context.locale).displayLocale,
    matchedLocale: tokens.length ? localization.displayLocale : null,
    isLocaleFallback: resolveNodeDisplay(entity, context.locale).isLocaleFallback,
    reasons: uniqueReasons(tokenReasons).slice(0, 4),
  };
}

function localizationCandidates(
  entity: GraphNode,
  locale: SupportedLocale,
  mode: RecordSearchQuery["localeMode"],
): ResolvedNodeLocalization[] {
  if (mode === "display_locale") return [resolveNodeDisplay(entity, locale)];
  const localizations = Object.values(entity.localizations).filter(value => value && (
    mode === "all_locales" || value.locale === locale ||
    (mode === "locale_with_fallbacks" && value.locale === defaultLocale)
  ));
  return localizations.length
    ? localizations.map(value => resolveNodeDisplay(entity, value!.locale))
    : [resolveNodeDisplay({ ...entity, localizations: {} }, locale)];
}

function matchesAny(values: string[], selected: string[]): boolean {
  return selected.length === 0 || values.some(value => selected.includes(value));
}

function matchesFilters(entity: GraphNode, graph: IndexedGraph, query: RecordSearchQuery): boolean {
  const properties = entity.properties;
  const routes = graph.ryuRoutesByNodeId[entity.id] ?? [];
  const localization = resolveNodeDisplay(entity, query.locale);
  const requested = entity.localizations[query.locale];
  const reviewStates = query.reviewLocale === "requested" ? [requested?.review.state]
    : query.reviewLocale === "any" ? Object.values(entity.localizations).map(value => value?.review.state)
    : [localization.review?.state];
  const available = supportedLocales.filter(locale => entity.localizations[locale]).length;
  const availability = query.localeAvailability;
  const countryCodes = entity.kind === "country" && entity.countryCode ? [entity.countryCode] : [];
  return matchesAny([entity.kind], query.kind)
    && matchesAny([entity.recordDepth], query.recordDepth)
    && matchesAny(countryCodes, query.countryCode)
    && matchesAny(properties.disciplines ?? [], query.disciplines)
    && (query.geography.length === 0 || query.geography.some(value =>
      collectText([entity.countryCode, properties.geographies])
        .some(candidate => normalizeSearchValue(candidate).includes(normalizeSearchValue(value)))))
    && ([["type", query.dataType], ["format", query.dataFormat], ["standard", query.dataStandard]] as const)
      .every(([category, selected]) => matchesAny(
        (properties.data?.descriptors ?? []).filter(value => value.category === category).map(value => value.label), selected))
    && matchesAny((properties.access ?? []).map(value => value.type), query.accessType)
    && matchesAny((properties.access ?? []).map(value => value.method), query.accessMethod)
    && matchesAny(reviewStates.filter((value): value is NonNullable<typeof value> => Boolean(value)), query.reviewState)
    && (!availability || (availability === "available" ? Boolean(requested)
      : availability === "missing" ? !requested
      : availability === "complete" ? available === supportedLocales.length : available < supportedLocales.length))
    && matchesAny(routes.map(route => route.status), query.routeStatus)
    && matchesAny(routes.flatMap(route => route.capabilities), query.routeCapability);
}

export function searchRecords(graph: IndexedGraph, query: RecordSearchQuery): EntitySearchResult[] {
  const tokens = tokenize(query.q ?? "", query.locale);
  const context: SearchContext = {
    systemRecordById: Object.fromEntries(buildSystemRecords(graph, query.locale).map(record => [record.entity.id, record])),
    locale: query.locale,
    localeMode: query.localeMode,
    scope: query.scope,
  };
  return graph.nodes.filter(entity => matchesFilters(entity, graph, query)).flatMap(entity => {
    const result = localizationCandidates(entity, query.locale, query.localeMode)
      .flatMap(localization => {
        const match = scoreEntity(entity, graph, context, tokens, localization);
        return match ? [match] : [];
      }).sort((left, right) => right.score - left.score)[0];
    return result ? [result] : [];
  }).sort((left, right) => right.score - left.score
    || nodeTitle(left.entity, query.locale).localeCompare(nodeTitle(right.entity, query.locale), query.locale)
    || left.entity.id.localeCompare(right.entity.id));
}
