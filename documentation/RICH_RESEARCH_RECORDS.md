# Rich Research Records For Ryu

Use this guide when researching and backfilling rich database records for Ryu. The goal is a record that helps a researcher quickly understand what a database is for, what data it contains, how large it is, how to access or contribute to it, who manages it, and which machine routes Ryu can use.

## Source Of Truth

- Treat Cloud SQL/Postgres as the canonical editable graph.
- Do not create a parallel registry, merged CSV, or alternate bootstrap as a new source of truth.
- Use the Explorer record API for routine content backfills: deterministic
  `PUT /api/records/:id` for full record upserts, `PATCH /api/records/:id` for
  section-aware updates, and `PATCH /api/records/:id/review` for review state
  changes. Direct Postgres edits should be reserved for deliberate migration or
  repair work.
- After DB edits, regenerate the public bootstrap with `npm --workspace server run export:public`.
- If UI-facing data changed, verify with `npm run build`.
- `client/public/bootstrap.public.json` is generated output. Keep it in sync, but do not edit it by hand.

## Record Shape

The lean graph schema uses:

- `nodes`: one row per country, organization, or system.
- `edges`: explicit graph relationships: `governs`, `operates`, `funds`, `member_of`, `publishes_to`, and `syncs_to`.
- `sources`: shared source IDs, types, URLs, publishers, and dates.
- `sources_localizations`: per-language source title/note text.
- `node_localizations`: per-language user-facing record text, localized details, and review state.
- `ryu_routes`: compact operational route rows for machine access.
- `saved_views`: app state.

For system nodes:

- Use `nodes.url` for the primary public URL.
- Use `nodes.record_depth` to track `stub`, `thin`, or `rich`.
- Use `nodes.properties_json` for language-neutral operational facts: approved discipline IDs, gallery asset URLs, data descriptor structure, access mechanics, and usage metric values.
- Use `node_localizations.title`, `summary`, and `description` for the public prose profile in each locale.
- Use `node_localizations.details_json` for localized details: aliases, gallery titles/captions, descriptor descriptions, access labels/descriptions/instructions, usage descriptions, and other language-specific prose.
- Store review snapshots in `node_localizations.review_json.history`. Each snapshot has `state`, `reviewer`, `date`, and `note`; the final entry defines current review state (`agent_researched`, `human_reviewed`, or `needs_revision`).
- The details UI shows `recordDepth` and the resolved localization's `review.state` for all users. In authenticated/author mode, it lets users update only `reviewState` and `reviewerNote`; snapshot `reviewer` and `date` are set by the server.
- Do not set review metadata in record content writes. Review state and reviewer
  notes belong in the dedicated review endpoint so the server can set reviewer
  identity and timestamps.
- Use `ryu_routes` only for approved machine access routes that agents or other apps should call.

Do not reintroduce removed tables or fields:

- No `system_profiles`, `system_data_descriptors`, `system_access_paths`, `system_gallery_items`, `system_metrics`, or `system_identifier_schemes`.
- No `node_claims` unless a new use case proves it is needed.
- No identifiers section, confidence fields, duplicate system IDs, or generic evidence-link layer.
- No hidden parent field or `part_of` edge. Use `member_of` only for documented
  membership/participation, not service components or a shared operator.
- No Operator country affiliation. `countryCode` identifies country nodes only;
  organizations and systems express government relationships through edges.
- No `geographicScope` tag. Structured geographic coverage is deferred; put
  relevant, source-backed geographic context in the profile prose.

## Rich Status And Source Completeness

`recordDepth` describes research depth. Localization `review.state` describes acceptance;
`rich` does not imply `human_reviewed`. Human review still checks whether evidence
actually supports the claims and whether translations are accurate.

