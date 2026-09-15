import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type WheelEvent as ReactWheelEvent,
} from "react";
import ForceGraph3D, {
  type ForceGraphMethods,
  type GraphData,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-3d";
import * as THREE from "three";

import { nodeMapEdgeColors, nodeMapNodeColors } from "../graph/graphColors";
import {
  createNodeMap3dGlobe,
  disposeNodeMap3dObject,
  updateNodeMap3dGlobe,
} from "./nodeMap3dGlobeScene";
import {
  getNodeMap3dTargets,
  getNodeMap3dSeed,
  nodeMap3dGlobeRadius,
  nodeMap3dStageRadius,
  type NodeMap3dArrangement,
  type NodeMap3dPosition,
} from "../graph/nodeMap3dLayout";
import {
  projectGraph,
  type GraphProjection,
  type GraphProjectionEdgeType,
  type GraphProjectionNode,
  type RelationshipBundle,
} from "../graph/projection";
import { formatNumber, t, vocabularyLabel } from "../i18n";
import { nodeTitle } from "../localization";
import { useGraphStore } from "../state/graphStore";

type ForceGraphNode = {
  id: string;
  label: string;
  secondaryLabel: string | null;
  kind: GraphProjectionNode["kind"];
  colorKind: GraphProjectionNode["kind"];
  layoutBand: number;
  degree: number;
  priority: number;
  val: number;
  bundle?: RelationshipBundle;
};

type ForceGraphLink = {
  id: string;
  source: string;
  target: string;
  type: GraphProjectionEdgeType;
  label: string;
  bundle?: RelationshipBundle;
};

type RenderNode = NodeObject<ForceGraphNode>;
type RenderLink = LinkObject<ForceGraphNode, ForceGraphLink>;
type ForceGraphData = GraphData<ForceGraphNode, ForceGraphLink>;
type ForceGraphHandle = ForceGraphMethods<ForceGraphNode, ForceGraphLink>;

type LabelPlacement = {
  id: string;
  label: string;
  secondaryLabel: string | null;
  expanded: boolean;
  opacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  selected: boolean;
  hovered: boolean;
  neighbor: boolean;
  kind: ForceGraphNode["kind"];
  colorKind: ForceGraphNode["colorKind"];
};

type Rect = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

type Size = {
  height: number;
  width: number;
};

type D3ForceLink = {
  distance: (value: number | ((link: RenderLink) => number)) => D3ForceLink;
  strength: (value: number | ((link: RenderLink) => number)) => D3ForceLink;
};

type D3ForceManyBody = {
  strength: (value: number | ((node: RenderNode) => number)) => D3ForceManyBody;
};

type D3ForceCenter = {
  strength?: (value: number) => D3ForceCenter;
  x: (value: number) => D3ForceCenter;
  y: (value: number) => D3ForceCenter;
  z?: (value: number) => D3ForceCenter;
};

type CameraControls = {
  addEventListener?: (
    type: "start" | "end" | "change",
    listener: (event?: unknown) => void,
  ) => void;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  dampingFactor?: number;
  enableDamping?: boolean;
  enablePan?: boolean;
  enableRotate?: boolean;
  mouseButtons?: {
    LEFT?: number;
    MIDDLE?: number;
    RIGHT?: number;
  };
  noRotate?: boolean;
  panSpeed?: number;
  removeEventListener?: (
    type: "start" | "end" | "change",
    listener: (event?: unknown) => void,
  ) => void;
  target?: THREE.Vector3;
  update?: () => void;
};

type Coords = {
  x: number;
  y: number;
  z: number;
};

interface ForceGraphCanvasProps {
  arrangement?: NodeMap3dArrangement;
}

const selectedOrange = "#ff4f2f";
const connectedOrange = "#ff785e";

const nodeTransitionDurationMs = 900;
const nodeMap3dStageCameraFov = 50;
const nodeMap3dStageCameraDistance = nodeMap3dStageRadius * 3.2;
const nodeMap3dStageCameraPosition = {
  x: 0,
  y: 0,
  z: nodeMap3dStageCameraDistance,
};
const nodeMap3dStageOffAxisCameraPosition = {
  x: nodeMap3dStageRadius * 0.38,
  y: nodeMap3dStageRadius * 0.22,
  z: nodeMap3dStageCameraDistance * 0.98,
};
const nodeMap3dStageLookAt = { x: 0, y: 0, z: 0 };
const nodeMap3dAutoRotateSpeed = 0.18;
const nodeMap3dGlobeAutoRotateSpeed = 0.22;
const globeOverlayFadeDurationMs = 520;
const globeLinkSegments = 44;
const labelCollisionInset = 4;
const labelFarDepthOpacity = 0.34;
const labelDepthPriorityBoost = 140;

function getNodeValue(kind: ForceGraphNode["kind"]): number {
  if (kind === "country") {
    return 8;
  }
  if (kind === "organization") {
    return 5.5;
  }
  return 3.6;
}

function getNodePriority(
  node: GraphProjectionNode,
  degree: number,
): number {
  const kindPriority =
    node.kind === "country" ? 300 : node.kind === "organization" ? 200 : 100;

  return kindPriority + degree * 8;
}

function buildForceGraphData(
  projection: GraphProjection,
  previous: ForceGraphData,
  positions: Map<string, NodeMap3dPosition>,
  preservePositions: boolean,
): ForceGraphData {
  const degreeByNodeId = new Map<string, number>();
  for (const edge of projection.edges) {
    degreeByNodeId.set(edge.source, (degreeByNodeId.get(edge.source) ?? 0) + 1);
    degreeByNodeId.set(edge.target, (degreeByNodeId.get(edge.target) ?? 0) + 1);
  }

  const previousNodes = new Map(previous.nodes.map(node => [node.id, node]));
  const previousLinks = new Map(previous.links.map(link => [link.id, link]));
  const structureChanged = projection.nodes.length !== previous.nodes.length ||
    projection.edges.length !== previous.links.length ||
    projection.nodes.some(node => !previousNodes.has(node.id)) ||
    projection.edges.some(edge => {
      const link = previousLinks.get(edge.id);
      return !link || getEndpointId(link.source) !== edge.source || getEndpointId(link.target) !== edge.target;
    });
  const anchorById = new Map<string, string>();
  for (const edge of projection.edges) {
    if (previousNodes.has(edge.source)) anchorById.set(edge.target, edge.source);
    if (previousNodes.has(edge.target)) anchorById.set(edge.source, edge.target);
  }
  const next: ForceGraphData = {
    nodes: projection.nodes.map((node) => {
      const degree = degreeByNodeId.get(node.id) ?? 0;
      const display: ForceGraphNode = {
        id: node.id,
        label: node.simpleLabel,
        secondaryLabel: node.secondaryLabel,
        kind: node.kind,
        colorKind: node.memberKinds?.length === 1 ? node.memberKinds[0] : node.kind,
        layoutBand: node.layoutBand,
        degree,
        priority: getNodePriority(node, degree),
        val: node.bundle ? 8 + Math.min(10, Math.log2(node.bundle.hiddenMemberIds.length + 1)) : getNodeValue(node.kind),
        bundle: node.bundle,
      };
      const existing = previousNodes.get(node.id);
      if (existing) {
        Object.assign(existing, display);
        const position = getRenderNodePosition(existing);
        if (structureChanged && preservePositions && position && !node.bundle) {
          applyNodePosition(existing, position, true);
        }
        return existing;
      }
      const rendered: RenderNode = display;
      let position = preservePositions ? positions.get(node.id) : undefined;
      if (!position && preservePositions) {
        const anchorId = node.bundle?.hubId ?? anchorById.get(node.id);
        const anchor = anchorId ? previousNodes.get(anchorId) : undefined;
        const anchorPosition = anchor ? getRenderNodePosition(anchor) : null;
        if (anchorPosition) position = getNodeMap3dSeed(node.id, anchorPosition);
      }
      if (position) applyNodePosition(rendered, position, false);
      return rendered;
    }),
    links: projection.edges.map((edge) => {
      const existing = previousLinks.get(edge.id);
      // Retained links are still in the live simulation until graphData is installed.
      const link = existing && getEndpointId(existing.source) === edge.source &&
        getEndpointId(existing.target) === edge.target
        ? existing
        : { id: edge.id, source: edge.source, target: edge.target } as RenderLink;
      Object.assign(link, { type: edge.type, label: edge.label, bundle: edge.bundle });
      return link;
    }),
  };
  return structureChanged ? next : previous;
}

function getEndpointId(endpoint: unknown): string {
  if (typeof endpoint === "object" && endpoint != null && "id" in endpoint) {
    return String((endpoint as { id?: string | number }).id);
  }

  return String(endpoint ?? "");
}

function getHighlightedGraphState(
  links: RenderLink[],
  selectedEntityId: string | null,
  selectedRelationshipId: string | null,
) {
  const nodeIds = new Set<string>();
  const linkIds = new Set<string>();

  if (selectedEntityId) {
    nodeIds.add(selectedEntityId);
    for (const link of links) {
      const source = getEndpointId(link.source);
      const target = getEndpointId(link.target);
      if (source !== selectedEntityId && target !== selectedEntityId) {
        continue;
      }
      linkIds.add(link.id);
      nodeIds.add(source);
      nodeIds.add(target);
    }
  }

  if (selectedRelationshipId) {
    const selectedLink = links.find((link) => link.id === selectedRelationshipId);
    if (selectedLink) {
      linkIds.add(selectedLink.id);
      nodeIds.add(getEndpointId(selectedLink.source));
      nodeIds.add(getEndpointId(selectedLink.target));
    }
  }

  return { linkIds, nodeIds };
}

function estimateLabelWidth(
  label: string,
  secondaryLabel: string | null,
  expanded: boolean,
): number {
  const longestLabel = expanded && secondaryLabel && secondaryLabel.length > label.length
    ? secondaryLabel
    : label;
  return Math.min(expanded ? 340 : 220, Math.max(56, longestLabel.length * 7.1 + 18));
}

function getCameraDepth(camera: THREE.Camera, coords: Coords): number {
  const cameraPoint = new THREE.Vector3(coords.x, coords.y, coords.z)
    .applyMatrix4(camera.matrixWorldInverse);
  const depth = -cameraPoint.z;

  return Number.isFinite(depth) ? depth : nodeMap3dStageCameraDistance;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function rectsOverlap(left: Rect, right: Rect): boolean {
  return !(
    left.right < right.left ||
    left.left > right.right ||
    left.bottom < right.top ||
    left.top > right.bottom
  );
}

function hasCollision(rect: Rect, acceptedRects: Rect[]): boolean {
  return acceptedRects.some((acceptedRect) => rectsOverlap(rect, acceptedRect));
}

function easeInOutCubic(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - (-2 * progress + 2) ** 3 / 2;
}

function getRenderNodeId(node: RenderNode): string | null {
  return node.id == null ? null : String(node.id);
}

function getRenderNodePosition(node: RenderNode): NodeMap3dPosition | null {
  if (typeof node.x !== "number" || typeof node.y !== "number" || typeof node.z !== "number" ||
      !Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isFinite(node.z)) {
    return null;
  }

  return { x: node.x, y: node.y, z: node.z };
}

const flattenedZThreshold = 0.001;
const currentLayoutDepthNudge = 12;

function has3dDepth(positions: Map<string, NodeMap3dPosition>): boolean {
  for (const position of positions.values()) {
    if (Math.abs(position.z) > flattenedZThreshold) {
      return true;
    }
  }
  return false;
}

function hasFixedPosition(node: RenderNode): boolean {
  return (
    typeof node.fx === "number" ||
    typeof node.fy === "number" ||
    typeof node.fz === "number"
  );
}

function applyNodePosition(
  node: RenderNode,
  position: NodeMap3dPosition,
  fixed: boolean,
): void {
  node.x = position.x;
  node.y = position.y;
  node.z = position.z;
  node.vx = 0;
  node.vy = 0;
  node.vz = 0;

  if (fixed) {
    node.fx = position.x;
    node.fy = position.y;
    node.fz = position.z;
  }
}

function releaseNodePosition(node: RenderNode): void {
  node.fx = undefined;
  node.fy = undefined;
  node.fz = undefined;
}

function getDepthNudge(nodeId: string): number {
  const lastCodePoint = nodeId.codePointAt(nodeId.length - 1) ?? 0;
  return lastCodePoint % 2 === 0 ? currentLayoutDepthNudge : -currentLayoutDepthNudge;
}

function releaseNodeToCurrentLayout(node: RenderNode): void {
  releaseNodePosition(node);

  if (typeof node.z === "number" && Math.abs(node.z) > flattenedZThreshold) {
    return;
  }

  const nodeId = getRenderNodeId(node);
  if (!nodeId) {
    return;
  }

  const z = getDepthNudge(nodeId);
  node.z = z;
  node.vz = z / currentLayoutDepthNudge;
}

function getNodeMap3dCameraPosition(arrangement: NodeMap3dArrangement): Coords {
  return arrangement === "flat"
    ? nodeMap3dStageCameraPosition
    : nodeMap3dStageOffAxisCameraPosition;
}

function roundDebugValue(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function vectorToDebugObject(vector: THREE.Vector3 | Coords) {
  return {
    x: roundDebugValue(vector.x),
    y: roundDebugValue(vector.y),
    z: roundDebugValue(vector.z),
  };
}

function getScreenAxisDebug(forceGraph: ForceGraphHandle) {
  const origin = forceGraph.graph2ScreenCoords(0, 0, 0);
  const xAxis = forceGraph.graph2ScreenCoords(100, 0, 0);
  const yAxis = forceGraph.graph2ScreenCoords(0, 100, 0);

  function axisDelta(point: { x: number; y: number }) {
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    return {
      angleDegrees: roundDebugValue((Math.atan2(dy, dx) * 180) / Math.PI),
      dx: roundDebugValue(dx),
      dy: roundDebugValue(dy),
    };
  }

  return {
    origin: {
      x: roundDebugValue(origin.x),
      y: roundDebugValue(origin.y),
    },
    xAxis: axisDelta(xAxis),
    yAxis: axisDelta(yAxis),
  };
}

function getNodeZDebug(nodes: RenderNode[]) {
  const zValues = nodes
    .map((node) => (typeof node.z === "number" ? node.z : null))
    .filter((value): value is number => value != null);
  const fzValues = nodes
    .map((node) => (typeof node.fz === "number" ? node.fz : null))
    .filter((value): value is number => value != null);

  return {
    fixedZCount: fzValues.length,
    maxAbsZ: roundDebugValue(Math.max(0, ...zValues.map((value) => Math.abs(value)))),
    maxZ: roundDebugValue(Math.max(0, ...zValues)),
    minZ: roundDebugValue(Math.min(0, ...zValues)),
    nonZeroZCount: zValues.filter((value) => Math.abs(value) > 0.001).length,
    sample: nodes.slice(0, 12).map((node) => ({
      id: node.id == null ? null : String(node.id),
      x: typeof node.x === "number" ? roundDebugValue(node.x) : null,
      y: typeof node.y === "number" ? roundDebugValue(node.y) : null,
      z: typeof node.z === "number" ? roundDebugValue(node.z) : null,
      fz: typeof node.fz === "number" ? roundDebugValue(node.fz) : null,
    })),
  };
}

function getNodeMap3dCameraUp(): THREE.Vector3 {
  return new THREE.Vector3(0, 1, 0);
}

function applyFlatCameraPlane(
  forceGraph: ForceGraphHandle,
  distance = nodeMap3dStageCameraDistance,
): void {
  const camera = forceGraph.camera();
  const controls = forceGraph.controls() as CameraControls;
  const targetX = controls.target?.x ?? nodeMap3dStageLookAt.x;
  const targetY = controls.target?.y ?? nodeMap3dStageLookAt.y;
  const targetZ = nodeMap3dStageLookAt.z;
  const nextDistance = Math.max(1, distance);

  controls.target?.set(targetX, targetY, targetZ);
  camera.position.set(targetX, targetY, targetZ + nextDistance);
  camera.up.copy(getNodeMap3dCameraUp());
  camera.lookAt(targetX, targetY, targetZ);
  camera.updateMatrixWorld();
  controls.update?.();
}

function makeGlobeLinkObject(color: string): THREE.Line {
  const line = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({
      color,
      depthWrite: false,
      opacity: 0.62,
      transparent: true,
    }),
  );
  line.userData.nodeMap3dGlobeLink = true;
  return line;
}

function isGlobeLinkObject(object: THREE.Object3D): object is THREE.Line {
  return object.userData.nodeMap3dGlobeLink === true && "geometry" in object;
}

function slerpDirections(
  startDirection: THREE.Vector3,
  endDirection: THREE.Vector3,
  progress: number,
): THREE.Vector3 {
  const dot = clamp(startDirection.dot(endDirection), -0.9999, 0.9999);
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega);

  if (sinOmega < 0.0001) {
    return startDirection.clone().lerp(endDirection, progress).normalize();
  }

  return startDirection
    .clone()
    .multiplyScalar(Math.sin((1 - progress) * omega) / sinOmega)
    .addScaledVector(endDirection, Math.sin(progress * omega) / sinOmega)
    .normalize();
}

function getSphericalArcPoints(start: Coords, end: Coords): THREE.Vector3[] {
  const startVector = new THREE.Vector3(start.x, start.y, start.z);
  const endVector = new THREE.Vector3(end.x, end.y, end.z);
  const startRadius = startVector.length();
  const endRadius = endVector.length();

  if (startRadius < 1 || endRadius < 1) {
    return [startVector, endVector];
  }

  const startDirection = startVector.clone().normalize();
  const endDirection = endVector.clone().normalize();
  const distance = startVector.distanceTo(endVector);
  const lift = clamp(distance * 0.16, 18, nodeMap3dGlobeRadius * 0.3);
  const points: THREE.Vector3[] = [];

  for (let index = 0; index <= globeLinkSegments; index += 1) {
    const progress = index / globeLinkSegments;
    const radius =
      startRadius +
      (endRadius - startRadius) * progress +
      Math.sin(Math.PI * progress) * lift;
    points.push(slerpDirections(startDirection, endDirection, progress).multiplyScalar(radius));
  }

  return points;
}

function getLinkCoordsKey(coords: { start: Coords; end: Coords }): string {
  return [
    coords.start.x,
    coords.start.y,
    coords.start.z,
    coords.end.x,
    coords.end.y,
    coords.end.z,
  ]
    .map((value) => value.toFixed(2))
    .join(":");
}

function updateGlobeLinkObject(
  object: THREE.Object3D,
  coords: { start: Coords; end: Coords },
  color: string,
): boolean {
  if (!isGlobeLinkObject(object)) {
    return false;
  }

  const material = object.material as THREE.LineBasicMaterial;
  material.color.set(color);
  const coordsKey = getLinkCoordsKey(coords);
  if (object.userData.nodeMap3dGlobeLinkCoordsKey === coordsKey) {
    return true;
  }

  object.geometry.dispose();
  object.geometry = new THREE.BufferGeometry().setFromPoints(
    getSphericalArcPoints(coords.start, coords.end),
  );
  object.userData.nodeMap3dGlobeLinkCoordsKey = coordsKey;
  return true;
}

function getCurrentLayoutTargets(
  nodes: RenderNode[],
  cachedPositions: Map<string, NodeMap3dPosition>,
): Map<string, NodeMap3dPosition> {
  const targets = new Map<string, NodeMap3dPosition>();
  for (const node of nodes) {
    const nodeId = getRenderNodeId(node);
    if (!nodeId) {
      continue;
    }

    const hubPosition = node.bundle ? cachedPositions.get(node.bundle.hubId) : undefined;
    const target = cachedPositions.get(nodeId) ?? (hubPosition ? getNodeMap3dSeed(nodeId, hubPosition) : undefined);
    if (target) {
      targets.set(nodeId, target);
    }
  }
  return targets;
}

function getTransitionStartPositions(
  nodes: RenderNode[],
  targetById: Map<string, NodeMap3dPosition>,
): Map<string, NodeMap3dPosition> {
  const starts = new Map<string, NodeMap3dPosition>();
  for (const node of nodes) {
    const nodeId = getRenderNodeId(node);
    if (!nodeId) {
      continue;
    }

    const start = getRenderNodePosition(node) ?? targetById.get(nodeId);
    if (start) {
      starts.set(nodeId, start);
    }
  }
  return starts;
}

function animateNodePositions({
  durationMs,
  fixedAfter,
  lockZToTarget,
  nodes,
  onComplete,
  onPositionsChange,
  targetById,
}: {
  durationMs: number;
  fixedAfter: boolean;
  lockZToTarget?: boolean;
  nodes: RenderNode[];
  onComplete: () => void;
  onPositionsChange: () => void;
  targetById: Map<string, NodeMap3dPosition>;
}): () => void {
  const startById = getTransitionStartPositions(nodes, targetById);
  const startedAt = performance.now();
  let animationFrame = 0;
  let cancelled = false;

  function tick(now: number) {
    if (cancelled) {
      return;
    }

    const progress = clamp((now - startedAt) / durationMs, 0, 1);
    const eased = easeInOutCubic(progress);

    for (const node of nodes) {
      const nodeId = getRenderNodeId(node);
      const target = nodeId ? targetById.get(nodeId) : undefined;
      if (!nodeId || !target) {
        continue;
      }

      const start = startById.get(nodeId) ?? target;
      applyNodePosition(
        node,
        {
          x: start.x + (target.x - start.x) * eased,
          y: start.y + (target.y - start.y) * eased,
          z: lockZToTarget ? target.z : start.z + (target.z - start.z) * eased,
        },
        true,
      );
    }

    onPositionsChange();

    if (progress < 1) {
      animationFrame = window.requestAnimationFrame(tick);
      return;
    }

    for (const node of nodes) {
      const nodeId = getRenderNodeId(node);
      const target = nodeId ? targetById.get(nodeId) : undefined;
      if (!target) {
        continue;
      }

      applyNodePosition(node, target, fixedAfter);
      if (!fixedAfter) {
        releaseNodePosition(node);
      }
    }

    onPositionsChange();
    onComplete();
  }

  animationFrame = window.requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    window.cancelAnimationFrame(animationFrame);
  };
}

