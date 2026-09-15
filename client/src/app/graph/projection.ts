/**
 * Structural projection turns scoped graph data into visible nodes and edges.
 */
import type {
  GraphEdge,
  GraphEdgeKind,
  GraphNode,
  GraphNodeKind,
  SupportedLocale,
  ViewMode,
} from "../../../../shared/domain";
import { defaultLocale } from "../../../../shared/localization";
import { formatNumber, t, vocabularyLabel } from "../i18n";
import { nodeTitle, resolveNodeDisplay } from "../localization";
import type { CountryDisplayMode } from "../state/graphStore";
import { buildLabel, getBinDimensions, getLayoutBand, getNodeDimensions, type NodeGeometry } from "./geometry";
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
  hiddenEdgeKinds?: readonly GraphEdgeKind[];
  semanticLevel?: SemanticLevel;
  selectedEntityId?: string | null;
  selectedRelationshipId?: string | null;
  expandedEntityIds?: ReadonlySet<string>;
}

export type SemanticLevel = "family" | "type" | "entity";
export type RelationshipFamily = "org" | "data";
export interface RelationshipBundle {
  id: string;
  hubId: string;
  direction: "incoming" | "outgoing";
  level: Exclude<SemanticLevel, "entity">;
  groupId: GraphEdgeKind | RelationshipFamily;
  label: string;
  memberIds: string[];
  hiddenMemberIds: string[];
  edgeIds: string[];
}

export const relationshipFamily = {
  governs: "org", operates: "org", funds: "org", member: "org",
  contributes: "data", transfers: "data",
} satisfies Record<GraphEdgeKind, RelationshipFamily>;

export type GovernanceBlock = "national" | "international" | null;

interface ProjectionNodeDisplay extends NodeGeometry {
  id: string;
  label: string;
  simpleLabel: string;
  secondaryLabel: string | null;
  countryCode: string | null;
  governanceBlock: GovernanceBlock;
  layoutBand: number;
}

export type GraphProjectionNode = ProjectionNodeDisplay & (
  | { kind: GraphNode["kind"]; bundle?: never; memberKinds?: never }
  | { kind: "relationship-bin"; bundle: RelationshipBundle; memberKinds: GraphNodeKind[] }
);

export type GraphProjectionEdgeType = GraphEdge["kind"] | RelationshipFamily;

export type GraphProjectionEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  isDerivedHierarchy: boolean;
} & (
  | { type: GraphEdgeKind; bundle?: never; edgeIds?: never }
  | { type: GraphProjectionEdgeType; bundle: RelationshipBundle; edgeIds: string[] }
);

export interface GraphProjection {
  nodes: GraphProjectionNode[];
  edges: GraphProjectionEdge[];
  effectiveFocusEntityId: string | null;
  bundles: RelationshipBundle[];
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
    countryCode: (node.kind === "country" ? node.countryCode : null),
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

function edgeLabel(kind: GraphEdgeKind, locale: SupportedLocale): string {
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
    hiddenEdgeKinds = [],
  } = input;
  const hiddenKindSet = new Set(hiddenNodeKinds);

  const defaultCountry = graph.nodes.find((node) => node.kind === "country")?.id ?? null;
  const defaultSystem = graph.nodes.find((node) => node.kind === "system")?.id ?? null;
  const effectiveFocusEntityId =
    viewMode === "governance" ? null :
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

  const visibleEdges = graph.edges
    .filter(
      (edge) =>
        visibleIds.has(edge.sourceNodeId) &&
        visibleIds.has(edge.targetNodeId) &&
        !hiddenEdgeKinds.includes(edge.kind),
    );
  const edges: GraphProjectionEdge[] = visibleEdges.map((edge) => ({
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    type: edge.kind,
    label: edgeLabel(edge.kind, locale),
    isDerivedHierarchy: false,
  }));

  return bundleRelationships(input, includedIds, nodes, edges, visibleEdges, effectiveFocusEntityId);
}