The record API evaluates the **resulting aggregate**, including existing rows and
supplied changes, on both PUT and PATCH. `validateOnly=true` runs the same checks
and preconditions without writes. Semantic validation failures on apply return HTTP 422 with
`valid: false` and field-level `issues`; dry runs return the same issues with HTTP
200. Request-shape errors return HTTP 400. Correct the issues before applying. A rich record cannot bypass checks with
`incomplete=true`. Save incomplete work as `thin`, explicitly changing depth when
an edit removes required content. Omitted PUT relationships, sources, routes, and
localizations remain stored; omission never acts as deletion.

A rich system must have:

- A canonical HTTP(S) URL and an
  incoming `operates` edge from an existing organization.
- All six supported node localizations, with non-empty title, summary, description,
  and explicit `details.profile.sourceRefs` supporting the prose and shared metadata.
- Source-backed `format` descriptors and justified approved `type` descriptors. Include applicable `standard`
  descriptors, or explain their absence in `details.researchGaps.standards`.
- At least one actual `read` access path, with mechanism, URL, evidence, localized
  label and description. Explain authentication, licensing, restrictions, and
  contribution arrangements in the profile/access prose as applicable.
- Matching, unique neutral/localized item IDs. Descriptors need localized
  descriptions; format and standard descriptors also need localized labels.
  Type labels come from the shared vocabulary. Access paths need labels and descriptions; gallery items
  need titles and captions; metrics need localized descriptions.
- Source-backed metrics with finite non-negative values, units, and observation
  dates (YYYY, YYYY-MM, or YYYY-MM-DD). Storage values use bytes. When record count,
  storage size, or usage metrics cannot be found, omit the values and explain each
  gap in every locale's `details.researchGaps.recordCount`, `storageSize`, or `usage`.
- Evidence on each relationship and route, using embedded source objects or
  `properties.sourceRefs`. Source references must resolve to stored sources or
  `sources.upsert`; embedded source URLs must match the source's canonical URL.
- A relationship review in every localization's `details.relationshipReview`,
  containing `sourceRefs` and `findings` with non-empty entries for all six edge
  types. This applies to rich organizations and countries as well as systems.
  Review all incoming and outgoing edges, find missing material relationships,
  and document unsupported or unresolved claims. The API validates review coverage
  and evidence; the agent must assess whether the sources support the semantics.

Gallery and machine routes are optional. No approved route produces a warning;
do not invent one. When present, gallery assets must exist or have HTTP(S) URLs.
Active routes need a target, capabilities, and a contract reference. Local contract
references must resolve under `documentation/contracts`. Network liveness checks
remain outside the write transaction; follow URL Validation below.

`sourceCompleteness` is returned with record details when sources are included and
with content-validation results. It reports `complete`, `partial`, or `missing`,
reference/resolution counts, and field-level evidence issues. It measures the
record's evidence coverage, not completeness of the upstream database. This is
computed from content, not an author-controlled badge or a separate source registry.

- Systems need evidence for their profile, data, access, quantitative claims,
  relationships, and routes.
- Organizations need evidence for identity, jurisdiction/role, and asserted
  relationships. They do not need system descriptors, metrics, or galleries.
- Countries need evidence for identity and asserted governance relationships.
- Minimal country/organization records may be source-complete and remain `stub`
  or `thin`. The richer system checklist is not applied to those node kinds.

Referenced sources need a title, type, publisher, public provenance URL, and access
date. Publication/paper/journal-article and dataset-snapshot sources additionally
need a publication or release date. Other publication dates are optional, but must
be valid when present. Do not invent unavailable bibliographic details.

Store all source titles and notes, including English, in `sources_localizations`,
keyed by `(source_id, locale)`. Source rows and embedded references have no title
or note fields. Display and search use the selected source localization, falling
back to English when it is missing. Review the displayed source text and citations
as part of the record's localization review, with current state derived from `node_localizations.review_json.history`. Source writes may include only the localization rows being
changed. Rich record completeness requires every referenced source to have all six
supported languages; if any source localization has a note/caveat, each required
locale must include it. Content writes accept only `title`,
`note`, and `translatedFromLocale` in these rows, never review or audit fields.
Existing missing translations remain missing during validation; fallback
presentation cannot make a source complete. A translated citation still
references the same underlying source, not a translated publication or a new ID.
For non-rich records, completeness assesses their existing node locales; richness
requires the full six-language set.

