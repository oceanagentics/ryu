import assert from "node:assert/strict";
import { test } from "node:test";
import cytoscape from "cytoscape";
import { Color } from "three";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { edgeKinds, type GraphEdge, type GraphNode } from "../../shared/domain";
import { emptyLocalizationDetails } from "../../shared/localization";
import { indexGraph } from "../src/app/graph/indexGraph";
import { projectGraph, type ProjectionInput, type GraphProjection } from "../src/app/graph/projection";
import { projectCytoscapeGraph } from "../src/app/graph/layout";
import { projectGlobeGraph } from "../src/app/graph/globeProjection";
import { getNodeMap3dSeed } from "../src/app/graph/nodeMap3dLayout";
import { getCytoscapeStyles, nodeMapEdgeColors, nodeMapNodeColors } from "../src/app/graph/cytoscapeStyles";
import { useGraphStore } from "../src/app/state/graphStore";
import { LegendPanel } from "../src/app/components/LegendPanel";

function node(id: string): GraphNode {
  return {
    id, kind: "system", url: null, recordDepth: "stub", properties: {}, sources: {},
    createdAt: "2026-09-14", updatedAt: "2026-09-14", availableLocales: ["en"],
    requestedLocale: "en", displayLocale: "en", isLocaleFallback: false,
    localizations: { en: { locale: "en", title: id, summary: null, description: null,
      details: emptyLocalizationDetails(), translatedFromLocale: null, contentUpdatedAt: "2026-09-14",
      review: { state: "agent_researched", note: null, reviewer: null, date: null },
      createdAt: "2026-09-14", updatedAt: "2026-09-14" } },
  };
}

function edge(id: string, sourceNodeId: string, targetNodeId: string, kind: GraphEdge["kind"] = "transfers"): GraphEdge {
  return { id, sourceNodeId, targetNodeId, kind, description: "", sources: {},
    createdAt: "2026-09-14", updatedAt: "2026-09-14" };
}

function input(edges: GraphEdge[], extraIds: string[] = []): ProjectionInput {
  return { graph: indexGraph({ nodes: [...new Set([...extraIds,
    ...edges.flatMap(edge => [edge.sourceNodeId, edge.targetNodeId])])].map(node),
    edges, savedViews: [], ryuRoutes: [] }),
    viewMode: "governance", countryDisplayMode: "node", focusEntityId: null,
    locale: "en", semanticLevel: "type" };
}

function verifyCoverage(projection: GraphProjection, edgeIds: string[]) {
  const ids = projection.nodes.map(node => node.id);
  assert.equal(new Set(ids).size, ids.length);
  const represented = projection.edges.flatMap(edge => edge.bundle ? edge.edgeIds : [edge.id]);
  assert.deepEqual(represented.sort(), [...edgeIds].sort());
  assert.equal(new Set(represented).size, represented.length);
  for (const edge of projection.edges) {
    assert.ok(ids.includes(edge.source), edge.source);
    assert.ok(ids.includes(edge.target), edge.target);
    if (edge.bundle) assert.ok(!ids.includes(edge.id), "synthetic node and edge namespaces are disjoint");
  }
}

test("Entity is canonical and projection never mutates the input graph", () => {
  const source = input([edge("a", "hub", "one"), edge("b", "hub", "two")]);
  const snapshot = JSON.stringify(source.graph);
  const projected = projectGraph({ ...source, semanticLevel: "entity" });
  assert.deepEqual(projected.nodes.map(node => node.id), source.graph.nodes.map(node => node.id));
  assert.deepEqual(projected.edges.map(edge => edge.id), ["a", "b"]);
  assert.equal(projected.effectiveFocusEntityId, null);
  projectGraph(source);
  assert.equal(JSON.stringify(source.graph), snapshot);
});

