# Search And Filter System Plan

## Goal

Build one extensible search and filter system that drives both the Systems pane and graph visibility. The system should support the current directory workflow, richer future node detail pages, and later natural-language query assistance without coupling search behavior to a single UI component.

## Current Server API Status

`GET /api/records` owns matching, aliases, locale fallback, filters, relevance ranking,
word/prefix/substring/one-edit typo matching, and match explanations. The matcher
lives in `server/src/recordSearch.ts` and reads the current Postgres graph. It
currently evaluates the graph in server memory for each request; SQL search
indexing can replace that execution strategy while preserving the API behavior.

The browser sends its query, locale, language mode, and filters once through
`App` and stores the response in `useGraphStore`. The directory and both graph
views consume that shared result. Browser code only formats records and filter
options; it does not match, rank, or apply search filters.

The endpoint accepts `q`, `kind`, `countryCode`, `disciplines`,
`geography`, `dataType`, `dataFormat`, `dataStandard`, `recordDepth`, `reviewState`,
`locale`, `localeMode`, `localeAvailability`, `reviewLocale`, `routeStatus`,
`routeCapability`, `accessType`, `accessMethod`, `include`, `limit`, and `cursor`.
Filters intersect across groups; selections within a group are alternatives.
`disciplines=ecology,taxonomy` matches either approved tag. Use canonical IDs from
`shared/domain.ts`; unknown IDs and the retired `role`/`disciplineFamily` query
parameters are rejected. Text search also matches localized discipline labels.
The retired `geographicScope` property is excluded from text and geography searches.
`dataType` accepts approved IDs from `dataTypes` in `shared/domain.ts`, for example
`dataType=occurrence_records,sequence_data`. Unknown IDs are rejected. Type names
in results and search come from the shared translations, with record-specific
detail in descriptor descriptions.
`dataFormat` likewise accepts only approved `dataFormats` IDs, for example
`dataFormat=csv,parquet`. Shared translations supply format labels in search,
filters, and details; localized descriptor labels cannot override them.

Responses include `total` and an opaque cursor ordered by score, displayed title,
and ID. `include=matchingIds` returns the entire matching ID set independently of
pagination; `include=matchReasons` returns field, label, value, token, and score.
The directory loads the ordered API pages once and retains its local table
pagination. The graph uses the complete API ID set. Query changes cancel obsolete
requests and cannot publish an older response over a newer result.

Aliases work for countries, organizations, and systems. Default matching searches
the displayed record localization, including English fallback. Source titles use the selected locale from the owner's title map; missing source translations are never presented as English translations. Other stored
languages are searched through the explicit all-language mode.

## Design Principles

- Keep search intent shared across panes.
- Keep graph filtering in the graph scope/projection pipeline.
- Prefer structured field extractors over one large text blob.
- Return ranked results with match reasons.
- Treat source text as supporting context, not equal to node identity.
- Let future node detail modules contribute searchable field definitions without rewriting the search UI.
- Let an embedded agent produce structured search intent, but keep deterministic app code responsible for executing it.
- Keep canonical graph data as the only source of truth. Search should not introduce stored per-node search documents.

## Core Model

The search system should have three layers:

1. Search field definitions
   - Definitions live by node kind or feature area.
   - Each definition reads directly from canonical indexed graph data.
   - Definitions cover typed fields such as name, aliases, kind, country, operator, data descriptors, access paths, relationships, sources, and future rich-page sections.
   - Each definition declares whether the field is searchable, filterable, visible as a match reason, and how strongly it should affect ranking.
   - Field weights are app behavior and should live in these definitions, not be copied onto each node.

2. Search intent
   - Shared app state that represents the current query and filters.
   - Used by both Systems and graph panes.
   - Example shape:

```ts
{
  text: "edna",
  facets: {
    countryCode: ["JPN"],
    kind: ["system"],
    relationshipType: ["contributes"]
  },
  mode: "strict"
}
```

3. Query resolver
   - Applies field definitions to the indexed graph at query time, or through an in-memory memoized runtime projection.
   - Converts search intent into ranked entity ids.
   - Returns match reasons for UI display and future agent explanations.
   - Keeps ranking deterministic and testable.
   - Does not create or maintain a second persisted search data model.

## MVP

The API executes search against Postgres data; the browser keeps the bootstrap graph for rendering topology and record details.

### MVP Scope