Substantive record edits invalidate affected `human_reviewed` localizations to
`needs_revision`; edits to an original localization also invalidate its translated
dependents. Shared neutral/relationship/route changes invalidate all node locales.
Shared source edits invalidate all locales on every referencing record and advance
those records' versions, so earlier preconditions become stale. A shared source
edit that would break another rich record is rejected with that record's issues.
These are record-API guarantees; deliberate direct database repairs must handle
validation and review invalidation explicitly. No-op content edits preserve review
acceptance. Review history retains activity dates, actors, and notes; current
review status remains on each localization.

## Executable Example

`server/src/fixtures/rich-record.json` is a compact FishBase content payload derived
from the canonical record API. Its adjacent README records the snapshot and
fixture-only additions. It is a test/documentation artifact, never a production
source of truth or a payload to apply unchanged.

`server/src/postgresGraphRepository.test.ts` loads the fixture, checks invalid
variants, and uses PGlite (PostgreSQL in process) to exercise the actual schema,
transactional PUT/PATCH, localization round-trips, dry runs, review invalidation,
and shared-source behavior. Run `npm --workspace server test`; tests require no
production database, credentials, or network access.

## Research Standard

Prefer official and primary sources:

- Official database homepage and documentation.
- API or data portal docs.
- Download pages, repository pages, or object-storage listings.
- Citation, terms, licensing, and contact pages.
- Published impact, citation, or user-community studies when official usage numbers are not available.

For facts that may change, use current web research and record an `accessed_at` date in `sources`. Do not rely on memory for current counts, operator names, URLs, access rules, or pricing.

Every important claim should be traceable to a `sources` row. Put source references directly on the relevant `nodes.properties_json` or `node_localizations.details_json` items by embedding a `source` object with `id` and `url`. Resolve its title from `sources_localizations`.
Use `sources_localizations` for localized source-facing titles and notes.

## URL Validation

Access and gallery URLs must be live enough for a researcher to use. Do not add an access URL just because it appears in page text, search results, or an old import row.

Before finalizing a record:

- Run `npm --workspace server run validate:urls`. This command checks `sources.url`, `nodes.properties_json.access[].url`, and gallery image URLs.
- Check `nodes.url` in a browser when you add or change it; many official homepages block command-line validators even when the page is valid.
- Treat `200`, stable `3xx` redirects, and intentional document downloads as usable.
- Treat `403`, `404`, DNS failures, bot-challenge pages, login walls not described in access notes, and iframe-only failures as problems to fix or explicitly explain.
- Prefer the canonical working host when mirrors differ, such as `fishbase.se` over a `www.fishbase.org` path that returns Cloudflare `403`.
- If a URL requires an account, application, API key, payment, or special browser/session behavior, say that in the access path `description`.

## Profile Writing

The system profile should read like a concise research brief.

Use these neutral node fields:

- `url`: canonical homepage, portal, or primary record entry point.
- `record_depth`: `rich` only when the system has a full researched record, not merely imported identifiers or tags.
- `properties_json.disciplines`: approved discipline IDs.
- Model the operator through an incoming `operates` edge.

Use the target `node_localizations` row, usually `locale='en'` for current backfills, for:

- `title`: localized display title.
- `summary`: one sentence saying what the database is and what kind of data it provides.
- `description`: one substantial paragraph covering scope, data categories, headline size, operator or manager, governance/consortium context, access model, contribution model, and important caveats.
- `details_json.aliases`: useful localized search/citation aliases.
- `review_state`: set `agent_researched` after an agent completes a rich backfill, `human_reviewed` after human acceptance, or `needs_revision` when follow-up changes are required.