function areLabelPlacementsEqual(
  left: LabelPlacement[],
  right: LabelPlacement[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((leftPlacement, index) => {
    const rightPlacement = right[index];
    return (
      leftPlacement.id === rightPlacement.id &&
      leftPlacement.label === rightPlacement.label &&
      leftPlacement.colorKind === rightPlacement.colorKind &&
      leftPlacement.secondaryLabel === rightPlacement.secondaryLabel &&
      leftPlacement.expanded === rightPlacement.expanded &&
      leftPlacement.opacity === rightPlacement.opacity &&
      leftPlacement.x === rightPlacement.x &&
      leftPlacement.y === rightPlacement.y &&
      leftPlacement.width === rightPlacement.width &&
      leftPlacement.height === rightPlacement.height &&
      leftPlacement.selected === rightPlacement.selected &&
      leftPlacement.hovered === rightPlacement.hovered &&
      leftPlacement.neighbor === rightPlacement.neighbor
    );
  });
}

function buildLabelPlacements(
  graph: ForceGraphHandle,
  nodes: RenderNode[],
  size: Size,
  selectedEntityId: string | null,
  hoveredEntityId: string | null,
  connectedNodeIds: Set<string>,
  visibleNodeLabelKinds: readonly GraphProjectionNode["kind"][],
): LabelPlacement[] {
  const camera = graph.camera();
  camera.updateMatrixWorld();

  const candidates = nodes
    .filter(
      (node): node is RenderNode & Required<Pick<RenderNode, "x" | "y" | "z">> =>
        visibleNodeLabelKinds.includes(node.kind) &&
        typeof node.x === "number" &&
        typeof node.y === "number" &&
        typeof node.z === "number" &&
        node.id != null,
    )
    .map((node) => {
      const nodeId = String(node.id);
      const selected = selectedEntityId === nodeId;
      const hovered = hoveredEntityId === nodeId;
      const neighbor = connectedNodeIds.has(nodeId) && !selected;
      const screenPosition = graph.graph2ScreenCoords(node.x, node.y, node.z);
      const cameraDepth = getCameraDepth(camera, node);
      const expanded = Boolean(node.secondaryLabel && (selected || hovered));
      const width = estimateLabelWidth(node.label, node.secondaryLabel, expanded);
      const height = expanded ? 39 : selected ? 24 : 21;
      const offset = selected ? 14 : 10;
      const placeRight = screenPosition.x < size.width * 0.68;
      const rawX = placeRight
        ? screenPosition.x + offset
        : screenPosition.x - width - offset;
      const rawY = screenPosition.y - height / 2;
      const rawRect = {
        bottom: rawY + height + 4,
        left: rawX - 4,
        right: rawX + width + 4,
        top: rawY - 4,
      };
      const x = Math.round(
        clamp(
          rawX,
          6,
          Math.max(6, size.width - width - 6),
        ),
      );
      const y = Math.round(
        clamp(
          rawY,
          6,
          Math.max(6, size.height - height - 6),
        ),
      );
      const required = selected || hovered;
      const visible =
        rawRect.right >= 0 &&
        rawRect.left <= size.width &&
        rawRect.bottom >= 0 &&
        rawRect.top <= size.height;

      return {
        expanded,
        height,
        hovered,
        id: nodeId,
        kind: node.kind,
        colorKind: node.colorKind,
        label: node.label,
        secondaryLabel: node.secondaryLabel,
        neighbor,
        cameraDepth,
        priority:
          node.priority +
          (selected ? 10000 : 0) +
          (hovered ? 6000 : 0) +
          (neighbor ? 1200 : 0),
        rect: {
          bottom: y + height - labelCollisionInset,
          left: x + labelCollisionInset,
          right: x + width - labelCollisionInset,
          top: y + labelCollisionInset,
        },
        required,
        selected,
        visible,
        width: Math.round(width),
        x,
        y,
      };
    })
    .filter((candidate) => candidate.required || candidate.visible);

  const nearDepth = Math.min(...candidates.map((candidate) => candidate.cameraDepth));
  const farDepth = Math.max(...candidates.map((candidate) => candidate.cameraDepth));
  const depthRange = Math.max(1, farDepth - nearDepth);
  const visibleCandidates = candidates
    .map((candidate) => {
      const depthRatio = clamp(
        (candidate.cameraDepth - nearDepth) / depthRange,
        0,
        1,
      );
      const depthOpacity = 1 - depthRatio * (1 - labelFarDepthOpacity);
      const opacity = candidate.required
        ? 1
        : candidate.neighbor
          ? Math.max(depthOpacity, 0.74)
          : depthOpacity;

      return {
        ...candidate,
        opacity: Math.round(opacity * 100) / 100,
        priority:
          candidate.priority +
          (1 - depthRatio) * labelDepthPriorityBoost,
      };
    })
    .sort((left, right) => right.priority - left.priority);

  const acceptedRects: Rect[] = [];
  const placements: LabelPlacement[] = [];

  for (const candidate of visibleCandidates) {
    const collided =
      !candidate.required && hasCollision(candidate.rect, acceptedRects);

    if (!collided) {
      acceptedRects.push(candidate.rect);
    }

    placements.push({
      expanded: candidate.expanded,
      height: candidate.height,
      hovered: candidate.hovered,
      id: candidate.id,
      kind: candidate.kind,
      colorKind: candidate.colorKind,
      label: candidate.label,
      secondaryLabel: candidate.expanded ? candidate.secondaryLabel : null,
      neighbor: candidate.neighbor,
      opacity: collided ? 0 : candidate.opacity,
      selected: candidate.selected,
      width: candidate.width,
      x: candidate.x,
      y: candidate.y,
    });
  }

  return placements;
}

export function ForceGraphCanvas({ arrangement: requestedArrangement = "current" }: ForceGraphCanvasProps) {
  const graph = useGraphStore((state) => state.graph);
  const locale = useGraphStore((state) => state.locale);
  const searchEntityIds = useGraphStore((state) => state.searchEntityIds);
  const hiddenNodeKinds = useGraphStore((state) => state.hiddenNodeKinds);
  const hiddenEdgeKinds = useGraphStore((state) => state.hiddenEdgeKinds);
  const visibleNodeLabelKinds = useGraphStore((state) => state.visibleNodeLabelKinds);
  const selectedEntityId = useGraphStore((state) => state.selectedEntityId);
  const selectedRelationshipId = useGraphStore((state) => state.selectedRelationshipId);
  const setSelectedEntityId = useGraphStore((state) => state.setSelectedEntityId);
  const setSelectedRelationshipId = useGraphStore((state) => state.setSelectedRelationshipId);
  const resetSelection = useGraphStore((state) => state.resetSelection);
  const semanticLevel = useGraphStore((state) => state.semanticLevel);
  const setSemanticLevel = useGraphStore((state) => state.setSemanticLevel);
  const expandedEntityIds = useGraphStore((state) => state.expandedEntityIds);
  const selectedBundleId = useGraphStore((state) => state.selectedBundleId);
  const expandRelationshipBundle = useGraphStore((state) => state.expandRelationshipBundle);
  const collapseRelationships = useGraphStore((state) => state.collapseRelationships);
  const graphRef = useRef<ForceGraphHandle | undefined>(undefined);
  const [renderedGraph, setRenderedGraph] = useState<{
    data: ForceGraphData;
    projection: GraphProjection | null;
    arrangement: NodeMap3dArrangement;
  }>({ data: { nodes: [], links: [] }, projection: null, arrangement: requestedArrangement });
  const renderedGraphRef = useRef(renderedGraph);
  const { data: graphData, projection: renderProjection, arrangement } = renderedGraph;
  const arrangementRef = useRef<NodeMap3dArrangement>(arrangement);
  const globeOverlayFadeOutUntilRef = useRef(0);
  const hasAppliedArrangementRef = useRef(false);
  const currentLayoutTransitionRef = useRef(false);
  const currentPositionByIdRef = useRef<Map<string, NodeMap3dPosition>>(new Map());
  const initializedDataRef = useRef(false);
  const warmupTicksRef = useRef(48);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>({ height: 1, width: 1 });
  const [labelPlacements, setLabelPlacements] = useState<LabelPlacement[]>([]);
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);


  const projection = useMemo(() => {
    if (!graph) {
      return null;
    }

    return projectGraph({
      graph,
      locale,
      hiddenNodeKinds,
      hiddenEdgeKinds,
      searchEntityIds,
      semanticLevel: requestedArrangement === "current" ? semanticLevel : "entity",
      selectedEntityId,
      selectedRelationshipId,
      expandedEntityIds,
    });
  }, [
    graph,
    hiddenNodeKinds,
    hiddenEdgeKinds,
    locale,
    searchEntityIds,
    requestedArrangement, semanticLevel, selectedEntityId, selectedRelationshipId, expandedEntityIds,
  ]);

  useLayoutEffect(() => {
    renderedGraphRef.current = renderedGraph;
  }, [renderedGraph]);

  useLayoutEffect(() => {
    if (!projection) return;
    // Coalesce control changes before touching D3-owned objects. Data, drawing mode,
    // labels and layout consume the same committed projection, not separate drafts.
    const frame = window.requestAnimationFrame(() => {
      const previous = renderedGraphRef.current;
      const positions = currentPositionByIdRef.current;
      if (previous.arrangement === "current" && !currentLayoutTransitionRef.current) {
        for (const node of previous.data.nodes) {
          const position = getRenderNodePosition(node);
          if (!node.bundle && position) positions.set(node.id, position);
        }
      }
      for (const id of positions.keys()) if (!graph?.nodeById[id]) positions.delete(id);
      const preservePositions = requestedArrangement === "current" && previous.arrangement === requestedArrangement;
      const next = buildForceGraphData(projection, previous.data, positions, preservePositions);
      if (next !== previous.data) {
        warmupTicksRef.current = initializedDataRef.current ? 0 : 48;
        if (next.nodes.length) initializedDataRef.current = true;
        setHoveredEntityId(null);
      }
      setRenderedGraph({ data: next, projection, arrangement: requestedArrangement });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [projection, graph, requestedArrangement]);

  const highlighted = useMemo(
    () =>
      getHighlightedGraphState(
        graphData.links,
        selectedEntityId,
        selectedRelationshipId,
      ),
    [graphData.links, selectedEntityId, selectedRelationshipId],
  );

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const debugElement =
      document.getElementById("chm-3d-debug-state") ??
      document.createElement("script");
    debugElement.id = "chm-3d-debug-state";
    debugElement.setAttribute("type", "application/json");
    if (!debugElement.parentElement) {
      document.body.appendChild(debugElement);
    }

    function getDebugSnapshot(): Record<string, unknown> {
      const forceGraph = graphRef.current;
      if (!forceGraph) {
        return {
          arrangement,
          error: "Force graph is not mounted",
        };
      }

      const camera = forceGraph.camera();
      const controls = forceGraph.controls() as CameraControls;
      const rotation = camera.rotation;
      const quaternion = camera.quaternion;

      return {
        arrangement,
        semanticLevel: arrangement === "current" ? semanticLevel : "entity",
        nodeCount: graphData.nodes.length,
        linkCount: graphData.links.length,
        binCount: graphData.nodes.filter(node => node.bundle).length,
        camera: {
          far:
            camera instanceof THREE.PerspectiveCamera
              ? roundDebugValue(camera.far)
              : null,
          fov:
            camera instanceof THREE.PerspectiveCamera
              ? roundDebugValue(camera.fov)
              : null,
          isPerspective: camera instanceof THREE.PerspectiveCamera,
          position: vectorToDebugObject(camera.position),
          quaternion: {
            w: roundDebugValue(quaternion.w),
            x: roundDebugValue(quaternion.x),
            y: roundDebugValue(quaternion.y),
            z: roundDebugValue(quaternion.z),
          },
          rotation: {
            order: rotation.order,
            x: roundDebugValue(rotation.x),
            y: roundDebugValue(rotation.y),
            z: roundDebugValue(rotation.z),
          },
          up: vectorToDebugObject(camera.up),
        },
        controls: {
          autoRotate: controls.autoRotate ?? null,
          autoRotateSpeed: controls.autoRotateSpeed ?? null,
          enableDamping: controls.enableDamping ?? null,
          enablePan: controls.enablePan ?? null,
          enableRotate: controls.enableRotate ?? null,
          mouseButtons: controls.mouseButtons ?? null,
          noRotate: controls.noRotate ?? null,
          target: controls.target ? vectorToDebugObject(controls.target) : null,
        },
        nodes: getNodeZDebug(graphData.nodes),
        screenAxes: getScreenAxisDebug(forceGraph),
        size,
        timestamp: Math.round(performance.now()),
      };
    }

    function updateDebugElement() {
      debugElement.textContent = JSON.stringify(getDebugSnapshot());
    }

    updateDebugElement();
    const intervalId = window.setInterval(updateDebugElement, 100);

    return () => {
      window.clearInterval(intervalId);
      debugElement.remove();
    };
  }, [arrangement, graphData.nodes, graphData.links, semanticLevel, size]);

  useEffect(() => {
    if (!container) {
      return;
    }

    function updateSize() {
      setSize({
        height: Math.max(container?.clientHeight ?? 1, 1),
        width: Math.max(container?.clientWidth ?? 1, 1),
      });
    }

    updateSize();
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateSize);
    resizeObserver?.observe(container);

    return () => resizeObserver?.disconnect();
  }, [container]);

  useEffect(() => {
    const forceGraph = graphRef.current;
    if (!forceGraph) {
      return;
    }

    const linkForce = forceGraph.d3Force("link") as D3ForceLink | undefined;
    linkForce
      ?.distance((link) => {
        if (link.type === "member") {
          return 46;
        }
        if (link.type === "contributes" || link.type === "transfers") {
          return 72;
        }
        return 58;
      })
      .strength(0.56);

    const chargeForce = forceGraph.d3Force("charge") as D3ForceManyBody | undefined;
    chargeForce?.strength((node) => (node.kind === "country" ? -150 : -85));

    const centerForce = forceGraph.d3Force("center") as D3ForceCenter | undefined;
    centerForce?.x(0).y(0).z?.(0).strength?.(graphData.nodes.some(hasFixedPosition) ? 0 : 1);
  }, [graphData]);

  useEffect(() => {
    const forceGraph = graphRef.current;
    if (!forceGraph || arrangement !== "globe") {
      return;
    }

    const globeObject = createNodeMap3dGlobe();
    forceGraph.scene().add(globeObject);

    let animationFrame = 0;
    const fadeInStartedAt = performance.now();
    const animateGlobe = (now: number) => {
      const visibility = clamp(
        (now - fadeInStartedAt) / globeOverlayFadeDurationMs,
        0,
        1,
      );
      updateNodeMap3dGlobe(globeObject, now / 1000, visibility);
      animationFrame = window.requestAnimationFrame(animateGlobe);
    };
    animationFrame = window.requestAnimationFrame(animateGlobe);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      const fadeOutStartedAt = performance.now();
      globeOverlayFadeOutUntilRef.current =
        fadeOutStartedAt + globeOverlayFadeDurationMs;
      const animateRemoval = (now: number) => {
        const visibility =
          1 -
          clamp((now - fadeOutStartedAt) / globeOverlayFadeDurationMs, 0, 1);
        updateNodeMap3dGlobe(globeObject, now / 1000, visibility);

        if (visibility > 0) {
          animationFrame = window.requestAnimationFrame(animateRemoval);
          return;
        }

        forceGraph.scene().remove(globeObject);
        disposeNodeMap3dObject(globeObject);
      };
      animationFrame = window.requestAnimationFrame(animateRemoval);
    };
  }, [arrangement]);

  useEffect(() => {
    const forceGraph = graphRef.current;
    if (!forceGraph) {
      return;
    }

    const applyCameraSetup = () => {
      const camera = forceGraph.camera();
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = nodeMap3dStageCameraFov;
        camera.far = Math.max(camera.far, nodeMap3dStageCameraDistance * 3);
        camera.up.set(0, 1, 0);
        camera.updateProjectionMatrix();
      }

      const controls = forceGraph.controls() as CameraControls;
      controls.mouseButtons = {
        ...controls.mouseButtons,
        LEFT: arrangement === "flat" ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };
      controls.noRotate = arrangement === "flat";
      controls.enableRotate = arrangement !== "flat";
      controls.enablePan = true;
      controls.panSpeed = 1;
      controls.target?.set(
        nodeMap3dStageLookAt.x,
        nodeMap3dStageLookAt.y,
        nodeMap3dStageLookAt.z,
      );
      if (arrangement === "flat") {
        controls.target?.set(
          nodeMap3dStageLookAt.x,
          nodeMap3dStageLookAt.y,
          nodeMap3dStageLookAt.z,
        );
        applyFlatCameraPlane(forceGraph);
      } else {
        forceGraph.cameraPosition(
          getNodeMap3dCameraPosition(arrangement),
          nodeMap3dStageLookAt,
          0,
        );
      }
      controls.update?.();
    };

    const cameraSetupDelayMs =
      arrangement === "globe" || arrangement === "flat"
        ? 0
        : Math.max(0, globeOverlayFadeOutUntilRef.current - performance.now());
    if (cameraSetupDelayMs > 0) {
      const timeoutId = window.setTimeout(applyCameraSetup, cameraSetupDelayMs);
      return () => window.clearTimeout(timeoutId);
    }

    if (arrangement === "flat") {
      globeOverlayFadeOutUntilRef.current = 0;
    }

    applyCameraSetup();
  }, [arrangement]);

  useEffect(() => {
    const forceGraph = graphRef.current;
    if (!forceGraph) {
      return;
    }

    const shouldAutoRotate = arrangement === "current" || arrangement === "globe";
    const controls = forceGraph.controls() as CameraControls;
    controls.autoRotate = shouldAutoRotate;
    controls.autoRotateSpeed = shouldAutoRotate
      ? arrangement === "globe"
        ? nodeMap3dGlobeAutoRotateSpeed
        : nodeMap3dAutoRotateSpeed
      : 0;
    controls.enableDamping = arrangement !== "flat";
    controls.dampingFactor = arrangement === "globe" ? 0.08 : 0.045;
    controls.update?.();
  }, [arrangement]);

  useEffect(() => {
    const forceGraph = graphRef.current;
    if (!forceGraph || arrangement !== "flat") {
      return;
    }

    const controls = forceGraph.controls() as CameraControls;
    let applyingFlatPlane = false;

    const enforceFlatPlane = () => {
      if (applyingFlatPlane) {
        return;
      }

      applyingFlatPlane = true;
      const camera = forceGraph.camera();
      const target = controls.target ?? new THREE.Vector3(
        nodeMap3dStageLookAt.x,
        nodeMap3dStageLookAt.y,
        nodeMap3dStageLookAt.z,
      );
      applyFlatCameraPlane(forceGraph, camera.position.distanceTo(target));
      applyingFlatPlane = false;
    };

    enforceFlatPlane();
    controls.addEventListener?.("change", enforceFlatPlane);

    return () => {
      controls.removeEventListener?.("change", enforceFlatPlane);
    };
  }, [arrangement]);

  useLayoutEffect(() => {
    if (!renderProjection || graphData.nodes.length === 0) {
      return;
    }

    const forceGraph = graphRef.current;
    const previousArrangement = arrangementRef.current;
    const hasAppliedArrangement = hasAppliedArrangementRef.current;
    hasAppliedArrangementRef.current = true;

    if (previousArrangement === "current" && arrangement !== "current" && !currentLayoutTransitionRef.current) {
      for (const node of graphData.nodes) {
        const position = getRenderNodePosition(node);
        if (!node.bundle && position) currentPositionByIdRef.current.set(node.id, position);
      }
    }

    arrangementRef.current = arrangement;
    if (arrangement !== "current") currentLayoutTransitionRef.current = false;

    if (arrangement === "current") {
      if ((!hasAppliedArrangement || previousArrangement === "current") && !currentLayoutTransitionRef.current) {
        return;
      }

      const targetById = getCurrentLayoutTargets(
        graphData.nodes,
        currentPositionByIdRef.current,
      );

      if (
        targetById.size !== graphData.nodes.length ||
        !has3dDepth(targetById)
      ) {
        currentLayoutTransitionRef.current = false;
        graphData.nodes.forEach(releaseNodeToCurrentLayout);
        forceGraph?.d3ReheatSimulation();
        return;
      }

      graphData.nodes.forEach(releaseNodePosition);
      currentLayoutTransitionRef.current = true;
      return animateNodePositions({
        durationMs: nodeTransitionDurationMs,
        fixedAfter: false,
        nodes: graphData.nodes,
        onComplete: () => {
          currentLayoutTransitionRef.current = false;
          forceGraph?.d3ReheatSimulation();
        },
        onPositionsChange: () => {
          // Wake a cooled simulation to sync positions without recreating meshes.
          forceGraph?.d3ReheatSimulation();
        },
        targetById,
      });
    }

    let cancelled = false;
    let stopTransition: (() => void) | undefined;

    void getNodeMap3dTargets(renderProjection, arrangement)
      .then((targetById) => {
        if (cancelled || targetById.size === 0) {
          return;
        }

        stopTransition = animateNodePositions({
          durationMs: nodeTransitionDurationMs,
          fixedAfter: true,
          lockZToTarget: arrangement === "flat",
          nodes: graphData.nodes,
          onComplete: () => undefined,
          onPositionsChange: () => {
            forceGraph?.d3ReheatSimulation();
          },
          targetById,
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error("Failed to compute 3D node map targets", error);
        }
      });

    return () => {
      cancelled = true;
      stopTransition?.();
    };
  }, [arrangement, graphData]);

  useEffect(() => {
    if (!container || graphData.nodes.length === 0) {
      setLabelPlacements([]);
      return;
    }

    let animationFrame = 0;
    let cancelled = false;
    let frame = 0;

    function updateLabels() {
      if (cancelled) {
        return;
      }

      frame += 1;
      if (frame % 2 === 0 && graphRef.current) {
        const nextLabels = buildLabelPlacements(
          graphRef.current,
          graphData.nodes,
          size,
          selectedEntityId,
          hoveredEntityId,
          highlighted.nodeIds,
          visibleNodeLabelKinds,
        );
        setLabelPlacements((previousLabels) =>
          areLabelPlacementsEqual(previousLabels, nextLabels)
            ? previousLabels
            : nextLabels,
        );
      }

      animationFrame = window.requestAnimationFrame(updateLabels);
    }

    animationFrame = window.requestAnimationFrame(updateLabels);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
    };
  }, [
    container,
    graphData.nodes,
    highlighted.nodeIds,
    hoveredEntityId,
    selectedEntityId,
    size,
    visibleNodeLabelKinds,
  ]);

  const nodeColor = useCallback(
    (node: RenderNode) => {
      const nodeId = String(node.id);
      if (nodeId === selectedEntityId) {
        return selectedOrange;
      }
      if (highlighted.nodeIds.has(nodeId)) {
        return connectedOrange;
      }
      return nodeMapNodeColors[node.colorKind];
    },
    [highlighted.nodeIds, selectedEntityId, renderProjection],
  );

  const nodeValue = useCallback(
    (node: RenderNode) => {
      const nodeId = String(node.id);
      if (nodeId === selectedEntityId) {
        return node.val * 2.2;
      }
      if (highlighted.nodeIds.has(nodeId)) {
        return node.val * 1.45;
      }
      return node.val;
    },
    [highlighted.nodeIds, selectedEntityId, renderProjection],
  );

  const linkColor = useCallback(
    (link: RenderLink) => {
      if (link.id === selectedRelationshipId) {
        return selectedOrange;
      }
      if (highlighted.linkIds.has(link.id)) {
        return connectedOrange;
      }
      return nodeMapEdgeColors[link.type];
    },
    [highlighted.linkIds, selectedRelationshipId, renderProjection],
  );

  const linkWidth = useCallback(
    (link: RenderLink) => {
      if (link.id === selectedRelationshipId) {
        return 7.8;
      }
      if (selectedEntityId && (getEndpointId(link.source) === selectedEntityId ||
          getEndpointId(link.target) === selectedEntityId)) {
        return 5.4;
      }
      return 3;
    },
    [selectedEntityId, selectedRelationshipId],
  );

  const linkParticles = useCallback(
    (link: RenderLink) => {
      if (arrangement === "globe") return 0;
      if (link.id === selectedRelationshipId) {
        return 3;
      }
      return highlighted.linkIds.has(link.id) ? 1 : 0;
    },
    [arrangement, highlighted.linkIds, selectedRelationshipId],
  );

  const linkArrowLength = useCallback(
    (link: RenderLink) => arrangement === "globe" || (link.type === "member" && !link.bundle)
      ? 0 : 2.4,
    [arrangement],
  );

  const linkThreeObject = useCallback(
    (link: RenderLink) => {
      if (arrangement === "globe") return makeGlobeLinkObject(nodeMapEdgeColors[link.type]);
      // Cylinder edges ignore linkHoverPrecision; an invisible line supplies the hit area.
      return new THREE.Line(
        new THREE.BufferGeometry().setAttribute(
          "position", new THREE.BufferAttribute(new Float32Array(6), 3),
        ),
        new THREE.LineBasicMaterial({ visible: false }),
      );
    },
    [arrangement],
  );

  const linkPositionUpdate = useCallback(
    (
      object: THREE.Object3D | undefined,
      coords: { start: Coords; end: Coords },
      link: LinkObject,
    ) => {
      // Mode settings change before the renderer rebuilds extended link objects.
      if (!object) return false;
      if (arrangement === "globe") {
        return updateGlobeLinkObject(object, coords, linkColor(link as RenderLink));
      }
      if (isGlobeLinkObject(object)) return false;
      const geometry = (object as THREE.Line).geometry;
      const positions = geometry?.getAttribute("position");
      if (!positions) return false;
      positions.setXYZ(0, coords.start.x, coords.start.y, coords.start.z);
      positions.setXYZ(1, coords.end.x, coords.end.y, coords.end.z);
      positions.needsUpdate = true;
      geometry.computeBoundingSphere();
      return false;
    },
    [arrangement, linkColor],
  );

  const forwardLabelWheel = useCallback(
    (event: ReactWheelEvent<HTMLButtonElement>) => {
      const canvas = container?.querySelector("canvas");
      if (!canvas) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const nativeEvent = event.nativeEvent;
      canvas.dispatchEvent(
        new window.WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          clientX: nativeEvent.clientX,
          clientY: nativeEvent.clientY,
          ctrlKey: nativeEvent.ctrlKey,
          deltaMode: nativeEvent.deltaMode,
          deltaX: nativeEvent.deltaX,
          deltaY: nativeEvent.deltaY,
          deltaZ: nativeEvent.deltaZ,
          metaKey: nativeEvent.metaKey,
          screenX: nativeEvent.screenX,
          screenY: nativeEvent.screenY,
          shiftKey: nativeEvent.shiftKey,
          view: window,
        }),
      );
    },
    [container],
  );

  const projectedNodeById = useMemo(() => new Map(renderProjection?.nodes.map(node => [node.id, node])), [renderProjection]);
  const selectDisplayedNode = (id: string) => {
    const node = projectedNodeById.get(id);
    if (node?.bundle) expandRelationshipBundle(node.bundle);
    else if (graph?.nodeById[id]) setSelectedEntityId(id);
  };
  const selectedBundle = renderProjection?.bundles.find(bundle => bundle.id === selectedBundleId);

  return (
    <div className="force-graph-canvas" ref={setContainer}>
      <div className="edgezoom-controls" lang={locale} dir="auto">
        <div role="group" aria-label={t(locale, "graph.detailLevel")}>
          {(["family", "type", "entity"] as const).map(level => (
            <button key={level} type="button"
              aria-pressed={(arrangement === "current" ? semanticLevel : "entity") === level}
              disabled={arrangement !== "current"}
              onClick={() => setSemanticLevel(level)}>{t(locale, `graph.level.${level}`)}</button>
          ))}
        </div>
        {arrangement === "current" ? <details>
          <summary>{t(locale, "graph.detailLevel")}</summary>
          <p>{t(locale, "graph.binHelp")}</p>
        </details> : <p>{t(locale, "graph.entityOnly")}</p>}
        {expandedEntityIds.size > 0 && <button type="button" onClick={collapseRelationships}>
          {t(locale, "graph.collapseRelationships")}
        </button>}
        {selectedBundle && <section className="edgezoom-details" aria-live="polite">
          <strong>{selectedBundle.label} · {vocabularyLabel(locale, "relationshipDirections", selectedBundle.direction)}</strong>
          <p>{graph?.nodeById[selectedBundle.hubId] && nodeTitle(graph.nodeById[selectedBundle.hubId], locale)}</p>
          <p>{t(locale, "graph.binSummary", {
            total: formatNumber(selectedBundle.memberIds.length, locale),
            hidden: formatNumber(selectedBundle.hiddenMemberIds.length, locale),
            visible: formatNumber(selectedBundle.memberIds.length - selectedBundle.hiddenMemberIds.length, locale),
            edges: formatNumber(selectedBundle.edgeIds.length, locale),
          })}</p>
          <div className="edgezoom-members">{selectedBundle.memberIds.map(id => (
            <button key={id} type="button" onClick={() => setSelectedEntityId(id)}>
              {graph?.nodeById[id] ? nodeTitle(graph.nodeById[id], locale) : id}
            </button>
          ))}</div>
          <details>
            <summary>{t(locale, "graph.edges")}</summary>
            <div className="edgezoom-members">{selectedBundle.edgeIds.map(id => {
              const edge = graph?.edgeById[id];
              return edge && <button key={id} type="button" onClick={() => setSelectedRelationshipId(id)}>
                {nodeTitle(graph!.nodeById[edge.sourceNodeId], locale)} → {vocabularyLabel(locale, "edgeKinds", edge.kind)} → {nodeTitle(graph!.nodeById[edge.targetNodeId], locale)}
              </button>;
            })}</div>
          </details>
          <button type="button" onClick={() => useGraphStore.setState({ selectedBundleId: null })}>
            {t(locale, "app.closeDetailsTitle")}
          </button>
        </section>}
      </div>
      <ForceGraph3D<ForceGraphNode, ForceGraphLink>
        ref={graphRef}
        backgroundColor="#142338"
        controlType="orbit"
        cooldownTicks={180}
        cooldownTime={6200}
        d3AlphaDecay={0.026}
        d3VelocityDecay={0.34}
        enableNodeDrag={arrangement === "current"}
        forceEngine="d3"
        graphData={graphData}
        height={size.height}
        linkColor={linkColor}
        linkDirectionalArrowColor={linkColor}
        linkDirectionalArrowLength={linkArrowLength}
        linkDirectionalArrowRelPos={0.92}
        linkDirectionalParticles={linkParticles}
        linkDirectionalParticleSpeed={0.006}
        linkDirectionalParticleWidth={1.4}
        linkHoverPrecision={12}
        linkLabel={(link) => link.label}
        linkOpacity={0.38}
        linkPositionUpdate={linkPositionUpdate}
        linkThreeObject={linkThreeObject}
        linkThreeObjectExtend={arrangement !== "globe"}
        linkWidth={linkWidth}
        nodeColor={nodeColor}
        nodeLabel={(node) =>
          node.secondaryLabel ? `${node.label} · ${node.secondaryLabel}` : node.label
        }
        nodeRelSize={3.2}
        nodeResolution={16}
        nodeVal={nodeValue}
        numDimensions={3}
        onBackgroundClick={resetSelection}
        onLinkClick={(link) => {
          if (link.bundle) {
            expandRelationshipBundle(link.bundle);
            return;
          }
          setSelectedRelationshipId(link.id);
        }}
        onNodeClick={(node) => {
          if (node.id != null) {
            selectDisplayedNode(String(node.id));
          }
        }}
        onNodeHover={(node) => {
          setHoveredEntityId(node?.id == null ? null : String(node.id));
        }}
        showNavInfo={false}
        warmupTicks={warmupTicksRef.current}
        width={size.width}
      />
      <div className="force-graph-label-layer">
        {labelPlacements.map((label) => (
          <button
            className={[
              "force-graph-label",
              `is-${label.kind}`,
              label.colorKind !== label.kind ? `is-${label.colorKind}` : "",
              label.selected ? "is-selected" : "",
              label.expanded ? "is-expanded" : "",
              label.neighbor ? "is-neighbor" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={label.id}
            style={{
              opacity: label.opacity,
              pointerEvents: label.opacity > 0.05 ? "auto" : "none",
              transform: `translate3d(${label.x}px, ${label.y}px, 0)`,
              width: label.width,
              height: label.height,
            }}
            aria-hidden={label.opacity <= 0.05}
            dir="auto"
            lang={locale}
            title={projectedNodeById.get(label.id)?.label}
            onClick={() => selectDisplayedNode(label.id)}
            onMouseEnter={() => setHoveredEntityId(label.id)}
            onMouseLeave={() => setHoveredEntityId(null)}
            onWheel={forwardLabelWheel}
            tabIndex={label.opacity > 0.05 ? 0 : -1}
            type="button"
          >
            <span className="force-graph-label-primary">{label.label}</span>
            {label.secondaryLabel ? (
              <span className="force-graph-label-secondary">{label.secondaryLabel}</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