function bundleRelationships(
  input: ProjectionInput,
  scopedIds: ReadonlySet<string>,
  nodes: GraphProjectionNode[],
  edges: GraphProjectionEdge[],
  visibleEdges: GraphEdge[],
  effectiveFocusEntityId: string | null,
): GraphProjection {
  const { graph, locale, semanticLevel = "entity" } = input;
  // Retention uses the unreduced scoped graph, before kind/edge filters. A filter
  // must not make a structurally shared entity look like an exclusive peripheral.
  const neighbors = new Map<string, Set<string>>();
  for (const edge of graph.edges) {
    if (!scopedIds.has(edge.sourceNodeId) || !scopedIds.has(edge.targetNodeId)) continue;
    for (const [id, other] of [[edge.sourceNodeId, edge.targetNodeId], [edge.targetNodeId, edge.sourceNodeId]]) {
      if (!neighbors.has(id)) neighbors.set(id, new Set());
      neighbors.get(id)!.add(other);
    }
  }
  const protectedIds = new Set(input.expandedEntityIds);
  if (effectiveFocusEntityId) protectedIds.add(effectiveFocusEntityId);
  if (input.selectedEntityId) protectedIds.add(input.selectedEntityId);
  const selectedEdge = input.selectedRelationshipId ? graph.edgeById[input.selectedRelationshipId] : null;
  if (selectedEdge) {
    protectedIds.add(selectedEdge.sourceNodeId);
    protectedIds.add(selectedEdge.targetNodeId);
  }
  for (const id of input.searchEntityIds ?? []) protectedIds.add(id);
  const hiddenIds = new Set<string>();
  const hubByMember = new Map<string, string>();
  const visibleIds = new Set(nodes.map(node => node.id));
  for (const node of nodes) {
    const adjacent = neighbors.get(node.id);
    const hubId = adjacent?.values().next().value;
    if (adjacent?.size === 1 && hubId && visibleIds.has(hubId) &&
        (neighbors.get(hubId)?.size ?? 0) > 1 && !protectedIds.has(node.id)) {
      hubByMember.set(node.id, hubId);
      if (semanticLevel !== "entity") hiddenIds.add(node.id);
    }
  }

  type BundleGroup = {
    bundle: RelationshipBundle;
    members: Set<string>;
    incident: Array<{ edgeId: string; memberId: string }>;
    hidden: Set<string>;
  };
  const groups = new Map<string, BundleGroup>();
  const projectedId = (parts: string[]) => {
    let id = `@edgezoom/${parts.map(encodeURIComponent).join("/")}`;
    while (graph.nodeById[id] || graph.edgeById[id]) id = `@${id}`;
    return id;
  };
  for (const edge of visibleEdges) {
    for (const direction of ["outgoing", "incoming"] as const) {
      const hubId = direction === "outgoing" ? edge.sourceNodeId : edge.targetNodeId;
      const memberId = direction === "outgoing" ? edge.targetNodeId : edge.sourceNodeId;
      // Retained hubs own all-neighbor groups; collapse eligibility is separate.
      if (hubByMember.has(hubId)) continue;
      for (const level of ["family", "type"] as const) {
        const groupId = level === "family" ? relationshipFamily[edge.kind] : edge.kind;
        const id = projectedId(["bin", hubId, direction, level, groupId]);
        let group = groups.get(id);
        if (!group) {
          const label = level === "family"
            ? t(locale, `graph.family.${relationshipFamily[edge.kind]}`)
            : edgeLabel(edge.kind, locale);
          group = {
            bundle: { id, hubId, direction, level, groupId, label,
              memberIds: [], hiddenMemberIds: [], edgeIds: [] },
            members: new Set(), incident: [], hidden: new Set(),
          };
          groups.set(id, group);
        }
        group.members.add(memberId);
        group.incident.push({ edgeId: edge.id, memberId });
        if (hiddenIds.has(memberId)) group.hidden.add(memberId);
      }
    }
  }
  // Singleton promotion cascades across overlapping memberships. Each membership
  // is removed once, so this does not rescan the whole graph until convergence.
  const memberships = new Map<string, BundleGroup[]>();
  const queue: BundleGroup[] = [];
  for (const group of groups.values()) {
    if (group.bundle.level !== semanticLevel) continue;
    for (const id of group.hidden) {
      const membershipsForId = memberships.get(id) ?? [];
      membershipsForId.push(group);
      memberships.set(id, membershipsForId);
    }
    if (group.hidden.size === 1) queue.push(group);
  }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const group = queue[cursor];
    if (group.hidden.size !== 1) continue;
    const id = group.hidden.values().next().value!;
    hiddenIds.delete(id);
    for (const membership of memberships.get(id) ?? []) {
      membership.hidden.delete(id);
      if (membership.hidden.size === 1) queue.push(membership);
    }
  }
  // Candidates with no remaining allowed relationships cannot be hidden.
  for (const id of hiddenIds) if (!memberships.has(id)) hiddenIds.delete(id);

  const bins: GraphProjectionNode[] = [];
  const aggregates: GraphProjectionEdge[] = [];
  const representedEdgeIds = new Set<string>();
  for (const group of groups.values()) {
    const bundle = group.bundle;
    bundle.memberIds = [...group.members].sort();
    bundle.hiddenMemberIds = bundle.memberIds.filter(id => hiddenIds.has(id));
    bundle.edgeIds = [...new Set(group.incident.map(item => item.edgeId))].sort();
    if (bundle.level !== semanticLevel || bundle.hiddenMemberIds.length === 0) continue;
    const label = t(locale, "graph.binLabel", {
      group: bundle.label, count: formatNumber(bundle.hiddenMemberIds.length, locale),
    });
    const directionLabel = vocabularyLabel(locale, "relationshipDirections", bundle.direction);
    const memberKinds = [...new Set(bundle.hiddenMemberIds.map(id => graph.nodeById[id].kind))].sort();
    bins.push({ id: bundle.id, kind: "relationship-bin", bundle, memberKinds, label: `${label}\n${directionLabel}`,
      simpleLabel: label, secondaryLabel: directionLabel, countryCode: null,
      governanceBlock: null, layoutBand: 3, ...getBinDimensions(label) });
    const edgeIds = group.incident.filter(item => hiddenIds.has(item.memberId)).map(item => item.edgeId).sort();
    edgeIds.forEach(id => representedEdgeIds.add(id));
    aggregates.push({ id: projectedId(["edge", bundle.hubId, bundle.direction, bundle.level, bundle.groupId]),
      source: bundle.direction === "outgoing" ? bundle.hubId : bundle.id,
      target: bundle.direction === "outgoing" ? bundle.id : bundle.hubId,
      type: bundle.groupId, label: `${label} · ${directionLabel}`, bundle, edgeIds,
      isDerivedHierarchy: false });
  }
  return {
    nodes: [...nodes.filter(node => !hiddenIds.has(node.id)), ...bins.sort((a, b) => a.id.localeCompare(b.id))],
    edges: [...edges.filter(edge => !representedEdgeIds.has(edge.id)), ...aggregates.sort((a, b) => a.id.localeCompare(b.id))],
    effectiveFocusEntityId,
    bundles: [...groups.values()].map(group => group.bundle).sort((a, b) => a.id.localeCompare(b.id)),
  };
}