- Add shared search state to the graph store:
  - query text
  - existing system filters
  - clear/reset actions
- Keep matching and ranking in the server search module; share only graph, localization, and presentation utilities with the browser.
- Define per-kind search field extractors for systems, organizations, and countries.
- Replace loose subsequence fuzzy matching with field-aware matching:
  - high weight: name, aliases, country code, kind
  - medium weight: descriptions, disciplines, data descriptor labels, access labels
  - low weight: source titles, relationship descriptions, connected node names
- Return ranked system records and matching entity ids from the same resolver.
- Have the Systems pane render the shared filtered/ranked system result set.
- Have graph projection receive matching entity ids and filter visible nodes.
- Preserve required ancestors/containers so filtered graph views remain readable.
- Show only edges where both endpoints are visible.
- Add basic match reasons for system cards/table rows.

### MVP Acceptance Criteria

- Typing once filters both Systems and graph panes.
- Searching `USA` shows USA-related nodes and matching USA systems.
- Searching for a term that is only weakly present in provenance does not flood the top results.
- Clearing the search restores the current graph view.
- Existing view modes still work.
- Existing selection behavior still works when the selected node remains visible.
- Search consolidation requires API and client deployment together; it needs no database schema change.

## Phase 1: Shared Search State

- Move query and filters out of `SystemDirectoryView` local state.
- Store them in `useGraphStore`.
- Keep UI controls in the Systems pane for now.
- Add selectors/helpers so other panes can read the resolved search intent.
- Consider URL persistence for search/filter fields once the behavior is stable.

## Phase 2: Field-Aware Search Extractors

- Create a search module with per-kind field definitions.
- Each definition has a getter that reads from the indexed graph:

```ts
{
  field: "data.descriptors.label",
  label: "Data type",
  weight: 70,
  filterable: true,
  getValues: (entity, graph) =>
    graph.systemNodeById[entity.id]?.data.descriptors.map((descriptor) => descriptor.label) ?? []
}
```

- Avoid a single concatenated `searchText`.
- Avoid persisted per-node search documents.
- Keep field definitions close to the domain data they describe.
- Let the resolver derive match candidates from canonical graph data at query time.
- Memoize derived runtime fields only as an implementation optimization, invalidated when canonical graph data changes.
- Start with systems, countries, and organizations using current bootstrap fields.

## Phase 3: Graph Filtering

- Pass resolved matching ids into `projectGraph`.
- Apply the filter at the scope/projection boundary.
- Preserve ancestor chains and visual containers where needed.
- Keep graph display components unaware of search semantics.
- Consider a user-facing mode toggle later:
  - `Matches only`
  - `Matches + one-hop context`

## Phase 4: Better UI Feedback

- Show why a result matched.
- Surface active filters as removable chips.
- Add count labels for visible graph nodes and matching systems.
- Make empty states specific:
  - no text match
  - no match after filters
  - match exists outside current view mode
- Add optional field filters for kind, country, data type, and relationship type.

## Phase 5: Rich Node Page Extensions

- Let rich node detail sections register search field definitions through the shared search module.
- Add new field families as data grows:
  - data holdings
  - publication/access pathways
  - APIs and access methods
  - governance roles
  - standards
  - source-backed claims
  - geographic/taxonomic/sample scope
- Keep field weights explicit so richer pages do not drown out identity fields.
- Use narrow per-node boosts only for exceptional cases, such as a canonical/preferred node, not for ordinary field weighting.

## Phase 6: Embedded Agent Query Assistant

- Give the agent a schema of supported facets and relationship concepts.
- Let the agent translate natural language into structured search intent.
- Do not let the agent directly mutate graph internals.
- Execute the agent-produced intent through the same deterministic resolver.
- Return result ids and match reasons so the agent can explain outcomes.

Example:

User asks:

> where do japanese researchers publish edna data?

Agent-produced intent:

```ts
{
  text: "edna",
  facets: {
    countryCode: ["JPN"],
    relationshipType: ["contributes"]
  },
  targetKind: ["system"],
  includeRelatedKinds: ["organization"]
}
```

The app resolver then determines the visible systems, organizations, and graph edges.

## Deferred Until Needed

- Postgres full-text search indexes.
- Server-side search endpoint.
- Cross-session search analytics.
- Vector embeddings.
- Agent-only ranking.

These can be added later if the graph becomes large enough or if natural-language discovery requires semantic matching beyond structured fields.