Keep organization rows minimal: localized identity, an accurate subtype, and
source-backed relationships. Do not assign a country code or `INT`. Use actual
responsible institutions; split combined operator labels when their members have
different responsibilities. International collaborations and EU institutions are
organizations, not placeholder countries.

## Relationship Review

The shared endpoint contract is in `shared/domain.ts`; the record API and PostgreSQL
enforce it, including when an existing node's kind changes. Self-links, duplicate
kind/source/target triples, unknown types, and retired `part_of` are rejected.

| Type | Allowed endpoints | Authoring criterion |
| --- | --- | --- |
| `governs` | country/organization -> organization/system | Formal decision authority, with scope stated. |
| `operates` | organization -> system | Management or ongoing operation; include every evidenced operator. |
| `funds` | country/organization -> organization/system | Financial support for the named recipient/activity; state current or historical period when known. |
| `member_of` | country -> organization; organization -> organization; system -> system | Documented membership or participating service; no automatic component hierarchy. |
| `publishes_to` | organization -> system | An evidenced publication/submission relationship. |
| `syncs_to` | system -> system | An evidenced transfer, with direction and active/planned status made clear. |

For each record, agents must:

1. Read the complete record and its incident edges; inspect the connected nodes to
   verify their identities and kinds. A consortium label does not establish its members.
2. Research governance, operation, funding, membership, publication, and synchronization
   using primary sources. Distinguish national, subnational, institutional, and
   collective authority. Funding a dataset does not necessarily fund its repository.
3. Check every asserted edge's direction, endpoints, meaning, provenance, and time
   scope. Attach supporting source refs to the edge itself. Review existing edges
   as critically as new ones; do not accept geographic grouping as governance.
4. Add verified missing relationships and remove unsupported assertions through
   `PATCH /api/records/:id`. Do not invent authority, contributors, grants, or
   memberships to fill the graph. Keep uncertainty explicit in the review findings.
5. Record localized findings under all six keys in `details.relationshipReview.findings`,
   with `details.relationshipReview.sourceRefs` supporting the investigation.
   Findings should say what is established, inapplicable, historical, planned, or
   still unknown. A missing edge alone does not demonstrate that a type was reviewed.
6. Run `validateOnly=true` on the resulting aggregate before applying; re-read to
   verify both endpoints and confirm the final edge set. Reassess these findings
   whenever relationships or their supporting evidence change.

Example shape (illustrative findings, never boilerplate to copy into live records):

```json
{
  "relationshipReview": {
    "sourceRefs": ["official-operator-page"],
    "findings": {
      "governs": "Describe the evidenced governing authority, or the research gap.",
      "operates": "Identify the organizations responsible for this system.",
      "funds": "Describe supported funding relationships and their periods, or unresolved funding.",
      "member_of": "Identify documented memberships, or explain why none were established.",
      "publishes_to": "Identify confirmed publication relationships, or their absence.",
      "syncs_to": "Identify confirmed transfer destinations, direction, and status, or their absence."
    }
  }
}
```

For existing databases, apply `server/schema/009_relationship_contract.sql` with
the release, after reviewing/removing legacy `part_of` edges using the record API.
It refuses an automatic rename, clears non-country affiliation codes, installs
the six-type/endpoint constraints, and returns previously rich records lacking
relationship-review coverage to `thin`. Review history is preserved and affected
localizations require revision. Promote records through the API only after the
complete current rich criteria pass. Regenerate the public bootstrap from Postgres.

## Disciplines

Use `properties.disciplines` as an array of unique IDs from `shared/domain.ts`.
The API rejects unknown IDs, duplicates, non-array values, and the retired `role`
and `disciplineFamily` properties at every record depth. Labels are translated
in `shared/i18n.ts`; do not store labels or translated IDs in records.

