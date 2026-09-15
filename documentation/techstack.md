# Ryu / CHM Explorer: tech stack and implementation

This is a summary of the current source checkout and its deployment configuration. It describes the active implementation, distinguishes compatibility code and proposed features, and does not assert which revision is currently serving production.

## Overview

Ryu maintains a graph of countries, organizations, systems, and their relationships. The CHM Explorer browser application presents that graph through a searchable directory, an interactive graph, and record details. Authorized users and agents maintain records through the Record API.

The repository is a TypeScript npm-workspace project with two packages, `client` and `server`, and a shared domain and presentation layer. Production graph data lives in the Cloud SQL PostgreSQL database `explorer` on the CHM instance `chm`.

## Technology stack

Versions below are declared dependency ranges from the package manifests, not a statement of the versions deployed in production. `package-lock.json` records the resolved dependency tree.

| Area | Technology | Current use |
| --- | --- | --- |
| Runtime | Node.js 24 | Docker runtime and GitHub Actions environment |
| Language | TypeScript `^5.9.3`, `tsx` `^4.20.6` | Strict type checking; server and tests execute TypeScript through `tsx` |
| Frontend | React / React DOM `^19.1.1` | Browser application and interactive panes |
| Build tooling | Vite `^7.1.5` | Development server, asset bundling, and frontend production build |
| UI | Ant Design `^6.4.3`, Ant Design icons `^6.2.3`, application CSS | Controls, forms, layout, search, details, and graph overlays |
| Application state | Zustand `^5.0.8` | Indexed graph, selection, search, filters, locale, and view intent |
| Active graph renderer | `react-force-graph-3d` `^1.29.1`, Three.js `^0.185.1` | WebGL graph, force simulation, camera controls, and rotation |
| Layout | ELK.js `^0.9.3` | Flat Tree arrangement in the active renderer |
| Compatibility renderer | Cytoscape `^3.33.1` with Dagre, ELK, and fCoSE extensions | Alternate graph projection and rendering path retained in source |
| Globe assets | `world-atlas` `^2.0.2`, `topojson-client` `^3.1.0` | World geography used by globe presentation code |
| HTTP server | Express `^4.21.2`, `cors` `^2.8.5` | Record API, graph bootstrap, static frontend serving, and development CORS |
| Database client | `pg` `^8.23.0` | Direct SQL through PostgreSQL connection pools |
| Authentication | `google-auth-library` `^11.0.2`, Google IAP, scoped bearer tokens | Human admin authentication and agent API access |
| Tests | Node.js test runner, `node:assert`, PGlite `^0.5.8` | Contracts, API behavior, search, migrations, and repository tests |
| Hosting and releases | Docker, Cloud Build, Artifact Registry, Cloud Run, GitHub Actions | Application builds, immutable images, staged releases, and smoke checks |

The TypeScript base configuration targets ES2022, uses ES modules, and enables strict checking. Both workspace builds include `shared/`. The server build type-checks without emitting JavaScript; its runtime starts the TypeScript entry point with `node --import tsx`.

## Repository structure

| Location | Responsibility |
| --- | --- |
| `client/src/app/App.tsx` | Application composition, panes, graph arrangement controls, search requests, and node URL selection |
| `client/src/app/components/` | Graph canvases, directory, details, language selector, legend, and retained editor component |
| `client/src/app/graph/` | Canonical scope, projection, geometry, layout, and renderer support |
| `client/src/app/state/` | Zustand store and view-intent normalization |
| `client/src/app/api.ts` and `config.ts` | Browser HTTP calls, app mode, and base-path configuration |
| `shared/` | Domain types, Record API types, indexing, localization, display joins, search presentation, and catalogs |
| `server/src/server.ts` | Express routes, authentication, authorization, response scope, and write logging |
| `server/src/postgresGraphRepository.ts` | SQL reads, transactional writes, aggregate loading, and concurrency checks |
| `server/src/recordContracts.ts` and `recordContracts/` | Request parsing, DTO shaping, closed record validation, and kind-specific rules |
| `server/src/recordSearch.ts` | Field-aware matching, filtering, scoring, and search explanations |
| `server/schema/` | PostgreSQL schema, numbered migrations, and deliberate migration runners |
| `scripts/` | Release orchestration, token setup, release data operations, and supporting tests |
| `documentation/` | Domain rules, deployment guides, research instructions, connector plans/contracts, this summary, and the semantic-zoom plan |
| `research/` | Research evidence and incremental import batches |

Read `shared/README.md` before changing shared contracts, vocabulary labels, localization, or search presentation.

## Application data flow

