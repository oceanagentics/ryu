# Semantic zoom for relationship bins

Status: proposed implementation plan. Writing this document does not authorize implementation of the graph changes.

## Objective

Introduce three levels of relationship detail while preserving canonical graph records and keeping camera navigation and rotation continuous as the displayed nodes change.

Start with a manual **Family / Type / Entity** control. Add automatic zoom switching only after projection, expansion, and scene updates work reliably.

| Level | Display |
| --- | --- |
| Family | Per-hub, per-direction relationship-family bins: Org and Data |
| Type | Per-hub, per-direction relationship-type bins, such as Governs 3 or Contributes 18 |
| Entity | Actual canonical nodes and edges within the current scope and filters |

The display families are:

| Family ID | Display label | Canonical edge types |
| --- | --- | --- |
| `org` | Org | `governs`, `operates`, `funds`, `member` |
| `data` | Data | `contributes`, `transfers` |

These families and bins are presentation concepts. They require no stored nodes, stored edges, record API changes, or database migration.

## Relationship grouping and topology

### Group all matching neighbors

A neighbor is a canonical entity connected to a hub by an incident relationship. Group membership comes from all matching incident relationships in the current scoped and filtered graph.

The group key is:

`hub ID + direction + semantic level + family/type ID`

Direction is relative to the hub:

- Outgoing: `hub -> bin`.
- Incoming: `bin -> hub`.

Incoming and outgoing groups must remain separate at both Family and Type levels. Entity kinds do not determine group membership: a bin may represent different kinds of entities connected by the same relationship type or family.

Do not use “exactly one distinct neighbor” as the relationship-grouping rule. That was an earlier conservative proposal, not the intended definition of a group.

### Distinguish group membership from hidden membership

The request to group all neighbors intersects with the original requirement to preserve shared and bridge topology. The recommended reconciliation is:

1. Form logical groups from all matching neighbors.
2. Retain required canonical entities and their visible canonical edges.
3. Collapse the remaining members into bins.
4. Show the number of unique hidden entities on each bin.
5. In group details, distinguish all members, visible members, and hidden members.

Protected entities include the focused entity, selected entity, both endpoints of a selected relationship, search matches, and entities revealed through local expansion. Structurally shared entities and entities needed to show bridge topology also remain real.

Protection prevents aggregation within the current visible scope. It should not silently override an explicit filter or add an out-of-scope entity. Preserve canonical selection state if filters exclude the selected record; define any reveal action separately.

This reconciliation remains a product decision. If all neighbors must disappear into bins, including shared entities, the plan needs an explicit alternative for representing their connections, such as visual proxies or connections between bins. Do not silently omit those connections.

### Retain hubs before collapsing neighbors

Choose a deterministic set of real hubs before aggregation. Two connected nodes cannot each disappear into the other's bin. Compute hub retention and topology protection from the scoped canonical graph, not from degrees in an already aggregated projection.

- Focused views: preserve the actual focus and the canonical connections needed to understand its neighborhood.
- Global view: define an explicit policy for retaining shared structure and choosing hubs. Do not treat the first country returned by the graph as an implicit global hub.
- Preserve isolated nodes, cycles, and connections between hubs unless an explicit projection rule accounts for them.
- Do not recursively collapse branches in the first implementation without a separately reviewed topology rule.

The exact global hub-retention policy must be settled before implementing global collapse.

### Multi-role entities and counts

An entity may belong to several groups for the same hub, including opposite directions. Multiple relationship types are not, by themselves, a reason to exclude it from grouping.

For example, if A operates B and C, and A contributes to B, the outgoing groups contain:

- Org: B and C.
- Data: B.

If both entities are hidden, the bins display Org 2 and Data 1. Counts are unique within each bin and are not additive across bins. Family counts use the union of member IDs rather than the sum of type counts.

Retain underlying canonical node IDs and edge IDs. Keep entity counts distinct from relationship counts. Several edges to one entity still count as one entity.

Recommend avoiding bins with fewer than two hidden entities, but settle this alongside overlapping membership. If a small group requires revealing an entity, remove that entity from every bin's hidden membership and restore its visible incident relationships. Never leave a partially hidden representation or omit one of its relationships.

Do not assume every level change reduces the number of displayed nodes. Multiple bins, directions, and shared memberships can outweigh the entities hidden. Measure the actual benefit.

## Architecture and ownership

Use the existing graph build and graph display boundaries.

