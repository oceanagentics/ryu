import type { RecordListDto } from "../../../../shared/recordApi";
/**
 * Zustand state for graph data, view intent, selection state, and saved view metadata.
 */
import { create } from "zustand";

import { edgeKinds } from "../../../../shared/domain";
import type {
  GraphBootstrapPayload,
  GraphEdgeKind,
  GraphNode,
  GraphNodeKind,
  SavedView,
  SupportedLocale,
  ViewMode,
} from "../../../../shared/domain";
import { defaultLocale } from "../../../../shared/localization";
import { indexGraph, type IndexedGraph } from "../graph/indexGraph";
import { emptySearchFilters, type GraphSearchFilters } from "../search";
import {
  isFocusAllowedForView,
  normalizeFocusForView,
} from "./viewIntent";

export const graphLayouts = [
  "grid",
  "circle",
  "concentric",
  "breadthfirst",
  "cose",
  "dagre",
  "fcose",
  "elk-layered",
  "elk-mrtree",
  "elk-stress",
  "elk-force",
] as const;

export type GraphLayout = (typeof graphLayouts)[number];
export type CountryDisplayMode = "node" | "engulf";
export type GraphDisplayMode = "graph" | "globe";

const filterableNodeKinds: GraphNodeKind[] = ["country", "organization", "system"];

function getInitialDisplayMode(): GraphDisplayMode {
  if (typeof window === "undefined") {
    return "graph";
  }

  return new URLSearchParams(window.location.search).get("display") === "globe"
    ? "globe"
    : "graph";
}

interface ViewportSnapshot {
  zoom: number;
  panX: number;
  panY: number;
}

interface GraphState {
  graph: IndexedGraph | null;
  loading: boolean;
  error: string | null;
  viewMode: ViewMode;
  displayMode: GraphDisplayMode;
  layoutMode: GraphLayout;
  countryDisplayMode: CountryDisplayMode;
  focusEntityId: string | null;
  selectedEntityId: string | null;
  selectedRelationshipId: string | null;
  savedViews: SavedView[];
  viewport: ViewportSnapshot | null;
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
  setBootstrap: (payload: GraphBootstrapPayload) => void;
  setSavedViews: (savedViews: SavedView[]) => void;
  updateNode: (node: GraphNode) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setViewMode: (viewMode: ViewMode) => void;
  setDisplayMode: (displayMode: GraphDisplayMode) => void;
  setLayoutMode: (layoutMode: GraphLayout) => void;
  setCountryDisplayMode: (countryDisplayMode: CountryDisplayMode) => void;
  setFocusEntityId: (focusEntityId: string | null) => void;
  setSelectedEntityId: (selectedEntityId: string | null) => void;
  setSelectedRelationshipId: (selectedRelationshipId: string | null) => void;
  setViewport: (viewport: ViewportSnapshot | null) => void;
  setLocale: (locale: SupportedLocale) => void;
  setSearchQuery: (searchQuery: string) => void;
  setSearchAllLanguages: (searchAllLanguages: boolean) => void;
  setSearchFilters: (searchFilters: GraphSearchFilters) => void;
  toggleNodeKindVisibility: (nodeKind: GraphNodeKind) => void;
  toggleEdgeKindVisibility: (edgeKind: GraphEdgeKind) => void;
  resetKindFilters: () => void;
  resetSearchFilters: () => void;
  resetSearch: () => void;
  resetSelection: () => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  graph: null,
  loading: true,
  error: null,
  viewMode: "governance",
  displayMode: getInitialDisplayMode(),
  layoutMode: "elk-mrtree",
  countryDisplayMode: "engulf",
  focusEntityId: null,
  selectedEntityId: null,
  selectedRelationshipId: null,
  savedViews: [],
  viewport: null,
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
  setBootstrap: (payload) =>
    set({
      graph: indexGraph(payload),
      savedViews: payload.savedViews,
      loading: false,
      error: null,
    }),
  setSavedViews: (savedViews) => set({ savedViews }),
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
          savedViews: state.graph.savedViews,
        }),
      };
    }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  setDisplayMode: (displayMode) => set({ displayMode }),
  setViewMode: (viewMode) =>
    set((state) => ({
      viewMode,
      focusEntityId: normalizeFocusForView(state.graph, viewMode, state.focusEntityId),
      selectedEntityId: null,
      selectedRelationshipId: null,
    })),
  setLayoutMode: (layoutMode) => set({ layoutMode }),
  setCountryDisplayMode: (countryDisplayMode) =>
    set({ countryDisplayMode }),
  setFocusEntityId: (focusEntityId) =>
    set((state) =>
      isFocusAllowedForView(state.graph, state.viewMode, focusEntityId)
        ? { focusEntityId }
        : {},
    ),
  setSelectedEntityId: (selectedEntityId) =>
    set({ selectedEntityId, selectedRelationshipId: null }),
  setSelectedRelationshipId: (selectedRelationshipId) =>
    set({ selectedRelationshipId, selectedEntityId: null }),
  setViewport: (viewport) => set({ viewport }),
  setLocale: (locale) => set({ locale }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchAllLanguages: (searchAllLanguages) => set({ searchAllLanguages }),
  setSearchFilters: (searchFilters) => set({ searchFilters }),
  toggleNodeKindVisibility: (nodeKind) =>
    set((state) => {
      const hiddenNodeKinds = new Set(state.hiddenNodeKinds);
      if (hiddenNodeKinds.has(nodeKind)) {
        hiddenNodeKinds.delete(nodeKind);
      } else {
        hiddenNodeKinds.add(nodeKind);
      }

      return {
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
        hiddenEdgeKinds: edgeKinds.filter((kind) => hiddenEdgeKinds.has(kind)),
      };
    }),
  resetKindFilters: () => set({ hiddenNodeKinds: [], hiddenEdgeKinds: [] }),
  resetSearchFilters: () => set({ searchFilters: emptySearchFilters() }),
  resetSearch: () =>
    set({
      searchQuery: "",
      searchAllLanguages: false,
      searchFilters: emptySearchFilters(),
    }),
  resetSelection: () => set({ selectedEntityId: null, selectedRelationshipId: null }),
}));
