import type { GraphEdgeKind, GraphNodeKind } from "../../../../shared/domain";

export const nodeMapNodeColors = {
  country: "#f7d470",
  organization: "#9ad29d",
  system: "#8fc7ff",
  "relationship-bin": "#95cdd5",
} satisfies Record<GraphNodeKind | "relationship-bin", string>;

export const nodeMapEdgeColors = {
  governs: nodeMapNodeColors.organization,
  operates: nodeMapNodeColors.organization,
  member: nodeMapNodeColors.organization,
  funds: nodeMapNodeColors.organization,
  contributes: nodeMapNodeColors.system,
  transfers: nodeMapNodeColors.system,
  org: nodeMapNodeColors.organization,
  data: nodeMapNodeColors.system,
} satisfies Record<GraphEdgeKind | "org" | "data", string>;