1. `App.tsx` requests the graph bootstrap through `api.ts`.
2. Express loads nodes, localizations, edges, routes, and saved views through `PostgresGraphRepository`.
3. The server applies the appropriate public or authorized response scope.
4. The browser stores an indexed graph in Zustand. `shared/indexGraph.ts` builds node/edge lookup maps and incoming/outgoing adjacency indexes.
5. Graph projection applies the selected view scope, search result IDs, and node/edge visibility filters.
6. The active renderer converts projected nodes and edges into mutable ForceGraph objects and renders them.
7. Canonical entity or relationship selection drives details. Entity selection also synchronizes the `node` query parameter through browser history.

Bootstrap is a complete graph payload rather than a stream of incremental graph updates. The application uses ordinary HTTP requests; the inspected implementation does not provide a live graph subscription.

## Frontend implementation

### Workspace and selection

The current application has search, graph, and details panes. Search and details can be resized, and the layout has mobile behavior. The details pane opens for valid canonical entity or relationship selection.

`graphStore.ts` holds the canonical indexed graph and shared interaction state. Graph arrangement choice and pane layout currently live in React state in `App.tsx`.

Canonical selections use `selectedEntityId` and `selectedRelationshipId`. Selecting one clears the other. These IDs are used to look up records and relationships; future synthetic display elements must use a separate identity path.

`EntityDetailsPanel.tsx` is active and includes authorized localization-review controls. `EditorPanel.tsx` remains in the repository but is not mounted by the current `App.tsx`; its presence should not be interpreted as an active general-purpose editor flow.

### Search

Search covers all three node kinds, despite the historical filename `SystemDirectoryView.tsx`. The active export is `SearchDirectoryView`.

- `App.tsx` debounces search requests and cancels obsolete requests.
- Normal search goes through `GET /api/records`.
- The server uses weighted field matching, Unicode normalization, tokenization, limited typo tolerance, translated labels, and structured filters.
- Results include scores and match explanations. `matchingIds` covers the complete result set independently of the API page size.
- The browser fetches the ordered result pages and the directory paginates them locally.
- The graph uses the matching ID set; current search shows matching entities and edges whose endpoints are both included, without automatically adding context neighbors.

Currently, `PostgresGraphRepository.listRecords()` loads and indexes a bootstrap, then searches it in application memory. This is not a PostgreSQL full-text index or external search service. Full-graph loading, repeated search pages, and browser graph size are relevant scaling considerations.

### Localization

Supported locales are Arabic, Chinese, English, French, Russian, and Spanish. Shared UI messages and vocabulary catalogs require all six translations. Record text resolves the requested locale, then English, then another available localization, with the record ID as the last fallback.

`shared/recordDisplay.ts` combines neutral facts with localized content. `shared/i18n.ts` owns text lookup and locale-aware formatting. Record prose lives with the record; reusable UI and vocabulary wording lives in code catalogs.

## Graph implementation

### Active renderer

`App.tsx` lazy-loads `ForceGraphCanvas`. All three visible arrangement controls currently use that component:

| UI arrangement | Internal value | Implementation |
| --- | --- | --- |
| Graph | `current` | Three-dimensional force simulation with orbit controls and automatic rotation |
| Tree | `flat` | ELK tree targets mapped to a plane, fixed node positions, and a camera constrained to that plane |
| Globe | `globe` | Spherical target positions, custom globe objects, curved links, and automatic rotation |

ForceGraph uses the D3 force engine through its dependencies. The component configures link distances, charge, centering, simulation decay, warm-up, and cooldown. Labels are HTML buttons positioned above the WebGL scene, with collision handling and priority for focus, selection, hover, and connected nodes.

The Tree layout currently uses `governs`, `operates`, `funds`, and `member` relationships to compute its layout structure. Other projected edges can still be drawn. Globe placement is schematic: country anchors and fallback distribution are used, so it is not a geographic location model for every organization or system.

### Build and display boundaries

| Module | Current responsibility |
| --- | --- |
| `scope.ts` | Canonical ID selection: global governance scope or three-hop focused neighborhoods |
| `projection.ts` | Search/filter application, canonical display, and synthetic relationship bins/aggregate edges with retained canonical IDs |
| `geometry.ts` | Labels, dimensions, and stable kind-based layout bands |
| `nodeMap3dLayout.ts` | Active renderer's Tree/Globe targets and deterministic local position seeds |
| `layout.ts` | Conversion to Cytoscape elements and Cytoscape layout options |
| `useCytoscapeController.ts` | Cytoscape lifecycle, events, layout execution, and viewport behavior |
| `cytoscapeStyles.ts` | Cytoscape appearance and the edge-color palette also used by ForceGraph |

