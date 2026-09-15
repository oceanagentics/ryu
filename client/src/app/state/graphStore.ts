import type { RecordListDto } from "../../../../shared/recordApi";
/** Zustand state for graph data, filtering, projection, and selection. */
import { create } from "zustand";

import { edgeKinds } from "../../../../shared/domain";
import type {
  GraphBootstrapPayload,
  GraphEdgeKind,
  GraphNode,
  GraphNodeKind,
  SupportedLocale,
} from "../../../../shared/domain";
import { defaultLocale } from "../../../../shared/localization";
import { indexGraph, type IndexedGraph } from "../graph/indexGraph";
import type { GraphProjectionNode, RelationshipBundle, SemanticLevel } from "../graph/projection";
import { emptySearchFilters, type GraphSearchFilters } from "../search";

const filterableNodeKinds: GraphNodeKind[] = ["country", "organization", "system"];
const collapsedRelationships = { expandedEntityIds: new Set<string>(), selectedBundleId: null };

interface GraphState {
  graph: IndexedGraph | null;
  loading: boolean;
  error: string | null;
  selectedEntityId: string | null;
  selectedRelationshipId: string | null;
  locale: SupportedLocale;
  searchQuery: string;
  searchAllLanguages: boolean;
  searchFilters: GraphSearchFilters;
  searchResult: RecordListDto | null;
  searchEntityIds: Set<string> | null;
  searchLoading: boolean;
  searchError: string | null;
  hiddenNodeKinds: GraphNodeKind[];
  hiddenEdgeKinds: GraphEdgeKind[];
  visibleNodeLabelKinds: GraphProjectionNode["kind"][];
  semanticLevel: SemanticLevel;
  expandedEntityIds: Set<string>;
  selectedBundleId: string | null;
  setSemanticLevel: (level: SemanticLevel) => void;
  expandRelationshipBundle: (bundle: RelationshipBundle) => void;
  collapseRelationships: () => void;
  setBootstrap: (payload: GraphBootstrapPayload) => void;
  updateNode: (node: GraphNode) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedEntityId: (selectedEntityId: string | null) => void;
  setSelectedRelationshipId: (selectedRelationshipId: string | null) => void;
  setLocale: (locale: SupportedLocale) => void;
  setSearchQuery: (searchQuery: string) => void;
  setSearchAllLanguages: (searchAllLanguages: boolean) => void;
  setSearchFilters: (searchFilters: GraphSearchFilters) => void;
  toggleNodeKindVisibility: (nodeKind: GraphNodeKind) => void;
  toggleEdgeKindVisibility: (edgeKind: GraphEdgeKind) => void;
  toggleNodeLabelVisibility: (kind: GraphProjectionNode["kind"]) => void;
  resetKindFilters: () => void;
  resetSearchFilters: () => void;
  resetSearch: () => void;
  resetSelection: () => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  graph: null,
  loading: true,
  error: null,
  selectedEntityId: null,
  selectedRelationshipId: null,
  locale: defaultLocale,
  searchQuery: "",
  searchAllLanguages: false,
  searchFilters: emptySearchFilters(),
  searchResult: null,
  searchEntityIds: null,
  searchLoading: false,
  searchError: null,
  hiddenNodeKinds: [],
  hiddenEdgeKinds: [],
  visibleNodeLabelKinds: ["system", "relationship-bin"],
  semanticLevel: "entity",
  ...collapsedRelationships,
  setSemanticLevel: (semanticLevel) => set({ semanticLevel }),
  expandRelationshipBundle: (bundle) => set((state) => ({
    selectedBundleId: bundle.id,
    expandedEntityIds: new Set([...state.expandedEntityIds,
      ...bundle.hiddenMemberIds.filter(id => state.graph?.nodeById[id])]),
  })),
  collapseRelationships: () => set(collapsedRelationships),
  setBootstrap: (payload) =>
    set({
      ...collapsedRelationships,
      graph: indexGraph(payload),
      loading: false,
      error: null,
    }),
  updateNode: (node) =>
    set((state) => {
      if (!state.graph?.nodeById[node.id]) {
        return {};
      }

      return {
        graph: indexGraph({
          nodes: state.graph.nodes.map((existingNode) =>
            existingNode.id === node.id ? node : existingNode,
          ),
          edges: state.graph.edges,
          ryuRoutes: state.graph.ryuRoutes,
        }),
      };
    }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  setSelectedEntityId: (selectedEntityId) =>
    set({ selectedEntityId, selectedRelationshipId: null, selectedBundleId: null }),
  setSelectedRelationshipId: (selectedRelationshipId) =>
    set({ selectedRelationshipId, selectedEntityId: null, selectedBundleId: null }),
  setLocale: (locale) => set({ locale }),
  setSearchQuery: (searchQuery) => set({ searchQuery, ...collapsedRelationships }),
  setSearchAllLanguages: (searchAllLanguages) => set({ searchAllLanguages, ...collapsedRelationships }),
  setSearchFilters: (searchFilters) => set({ searchFilters, ...collapsedRelationships }),
  toggleNodeKindVisibility: (nodeKind) =>
    set((state) => {
      const hiddenNodeKinds = new Set(state.hiddenNodeKinds);
      if (hiddenNodeKinds.has(nodeKind)) {
        hiddenNodeKinds.delete(nodeKind);
      } else {
        hiddenNodeKinds.add(nodeKind);
      }

      return {
        ...collapsedRelationships,
        hiddenNodeKinds: filterableNodeKinds.filter((kind) =>
          hiddenNodeKinds.has(kind),
        ),
      };
    }),
  toggleEdgeKindVisibility: (edgeKind) =>
    set((state) => {
      const hiddenEdgeKinds = new Set(state.hiddenEdgeKinds);
      if (hiddenEdgeKinds.has(edgeKind)) {
        hiddenEdgeKinds.delete(edgeKind);
      } else {
        hiddenEdgeKinds.add(edgeKind);
      }

      return {
        ...collapsedRelationships,
        hiddenEdgeKinds: edgeKinds.filter((kind) => hiddenEdgeKinds.has(kind)),
      };
    }),
  toggleNodeLabelVisibility: (kind) => set((state) => ({
    visibleNodeLabelKinds: state.visibleNodeLabelKinds.includes(kind)
      ? state.visibleNodeLabelKinds.filter(visibleKind => visibleKind !== kind)
      : [...state.visibleNodeLabelKinds, kind],
  })),
  resetKindFilters: () => set({ hiddenNodeKinds: [], hiddenEdgeKinds: [], ...collapsedRelationships }),
  resetSearchFilters: () => set({ searchFilters: emptySearchFilters(), ...collapsedRelationships }),
  resetSearch: () =>
    set({
      ...collapsedRelationships,
      searchQuery: "",
      searchAllLanguages: false,
      searchFilters: emptySearchFilters(),
    }),
  resetSelection: () => set({ selectedEntityId: null, selectedRelationshipId: null, selectedBundleId: null }),
}));