| Owner | Responsibility |
| --- | --- |
| `client/src/app/state/graphStore.ts` and `state/viewIntent.ts` | Manual level, later automatic mode and effective level, expansion intent, separate bundle-details identity |
| `client/src/app/graph/scope.ts` | Return canonical IDs for the view; no synthetic nodes, bins, sizes, or layout behavior |
| `client/src/app/graph/projection.ts` | Canonical filtering, group membership, protected entities, retained hubs, synthetic bins, aggregate edges, counts, and stable IDs |
| `client/src/app/graph/geometry.ts` | Intrinsic label dimensions and stable bin sizing hints |
| `client/src/app/graph/layout.ts` and `graph/nodeMap3dLayout.ts` | Renderer-specific layout intent, placement constraints, bin spacing, and display conversion |
| `client/src/app/components/ForceGraphCanvas.tsx` | Active renderer integration, mutable render-object reconciliation, interaction dispatch, and camera-scale observation |
| `client/src/app/graph/useCytoscapeController.ts` | Cytoscape element reconciliation, layout execution, interaction dispatch, and viewport preservation |
| `client/src/app/components/GraphCanvas.tsx` | Compose state, projection, and display plan; no hidden layout or coordinate-cache policy |
| Styles and shared UI catalogs | Bin appearance, labels, directions, counts, and controls |

Keep the implementation focused on these existing owners. A broad renderer rewrite is not a prerequisite.

### Projected data contract

Extend the client projection types with explicit variants:

- Canonical entity node: canonical ID, canonical kind, and display data.
- Relationship-bin node: projected ID, hub ID, direction, level, group ID, member IDs, hidden member IDs, and supporting edge IDs.
- Canonical relationship: canonical edge ID and endpoints.
- Aggregate relationship: projected ID, directed endpoints, group identity, and the canonical edge IDs represented by that aggregate.

Logical group metadata may include edges that remain directly visible. An aggregate edge must reference only the edges it replaces. Every eligible visible canonical edge is represented exactly once: directly or within one aggregate edge.

Do not assign bins a fake canonical kind or assign an Org/Data aggregate a fake canonical edge type. Keep synthetic variants outside `GraphNode`, `GraphEdge`, and the persisted graph index. Do not repurpose `isDerivedHierarchy` to mean a relationship bin.

Generate deterministic IDs from encoded key fields under a reserved display namespace. Include direction and level; exclude counts, member lists, localized labels, and array order. Sort and deduplicate underlying IDs. Ensure no collisions with canonical node or edge IDs.

Keep canonical projection inputs immutable. ForceGraph mutates node coordinates and link endpoints, so renderer objects must be separate from canonical records and pure projection results.

### Localization

Use existing shared edge-kind and relationship-direction labels. Put Family/Type/Entity, Org/Data, expansion controls, and count templates in the shared graph UI catalog with all six supported locales. Format counts through the existing number formatter.

Show direction explicitly in a label, tooltip, or accessible description as well as through the edge arrow. A label such as Governs 3 alone is ambiguous for an incoming group. Do not inherit the current ForceGraph suppression of membership arrows for bins.

## Local expansion and selection

Clicking a bin should reveal its hidden canonical entities locally while retaining the chosen global level.

- Reveal each entity once, even if several bins represented it.
- Restore its incident canonical edges allowed by the current scope and filters.
- Remove it from all rendered bins' hidden membership and update their counts.
- Remove empty bins.
- Provide an explicit collapse/reset action; retain focused and selected entities when collapsing.
- Keep expansion intent across Family/Type/Entity changes.
- Keep bundle details keyed to the logical group, because the rendered bin may disappear immediately after expansion.

Canonical entity and relationship selection remain in the existing selection fields. Synthetic IDs must never enter canonical detail lookup, editing, or entity URLs. Use separate transient bundle-details state and resolve full records through the canonical graph index when needed.

Define whether expansion resets or is reconciled when focus, search, or filters change. Recommended starting behavior: reset for a new scope or search/filter context; preserve for a semantic-level change. Explicit manual mode overrides automatic level choice, and local expansion remains an exception to either mode.

## Continuous camera and rotation

Scene-data changes must preserve the running camera and controls. Keep one mounted ForceGraph instance and do not change its React key during projection updates.

Separate four lifecycle operations:

1. Renderer initialization establishes the initial camera and controls.
2. Intentional arrangement changes apply that arrangement's camera policy.
3. Canvas resizing updates canvas dimensions and camera projection.
4. Projection changes reconcile displayed nodes and edges.

Projection changes must not reset camera position, orientation, field of view, orbit target, auto-rotation state/speed, or damping. Resizing, including opening the details pane, must not reset navigation.