Use the smallest set that adequately describes substantial, documented coverage.
Support assignments with the profile's source references. Do not infer disciplines
from an operator's name, incidental holdings, data formats, techniques, or possible
downstream uses. Coordinates alone do not justify Geography. Avoid tagging every
possible subject in generalist repositories such as Dryad, Zenodo, or re3data.
Use `[]` when no specific discipline is justified and explain the system's scope
in its profile. Countries do not need discipline tags. Do not invent tags to fill
a rich-record requirement; there is no minimum tag count.

| ID | Meaning |
| --- | --- |
| `agronomy` | Crop production and agricultural soil management. |
| `botany` | Plant science. |
| `chemistry` | Composition, properties, and reactions of matter. |
| `climatology` | Climate patterns, variability, and long-term change. |
| `ecology` | Relationships among organisms and their environment. |
| `economics` | Production, consumption, allocation, and economic value. |
| `fisheries_science` | Fishery resources, harvests, aquaculture, and management. |
| `genetics` | Genes, heredity, genetic variation, and genomes. |
| `geography` | Places, spatial relationships, and geographic representation, including cartography. |
| `geology` | Earth's rocks, sediments, structure, and history. |
| `geophysics` | Physical properties and processes of Earth. |
| `glaciology` | Glaciers, ice sheets, and other natural ice. |
| `hydrology` | Water movement, storage, distribution, and the water cycle. |
| `law` | Legal rules, instruments, rights, and obligations. |
| `marine_biology` | Organisms and biological processes in marine environments. |
| `meteorology` | Atmospheric processes and weather. |
| `microbiology` | Microorganisms and their biology. |
| `mycology` | Fungi and their biology. |
| `oceanography` | Ocean properties, circulation, and physical, chemical, biological, and geological processes. |
| `paleontology` | Past life studied through fossils and their geological context. |
| `spatial_planning` | Planning the use and development of land and marine space. |
| `taxonomy` | Naming, identifying, and classifying organisms. |
| `zoology` | Animal science. |

**Adding a discipline requires human approval in the authoring chat.** First check
the list and definitions, including whether a broader existing discipline fits.
If none fits, ask the human with the proposed name, a short definition, the affected
record and source, and why existing tags are insufficient. Wait for explicit
approval; silence and approval of the record generally are not approval of a new
discipline. After approval, update the shared vocabulary and all six translated
labels. Release the updated service before using the new ID through the API.
Do not create a proposal record, approval flag, or automatic vocabulary-writing
endpoint. Ordinary record writes cannot extend the vocabulary.

For existing databases, apply `server/schema/005_disciplines.sql` with the service
release. It removes role, preserves explicit new tags and direct legacy equivalents,
and leaves ambiguous classifications empty for later source-backed authoring.
It does not expand a legacy label into inferred subject coverage. Historical
language imports must also run this migration before export. Regenerate the public
bootstrap from the migrated Postgres database; never hand-edit the export.

Also apply `server/schema/006_remove_geographic_scope.sql` with the release and
after historical language imports. It removes the retired `geographicScope`
property from nodes and localized details; the API rejects new writes of that
field at every record depth. It does not introduce replacement coverage fields.

## Data Descriptors

Use `nodes.properties_json.data.descriptors` for compact, source-backed data descriptor structure. Put localized descriptor descriptions in `node_localizations.details_json.data.descriptors` with matching descriptor ids.

Categories:

- `type`: an approved data type ID from `dataTypes` in `shared/domain.ts`, describing records or products a user can retrieve.
- `format`: how the data is exposed or stored, such as web pages, CSV, parquet, API JSON, Darwin Core Archive, RDF, or relational database tables.
- `standard`: identifiers, vocabularies, schemas, licenses, or protocols used by the database.