test("all six types form distinct incoming and outgoing bins with exact edge coverage", () => {
  const edges = edgeKinds.flatMap(kind => ["incoming", "outgoing"].flatMap(direction =>
    [0, 1].map(index => {
      const member = `${kind}-${direction}-${index}`;
      return direction === "outgoing" ? edge(member, "hub", member, kind) : edge(member, member, "hub", kind);
    })));
  const projected = projectGraph(input(edges));
  const bins = projected.nodes.filter(node => node.bundle);
  assert.equal(bins.length, 12);
  for (const bin of bins) {
    assert.equal(bin.bundle!.hiddenMemberIds.length, 2);
    assert.equal(bin.simpleLabel, `2 ${bin.bundle!.groupId} nodes`);
    const aggregate = projected.edges.find(edge => edge.bundle?.id === bin.id)!;
    assert.equal(aggregate.source, bin.bundle!.direction === "outgoing" ? "hub" : bin.id);
    assert.equal(aggregate.target, bin.bundle!.direction === "outgoing" ? bin.id : "hub");
  }
  verifyCoverage(projected, edges.map(edge => edge.id));
});

test("family bins show the unique count first, then the family label and nodes", () => {
  const source = input(["one", "two"].flatMap(id => [
    edge(`fund-${id}`, "hub", id, "funds"), edge(`operate-${id}`, "hub", id, "operates"),
    edge(`transfer-${id}`, "hub", id, "transfers"),
  ]));
  const projected = projectGraph({ ...source, semanticLevel: "family" });
  const bins = projected.nodes.filter(node => node.bundle);
  assert.deepEqual(bins.map(node => node.simpleLabel).sort(), ["2 Data nodes", "2 Org nodes"]);
  const display = projectCytoscapeGraph(projected, "grid", "governance", "node-map");
  for (const bin of bins) {
    assert.equal(bin.label, `${bin.simpleLabel}\noutgoing`);
    assert.equal(display.elements.find(element => element.data.id === bin.id)!.data.simpleLabel, bin.simpleLabel);
    assert.equal(projected.edges.find(edge => edge.bundle?.id === bin.id)!.label, `${bin.simpleLabel} · outgoing`);
  }
});

test("canonical and aggregate edges share the node blue/green palette across renderers", () => {
  assert.equal(nodeMapNodeColors.organization, "#9ad29d");
  assert.equal(nodeMapNodeColors.system, "#8fc7ff");
  assert.equal(new Set(Object.values(nodeMapEdgeColors)).size, 2);
  for (const kind of [...edgeKinds, "org", "data"] as const) {
    const isData = ["contributes", "transfers", "data"].includes(kind);
    assert.equal(nodeMapEdgeColors[kind], nodeMapNodeColors[isData ? "system" : "organization"]);
  }
  const source = input(edgeKinds.flatMap(kind => ["one", "two"].map(id =>
    edge(`edge-${kind}-${id}`, "hub", `${kind}-${id}`, kind))));
  for (const semanticLevel of ["entity", "type", "family"] as const) {
    const projection = projectGraph({ ...source, semanticLevel });
    for (const displayMode of ["diagram", "node-map"] as const) {
      const plan = projectCytoscapeGraph(projection, "grid", "governance", displayMode);
      const cy = cytoscape({ headless: true, styleEnabled: true, elements: plan.elements,
        style: getCytoscapeStyles(displayMode) });
      try {
        for (const edge of projection.edges) {
          const displayed = cy.getElementById(edge.id);
          const color = new Color(nodeMapEdgeColors[edge.type]).getStyle();
          assert.equal(displayed.style("line-color"), color);
          assert.equal(displayed.style("target-arrow-color"), color);
          displayed.addClass("is-connected");
          assert.equal(displayed.style("line-color"), "rgb(255,120,94)");
          assert.equal(displayed.style("target-arrow-color"), "rgb(255,120,94)");
        }
      } finally { cy.destroy(); }
    }
    if (semanticLevel === "entity") {
      for (const link of projectGlobeGraph(projection).links) {
        assert.equal(link.color, nodeMapEdgeColors[link.type]);
      }
    }
  }
});

