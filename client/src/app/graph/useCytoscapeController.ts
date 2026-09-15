/**
 * Cytoscape controller owns renderer lifecycle, interaction wiring, layout execution, and viewport behavior.
 */
import { useEffect, useMemo, useRef } from "react";
import cytoscape, { type Core } from "cytoscape";
import dagre from "cytoscape-dagre";
import elk from "cytoscape-elk";
import fcose from "cytoscape-fcose";

import {
  getCytoscapeStyles,
  type GraphDisplayMode,
} from "./cytoscapeStyles";
import type { CytoscapeProjectionOutput } from "./layout";
import type { RelationshipBundle } from "./projection";
import { useGraphStore } from "../state/graphStore";

cytoscape.use(dagre);
cytoscape.use(fcose);
cytoscape.use(elk);

interface UseCytoscapeControllerOptions {
  container: HTMLDivElement | null;
  projection: CytoscapeProjectionOutput;
  structuralKey: string;
  layoutKey: string;
  focusedEntityId: string | null;
  selectedEntityId: string | null;
  connectedNodeIds: string[];
  connectedEdgeIds: string[];
  displayMode: GraphDisplayMode;
}

export function useCytoscapeController({
  container,
  projection,
  structuralKey,
  layoutKey,
  focusedEntityId,
  selectedEntityId,
  connectedNodeIds,
  connectedEdgeIds,
  displayMode,
}: UseCytoscapeControllerOptions): Core | null {
  const visibleNodeLabelKinds = useGraphStore((state) => state.visibleNodeLabelKinds);
  const cyRef = useRef<Core | null>(null);
  const lastStructuralKeyRef = useRef<string | null>(null);
  const pendingInitialFitRef = useRef(false);
  const lastLayoutKeyRef = useRef<string | null>(null);
  const hasFittedRef = useRef(false);
  const positionsRef = useRef(new Map<string, cytoscape.Position>());

  useEffect(() => {
    if (!container || cyRef.current) {
      return;
    }

    const cy = cytoscape({
      container,
      elements: [],
      style: getCytoscapeStyles(displayMode, visibleNodeLabelKinds),
    });

    cy.on("tap", "node", (event) => {
      const nodeId = event.target.id();
      const state = useGraphStore.getState();
      const bundle = event.target.data("bundle") as RelationshipBundle | undefined;
      if (bundle) {
        state.expandRelationshipBundle(bundle);
        return;
      }
      state.setSelectedEntityId(nodeId);
    });

    cy.on("tap", "edge", (event) => {
      const bundle = event.target.data("bundle") as RelationshipBundle | undefined;
      if (bundle) {
        useGraphStore.getState().expandRelationshipBundle(bundle);
        return;
      }
      if (event.target.data("isDerivedHierarchy")) {
        return;
      }
      useGraphStore.getState().setSelectedRelationshipId(event.target.id());
    });

    cy.on("tap", (event) => {
      if (event.target === cy) {
        useGraphStore.getState().resetSelection();
      }
    });

    cyRef.current = cy;

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            cy.resize();
            if (
              pendingInitialFitRef.current &&
              container.clientWidth > 0 &&
              container.clientHeight > 0 &&
              cy.elements().length > 0
            ) {
              cy.fit(cy.elements(), 48);
              pendingInitialFitRef.current = false;
              hasFittedRef.current = true;
            }
          });

    resizeObserver?.observe(container);

    return () => {
      resizeObserver?.disconnect();
      cy.destroy();
      cyRef.current = null;
      hasFittedRef.current = false;
      lastLayoutKeyRef.current = null;
    };
  }, [container]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }

    cy.style().fromJson(getCytoscapeStyles(displayMode, visibleNodeLabelKinds)).update();
  }, [displayMode, visibleNodeLabelKinds]);

  const stableElements = useMemo(
    () => projection.elements,
    [projection.elements],
  );

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !container) {
      return;
    }

    let cancelled = false;
    const nextIds = new Set(stableElements.map(element => String(element.data.id)));
    const positions = positionsRef.current;
    if (lastLayoutKeyRef.current !== layoutKey) positions.clear();
    else cy.nodes().forEach(node => { if (!node.data("bundle")) positions.set(node.id(), { ...node.position() }); });
    const canonicalGraph = useGraphStore.getState().graph;
    for (const id of positions.keys()) if (!canonicalGraph?.nodeById[id]) positions.delete(id);
    const seeds = new Map(positions);
    for (const hint of projection.positionHints ?? []) {
      const anchor = cy.$id(hint.anchorId);
      if (anchor.length) {
        seeds.set(hint.id, { x: anchor.position("x") + hint.offset.x,
          y: anchor.position("y") + hint.offset.y });
      }
    }

    cy.batch(() => {
      cy.elements().filter(element => !nextIds.has(element.id())).remove();
      for (const element of stableElements) {
        const existing = cy.$id(String(element.data.id));
        if (existing.length) existing.data(element.data);
        else cy.add({ ...element, position: seeds.get(String(element.data.id)) });
      }
    });

    const didStructureChange = lastStructuralKeyRef.current !== structuralKey;
    lastStructuralKeyRef.current = structuralKey;
    const didLayoutChange = lastLayoutKeyRef.current !== layoutKey;
    lastLayoutKeyRef.current = layoutKey;
    pendingInitialFitRef.current = !hasFittedRef.current && cy.nodes().length > 0;

    const finishLayout = (padding: number) => {
      if (cancelled) {
        return;
      }

      cy.resize();
      if (
        pendingInitialFitRef.current &&
        cy.container()?.clientWidth &&
        cy.container()?.clientHeight
      ) {
        cy.fit(cy.elements(), padding);
        pendingInitialFitRef.current = false;
        hasFittedRef.current = true;
      }
    };

    const nextLayout = {
      ...(didLayoutChange || !hasFittedRef.current ? projection.layout : { name: "preset" }),
      fit: false,
    } as cytoscape.LayoutOptions & {
      fit?: boolean;
      padding?: number;
    };
    if (didStructureChange && nextLayout.padding == null) {
      nextLayout.padding = 48;
    }

    const layoutRunner = cy.layout(nextLayout);
    layoutRunner.on("layoutstop", () => {
      finishLayout(nextLayout.padding ?? 48);
    });

    requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }
      cy.resize();
      layoutRunner.run();
    });

    return () => {
      cancelled = true;
      layoutRunner.stop();
    };
  }, [container, projection, stableElements, structuralKey, layoutKey]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }

    cy.batch(() => {
      cy.nodes().removeClass("is-selected is-neighbor");
      cy.edges().removeClass("is-connected");

      if (!selectedEntityId) {
        return;
      }

      cy.$id(selectedEntityId).addClass("is-selected");
      for (const nodeId of connectedNodeIds) {
        cy.$id(nodeId).addClass("is-neighbor");
      }
      for (const edgeId of connectedEdgeIds) {
        cy.$id(edgeId).addClass("is-connected");
      }
    });
  }, [connectedEdgeIds, connectedNodeIds, selectedEntityId]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }

    cy.batch(() => {
      cy.nodes().removeClass("is-focus");

      if (!focusedEntityId) {
        return;
      }

      cy.$id(focusedEntityId).addClass("is-focus");
    });
  }, [focusedEntityId]);

  return cyRef.current;
}