The current ForceGraph camera setup depends on node count and canvas size; its rotation setup also depends on node count. Those dependencies must be separated before bins are enabled.

Preserve the live camera continuously. Routine snapshot-and-restore after asynchronous layout can rewind rotation or overwrite navigation performed while layout was running. Camera snapshots are useful for verification or intentional view restoration, not as a substitute for independent lifecycles.

Temporary empty graphs, search-loading states, and rapid updates must not recreate the renderer or reset the camera. Label updates and hover state must not trigger structural reconstruction.

## Node-position stability

Camera continuity and layout stability are separate requirements. An unchanged camera does not prevent the graph from moving beneath it.

Reconcile renderer objects by stable projected ID:

- Reuse surviving node objects and their positions.
- Preserve renderer-owned velocity and fixed-position state where appropriate to the active layout.
- Cache bounded, last-known positions for hidden canonical entities.
- Seed new bins near their hub or the centroid of represented members.
- Seed returning entities from suitable cached positions or near the former bin, with deterministic spacing.
- Reconcile link endpoints against current renderer objects; avoid stale object references.
- Remove stale hover targets and cancel obsolete layout results without resetting canonical selection.

The installed force engine reheats when graph data changes, and the app currently requests 48 warm-up ticks. Reusing objects alone therefore does not guarantee a smooth transition. The centering and repulsion forces can also move the entire graph after membership changes.

Use initial warm-up only for initial layout. For semantic transitions, verify a layout policy that holds retained hubs stable while changed regions settle. Express this as layout constraints before simulation rather than correcting positions after the solve. Do not assume `d3ReheatSimulation()` provides a gentle or local update.

Keep position caches and renderer mutation out of `projection.ts`. Bound caches to the loaded graph and arrangement context. Do not reuse flat/globe fixed positions as unconstrained graph positions without the existing arrangement-transition policy.

## Search, filters, and view scope

- Apply view scope and canonical node/edge filters before producing visible bins or their counts.
- Do not include filtered-out entities or relationships in hidden counts.
- Define topology protection against the scoped canonical graph and document whether excluded relationships affect that protection. A bridge visible in the unfiltered graph can look peripheral after filtering.
- Current search replaces graph scope with matching IDs. Protecting every search match therefore usually leaves no eligible hidden members during search. Preserve this behavior initially unless search explicitly gains contextual neighbors.
- Distinguish text-search protection from structured-filter results if the product needs bins in broad filtered views; current `searchEntityIds` represents both.
- Locale changes may update labels and dimensions, but must not change group identity or reset the camera.

## Automatic semantic zoom

Add automatic behavior after the manual levels pass acceptance checks.

Observe a normalized camera scale, using camera distance to the controls target and an arrangement reference scale. Do not use wheel delta or bounds that change when bins replace entities. Account for camera projection where necessary.

Keep high-frequency camera measurements outside shared React/store state. Publish only discrete semantic-level changes.

OrbitControls emits `end` for individual wheel events, so that event alone does not identify a settled zoom gesture. Debounce successive scale changes and require a stable threshold crossing before committing a new projection.

- Use separate entry and exit thresholds for Family/Type and Type/Entity transitions.
- Coalesce a burst of wheel or pinch input into one settled decision.
- Ignore rotation-only and pan-only changes.
- Ignore programmatic arrangement/camera transitions while they run.
- Prevent layout changes from triggering a feedback loop in level selection.
- Preserve local expansions and canonical selection.
- Keep manual Family/Type/Entity available as an override.

Calibrate thresholds using the real graph and representative canvas sizes after the manual release. Do not commit arbitrary production thresholds in advance.

## Cytoscape, Tree, and Globe

Cytoscape must consume the same projection variants and preserve canonical selection. Its current controller removes all elements, reruns layout, and can refit; the viewport-preservation ref is not populated. Reconcile stable elements where practical, preserve zoom/pan, and avoid fitting on semantic transitions or overwriting navigation during asynchronous layout.

Tree currently uses only Org-family canonical relationships for its ELK layout. When adding bins, ensure Data bins receive meaningful placement constraints without being presented as organizational hierarchy. Treat this as a separate arrangement integration.

Keep Globe at Entity level initially. The current globe projection assumes canonical node kinds and uses fallback geographic positions for entities without country anchors. Bins have no inherent geographic position, and globe links currently suppress directional arrows. A later globe design needs explicit placement and direction rules; do not invent a country or location for a bin.