test("families deduplicate multi-role and duplicate-edge members; opposing directions stay separate", () => {
  const edges = ["one", "two"].flatMap(id => [
    edge(`op-${id}`, "hub", id, "operates"), edge(`fund-${id}`, "hub", id, "funds"),
    edge(`con-${id}`, "hub", id, "contributes"), edge(`back-${id}`, id, "hub"),
    edge(`duplicate-${id}`, "hub", id, "funds"),
  ]);
  const projected = projectGraph({ ...input(edges), semanticLevel: "family" });
  assert.equal(projected.nodes.filter(node => node.bundle).length, 3);
  for (const node of projected.nodes.filter(node => node.bundle)) {
    assert.deepEqual(node.bundle!.hiddenMemberIds, ["one", "two"]);
  }
  verifyCoverage(projected, edges.map(edge => edge.id));
});

test("bin color classification comes from hidden members, not its hub or relationship family", () => {
  const source = input([edge("a", "hub", "one", "funds"), edge("b", "hub", "two", "funds"),
    edge("c", "hub", "visible", "funds")]);
  for (const kind of ["country", "organization", "system"] as const) {
    for (const id of ["one", "two"]) Object.assign(source.graph.nodeById[id], { kind });
    for (const semanticLevel of ["family", "type"] as const) {
      const projected = projectGraph({ ...source, semanticLevel, selectedEntityId: "visible" });
      const bin = projected.nodes.find(node => node.bundle)!;
      assert.deepEqual(bin.memberKinds, [kind]);
      assert.equal(bin.kind, "relationship-bin", "display color never changes synthetic identity");
      for (const displayMode of ["diagram", "node-map"] as const) {
        const plan = projectCytoscapeGraph(projected, "grid", "governance", displayMode);
        const cy = cytoscape({ headless: true, styleEnabled: true, elements: [...plan.elements,
          { data: { id: "reference", kind, label: "Reference", simpleLabel: "Reference",
            width: 100, height: 60, textMaxWidth: 90 } }], style: getCytoscapeStyles(displayMode) });
        try {
          const renderedBin = cy.getElementById(bin.id);
          assert.equal(renderedBin.data("colorKind"), kind);
          assert.equal(renderedBin.style("background-color"), cy.getElementById("reference").style("background-color"));
          assert.equal(renderedBin.style("border-style"), "dashed");
        } finally { cy.destroy(); }
      }
    }
  }
});

test("mixed-bin classification is deterministic and changes when members are revealed", () => {
  const source = input([edge("a", "hub", "one", "contributes"), edge("b", "hub", "two", "contributes"),
    edge("c", "hub", "three", "transfers")]);
  for (const id of ["one", "two"]) Object.assign(source.graph.nodeById[id], { kind: "organization" });
  const mixedProjection = projectGraph({ ...source, semanticLevel: "family" });
  const mixed = mixedProjection.nodes.find(node => node.bundle)!;
  assert.deepEqual(mixed.memberKinds, ["organization", "system"]);
  const blendedColor = new Color("#9ad29d").lerp(new Color("#8fc7ff"), 0.5).getStyle();
  for (const displayMode of ["diagram", "node-map"] as const) {
    const plan = projectCytoscapeGraph(mixedProjection, "grid", "governance", displayMode);
    const cy = cytoscape({ headless: true, styleEnabled: true, elements: plan.elements,
      style: getCytoscapeStyles(displayMode) });
    try {
      assert.equal(cy.getElementById(mixed.id).style("background-color"), blendedColor);
    } finally { cy.destroy(); }
  }
  const revealed = projectGraph({ ...source, semanticLevel: "family", expandedEntityIds: new Set(["three"]) })
    .nodes.find(node => node.bundle)!;
  assert.equal(revealed.id, mixed.id);
  assert.deepEqual(revealed.memberKinds, ["organization"]);
  const reversed = projectGraph({ ...source, semanticLevel: "family", graph: indexGraph({ ...source.graph,
    nodes: [...source.graph.nodes].reverse(), edges: [...source.graph.edges].reverse() }) });
  assert.deepEqual(reversed.nodes.find(node => node.bundle)!.memberKinds, mixed.memberKinds);
});