The store supports governance, country, and technical view modes. The current application initializes the governance/global view; Graph/Tree/Globe controls change arrangement, not canonical scope.

`GraphCanvas.tsx` and the separate `GlobeCanvas.tsx` remain as alternate implementations but are not mounted by the current app. Changes to shared projection types still need to keep these consumers compatible.

### Manual relationship detail and remaining limitations

- Graph now offers session-only Family / Type / Entity controls, defaulting to Entity. Display families are `org` and `data`; all bins separate incoming and outgoing relationships.
- Shared/bridge and protected entities remain canonical on screen. Bin counts represent unique hidden entities, not edge totals; overlapping memberships are allowed. Expansion and bundle details have separate state from canonical selection and URLs.
- ForceGraph reconciles render objects by ID and caches canonical positions. Surviving canonical nodes are anchored on structural updates, and new nodes receive local seeds. Camera/rotation setup is independent of node count and pane size; only initial data uses 48 warm-up ticks.
- Cytoscape consumes the synthetic variants, reconciles stable elements, and fits initially. Same-layout updates use retained coordinates and layout-owned bin position hints.
- Automatic semantic zoom is not enabled. Tree and Globe remain Entity-only and preserve the selected Graph level for later return.
- Browser-level camera, rotation, and layout continuity still need acceptance testing. Local preview startup was blocked by the execution environment, so source/build checks are not proof of visual behavior.

The companion `documentation/edgezoom.md` records the manual implementation, restore point, checks, and deferred automatic hysteresis/arrangement work. These statements describe this checkout, not a deployed production revision. No canonical record or database change is involved.

## Canonical records and PostgreSQL

The current node kinds are `country`, `organization`, and `system`. Their shared TypeScript representation is a discriminated union with kind-specific facts and localized content.

Relationships use six directed kinds: `governs`, `operates`, `funds`, `member`, `contributes`, and `transfers`. `shared/domain.ts` defines allowed endpoint kinds. Hierarchy and relationships are expressed through edges rather than hidden node subtype or parent fields.

| Storage | Purpose |
| --- | --- |
| `nodes` | Canonical identity, kind, neutral properties, record depth, owner-local sources, and timestamps |
| `node_localizations` | Titles and prose, localized details, and locale-specific review information |
| `edges` | Canonical endpoints, relationship kind, description, owner-local sources, and timestamps |
| `ryu_routes` | Machine-access route metadata and references to external API/connector contracts |
| `saved_views` | Stored view metadata; not a general public mutation API |
| `supported_locales` | Database locale vocabulary |

Structured facts and localized detail structures use JSONB alongside relational identity and endpoint columns. PostgreSQL constraints and schema migrations complement application-level validation. Sources belong to their owning node or edge rather than a global source registry.

`PostgresGraphRepository` uses parameterized SQL and explicit transactions through `pg`; there is no ORM in the current dependency stack. Record writes use locking and precondition checks, with rollback on failure. Content changes invalidate affected localization reviews where required.

The connection layer accepts `DATABASE_URL` or standard `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD` settings, plus `PGPOOL_MAX`. Cloud Run connects to the designated Cloud SQL instance using its configured connection and credentials.

`client/public/bootstrap.public.json` is a seed/export and preview artifact. Production canonical reads use PostgreSQL. Research folders are incremental batches, not a second central graph database.

The repository factory is PostgreSQL-only. However, the inspected `start()` creates the app and begins listening without awaiting a database readiness check, and health handlers return a simple success response. The documented fail-fast startup policy should therefore be distinguished from the current health/readiness implementation; a healthy HTTP process does not prove that its database schema is ready.

## HTTP API and access control

`server/src/server.ts` mounts the API under the configured `APP_BASE_PATH`. Browser requests use their public or admin application base path; the agent-facing service exposes the canonical Record API at `/api/records` through CHM routing.

| Endpoint relative to app base | Purpose |
| --- | --- |
| `GET /api/graph/bootstrap` | Load the complete graph payload for the browser |
| `GET /api/records` | Search, filter, and paginate record summaries |
| `GET /api/records/:id` | Retrieve a record aggregate with requested includes |
| `PUT /api/records/:id` | Create or replace authored record content |
| `PATCH /api/records/:id` | Apply a structured partial content update |
| `PATCH /api/records/:id/review` | Update the review state of one localization |
| `DELETE /api/records/:id` | Preview deletion impact or apply a preconditioned deletion |

The server also provides health endpoints and serves built frontend assets when present.

Runtime authorization modes are separate from the frontend's public/author build mode:

