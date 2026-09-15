import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import * as THREE from "three";
import type { GraphData, LinkObject, NodeObject } from "three-forcegraph";
import ts from "typescript";

import { getNodeMap3dSeed, nodeMap3dGlobeRadius } from "../src/app/graph/nodeMap3dLayout";
import { nodeMapEdgeColors } from "../src/app/graph/graphColors";
import { indexGraph } from "../src/app/graph/indexGraph";
import { projectGraph, type GraphProjection, type ProjectionInput } from "../src/app/graph/projection";

type DrawNode = NodeObject & { id: string; __threeObj?: THREE.Object3D };
type DrawLink = LinkObject<DrawNode> & { id: string; type?: GraphProjection["edges"][number]["type"]; __lineObj?: THREE.Object3D };
type DrawData = GraphData<DrawNode, DrawLink>;

// Exercise production functions and effects without mounting the browser-only wrapper.
const source = readFileSync(new URL("../src/app/components/ForceGraphCanvas.tsx", import.meta.url), "utf8");
const file = ts.createSourceFile("ForceGraphCanvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function loadCode(names: string[], environment: Record<string, unknown> = {}) {
  const fragments: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name && names.includes(node.name.text)) fragments.push(node.getText(file));
    if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(file))) {
      fragments.push(`const ${node.getText(file)};`);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.equal(fragments.length, names.length);
  const compiled = ts.transpileModule(fragments.join("\n"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return new Function(...Object.keys(environment), `${compiled}; return { ${names.join(",")} };`)(...Object.values(environment));
}

function loadEffect(marker: string, environment: Record<string, unknown>) {
  let effect: ts.ArrowFunction | undefined;
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(file) === "useLayoutEffect" &&
        ts.isArrowFunction(node.arguments[0]) && node.arguments[0].getText(file).includes(marker)) effect = node.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(effect);
  const compiled = ts.transpileModule(`const effect = ${effect.getText(file)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return new Function(...Object.keys(environment), `${compiled}; return effect;`)(...Object.values(environment));
}

async function createEngine() {
  // three-forcegraph only reads window.THREE at module initialization; no WebGL is needed.
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
  const { default: ThreeForceGraph } = await import("three-forcegraph").finally(() => {
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
    else Reflect.deleteProperty(globalThis, "window");
  });
  return new ThreeForceGraph<DrawNode, DrawLink>().linkWidth(3);
}

test("link drawing survives deferred Graph/Tree/Globe transitions without stale scene objects", async () => {
  const callbacks = (arrangement: string) => loadCode([
    "clamp", "makeGlobeLinkObject", "isGlobeLinkObject", "slerpDirections", "getSphericalArcPoints",
    "getLinkCoordsKey", "updateGlobeLinkObject", "globeLinkSegments", "linkThreeObject", "linkPositionUpdate",
  ], { THREE, arrangement, nodeMap3dGlobeRadius, nodeMapEdgeColors,
    useCallback: (callback: unknown) => callback, linkColor: () => "#ffffff" });
  const graph = (await createEngine()).graphData({
    nodes: [{ id: "hub" }, { id: "neighbor" }], links: [{ id: "edge", type: "funds", source: "hub", target: "neighbor" }],
  });
  try {
    for (const arrangement of ["globe", "current", "globe", "flat", "current", "globe", "current"]) {
      const { linkThreeObject, linkPositionUpdate } = callbacks(arrangement);
      graph.linkThreeObject(linkThreeObject).linkThreeObjectExtend(arrangement !== "globe")
        .linkPositionUpdate(linkPositionUpdate);
      // Settings change synchronously, but scene objects are rebuilt on a later timer.
      assert.doesNotThrow(() => graph.tickFrame(), `${arrangement}: frame before scene reconciliation`);
      await delay(10);
      assert.doesNotThrow(() => graph.tickFrame(), `${arrangement}: frame after scene reconciliation`);
      assert.equal(graph.children.length, 3, "one object per node/link, no frozen duplicate");
      const hub = graph.graphData().nodes[0];
      Object.assign(hub, { x: 20, y: 30, z: 40, fx: 20, fy: 30, fz: 40 });
      graph.tickFrame();
      assert.deepEqual(hub.__threeObj!.position.toArray(), [20, 30, 40]);
    }
    for (const arrangement of ["current", "flat", "globe"]) {
      const { linkPositionUpdate } = callbacks(arrangement);
      const coords = { start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 2, z: 3 } };
      for (const pendingObject of [undefined, new THREE.Group(), new THREE.Line(new THREE.BufferGeometry())]) {
        assert.doesNotThrow(() => linkPositionUpdate(pendingObject, coords, {}));
      }
    }
  } finally {
    graph.graphData({ nodes: [], links: [] });
    await delay(10);
    assert.equal(graph.children.length, 0);
  }
});

test("live edges survive levels, legends, expansion, empty views and same-ID retargeting", async () => {
  const { buildForceGraphData: build, getEndpointId } = loadCode([
    "buildForceGraphData", "getEndpointId", "getNodeValue", "getNodePriority", "getRenderNodePosition", "applyNodePosition",
  ], { getNodeMap3dSeed });
  const canonical = indexGraph(JSON.parse(readFileSync(new URL("../public/bootstrap.public.json", import.meta.url), "utf8")));
  const canonicalSnapshot = JSON.stringify(canonical);
  const base: ProjectionInput = {
    graph: canonical, locale: "en", semanticLevel: "entity", selectedEntityId: "fishbase",
  };
  const family = projectGraph({ ...base, semanticLevel: "family" });
  assert.ok(family.bundles.length > 0);
  const scenarios: Partial<ProjectionInput>[] = [
    { semanticLevel: "family" }, { semanticLevel: "family" }, { semanticLevel: "type" }, { semanticLevel: "entity" },
    { hiddenEdgeKinds: ["funds"] }, { hiddenNodeKinds: ["organization"] },
    { hiddenNodeKinds: ["country", "organization", "system"] }, {},
    { semanticLevel: "family", expandedEntityIds: new Set(family.bundles[0].hiddenMemberIds) }, {},
  ];
  const engine = await createEngine();
  let previous: DrawData = build(projectGraph(base), { nodes: [], links: [] }, new Map(), false);
  const positions = new Map();
  engine.graphData(previous);
  await delay(10);
  engine.tickFrame();
  try {
    for (const scenario of [...scenarios, ...scenarios]) {
      for (const node of previous.nodes) positions.set(node.id, { x: node.x, y: node.y, z: node.z });
      const boundEndpoints = previous.links.map(link => [link, link.source, link.target] as const);
      const oldNodes = new Map(previous.nodes.map(node => [node.id, node]));
      const oldMeshes = new Map(previous.nodes.map(node => [node.id, node.__threeObj]));
      const oldLinks = new Map(previous.links.map(link => [link.id, link.__lineObj]));
      const projection = projectGraph({ ...base, ...scenario });
      const next: DrawData = build(projection, previous, positions, true);
      for (const [link, source, target] of boundEndpoints) {
        assert.equal(link.source, source, "preparing a projection must not invalidate the running force");
        assert.equal(link.target, target);
      }
      assert.doesNotThrow(() => engine.tickFrame(), "old engine remains safe before React installs graphData");
      engine.graphData(next);
      assert.doesNotThrow(() => engine.tickFrame(), "safe while scene reconciliation is pending");
      await delay(10);
      engine.tickFrame();
      assert.equal(engine.children.length, next.nodes.length + next.links.length);
      for (const node of next.nodes) {
        if (oldNodes.has(node.id)) {
          assert.equal(node, oldNodes.get(node.id));
          assert.equal(node.__threeObj, oldMeshes.get(node.id), "surviving node meshes are retained");
          if (canonical.nodeById[node.id]) assert.deepEqual({ x: node.x, y: node.y, z: node.z }, positions.get(node.id));
        }
      }
      for (const link of next.links) {
        if (oldLinks.has(link.id)) assert.equal(link.__lineObj, oldLinks.get(link.id), "surviving edge meshes are retained");
        assert.ok(next.nodes.includes(link.source as DrawNode));
        assert.ok(next.nodes.includes(link.target as DrawNode));
      }
      assert.ok(next.nodes.some(node => node.id === "fishbase") || scenario.hiddenNodeKinds?.includes("system"));
      previous = next;
    }

    const projection = projectGraph(base);
    const oldLink = previous.links[0];
    const oldTarget = oldLink.target;
    const newTarget = previous.nodes.find(node => node.id !== getEndpointId(oldTarget) && node.id !== getEndpointId(oldLink.source))!;
    const retargeted: GraphProjection = { ...projection, edges: projection.edges.map(edge =>
      edge.id === oldLink.id ? { ...edge, target: newTarget.id } : edge) };
    const next: DrawData = build(retargeted, previous, positions, true);
    assert.notEqual(next.links.find(link => link.id === oldLink.id), oldLink);
    assert.equal(oldLink.target, oldTarget);
    engine.tickFrame();
    engine.graphData(next);
    await delay(10);
    engine.tickFrame();
    assert.equal(next.links.find(link => link.id === oldLink.id)!.target, newTarget);
    assert.equal(JSON.stringify(canonical), canonicalSnapshot, "render updates never mutate canonical records");
  } finally {
    engine.graphData({ nodes: [], links: [] });
    await delay(10);
    assert.equal(engine.children.length, 0);
  }
});

test("position animation wakes a cooled engine without rebuilding meshes and cancels cleanly", async () => {
  let nextFrame = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const { animateNodePositions } = loadCode([
    "animateNodePositions", "getTransitionStartPositions", "getRenderNodePosition", "getRenderNodeId",
    "applyNodePosition", "releaseNodePosition", "easeInOutCubic", "clamp",
  ], { performance: { now: () => 0 }, window: {
    requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: (id: number) => frames.delete(id),
  } });
  const engine = (await createEngine()).cooldownTicks(1).graphData({
    nodes: [{ id: "hub" }, { id: "neighbor" }], links: [{ id: "edge", source: "hub", target: "neighbor" }],
  });
  await delay(10);
  engine.tickFrame().tickFrame(); // cooled before the transition starts
  const meshes = [...engine.children];
  let updates = 0;
  engine.onUpdate(() => { updates += 1; });
  let completed = 0;
  const targetById = new Map([["hub", { x: 200, y: 300, z: 0 }], ["neighbor", { x: 400, y: 500, z: 0 }]]);
  const options = { nodes: engine.graphData().nodes, targetById, durationMs: 900, fixedAfter: true,
    onPositionsChange: () => engine.d3ReheatSimulation(), onComplete: () => { completed += 1; } };
  try {
    animateNodePositions(options);
    for (const now of [0, 100, 450, 900]) {
      const callback = [...frames.values()][0];
      frames.clear();
      callback(now);
      engine.tickFrame();
      assert.deepEqual(engine.children, meshes);
      for (const node of engine.graphData().nodes) {
        assert.deepEqual(node.__threeObj!.position.toArray(), [node.x, node.y, node.z]);
      }
    }
    await delay(10);
    assert.equal(updates, 0, "position-only animation never runs an object digest");
    assert.equal(completed, 1);
    assert.equal(frames.size, 0);
    for (const node of engine.graphData().nodes) {
      assert.deepEqual({ x: node.fx, y: node.fy, z: node.fz }, targetById.get(node.id));
    }
    const cancel = animateNodePositions({ ...options, fixedAfter: false });
    const pending = [...frames.values()][0];
    cancel();
    pending(900);
    assert.equal(frames.size, 0);
    assert.equal(completed, 1, "a cancelled transition cannot complete later");

    // Appearance changes also retain objects when the object factory/shape is stable.
    engine.nodeColor(() => "#8fc7ff").linkColor(() => "#9ad29d");
    await delay(10);
    engine.tickFrame();
    assert.deepEqual(engine.children, meshes);
  } finally {
    engine.graphData({ nodes: [], links: [] });
    await delay(10);
  }
});

test("the projection update effect coalesces rapid controls without touching the camera", () => {
  let scheduled: (() => void) | undefined;
  let builds = 0;
  let committed: unknown;
  const nextData = { nodes: [], links: [] };
  const environment = {
    renderedGraphRef: { current: { data: { nodes: [], links: [] }, arrangement: "current" } },
    currentPositionByIdRef: { current: new Map() }, currentLayoutTransitionRef: { current: false },
    warmupTicksRef: { current: 48 }, initializedDataRef: { current: true },
    buildForceGraphData: () => { builds += 1; return nextData; },
    setHoveredEntityId: () => undefined,
    setRenderedGraph: (next: unknown) => { committed = next; }, graph: null,
    window: { requestAnimationFrame: (callback: () => void) => { scheduled = callback; return 1; },
      cancelAnimationFrame: () => { scheduled = undefined; } },
  };
  let cleanup: (() => void) | undefined;
  const latest = { level: "entity" };
  for (const projection of [{ level: "family" }, { level: "type" }, latest]) {
    cleanup?.();
    cleanup = loadEffect("setRenderedGraph({", { ...environment, projection, requestedArrangement: "current" })();
  }
  assert.equal(builds, 0, "obsolete projections never touch live data");
  assert.ok(scheduled);
  scheduled();
  assert.equal(builds, 1);
  assert.deepEqual(committed, { data: nextData, projection: latest, arrangement: "current" });
  // No camera/controls/renderer is supplied: content updates must not need one.
  cleanup?.();
  assert.equal(scheduled, undefined);
});

test("a superseded asynchronous layout cannot animate an obsolete projection", async () => {
  let resolveLayout: (targets: Map<string, { x: number; y: number; z: number }>) => void = () => undefined;
  let layoutProjection: unknown;
  let animatedNodes: unknown;
  let stopped = 0;
  const environment = {
    graphRef: { current: {} }, arrangement: "flat", arrangementRef: { current: "flat" },
    hasAppliedArrangementRef: { current: true }, currentLayoutTransitionRef: { current: false },
    nodeTransitionDurationMs: 900,
    getNodeMap3dTargets: (projection: unknown) => {
      layoutProjection = projection;
      return new Promise(resolve => { resolveLayout = resolve; });
    },
    animateNodePositions: ({ nodes }: { nodes: unknown }) => {
      animatedNodes = nodes;
      return () => { stopped += 1; };
    },
  };
  const oldProjection = { id: "old" };
  const cancel = loadEffect("void getNodeMap3dTargets", { ...environment,
    renderProjection: oldProjection, graphData: { nodes: [{ id: "old" }], links: [] } })();
  assert.equal(layoutProjection, oldProjection);
  cancel();
  resolveLayout(new Map([["old", { x: 0, y: 0, z: 0 }]]));
  await delay(0);
  assert.equal(animatedNodes, undefined);

  const latestProjection = { id: "latest" };
  const latestData = { nodes: [{ id: "latest" }], links: [] };
  const stop = loadEffect("void getNodeMap3dTargets", { ...environment,
    renderProjection: latestProjection, graphData: latestData })();
  resolveLayout(new Map([["latest", { x: 10, y: 20, z: 0 }]]));
  await delay(0);
  assert.equal(layoutProjection, latestProjection);
  assert.equal(animatedNodes, latestData.nodes);
  stop();
  assert.equal(stopped, 1);
});

test("label and highlight rerenders retain the link factory and avoid width-triggered scene rebuilds", () => {
  const cache: { value: unknown; deps: unknown[] }[] = [];
  let cursor = 0;
  const environment = {
    THREE, arrangement: "current", selectedEntityId: "hub", selectedRelationshipId: null,
    highlighted: { linkIds: new Set(["edge"]) },
    useCallback: (value: unknown, deps: unknown[]) => {
      const index = cursor++;
      if (!cache[index] || deps.some((dep, i) => dep !== cache[index].deps[i])) cache[index] = { value, deps };
      return cache[index].value;
    },
  };
  const names = ["linkWidth", "linkArrowLength", "linkParticles", "linkThreeObject", "getEndpointId"];
  const first = loadCode(names, environment);
  cursor = 0;
  const labelRender = loadCode(names, environment);
  for (const name of names.filter(name => name !== "getEndpointId")) assert.equal(labelRender[name], first[name]);
  cursor = 0;
  const graphRender = loadCode(names, { ...environment, highlighted: { linkIds: new Set(["edge", "new-edge"]) } });
  assert.equal(graphRender.linkThreeObject, first.linkThreeObject);
  assert.equal(graphRender.linkWidth, first.linkWidth);
  assert.equal(graphRender.linkArrowLength, first.linkArrowLength);
  assert.equal(graphRender.linkWidth({ source: { id: "hub" }, target: { id: "neighbor" } }), 5.4);
  assert.equal(graphRender.linkWidth({ source: "other", target: "neighbor" }), 3);
});

test("hidden label kinds neither render nor suppress visible labels through collision checks", () => {
  const { buildLabelPlacements } = loadCode([
    "buildLabelPlacements", "estimateLabelWidth", "getCameraDepth", "clamp", "hasCollision", "rectsOverlap",
    "labelCollisionInset", "labelFarDepthOpacity", "labelDepthPriorityBoost",
  ], { THREE });
  const nodes = (["country", "organization", "system", "relationship-bin"] as const).map(kind => ({
    id: kind, kind, colorKind: kind, label: kind, secondaryLabel: null, priority: kind === "organization" ? 1000 : 100,
    x: kind === "relationship-bin" ? 250 : 0, y: 0, z: 0,
  }));
  const snapshot = JSON.stringify(nodes);
  const camera = new THREE.PerspectiveCamera();
  camera.position.z = 100;
  const cameraPosition = camera.position.clone();
  let measured = 0;
  const graph = { camera: () => camera, graph2ScreenCoords: (x: number) => { measured += 1; return { x: 300 + x, y: 200 }; } };
  const labels = buildLabelPlacements(graph, nodes, { width: 1000, height: 600 }, "country", null,
    new Set(), ["system", "relationship-bin"]);
  assert.deepEqual(labels.map((label: { id: string }) => label.id).sort(), ["relationship-bin", "system"]);
  assert.equal(measured, 2, "hidden labels are filtered before measuring and collision detection");
  assert.ok(labels.find((label: { id: string }) => label.id === "system").opacity > 0);
  assert.deepEqual(buildLabelPlacements(graph, nodes, { width: 1000, height: 600 }, null, null, new Set(), []), []);
  assert.equal(JSON.stringify(nodes), snapshot);
  assert.deepEqual(camera.position, cameraPosition);
});
