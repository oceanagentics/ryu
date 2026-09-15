# Ryu Agent Notes

## Canonical Graph Data
- Treat the Cloud SQL PostgreSQL `explorer` database on the CHM instance `chm` as the production canonical graph.
- Treat `client/public/bootstrap.public.json` as a launch seed/export artifact, not as a production runtime source of truth.
- The initial launch seed may include converted legacy data, but production must run on Cloud SQL/Postgres only.
- Treat `research/*` CSV folders as incremental research/import batches, not as a separate central source of truth.

## Documentation
- Treat the [Ryu Product Roadmap](https://docs.google.com/spreadsheets/d/1qrlogYeo5XIO7j7c8qEaAFP_WQmKi6dKLQI_3PjxhTM/edit?usp=sharing) as the canonical product roadmap. When work refers to the product roadmap, a roadmap phase, or a roadmap release, consult this Google Sheet rather than local roadmap examples or project plans.
- Read [shared/README.md](shared/README.md) before using or extending shared domain contracts, localization, vocabulary labels, UI messages, or search presentation.
- Follow the node-specific standing research and backfill guides:
  `documentation/SYSTEM_RECORDS.md`, `documentation/COUNTRY_RECORDS.md`, and
  `documentation/ORGANIZATION_RECORDS.md`.
- Use `documentation/finishedwork/cloud-run-migration.md` for the completed Cloud Run, CHM routing, and Cloud SQL launch record.
- Treat `documentation/shutteredwork/mvp.md` and
  `documentation/shutteredwork/osusources.md` as discontinued historical plans,
  not current roadmap or modeling policy.

## Research Import Workflow
- Each research job may live in its own dated folder under `research/`.
- Historical CSV batches may include `systems.csv`, `system_links.csv`, and `sources.csv`. New imports must assemble the record API payload with sources on their owning nodes/edges; CSV source IDs are input references, not a global registry.
- Port research imports to a Postgres-native path before using them against production data.
- Research jobs may reference parent systems or workflow targets that were already imported by earlier jobs.
- Do not create or maintain a separate merged central CSV registry.

## Write Surfaces
### Record API
- The canonical agent API is `/api/records`, exposed by the `explorer-api` service through the CHM load balancer.
- Agents must authenticate with `Authorization: Bearer $RYU_API_TOKEN`.
- To persist a team member or agent token locally, use
  `scripts/setup-ryu-api-token.sh --secret <gsm-secret-name> --project chm-network`.
  The script writes `~/.config/ryu/api.env`, sources it from `~/.zshenv`, and
  verifies `/api/records` without printing the token.
- Do not use CHM proxy routes or `x-chm-*` forwarded identity headers for Explorer authorization.
- Human browser authoring goes directly through the IAP-protected Explorer admin app at `/explorer/admin`, which calls its own `/api/records` routes.
- The details UI shows `recordDepth` plus the resolved localization's `review.state` for all users. Authenticated/author mode renders the review state dropdown and reviewer-note form for that localization.
- Record reads are `GET /api/records` and `GET /api/records/:id`.
- Record writes are `PUT /api/records/:id`, `PATCH /api/records/:id`, `PATCH /api/records/:id/review`, and `DELETE /api/records/:id`.
- Applied writes against existing records must include `x-ryu-record-updated-at` from a fresh read. Create-only writes must include `x-ryu-create-only: true`.
- Agents should run `validateOnly=true` before applying content writes and show validation errors before retrying.
- Writer tokens may create, update, and delete records but must not set `human_reviewed`; reviewer or admin tokens may set `human_reviewed`.
- Delete dry-runs and applies require writer access or higher; applies require a dry-run `impactHash` plus the current `recordUpdatedAt` precondition.
- Do not expose general node, edge, source, saved-view, schema, bulk, or direct database mutation routes as launch APIs.

## Current Minimal Model
### Node kinds
- `country`
- `organization`
- `system`

### Edge kinds
- `governs`
- `operates`
- `funds`
- `member`
- `contributes`
- `transfers`

## Validation Rules
### System record contract
- Use the content-only FishBase example in `server/src/fixtures/rich-record.json`
  and the field contract in `documentation/SYSTEM_RECORDS.md`.
- All system depths use the same closed structure. `stub` is the minimum ID and
  kind; `thin` may omit unfinished sections. Supplied fields must still have the
  approved shape.
  Never invent fields, nested metadata bags, identifiers, or hidden relationships.
- `rich` requires the complete six-language record, at least one useful gallery
  item showing a representative record or data content, and completed relationship
  research. It does not mean human-reviewed. Use specific research gaps instead
  of invented measurements, standards, gallery images, or machine routes; keep a
  system `thin` when no qualifying gallery capture is available.
- The API validates the resulting aggregate on PUT/PATCH, including stored
  content. Fix reported paths; do not bypass structural errors by lowering depth.
- Contract changes require a code/documentation release with an updated example
  and tests. Audit existing data before schema migration 014; it rejects
  incompatible records and never removes unknown content automatically.

### Nodes
- `country`, `organization`, and `system` are flat node types. Do not add a `subtype` field.
- Do not add hidden hierarchy fields. Use explicit edges for graph relationships.
- Node IDs are globally unique, kindless slugs. Do not encode kind with prefixes such as `system-`, `org-`, or `country-`; use the `kind` field for type.
- If a natural slug collides across node kinds, keep the most queried entity on the natural slug and add a meaning-bearing suffix such as `-operator` to the other entity.

### Edges
- `governs`: `country|organization -> organization|system`
- `operates`: `organization -> system`
- `funds`: `country|organization -> organization|system`
- `member`: `country -> organization`, `organization -> organization`, or `system -> system`
- `contributes`: `organization -> system`
- `transfers`: `system -> system`
- Use `shared/domain.ts` as the executable edge vocabulary and endpoint contract.
- `member` means documented participation, not component hierarchy. `part_of`,
  `manages`, `located_in`, and `advises` are not accepted edge types.
- `governs` requires formal authority; `operates` includes management and operation;
  `funds` requires evidence of financial support and its scope/period.
- Never infer governance from funding, membership, shared infrastructure, an address,
  or data coverage. Countries participating in a council do not each unilaterally
  govern its institution. Record the collective authority when evidence supports it.
- `countryCode` is an identity code for country nodes only. Do not set it on
  organizations or systems, or recreate an Operator country field.
- Before marking a record rich, review every incident edge and investigate every
  relationship type applicable to that node kind. Actively research missing
  connections using primary sources to establish endpoints, direction, scope,
  and time/status.
  Put the full relationship meaning, including material scope and timing, in the
  edge `description`; store its evidence directly in the edge `sources` collection.
  Persist verified material connections during authorized backfills and report
  unresolved candidates with reasons. Keep unfinished research thin; there is no
  minimum connection count. Follow the guide for the record's node kind in
  `documentation/SYSTEM_RECORDS.md`, `documentation/COUNTRY_RECORDS.md`, or
  `documentation/ORGANIZATION_RECORDS.md`.

## Provenance and Metadata
- Store sources in dedicated `nodes.sources` and `edges.sources` JSONB objects,
  keyed by owner-local source ID. Each source has `id`, `url`, `title`
  (supported-locale map), optional `description` (supported-locale map), and
  `accessedAt` (YYYY-MM-DD), with no other fields.
- Store user-facing system prose in `node_localizations`, with source IDs on the relevant localized detail items, resolving against the node's sources. Edge citations resolve against the edge's sources; route citations resolve against the route node's sources.
- Store language-neutral operational facts in `nodes.properties_json`.
- Do not add or preserve identifier lists in the record model.
- Edges have the closed authored shape `id`, `sourceNodeId`, `targetNodeId`, `kind`,
  `description`, and `sources`. Do not author edge `properties`, `sourceRefs`,
  `scope`, `status`, or other supplemental prose fields. Add a structured edge
  field only when a demonstrated filter, calculation, or automated behavior needs it.
- Keep node/edge edits minimal in the editor; rich research backfills should update the JSON record deliberately.
- Use only the approved `disciplines` IDs in `shared/domain.ts`. Never add a
  discipline without explicit human approval in the current authoring chat.
  Explain the uncovered subject and why existing tags do not fit, then wait for
  approval before updating the vocabulary. Follow the discipline rules in
  `documentation/SYSTEM_RECORDS.md`; do not recreate `role` or `disciplineFamily`.
- Do not author `geographicScope` tags. Structured geographic coverage is deferred;
  include relevant, source-backed geographic context in the profile prose.
- Use only approved `dataTypes` IDs from `shared/domain.ts` as the label of a
  `data.descriptors` item with category `type`. New data types require explicit
  human approval in the current authoring chat, followed by a vocabulary and
  translation update. Do not introduce free-text or localized type names.
- Use only approved `dataFormats` IDs from `shared/domain.ts` as the label of a
  `data.descriptors` item with category `format`, once per format per record.
  New formats require explicit human approval in the current authoring chat and
  a vocabulary/translation update. Keep interfaces, schemas, backend details,
  and planned conversions out of Formats; retain sourced detail in descriptions.

- Use only approved `dataStandards` IDs from `shared/domain.ts` for `standard`
  descriptors, once per system. Every assignment requires an owner-local source
  and a scoped description in all six locales whenever supplied. A record with
  a standard descriptor is at least `thin` under the authoring classification.
  Shared vocabulary labels replace localized labels. New standard IDs require
  explicit human approval and a vocabulary/translation release before use.
  Follow `documentation/SYSTEM_RECORDS.md`; do not infer standards from
  formats, connected systems, operators, or planned routes. Keep versions in
  descriptions and document gaps when no assignment is verified.

- Store system measurements only in `properties.metrics`, using the ten approved
  `metricDefinitions` keys from `shared/domain.ts`. Units and Data/Usage groups
  come from that definition; never author labels, units, or arbitrary metric keys.
  New metrics, units, or changes of meaning require explicit human approval in
  the current authoring chat and a vocabulary/translation release before use.
  Put descriptions in each localization's `details.metrics`, with matching IDs.
  Follow `documentation/SYSTEM_RECORDS.md` for sources, reporting periods,
  research gaps, and preserving unsupported measurements as sourced prose.

- Read and Write access use approved `readAccessMethods` / `writeAccessMethods`,
  `accessRequirements` and
  `accessCosts` from `shared/domain.ts`, with owner-local `sourceRefs` and matching
  labels/descriptions in all six locales at every depth. Additions require human
  approval and a vocabulary/translation release. Keep human and machine access;
  follow the Access Paths guidance in `documentation/SYSTEM_RECORDS.md`.

## Ryu Access Routes
- Treat `ryu_routes` as the first-class operational route index for agents.
- Keep `nodes.properties_json.access` as access mechanics and `node_localizations.details_json.access` as localized human guidance; use `ryu_routes` to decide how an agent should actually retrieve data.
- Use `ryu_routes` only for machine access routes; human lookup, web UI, manual request, researcher-library, and raw-source context stays in the localized access/details surface, not `ryu_routes`.
- For system research and record backfills, follow
  `documentation/SYSTEM_RECORDS.md` for the full `ryu` shape and research rules.
- Keep `ryu_routes` compact: route id, status, mode, priority, capabilities, target, upstream, format, contract_ref, and caveat.
- Do not store MCP/API tool contracts inline; `contract_ref` points to the relevant MCP, API, or service contract.
- Treat `status='planned'` as non-live; do not use that route for runtime access unless the requested work is planning or implementation.
- Prefer the lowest-priority route that matches the needed capability. No `ryu_routes` rows means no approved operational route is recorded yet.

## Ryu MCP Portal
- Ryu should act as a system discovery and routing portal, not one universal marine-data API.
- The portal surface should expose stable discovery tools such as `list_systems`, `search_systems`, and `get_system`.
- Portal responses should return enough system, source, capability, route, connector, auth, delivery-format, and caveat metadata for clients such as Deeptime to decide which systems to query and how.
- System-specific APIs or MCP connectors own source-specific tools for sending, receiving, retrieving, and transforming data.
- Keep connector references in route metadata or route properties; keep detailed connector/API contracts in referenced docs or connector packages.

## Rich Record Screenshots
- For rich record gallery screenshots, use the Codex in-app Browser as the preferred capture path before standalone headless browser tools.
- If the in-app Browser or all available capture paths are blocked by login, CAPTCHA, Cloudflare verification, browser-security pages, or other non-content screens, do not add gallery images for that record just to fill the slot.
- When capture is blocked, keep the system `thin` and report the blocker and target URL back to the human so they can provide access, clear the session, or supply screenshots.

## Startup Behavior
- On startup, the server connects to the configured Postgres database.
- If required Postgres connection settings or schema objects are missing, the server should fail fast instead of creating or reseeding an alternate graph.

## GCP Environment
- Organization: `oceanagentics.com`
- Project: `chm-network` (`288836337031`)
- Region: `us-east4`
- Public entry: `https://chm.oceanagentics.org/explorer`
- CHM owns the domain, load balancer, IAP, and path routing.
- Explorer owns the app image, runtime behavior, Postgres schema, and graph data model.
- Browser-facing `explorer` uses read credentials; private `explorer-api` uses write credentials; schema/setup work uses the dedicated schema-capable credentials only when an explicit database change is being applied.

## Cloud Run Publishing
- Use `scripts/deploy.sh` as the shared local/Actions release entry point. `plan` checks scope and data compatibility; `prepare` stages images without traffic; default `publish` promotes compatible revisions and smoke-tests. Follow `documentation/deployment-recommendations.md` for migration releases and retries.
- Build one Explorer image with `cloudbuild.yaml`, or build the public/admin image pair with `cloudbuild.release.yaml`, into Artifact Registry repository `chm-apps`; use cache image substitutions so unchanged dependency layers are reused when `package-lock.json` has not changed.
- Use commit-only updates for review, handoff, and release traceability; commits do not publish by themselves unless an external trigger is explicitly configured.
- Use routine fast deploys for UI, API, runtime, and other app-only changes: commit, build the affected immutable image, deploy that image to the existing Cloud Run service with `gcloud run deploy --image`, and smoke test.
- Do not run Terraform for image-only app deploys. Use broader Terraform changes only for shared CHM infrastructure, routing, IAP, service accounts, secrets, Cloud SQL, runtime environment, or schema-change wiring.
- Public UI image maps to `explorer`, admin UI image maps to `explorer-admin`, and API image maps to `explorer-api`.
- Do not keep standing Cloud Run jobs for initial database setup or read checks.
- Handle future schema changes deliberately when they are needed; keep the current SQL as the reference for the production Postgres shape.

## Graph View Layers
- Keep graph view code split into two top-level phases: graph build and graph display.
- Graph build decides what Cytoscape elements exist:
  - `state/viewIntent.ts` and `state/graphStore.ts`: view intent and normalized user state
  - `graph/scope.ts`: scope selection
  - `graph/projection.ts`: structural projection
  - `graph/geometry.ts`: intrinsic node geometry and stable layout hints
- Graph display decides how those elements are positioned and shown:
  - `graph/layout.ts`: base Cytoscape layout planning and named post-layout transform definitions
  - `graph/useCytoscapeController.ts`: Cytoscape execution, enabled transform execution, events, and viewport policy
  - `components/GraphCanvas.tsx`: composition root only
  - `graph/cytoscapeStyles.ts`: presentation only

## Graph View Code Rules
- Put new logic in the highest layer that actually owns that concern.
- Express graph layout intent as graph structure or layout constraints before the layout solve whenever possible. Avoid moving nodes after the solve; post-solve position overrides make the app responsible for collisions, spacing, crossings, and edge routing side effects.
- `scope.ts` should decide which ids belong in a view. It should return ids only, not parent containers, sizes, or layout options.
- `projection.ts` should assemble the drawable graph structure: visible nodes, visible edges, view-specific grouping, and classification such as governance block membership.
- `geometry.ts` should define intrinsic node facts only: label text, box width and height, text width, and stable hints like `layoutBand`.
- `layout.ts` should translate projected graph data into Cytoscape elements, base layout behavior, and named post-layout transforms. Put Dagre, ELK, concentric, breadthfirst, multi-phase layout plans, and transform definitions here.
- `useCytoscapeController.ts` should execute the supplied display plan, run only enabled post-layout transforms after `layoutstop`, wire interactions, and manage fit vs preserve viewport behavior. Do not invent graph semantics here.
- `GraphCanvas.tsx` should orchestrate the pipeline and pass view intent plus display plans through to the controller. Do not delete fields from display plans, cache coordinates, or add view-specific layout hacks here.
- `cytoscapeStyles.ts` should stay visual only. Keep colors, borders, labels, arrows, and selection styling here. Do not put semantic geometry or layout behavior here.
- Post-layout transforms are position-only developer controls. They must not add or remove elements, change labels, change parents, or alter edge inclusion.

## Graph View Change Guide
- If the change is about which nodes or edges appear in a view, start in `graph/scope.ts`.
- If the change is about explicit graph grouping or edge projection, start in `graph/projection.ts`.
- If the change is about box size, label wrapping, or band assignment, start in `graph/geometry.ts`.
- If the change is about how a specific layout algorithm behaves, start in `graph/layout.ts`.
- If the change is about a named post-layout position transform, start in `graph/layout.ts` and expose it through the existing transform toggle model.
- If the change is about camera behavior, fit, preserve zoom, or interaction wiring, start in `graph/useCytoscapeController.ts`.
- Prefer changing one layer cleanly over adding a workaround in a lower layer.
