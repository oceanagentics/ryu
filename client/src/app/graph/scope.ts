/** Scope selection decides which canonical node ids belong in the graph. */
import type { IndexedGraph } from "./indexGraph";

export function getScopeIds(
  graph: IndexedGraph,
  searchEntityIds: ReadonlySet<string> | null,
): Set<string> {
  return searchEntityIds
    ? new Set(searchEntityIds)
    : new Set(graph.nodes.map((node) => node.id));
}