test("singleton promotion reconciles overlapping memberships without dropping relationships", () => {
  const source = input([edge("a", "hub", "one", "operates"), edge("b", "hub", "two", "operates"),
    edge("c", "hub", "one", "contributes")]);
  const projected = projectGraph({ ...source, semanticLevel: "family" });
  assert.equal(projected.nodes.filter(node => node.bundle).length, 0);
  verifyCoverage(projected, ["a", "b", "c"]);
});

test("global hubs, shared topology, cycles, self-loops, pairs and isolated nodes remain real", () => {
  const edges = [edge("a", "hub", "one"), edge("b", "hub", "two"),
    edge("s1", "hub", "shared"), edge("s2", "shared", "other-hub"),
    edge("c", "other-hub", "three"), edge("d", "other-hub", "four"),
    edge("cycle1", "c1", "c2"), edge("cycle2", "c2", "c3"), edge("cycle3", "c3", "c1"),
    edge("pair", "p1", "p2"), edge("self", "self", "self")];
  const projected = projectGraph(input(edges, ["isolated"]));
  const realIds = projected.nodes.filter(node => !node.bundle).map(node => node.id);
  assert.deepEqual(realIds.sort(), ["hub", "shared", "other-hub", "c1", "c2", "c3", "p1", "p2", "self", "isolated"].sort());
  const hubGroup = projected.bundles.find(bundle => bundle.hubId === "hub" && bundle.level === "type")!;
  assert.deepEqual(hubGroup.memberIds, ["one", "shared", "two"]);
  assert.deepEqual(hubGroup.hiddenMemberIds, ["one", "two"]);
  verifyCoverage(projected, edges.map(edge => edge.id));
});

test("focus, selection, selected edge endpoints, search and expansion protect canonical identities", () => {
  const edges = ["one", "two", "three", "four"].map(id => edge(id, "hub", id));
  const source = input(edges);
  for (const overrides of [
    { selectedEntityId: "one" }, { selectedRelationshipId: "one" },
    { expandedEntityIds: new Set(["one"]) },
    { viewMode: "technical" as const, focusEntityId: "one" },
  ]) {
    const projected = projectGraph({ ...source, ...overrides });
    assert.ok(projected.nodes.some(node => node.id === "one" && !node.bundle));
    verifyCoverage(projected, edges.map(edge => edge.id));
  }
  const search = projectGraph({ ...source, searchEntityIds: new Set(source.graph.nodes.map(node => node.id)) });
  assert.equal(search.nodes.filter(node => node.bundle).length, 0);
  const collapsed = projectGraph(source);
  const group = collapsed.nodes.find(node => node.bundle)!.bundle!;
  const expanded = projectGraph({ ...source, expandedEntityIds: new Set(group.hiddenMemberIds) });
  assert.equal(expanded.nodes.filter(node => node.bundle).length, 0);
  assert.equal(expanded.bundles.find(bundle => bundle.id === group.id)!.hiddenMemberIds.length, 0);
  verifyCoverage(expanded, edges.map(edge => edge.id));
});

test("filters affect counts and coverage, not structural bridge protection", () => {
  const edges = [edge("a", "hub", "one"), edge("b", "hub", "two"), edge("c", "hub", "shared"),
    edge("excluded", "shared", "other", "member")];
  const projected = projectGraph({ ...input(edges), hiddenEdgeKinds: ["member"] });
  assert.ok(projected.nodes.some(node => node.id === "shared"));
  assert.deepEqual(projected.nodes.find(node => node.bundle)!.bundle!.hiddenMemberIds, ["one", "two"]);
  verifyCoverage(projected, ["a", "b", "c"]);
  assert.equal(projectGraph({ ...input(edges), hiddenNodeKinds: ["system"] }).nodes.length, 0);
});