Preserve the user's chosen level when an unsupported arrangement temporarily forces Entity, and restore that preference when returning to a supported arrangement.

## Product decisions before implementation

| Decision | Recommended starting position |
| --- | --- |
| Does “all neighbors” require hiding shared/bridge entities? | Group all; keep required entities real; badge counts hidden entities. Confirm this reconciliation. |
| Which nodes remain hubs globally? | Define a deterministic retained structure before aggregation; do not infer hubs from the reduced graph. |
| Minimum bin size | Avoid singleton bins; reconcile overlapping groups without partially hiding entities. |
| Multi-role and opposite-direction membership | Permit multiple logical memberships; count unique entities within each bin and explain overlap. |
| Bin click | Reveal canonical members locally and retain logical group details. |
| Collapse and context changes | Explicit reset; preserve expansion across levels, reset on a new scope/search/filter context. |
| Search versus structured filters | Protect text matches; explicitly decide whether all structured-filter results are also protected. |
| Initial supported arrangements | Active Graph first; Tree after placement review; Globe Entity-only. |
| Persistence | Session state initially; defer saved-view and URL persistence for semantic settings. |

## Incremental implementation sequence

1. **Establish stable scene updates.** Verify that additions, removals, resizing, and temporary empty results preserve camera navigation and ongoing rotation. Separate initialization, arrangement, resize, and graph-update effects. Characterize force warm-up and movement during updates.
2. **Add manual Family / Type / Entity.** Default to Entity. Add localized controls and explicit unsupported-arrangement behavior. Leave automatic zoom disabled.
3. **Implement the projection contract and grouping.** Settle hub retention and bridge policy first. Add synthetic variants, deterministic IDs, direction-preserving aggregates, exact counts, and tests for overlapping membership. Keep Entity output equivalent to the existing canonical projection.
4. **Integrate stable ForceGraph updates and local expansion.** Reconcile objects, apply the verified layout-transition policy, preserve selection, and add bundle details plus collapse/reset behavior.
5. **Bring Cytoscape to parity.** Use the shared projection, add bin appearance and sizing, preserve viewport, and verify event dispatch and canonical selection.
6. **Evaluate Tree integration.** Add explicit placement for both families and verify cycles, opposing directions, and layout stability.
7. **Add automatic semantic zoom.** Measure camera scale, calibrate hysteresis thresholds, debounce settled changes, and verify manual overrides and expansion behavior.
8. **Review Globe separately.** Keep Entity-only until an explicit geographic presentation is approved.

## Verification and acceptance

### Projection correctness

- Canonical graph inputs remain unchanged and contain no synthetic records.
- Entity level reproduces the scoped and filtered canonical graph.
- All six relationship types and both directions map to the intended groups.
- Duplicate edges to an entity do not inflate entity counts; Family counts deduplicate across types.
- Multi-role entities, opposing directions, selected relationships, shared neighbors, cycles, isolated nodes, and two-node components retain the intended meaning.
- Every visible relationship is directly represented or belongs to exactly one aggregate; no dangling endpoints exist.
- IDs and membership ordering remain deterministic under reordered input and locale changes.
- Expansion restores each entity once and reconciles all affected bins.
- Node/edge filters and search exclusions are respected in counts and expansion.

### Display continuity

- With rotation disabled, semantic transitions leave camera pose, target, and scale unchanged.
- With rotation enabled, rotation proceeds continuously through a semantic transition without a snap, restart, pause caused by reconstruction, or restoration to an earlier pose.
- Surviving hubs do not jump because of warm-up, recentering, or stale layout results.
- Selection and details survive level changes; synthetic interactions never enter canonical editing or URLs.
- Resizing, opening details, rapid expansion/collapse, temporary empty results, and arrangement transitions do not reset navigation unexpectedly.
- Incoming and outgoing bins remain visually distinguishable, including membership relationships.

### Performance and automatic behavior

- Projection work scales with the canonical nodes and edges in scope, using indexes and sets rather than scanning all edges separately for every node.
- Wheel events and rotation frames do not directly rebuild projection or graph data.
- A settled threshold crossing produces one effective-level update; oscillation inside the hysteresis band produces none.
- Label-only changes and unchanged effective levels avoid structural reconstruction.
- Measure node/link reduction, projection cost, layout movement, and frame responsiveness on representative live graph snapshots. Treat the launch seed only as a fixture, not as production-size evidence.

Keep tests focused on these invariants and user-visible behavior. Use the existing client test runner and normal TypeScript/build checks; no new test framework or general-purpose scaffolding is required.