Each neutral descriptor should have `id`, `category`, `label`, and optional `source`
(required for rich records). For category `type`, `label` stores the canonical ID;
its translated display name comes from `shared/i18n.ts`. Keep its localized entry's
`id` and `description`, and omit `label`. Format and standard descriptors still
use localized labels and descriptions.

Keep descriptors broad enough to scan. Do not create one descriptor per table unless table-level detail is essential.

### Approved Data Types

Use each type at most once per record. The API rejects unknown IDs, duplicate
types, and localized type-label overrides at every record depth on PUT and PATCH.
The `dataType` search filter also accepts only canonical IDs.

| ID | Label | Meaning |
| --- | --- | --- |
| `taxonomic_records` | Taxonomic records | Scientific names, synonyms, classifications, and naming authorities. |
| `occurrence_records` | Occurrence records | Records of organisms found at particular places and times. |
| `survey_records` | Survey records | Sampling events, methods, effort, counts, and associated observations. |
| `biological_traits` | Biological traits | Characteristics such as size, growth, maturity, reproduction, and longevity. |
| `biological_interactions` | Biological interactions | Relationships between organisms, including predation, parasitism, and symbiosis. |
| `sample_records` | Sample records | Records describing specimens, tissues, extracts, and their collection or preservation. |
| `sequence_data` | Sequence data | Nucleotide or protein sequences, assemblies, and associated annotations. |
| `environmental_measurements` | Environmental measurements | Observed physical and chemical quantities, including temperature, salinity, and oxygen. |
| `model_outputs` | Model outputs | Predictions, simulations, forecasts, and reanalyses. |
| `fisheries_statistics` | Fisheries statistics | Catch, effort, landings, aquaculture production, and associated economic values. |
| `geographic_reference_data` | Geographic reference data | Named places, boundaries, shorelines, delineated areas, and basemaps. |
| `bathymetry` | Bathymetry | Seafloor depths and terrain surfaces. |
| `platform_records` | Platform records | Observing platforms, instruments, deployments, trajectories, and operational status. |
| `media` | Media | Photographs, illustrations, video, and audio. |
| `bibliographic_records` | Bibliographic records | Structured references to publications and other literature. |
| `catalogue_records` | Catalogue records | Descriptions of datasets, repositories, and services available for discovery. |
| `documents` | Documents | Full publications, reports, manuals, and other textual works. |
| `software` | Software | Source code, scripts, packages, and software releases. |

Use the smallest supported set. Each assignment must identify actual retrievable
records, a collection, or a product, supported by its source and description.
Website illustrations, citations, maps, metadata, and helper scripts do not by
themselves justify Media, Bibliographic records, Geographic reference data,
Catalogue records, or Software. Coordinates do not make an occurrence record
geographic reference data. A model consuming observations does not automatically
provide observation records. Links to sequence archives do not establish that a
sample catalogue supplies sequence data. Keep parameters, layouts (profiles,
time series, grids), and product-specific detail in descriptions.

Use no type descriptors when no specific type is justified, including generalist
repositories with unreviewed holdings. There is no minimum type count for rich
records. Do not invent a generic type to fill the field or assign every possible
type to Dryad, Zenodo, or PANGAEA. Planned content belongs in profile/route prose;
it does not establish a currently retrievable data type.

**Adding a data type requires human approval in the authoring chat.** Check the
approved definitions first. If none fits, present the proposed name, definition,
record and source, and why existing types do not fit. Wait for explicit approval
before changing `dataTypes` and all six translations. Approval of a record or
silence does not approve a vocabulary addition. Release the vocabulary update
before using the new ID through the API. Do not add a proposal system, approval
flag, or vocabulary-writing endpoint.

Apply `server/schema/007_data_types.sql` with the service release and after
historical language imports, before regenerating the bootstrap export. It maps
documented equivalents, keeps one existing descriptor and its source/localizations
per type (preferring canonical and sourced entries), and removes ambiguous or
duplicate descriptors. It does not certify the retained assignments as reviewed
or backfill absent evidence. Review those assignments during subsequent authoring.

