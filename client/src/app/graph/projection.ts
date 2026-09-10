/**
 * Structural projection turns scoped graph data into visible nodes and edges.
 */
import type {
  GraphEdge,
  GraphNode,
  GraphNodeKind,
  SupportedLocale,
  ViewMode,
} from "../../../../shared/domain";
import { defaultLocale } from "../../../../shared/localization";
import { vocabularyLabel } from "../i18n";
import { nodeTitle, resolveNodeDisplay } from "../localization";
import type { CountryDisplayMode } from "../state/graphStore";
import { buildLabel, getLayoutBand, getNodeDimensions, type NodeGeometry } from "./geometry";
import type { IndexedGraph } from "./indexGraph";
import {
  getCountryIds,
  getGovernanceIds,
  getTechnicalIds,
} from "./scope";

export interface ProjectionInput {
  graph: IndexedGraph;
  viewMode: ViewMode;
  countryDisplayMode: CountryDisplayMode;
  focusEntityId: string | null;
  locale: SupportedLocale;
  searchEntityIds?: ReadonlySet<string> | null;
  hiddenNodeKinds?: readonly GraphNodeKind[];
}

export type GovernanceBlock = "national" | "international" | null;

export interface GraphProjectionNode extends NodeGeometry {
  id: string;
  label: string;
  simpleLabel: string;
  secondaryLabel: string | null;
  kind: GraphNode["kind"];
  countryCode: string | null;
  governanceBlock: GovernanceBlock;
  layoutBand: number;
}

export type GraphProjectionEdgeType = GraphEdge["kind"];

export interface GraphProjectionEdge {
  id: string;
  source: string;
  target: string;
  type: GraphProjectionEdgeType;
  label: string;
  isDerivedHierarchy: boolean;
}

export interface GraphProjection {
  nodes: GraphProjectionNode[];
  edges: GraphProjectionEdge[];
  effectiveFocusEntityId: string | null;
}

function buildProjectionNode(
  node: GraphNode,
  governanceBlock: GovernanceBlock,
  layoutBand: number,
  locale: SupportedLocale,
): GraphProjectionNode {
  const label = buildLabel(node, locale);
  const simpleLabel = nodeTitle(node, locale);

  return {
    id: node.id,
    label,
    simpleLabel,
    secondaryLabel: secondaryNodeLabel(node, locale, simpleLabel),
    kind: node.kind,
    countryCode: node.countryCode,
    governanceBlock,
    layoutBand,
    ...getNodeDimensions(node.kind, label),
  };
}

function normalizedLabel(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function secondaryNodeLabel(
  node: GraphNode,
  locale: SupportedLocale,
  title: string,
): string | null {
  const titleKey = normalizedLabel(title);
  const localization = resolveNodeDisplay(node, locale);
  const alias = localization.details.aliases.find(
    (candidate) => normalizedLabel(candidate) !== titleKey,
  );

  if (alias) {
    return alias;
  }

  if (locale === defaultLocale) {
    return null;
  }

  const englishTitle = nodeTitle(node, defaultLocale);
  return normalizedLabel(englishTitle) === titleKey ? null : englishTitle;
}

function edgeLabel(kind: GraphProjectionEdgeType, locale: SupportedLocale): string {
  return vocabularyLabel(locale, "edgeKinds", kind);
}

export function projectGraph(input: ProjectionInput): GraphProjection {
  const {
    graph,
    viewMode,
    focusEntityId,
    locale,
    searchEntityIds = null,
    hiddenNodeKinds = [],
  } = input;
  const hiddenKindSet = new Set(hiddenNodeKinds);

  const defaultCountry = graph.nodes.find((node) => node.kind === "country")?.id ?? null;
  const defaultSystem = graph.nodes.find((node) => node.kind === "system")?.id ?? null;
  const effectiveFocusEntityId =
    focusEntityId ?? (viewMode === "technical" ? defaultSystem : defaultCountry);

  let includedIds = new Set<string>();
  if (searchEntityIds) {
    includedIds = new Set(searchEntityIds);
  } else if (viewMode === "governance") {
    includedIds = getGovernanceIds(graph);
  } else if (viewMode === "country" && effectiveFocusEntityId) {
    includedIds = getCountryIds(graph, effectiveFocusEntityId);
  } else if (viewMode === "technical" && effectiveFocusEntityId) {
    includedIds = getTechnicalIds(graph, effectiveFocusEntityId);
  }

  const includedNodes = graph.nodes.filter(
    (node) => includedIds.has(node.id) && !hiddenKindSet.has(node.kind),
  );
  const visibleIds = new Set(includedNodes.map((node) => node.id));
  const nodes = includedNodes.map((node) =>
    buildProjectionNode(
      node,
      null,
      getLayoutBand(node.kind),
      locale,
    ),
  );

  const edges: GraphProjectionEdge[] = graph.edges
    .filter(
      (edge) =>
        visibleIds.has(edge.sourceNodeId) &&
        visibleIds.has(edge.targetNodeId),
    )
    .map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      type: edge.kind,
      label: edgeLabel(edge.kind, locale),
      isDerivedHierarchy: false,
    }));

  return {
    nodes,
    edges,
    effectiveFocusEntityId,
  };
}