test("bin IDs and membership are order/locale/count independent and cannot collide with records", () => {
  const source = input([edge("a", "hub", "one"), edge("b", "hub", "two"), edge("c", "hub", "three")]);
  const first = projectGraph(source);
  const second = projectGraph({ ...source, graph: indexGraph({ ...source.graph,
    nodes: [...source.graph.nodes].reverse(), edges: [...source.graph.edges].reverse() }), locale: "fr" });
  assert.deepEqual(first.bundles.map(({ label, ...bundle }) => bundle), second.bundles.map(({ label, ...bundle }) => bundle));
  const id = first.nodes.find(node => node.bundle)!.id;
  assert.equal(projectGraph({ ...source, selectedEntityId: "one" }).nodes.find(node => node.bundle)!.id, id);
  const collision = projectGraph(input(source.graph.edges, [id]));
  assert.ok(collision.nodes.some(node => node.id === id && !node.bundle));
  assert.notEqual(collision.nodes.find(node => node.bundle)!.id, id);
  verifyCoverage(collision, ["a", "b", "c"]);
});

test("Cytoscape retains synthetic metadata; Globe rejects non-Entity projections", () => {
  const source = input([edge("a", "hub", "one"), edge("b", "hub", "two")]);
  const projected = projectGraph(source);
  const converted = projectCytoscapeGraph(projected, "grid", "governance");
  assert.equal(converted.elements.filter(element => element.data.bundle).length, 2);
  assert.throws(() => projectGlobeGraph(projected), /Entity-level/);
  assert.equal(projectGlobeGraph(projectGraph({ ...source, semanticLevel: "entity" })).nodes.length, 3);
});

test("new-node placement is deterministic, local and independent of membership order", () => {
  const anchor = { x: 200, y: 300, z: 100 };
  const a = getNodeMap3dSeed("bin-a", anchor);
  assert.deepEqual(a, getNodeMap3dSeed("bin-a", anchor));
  assert.notDeepEqual(a, getNodeMap3dSeed("bin-b", anchor));
  assert.ok(Math.hypot(a.x - anchor.x, a.y - anchor.y, a.z - anchor.z) < 80);
});

test("expansion is separate from canonical selection, persists across levels and resets on context change", () => {
  const source = input([edge("a", "hub", "one"), edge("b", "hub", "two")]);
  useGraphStore.getState().setBootstrap(source.graph);
  useGraphStore.getState().setSelectedEntityId("hub");
  const group = projectGraph(source).nodes.find(node => node.bundle)!.bundle!;
  useGraphStore.getState().expandRelationshipBundle(group);
  assert.equal(useGraphStore.getState().selectedEntityId, "hub");
  assert.equal(useGraphStore.getState().selectedBundleId, group.id);
  useGraphStore.getState().setSemanticLevel("family");
  assert.equal(useGraphStore.getState().expandedEntityIds.size, 2);
  useGraphStore.getState().setLocale("fr");
  assert.equal(useGraphStore.getState().expandedEntityIds.size, 2);
  useGraphStore.getState().setSearchQuery("one");
  assert.equal(useGraphStore.getState().expandedEntityIds.size, 0);
  assert.equal(useGraphStore.getState().selectedBundleId, null);
  useGraphStore.getState().setSemanticLevel("entity");
});

test("representative large star conserves all relationships", () => {
  const edges = Array.from({ length: 10000 }, (_, index) => edge(String(index), "hub", `member-${index}`));
  const projected = projectGraph(input(edges));
  assert.equal(projected.nodes.length, 2);
  assert.equal(projected.nodes.find(node => node.bundle)!.bundle!.hiddenMemberIds.length, 10000);
  verifyCoverage(projected, edges.map(edge => edge.id));
});