## Metrics

Use these `nodes.properties_json` fields for quantitative claims:

- `data.recordCount`: native record count.
- `data.storageSize`: total size in bytes.
- `usage`: publication counts, citation counts, downloads, registered users, contributors, and similar usage metrics.

Each neutral metric should include `id`, `key`, `value`, `unit`, `observedAt`, and `source`. Put localized metric descriptions in `node_localizations.details_json.data` or `node_localizations.details_json.usage` using the same metric id.

Rules:

- Every metric must have a source object.
- Use `observedAt` for the date or version the number refers to.
- Use localized descriptions to capture caveats, such as "compressed public snapshot, not live production DB".
- Store storage in bytes even if the source reports MB/GB/TB. Convert carefully and describe the original source measurement.
- If a metric cannot be found, do not invent it. Leave it absent and mention the gap in notes or final summary.

## Access Paths

Use `nodes.properties_json.access` for access mechanics and `node_localizations.details_json.access` for localized access prose. Access and submission remain one record section, but the UI splits read paths from write/contribution paths.

Each neutral access path should have:

- `id`: stable route-like id within the node.
- `type`: `read`, `submit`, or `partner_sync`.
- `method`: lower_snake_case access mechanism.
- `url`: direct portal, docs, contact, download, API, or terms page.
- `source`: source object with `id` and `url`; its title comes from `sources_localizations`.

Each localized access path should have the same `id` plus:

- `label`: short human-readable label.
- `description`: how access is handled, including account/API key, application, payment, free access, limitations, and whether data are static snapshots.

Do not add negative access rows for access that does not exist, such as "no public write API", "no direct write", or "commercial reuse requires contact". Leave absent access absent. If a limitation materially qualifies an actual access path, describe it in that access path's localized `description` or in the system profile.

Do not create `none`, `service`, `documentation`, or `download` access types. Preserve those distinctions in `method` or localized labels when useful; `type` must be `read`, `submit`, or `partner_sync`.

## Ryu Routes

Use `ryu_routes` only for approved machine access routes. Human lookup, browser UI, manual request, researcher-library, and raw-source context belongs in node access properties and localized access details, not `ryu_routes`.

Route fields:

- `id`: stable lower-kebab-case route id.
- `node_id`: system node id.
- `status`: route readiness, usually `active`, `planned`, `deprecated`, or `blocked`.
- `mode`: machine access pattern, such as `live_api`, `self_hosted_snapshot`, `hosted_snapshot`, `oa_cache`, `connector`, or `unavailable`.
- `priority`: lower number means preferred.
- `capabilities_json`: JSON array of task-level affordances, such as `species_profile`, `occurrence_locations`, `dataset_search`, `metadata_lookup`, `file_download`, or `submission_status`.
- `target`: our runtime, service, connector, cache, or tool target.
- `upstream`: concise upstream locator, such as a domain, API base, bucket/prefix, repository, or source alias.
- `format`: main data/interface format, such as `json`, `geojson`, `parquet`, `csv`, `darwin_core_archive`, or `html`.
- `contract_ref`: pointer to the real contract, docs, connector, OpenAPI spec, or service notes. Do not inline the contract in `ryu_routes`.
- `caveat`: one short operational warning.
- `properties_json`: only for route-specific extras that do not deserve columns.

Research rules:

- Add a route only when research establishes a concrete machine access path that an agent runtime should use.
- Use `status='planned'` when the route is intentional but not yet live. Planned routes are indexes for future implementation, not runtime access.
- Multiple routes are allowed; order them with `priority`.
- Prefer an OA-controlled runtime route when production use needs stable performance, joins, caching, credentials, or map-ready transforms.
- Do not add raw upstream storage as a separate route when our runtime is a derived cache or connector service. Mention the upstream on the machine route instead.
- If there is no approved operational route, leave `ryu_routes` empty for that node.

