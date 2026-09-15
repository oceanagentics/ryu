/**
 * Cytoscape stylesheet contains visual presentation only; geometry comes from node data.
 */
import type cytoscape from "cytoscape";
import type { GraphEdgeKind, GraphNodeKind } from "../../../../shared/domain";

export const nodeMapNodeColors = {
  country: "#f7d470",
  organization: "#9ad29d",
  system: "#8fc7ff",
  "relationship-bin": "#95cdd5", // 50/50 linear-RGB blend of organization green and system blue.
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

const edgeColorStyles: cytoscape.StylesheetJson = Object.entries(nodeMapEdgeColors).map(([type, color]) => ({
  selector: `edge[type = "${type}"]`,
  style: { "line-color": color, "target-arrow-color": color },
}));

const labelFontScale = 2;

export type GraphDisplayMode = "diagram" | "node-map";

const diagramStyles: cytoscape.StylesheetJson = [
  {
    selector: "node",
    style: {
      label: "data(label)",
      "text-wrap": "wrap",
      "text-max-width": "data(textMaxWidth)",
      "font-size": 15 * labelFontScale,
      "font-family": "Helvetica, Arial, sans-serif",
      color: "#132033",
      "text-valign": "center",
      "text-halign": "center",
      "background-color": "#d6e4f7",
      "border-width": 2,
      "border-color": "#42658f",
      width: "data(width)",
      height: "data(height)",
      padding: `${10 * labelFontScale}px`,
      "overlay-opacity": 0,
    },
  },
  { selector: 'node[kind = "country"], node[colorKind = "country"]', style: { shape: "round-rectangle", "background-color": "#f7d470", "border-color": "#b28a23" } },
  { selector: 'node[kind = "organization"], node[colorKind = "organization"]', style: { shape: "round-rectangle", "background-color": "#dcefdc", "border-color": "#5d8b5d" } },
  { selector: 'node[kind = "system"], node[colorKind = "system"]', style: { shape: "round-rectangle", "background-color": "#d9ebff", "border-color": "#467ab3" } },
  {
    selector: "edge",
    style: {
      width: 2.2,
      "line-color": "#73849b",
      "target-arrow-color": "#73849b",
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
      label: "data(label)",
      "font-size": 10 * labelFontScale,
      "text-background-color": "#ffffff",
      "text-background-opacity": 0.8,
      "text-background-padding": "2px",
      "text-rotation": "autorotate",
      color: "#2a3950",
    },
  },
  ...edgeColorStyles,
  { selector: 'edge[type = "member"]', style: { "line-style": "dashed", width: 1.8 } },
  { selector: 'edge[type = "contributes"], edge[type = "transfers"]', style: { width: 3 } },
  {
    selector: ".is-focus",
    style: {
      "border-width": 4,
      "border-color": "#ff4f2f",
      "z-index-compare": "manual",
      "z-index": 999,
    },
  },
  {
    selector: ".is-selected",
    style: {
      "background-color": "#ff4f2f",
      "border-color": "#ff4f2f",
      color: "#ffffff",
      "underlay-color": "#ff4f2f",
      "underlay-opacity": 1,
      "underlay-padding": 11,
      "z-index-compare": "manual",
      "z-index": 1000,
    },
  },
  {
    selector: ".is-neighbor",
    style: {
      "underlay-color": "#ff785e",
      "underlay-opacity": 1,
      "underlay-padding": 6,
      "z-index-compare": "manual",
      "z-index": 998,
    },
  },
  {
    selector: ".is-connected",
    style: {
      "line-color": "#ff785e",
      "target-arrow-color": "#ff785e",
      width: 4.4,
      "z-index-compare": "manual",
      "z-index": 997,
    },
  },
];

const nodeMapStyles: cytoscape.StylesheetJson = [
  {
    selector: "node",
    style: {
      label: "data(simpleLabel)",
      "font-size": 10,
      "font-family": "Helvetica, Arial, sans-serif",
      color: "#dfeeff",
      "text-valign": "center",
      "text-halign": "right",
      "text-margin-x": 8,
      "text-wrap": "none",
      "text-outline-width": 1,
      "text-outline-color": "#31598d",
      "background-color": "#f6fbff",
      "border-width": 0,
      shape: "ellipse",
      width: 7,
      height: 7,
      "overlay-opacity": 0,
    },
  },
  { selector: 'node[kind = "country"]', style: { width: 10, height: 10 } },
  { selector: 'node[kind = "organization"]', style: { width: 8, height: 8 } },
  { selector: 'node[kind = "system"]', style: { width: 6, height: 6 } },
  {
    selector: "edge",
    style: {
      width: 0.8,
      "line-color": "#a9c9ee",
      "line-opacity": 0.34,
      "target-arrow-shape": "none",
      "curve-style": "bezier",
      label: "",
      "overlay-opacity": 0,
    },
  },
  ...edgeColorStyles,
  { selector: 'edge[type = "governs"]', style: { "line-opacity": 0.28 } },
  { selector: 'edge[type = "operates"]', style: { "line-opacity": 0.32 } },
  { selector: 'edge[type = "member"]', style: { "line-style": "dotted", "line-opacity": 0.28 } },
  { selector: 'edge[type = "contributes"]', style: { "line-opacity": 0.62, width: 1.2 } },
  { selector: 'edge[type = "transfers"]', style: { "line-opacity": 0.56, width: 1.2 } },
  {
    selector: ".is-focus",
    style: {
      "background-color": "#ffffff",
      "border-width": 2,
      "border-color": "#ff4f2f",
      width: 12,
      height: 12,
      "z-index-compare": "manual",
      "z-index": 999,
    },
  },
  {
    selector: ".is-selected",
    style: {
      "background-color": "#ff4f2f",
      "border-color": "#ff4f2f",
      "underlay-color": "#ff4f2f",
      "underlay-opacity": 1,
      "underlay-padding": 8,
      "z-index-compare": "manual",
      "z-index": 1000,
    },
  },
  {
    selector: ".is-neighbor",
    style: {
      "underlay-color": "#ff785e",
      "underlay-opacity": 0.88,
      "underlay-padding": 4,
      "z-index-compare": "manual",
      "z-index": 998,
    },
  },
  {
    selector: ".is-connected",
    style: {
      "line-color": "#ff785e",
      "line-opacity": 0.9,
      "target-arrow-color": "#ff785e",
      width: 2,
      "z-index-compare": "manual",
      "z-index": 997,
    },
  },
];

export function getCytoscapeStyles(
  displayMode: GraphDisplayMode,
  visibleNodeLabelKinds?: readonly (keyof typeof nodeMapNodeColors)[],
): cytoscape.StylesheetJson {
  return [...(displayMode === "node-map" ? nodeMapStyles : diagramStyles),
    { selector: 'node[kind = "relationship-bin"]', style: { shape: "round-rectangle",
      "border-style": "dashed", "border-width": 2,
      ...(displayMode === "node-map" ? { width: 14, height: 14, "border-color": "#f6fbff" } : {}) } },
    { selector: 'node[kind = "relationship-bin"][colorKind = "relationship-bin"]',
      style: { "background-color": "#95cdd5", "border-color": "#528390" } },
    { selector: 'edge[bundle]', style: { "target-arrow-shape": "triangle", "line-style": "dashed", width: 3 } },
    ...Object.keys(nodeMapNodeColors).filter(kind => visibleNodeLabelKinds &&
      !visibleNodeLabelKinds.some(visibleKind => visibleKind === kind)).map(kind => ({
      selector: `node[kind = "${kind}"]`, style: { "text-opacity": 0 },
    })),
  ];
}

export const cytoscapeStyles = diagramStyles;