test("varied multi-role graphs conserve filtered relationships and protected identities at every level", () => {
  let seed = 37;
  const random = (max: number) => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) % max);
  for (let sample = 0; sample < 80; sample++) {
    const edges = Array.from({ length: 30 }, (_, index) => {
      const a = random(3) === 0 ? `node-${random(12)}` : "hub";
      const b = `node-${random(12)}`;
      return edge(`edge-${index}`, a, b, edgeKinds[random(edgeKinds.length)]);
    });
    const source = input(edges);
    const hiddenEdgeKinds = [edgeKinds[random(edgeKinds.length)]];
    for (const semanticLevel of ["family", "type", "entity"] as const) {
      const projected = projectGraph({ ...source, semanticLevel, hiddenEdgeKinds, selectedEntityId: "node-1" });
      verifyCoverage(projected, edges.filter(edge => !hiddenEdgeKinds.includes(edge.kind)).map(edge => edge.id));
      if (source.graph.nodeById["node-1"]) assert.ok(projected.nodes.some(node => node.id === "node-1"));
      for (const node of projected.nodes) if (node.bundle) {
        assert.ok(node.bundle.hiddenMemberIds.length >= 2);
        assert.ok(!node.bundle.hiddenMemberIds.includes("node-1"));
      }
    }
  }
});

test("legend label controls default to systems and bins without changing graph or selection state", () => {
  const initial = useGraphStore.getInitialState().visibleNodeLabelKinds;
  assert.deepEqual(initial, ["system", "relationship-bin"]);
  const previous = useGraphStore.getState();
  try {
    useGraphStore.setState({ visibleNodeLabelKinds: initial, locale: "en" });
    const html = renderToStaticMarkup(createElement(LegendPanel));
    const checkboxes = [...html.matchAll(/<input[^>]*type="checkbox"[^>]*>/g)].map(match => match[0]);
    assert.equal(checkboxes.length, 4);
    assert.deepEqual(checkboxes.map(input => input.includes("checked")), [false, false, true, true]);
    assert.ok(html.includes("Node labels"));
    const { visibleNodeLabelKinds: _, ...unchanged } = useGraphStore.getState();
    for (const kind of ["country", "organization", "system", "relationship-bin"] as const) {
      const before = useGraphStore.getState().visibleNodeLabelKinds.includes(kind);
      useGraphStore.getState().toggleNodeLabelVisibility(kind);
      assert.equal(useGraphStore.getState().visibleNodeLabelKinds.includes(kind), !before);
      useGraphStore.getState().toggleNodeLabelVisibility(kind);
      assert.equal(useGraphStore.getState().visibleNodeLabelKinds.includes(kind), before);
    }
    const { visibleNodeLabelKinds: __, ...after } = useGraphStore.getState();
    assert.deepEqual(after, unchanged, "labels do not reset filters, expansion, selection, viewport or canonical data");
  } finally { useGraphStore.setState(previous); }
});

test("Cytoscape label toggles affect text only, including selected nodes and bins", () => {
  const kinds = ["country", "organization", "system", "relationship-bin"] as const;
  for (const displayMode of ["diagram", "node-map"] as const) {
    const cy = cytoscape({ headless: true, styleEnabled: true, layout: { name: "preset" },
      elements: kinds.map((kind, index) => ({ data: { id: kind, kind, colorKind: kind, label: kind,
        simpleLabel: kind, width: 100, height: 30, textMaxWidth: 90 }, position: { x: index * 120, y: 0 } })),
      style: getCytoscapeStyles(displayMode) });
    cy.zoom(2);
    cy.pan({ x: 10, y: 20 });
    cy.$id("organization").addClass("is-selected");
    const positions = cy.nodes().map(node => ({ ...node.position() }));
    try {
      for (const visible of [["system", "relationship-bin"], [], [...kinds]] as (typeof kinds[number])[][]) {
        cy.style().fromJson(getCytoscapeStyles(displayMode, visible)).update();
        cy.nodes().forEach(node => {
          assert.equal(node.style("text-opacity"), visible.some(kind => kind === node.id()) ? "1" : "0");
          assert.equal(node.style("display"), "element");
        });
        assert.equal(cy.nodes().length, 4);
        assert.deepEqual(cy.nodes().map(node => ({ ...node.position() })), positions);
        assert.equal(cy.zoom(), 2);
        assert.deepEqual(cy.pan(), { x: 10, y: 20 });
      }
    } finally { cy.destroy(); }
  }
});