## Gallery Images

Gallery images should be local, stable, and useful. Avoid blocked iframes and decorative screenshots.

Preferred capture path:

- Use the Codex in-app Browser first for screenshots, especially for public sites that may challenge headless browsers.
- If the in-app Browser reaches the real page, capture representative UI pages from that session.
- If access is blocked by login, CAPTCHA, Cloudflare verification, browser-security pages, or another non-content screen, do not add gallery items or substitute weak images just to fill the gallery.
- When capture is blocked, report the blocked URL and blocker back to the human so they can provide access, clear the session, or supply screenshots.

Storage convention:

- Store assets under `client/public/gallery/<node-id>/`.
- Use one high-resolution file and one thumbnail per gallery item.
- Recommended filenames: `<capture-name>-high.png` and `<capture-name>-thumb.png`.
- Recommended capture size for screenshots: `1440x900`.
- Recommended thumbnail size: `640x400`.

`nodes.properties_json.gallery` items should have `id`, `type`, `url`, `thumbnailUrl`, `source`, and `sortOrder`. `node_localizations.details_json.gallery` items should have matching `id` values plus localized `title`, `caption`, and optional `altText`.

Use `type='embed'` only when the target site works reliably in an iframe. If an embed renders as a grey or blank square, replace it with local image captures.

Choose images that show what kinds of data the database contains and how those data are structured. The gallery should visually answer what a researcher or ocean stakeholder can expect to find in the system, not merely how to use the website.

## Identifiers

Do not add identifier sections to Ryu records. The language migration removed legacy identifiers from the long-term record model, UI, and search surface.

## Updating The DB

Use a single Postgres transaction for each system backfill when practical.

Recommended order:

1. Upsert `sources` together with any ready `sources_localizations` through `sources.upsert`.
2. Upsert any new `nodes` for operators.
3. Update `edges` for operator/governance/part-of links.
4. Update the system row in `nodes`, including `url`, `record_depth`, and neutral `properties_json`.
5. Upsert the target row in `node_localizations`, including `title`, `summary`, `description`, and localized `details_json`. Use the dedicated review endpoint for review decisions.
6. Update `ryu_routes` when the system has an approved operational route.
7. Regenerate `client/public/bootstrap.public.json`.
8. Run validation.

Do not delete unrelated rows for other systems. Do not change existing user or agent work outside the target system unless required by a proven correction.

## Validation Checklist

Run these checks before finishing:

```sh
npm --workspace server run export:public
npm run build
```

For the target system, also check:

```sh
psql "$DATABASE_URL" -c \
  "SELECT id, url, record_depth, properties_json FROM nodes WHERE id='<node-id>';"

psql "$DATABASE_URL" -c \
  "SELECT node_id, locale, title, summary, description, review_state, details_json FROM node_localizations WHERE node_id='<node-id>' ORDER BY locale;"

psql "$DATABASE_URL" -c \
  "SELECT kind, source_node_id, target_node_id, note FROM edges WHERE source_node_id='<node-id>' OR target_node_id='<node-id>' ORDER BY kind;"

psql "$DATABASE_URL" -c \
  "SELECT id, status, mode, priority, format, contract_ref FROM ryu_routes WHERE node_id='<node-id>' ORDER BY priority;"
```

Confirm:

- Required access URLs, descriptions, and sources are present.
- Required metric sources are present.
- Gallery local files exist for every local `url` and `thumbnailUrl`.
- The public bootstrap exports the same values you expect from Postgres.

## Final Summary For Users

When reporting a completed backfill, include:

- What system was updated.
- Main profile improvements.
- Counts of descriptors, access paths, gallery items, and metrics.
- The most important sourced metrics.
- Any caveats, especially about approximate counts, snapshot-vs-live sizes, or missing usage data.
- Validation commands that passed.

Keep the summary factual and short. Do not paste the entire record unless requested.
