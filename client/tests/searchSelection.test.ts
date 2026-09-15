import assert from "node:assert/strict";
import { test } from "node:test";

import type { GraphNode, GraphNodeKind } from "../../shared/domain";
import { emptyLocalizationDetails } from "../../shared/localization";
import { projectGraph } from "../src/app/graph/projection";
import { useGraphStore } from "../src/app/state/graphStore";

function node(id: string, kind: GraphNodeKind): GraphNode {
  return {
    id, kind, countryCode: kind === "country" ? "CAN" : null, url: null,
    recordDepth: "stub", createdAt: "2026-09-14", updatedAt: "2026-09-14",
    properties: {}, sources: {}, availableLocales: ["en"], requestedLocale: "en",
    displayLocale: "en", isLocaleFallback: false,
    localizations: { en: { locale: "en", title: id, summary: null, description: null,
      details: emptyLocalizationDetails(), translatedFromLocale: null, contentUpdatedAt: "2026-09-14",
      review: { state: "agent_researched", note: null, reviewer: null, date: null },
      createdAt: "2026-09-14", updatedAt: "2026-09-14" } },
  };
}

test("graph search filtering and selection preserve every node kind", () => {
  const nodes = [node("country", "country"), node("organization", "organization"), node("system", "system")];
  useGraphStore.getState().setBootstrap({ nodes, edges: [], ryuRoutes: [] });

  for (const entity of nodes) {
    const projection = projectGraph({
      graph: useGraphStore.getState().graph!, locale: "en",
      searchEntityIds: new Set([entity.id]),
    });
    assert.deepEqual(projection.nodes.map(projected => projected.id), [entity.id]);

    useGraphStore.getState().setSelectedRelationshipId("previous-edge");
    useGraphStore.getState().setSelectedEntityId(entity.id);
    assert.equal(useGraphStore.getState().selectedEntityId, entity.id);
    assert.equal(useGraphStore.getState().selectedRelationshipId, null);
  }
});