- `RYU_MODE=local`: development access with local admin scope.
- `RYU_MODE=public`: read-only public access.
- `RYU_MODE=api`: authorized read/write access, using validated IAP identity when configured or scoped bearer tokens otherwise.

Human authoring uses the IAP-protected admin app at `/explorer/admin`. Agent tokens use the `reader`, `writer`, `reviewer`, and `admin` scope hierarchy. The server stores token hashes in configuration, supports expiry, rate-limits token requests, and logs write audit context. The `chm_admin_hint` browser cookie only helps redirect users to admin; it is not authorization.

Applied updates to existing records require `x-ryu-record-updated-at`; create-only writes use `x-ryu-create-only: true`. Content requests support `validateOnly=true`. Deletion requires a dry-run impact hash and the current record precondition. Setting `human_reviewed` requires reviewer or admin scope.

The public bootstrap redacts reviewer identity and notes and omits operational routes. Record DTOs also enforce public versus authorized response scope. General node, edge, source, schema, or bulk mutation endpoints are not the launch API.

## Hosting and release implementation

The configured GCP project is `chm-network`, in `us-east4`. Public entry is `https://chm.oceanagentics.org/explorer`. CHM owns domain, load balancing, IAP, and path routing; this repository owns Explorer application behavior and graph contracts.

| Cloud Run service | Role |
| --- | --- |
| `explorer` | Public browser application and public reads |
| `explorer-admin` | IAP-protected browser application and authorized authoring/review |
| `explorer-api` | Agent-facing Record API with bearer-token authorization |

The Dockerfile uses `node:24-alpine` and shared dependency/server layers. Its `api` target skips the frontend build; its `web` target builds Vite assets. Both start the Express server, and containers run as the `node` user. Public and admin frontend builds use distinct base paths and build-time modes.

Cloud Build publishes to Artifact Registry repository `chm-apps`. `cloudbuild.yaml` handles an individual target; `cloudbuild.release.yaml` builds the public/admin pair with reusable dependency layers.

`scripts/deploy.sh` delegates to `scripts/deploy.mjs`:

- `plan` determines affected services and checks data compatibility without publishing.
- `prepare` builds and stages revisions without production traffic.
- `publish`, the default, performs compatibility checks, promotes prepared revisions, and smoke-tests.
- `smoke` verifies the deployed surfaces.

Release state is kept under `.release/<commit>/`. Runtime scope is determined against serving revision provenance. Schema migrations and research data writes are deliberate, separate operations; routine image updates preserve service configuration and do not run Terraform.

The checked-in GitHub Actions workflow triggers on pushes to `main` and manual dispatch. It sets up Node 24, runs `npm ci` and deployment-script tests, authenticates to GCP through Workload Identity Federation, runs the shared deployment entry point, and uploads release state. Production jobs are serialized. A local commit alone does not trigger this workflow; pushing to `main` does.

## Local development and verification

With Node 24 and PostgreSQL configuration available:

```sh
npm ci
npm run dev
```

Vite listens on `127.0.0.1:5173` and proxies `/api` to the Express development server on port `8787`. The server uses watch mode with `tsx`. Development does not automatically create or seed a database.

Useful checks:

```sh
npm run build
npm test
node --import tsx --test scripts/deploy.test.mjs
```

The build checks server/shared types and produces the Vite frontend bundle. The test suites cover record contracts, search/localization, API access, transactional behavior, SQL migrations, and client search selection. PGlite is a test dependency, not the production database. Browser-level camera and animation acceptance still requires renderer-specific verification; passing contract tests does not prove visual continuity.

A separate static-preview path exists through `VITE_STATIC_PREVIEW` and bootstrap-path configuration. It uses a supplied export and runs the search implementation in the browser. This is an explicit preview mode, not the production runtime data source.

## Planned portal and graph work

The Ryu/Deeptime plan describes system discovery and routing tools such as `list_systems`, `search_systems`, and `get_system`, with data retrieval delegated to system-specific connectors. Route storage, portal-oriented repository methods, and connector contract documents exist, but the current Express route table exposes the Record API; it does not establish that those proposed MCP tools are deployed.

For current authoritative contracts and working plans, consult:

- `AGENTS.md`: repository rules, canonical data, graph-layer ownership, and operating boundaries.
- `shared/README.md`: shared types, presentation logic, localization, and catalog ownership.
- `documentation/RICH_RESEARCH_RECORDS.md`: authored record structure and research requirements.
- `documentation/deployment-recommendations.md`: shared release workflow and migration procedures.
- `documentation/mvp.md` and `documentation/osusources.md`: active portal/source plans; examples are not substitutes for executable contracts.
- `documentation/edgezoom.md`: manual relationship bins, verification status, camera continuity, and remaining implementation sequence.
