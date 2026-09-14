# Rich Research Records For Ryu

Use this guide when researching and backfilling rich database records for Ryu. The goal is a record that helps a researcher quickly understand what a database is for, what data it contains, how large it is, how to access or contribute to it, who manages it, and which machine routes Ryu can use.

For shared vocabulary labels, UI messages, lookup APIs and translation extension
checks, see [the shared code guide](../shared/README.md). Record-specific prose
and source titles continue to follow the ownership rules below.

## Node Contract Boundaries

The three authored records have separate positive contracts in
`shared/records/country.ts`, `shared/records/organization.ts`, and
`shared/records/system.ts`. Their API inputs, PATCHes, DTOs, display and search
types preserve the owning kind. Each runtime validator lives in
`server/src/recordContracts/<kind>.ts`; shared validation handles sources,
locales and review metadata.

The tables and Record API endpoints stay shared. `nodes.kind` selects the
`node_localizations` shape through `node_id`; no second kind column is stored.
Migration 017 completes the populated-column and route ownership checks after
014–016. Its audit fails on incompatible content without deleting it. A schema
release and reviewed data audit are required before deploying this contract.

PATCH uses the stored kind when none is supplied. Every write validates the
whole resulting aggregate, including untouched locales and incident edges.
Changing kind is an explicit conversion: replace incompatible properties and
localizations, and explicitly delete any incompatible routes or relationships.
A full PUT is required when removing neutral fields such as a former canonical
URL. Omitted locales, sources and incident edges retain their existing content.

Record search covers all three kinds; the `kind` query filter selects a subset.
The **Systems** directory remains an explicitly system-only view; absence there
does not establish absence from the graph.

## Canonical System Contract

The [FishBase content example](../server/src/fixtures/rich-record.json) is the
reference for system records. Its [snapshot notes](../server/src/fixtures/README.md)
identify its provenance and example-only choices. Copy the structure, not its
claims, IDs, sources, counts, or particular relationships. The approved format
is enforced by `server/src/recordContracts/system.ts`, with closed shared types and
PostgreSQL structural guards in `server/schema/014_system_record_shape.sql`.

Every depth uses this format. A `stub` identifies a system; `thin` holds partial
research; `rich` means the complete profile and relationship research described
below. Incomplete work may omit sections, but supplied fields must be valid.
Changing depth never permits unknown keys, wrong types, or mismatched item IDs.

Content PUT bodies contain only `id` (optional, matching the path), `record`,
`localizations`, `edges`, `routes`, and optional `incomplete`. Record fields are
`kind`, `url`, `recordDepth`, `properties`, and `sources`.
PATCH uses the documented section replacements/upserts.
Do not send a GET response back unchanged: computed summaries, timestamps,
localization `locale`, and review/audit metadata are response fields.

The following objects are closed: no additional keys or extension bags.

| Object | Fields |
| --- | --- |
| `record.properties` | `disciplines`, `data`, `access`, `gallery`, `metrics` |
| `properties.data` | `descriptors` |
| Neutral descriptor | `id`, `category`, `label`, `source` |
| Neutral access | `id`, `type`, `methods`, `url`, `requirements`, `cost`, `sourceRefs` |
| Neutral gallery item | `id`, `type`, `url`, `thumbnailUrl`, `source`, `sortOrder` |
| Neutral metric | `id`, `key`, `value`, `observedAt`, optional `period`, `source` |
| Localization content | `title`, `summary`, `description`, `details`, optional `translatedFromLocale` |
| `details` | `aliases`, `profile`, `data`, `access`, `gallery`, `metrics`, optional `researchGaps` |
| `details.profile` | `sourceRefs` |
| `details.data` | `descriptors` |
| Localized descriptor or metric | `id`, `description` |
| Localized access | `id`, `label`, `description` |
| Localized gallery item | `id`, `title`, `caption`, optional `altText` |
| `details.researchGaps` | Optional `data`, `usage`, `standards`, `access` explanations |
| Owned source | `id`, `url`, `title`, optional `description`, `accessedAt` |

Array sections use `[]` when empty, never null, strings, or an object keyed by
item ID. Every supplied data object has a `descriptors` array. IDs are stable
slugs, unique within their section. Localized IDs must resolve to neutral items;
rich localizations must match the complete neutral ID sets. Incomplete records
may leave descriptor/gallery translations unfinished; access and standards
require all six locales at every depth, and metric IDs must match in each
existing locale. Aliases and source-reference lists contain no duplicates.
`sortOrder` is a non-negative safe integer. Missing research-gap keys are allowed;
present gaps contain a specific nonblank explanation.

Permitted nulls have explicit meanings: an incomplete descriptor's `source` may
be null; a metric's unknown `observedAt` is null; optional `period` may be null;
access `requirements: null` means unknown; an embed may have `thumbnailUrl: null`.
Localized descriptor/metric descriptions and gallery title/caption/alt text may
be null during incomplete research. Rich descriptions, gallery titles and captions
must be nonblank. Access labels and descriptions are always nonblank. Shared
vocabulary labels and metric units cannot be overridden, even with null.

Before marking a system rich:

1. Read its complete canonical record and incident relationships. Research the
   profile, holdings, formats/standards, Read/Write access, Data/Usage measurements,
   and all six relationship types using primary sources.
2. Assemble all five neutral sections and all six complete localizations with
   profile citations. Use approved vocabulary IDs and owner-local sources.
3. Add verified relationships with a complete description and direct evidence on
   the edges. Include material scope and timing in the description when known.
   Complete material connection research; report specific unresolved candidates.
4. Record supported metrics or specific Data/Usage gaps, and supported standards
   or a standards gap. Include at least one useful gallery item showing a
   representative record or data content. Operational routes remain optional.
   No minimum discipline, type, standard or connection count substitutes for
   evidence; the existing operator and read/format requirements apply.
5. Validate the merged candidate with `validateOnly=true`, fix every issue, apply
   with a fresh record timestamp, and re-read it. Review state changes use the
   separate review endpoint. Rich does not imply human review or factual verification
   by the validator.

Change this contract deliberately with shared types, runtime validation, SQL
guards, example, tests and this guide in one release. Do not automatically
refresh the fixture from production. Audit existing records before enforcement;
see [the shape rollout audit](SYSTEM_RECORD_SHAPE_ROLLOUT.md) and
[the rich system gallery rollout](RICH_SYSTEM_GALLERY_ROLLOUT.md).

## Canonical Organization Contract

Organization records are concise institutional profiles. They explain what an
organization is, why it exists, when it was established, its documented scale,
where it maintains offices, and how it relates to the rest of the graph. Their
positive shape is defined in `shared/records/organization.ts`, illustrated by
[the synthetic organization example](../server/src/fixtures/rich-organization.json),
and enforced by `server/src/recordContracts/organization.ts` and
`server/schema/016_organization_record_shape.sql`.

The following organization objects are closed:

| Object | Fields |
| --- | --- |
| `record` | `kind`, `url`, `recordDepth`, `properties`, `sources` |
| `record.properties` | `established`, `metrics`, `offices` |
| Established fact | `date`, `source` |
| Scale metric | `id`, `key`, `value`, `observedAt`, `source` |
| Neutral office | `id`, `kind`, `source` |
| Localization content | `title`, `summary`, `description`, `details`, optional `translatedFromLocale` |
| `details` | `aliases`, `profile`, `offices`, optional `researchGaps` |
| `details.profile` | `mission`, `sourceRefs` |
| Localized office | `id`, `location` |
| `details.researchGaps` | Optional `established`, `scale`, `officeLocations` explanations |

`established.date` uses the most precise supported value (`YYYY`, `YYYY-MM`, or
`YYYY-MM-DD`). It means the legal or documented establishment represented by
the cited source; do not silently substitute a predecessor's founding, treaty
signature, launch, reorganization, or renaming date. Put that qualification in
the referenced source's localized `description`, not beside the date.

Scale is a list of independently sourced measurements. Approved keys are
`staff_count`, `member_organization_count`, and `member_country_count`.
`observedAt` uses the same partial-date format or null. Organization scale does
not use a reporting `period`, and each measurement's definition and caveats
(employees versus consultants, current versus authorized posts, and the scope
of membership) belong in the source's localized `description`. Do not mix
unlike member categories into a single count.

Offices are a sourced list, never an office count. Each neutral item has a
stable ID, an approved `kind` (`headquarters` or `office`), and one source. Its
localized partner has the same ID and a human-readable `location`. Include only
documented active organizational offices; do not count member institutions,
project sites, hosted secretariats, mailing addresses, or inferred places.
Users and clients may derive a count from the list.

Before marking an organization rich:

1. Supply a canonical URL and all six localized titles, summaries,
   descriptions, aliases, missions, and profile citations.
2. Research establishment, the applicable scale measures, and active office
   locations. If an authoritative fact is unavailable, use null or an empty
   list and give the corresponding specific explanation in every locale's
   `researchGaps`; never invent a value.
3. Give every establishment, scale, and office source a nonblank localized
   `description` in all six languages so users can interpret the fact.
4. Review every incident edge and all six relationship types. A rich
   organization needs at least one evidenced incident relationship, and every
   included relationship needs a clear note plus owner-local citations.
5. Validate the complete aggregate, apply with a fresh record timestamp, and
   re-read it. Rich does not imply human review.

Stub and thin organization records may omit unfinished sections, but every
supplied field must retain this shape. Existing records labeled rich are lowered
to thin by migration 016 until deliberately backfilled against this contract.

## Canonical Country Contract

Country records are compact ocean-governance profiles. Their positive field
contracts live in `shared/records/country.ts`, illustrated by
[the synthetic country example](../server/src/fixtures/rich-country.json), with runtime checks in
`server/src/recordContracts/country.ts` and storage checks in
`server/schema/015_country_record_shape.sql`. The owning `nodes.kind` selects
the localization contract through `node_localizations.node_id`.

| Country object | Authored fields |
| --- | --- |
| `record` | `kind`, `countryCode`, `recordDepth`, `properties`, `sources` |
| `record.properties` | `treatyParticipation` |
| Localization | `title`, `summary`, `details`, `translatedFromLocale` |
| Localization `details` | `aliases`, `profile`, `treatyParticipation` |
| `details.profile` | `sourceRefs` |

IDs, timestamps, and localization review history are managed metadata. Each kind
has its own localization type; system and organization canonical URLs and extended
prose belong to their respective contracts. Stub and thin records may omit
unfinished sections; supplied fields retain the declared shape.

| Object | Fields |
| --- | --- |
| Neutral treaty participation | `id`, `status`, `signatureDate`, `consentMethod`, `depositDate`, `effectiveDate`, `focalPointUrl`, `sourceRefs` |
| Localized treaty participation | `id`, `title`, `description`, `focalPoint` |

Treaty item IDs are stable owner-local slugs and must match across neutral and
localized arrays. Dates use `YYYY-MM-DD` or null. `focalPointUrl` is an official
HTTP(S) directory or page, not a copied personal email address. Every neutral
item has nonempty, unique source references resolving against the country's
sources. Localized `focalPoint` names the designated institution or office; omit
the current person's name unless it has clear operational value and the official
source is maintained.

Use `status` for the current legal position: `party`, `signatory_not_party`,
`not_party`, or `withdrawn`. Use `consentMethod` for the distinct international
act: `ratification`, `acceptance`, `approval`, `accession`, or
`definitive_signature`. Do not reduce these to a `ratified` boolean. Record the
depositary's date of deposit and the date the treaty became effective for that
country when the official status source supplies them. Explain reservations,
declarations, provisional application, or unusual legal history briefly in the
localized treaty description when material to marine governance or participation.

### Country prose

Write publication-ready, factual prose about the country, its institutions, and
its treaty participation. Make those entities the subjects of sentences. Internal
project names belong in internal documentation; provenance and research-process
information belong in source citations and review history.

- `summary` is the single country introduction: a short paragraph, usually two or
  three sentences. Give useful geographic or ocean context and concise institutional
  context. Use concrete, sourced facts and explain agency abbreviations when useful.
- Treaty `title` uses the recognized treaty name in the selected language, with a
  familiar abbreviation where helpful.
- Treaty `description` briefly explains participation and material qualifications.
  Let structured fields carry routine dates. Explain relevant declarations, the
  distinction between domestic approval and deposited consent, or entry-into-force
  context. Include an explicit as-of date for pending or unrecorded actions.
- Treaty `focalPoint` names the officially designated institution or office, with
  its official directory as evidence.
- Translate the same facts and qualifications naturally into all six languages.
  Review prose for clarity, accuracy, and repetition. Automated checks enforce
  structure, completeness, vocabulary, dates, and citations; editorial review
  assesses writing quality.

Before marking a country rich:

1. Supply its uppercase ISO alpha-3 identity code, authoritative profile sources,
   and all six localized titles, summaries, aliases, and profile citations.
2. Research every treaty explicitly in scope for that Ryu record. Supply at
   least one complete treaty item; do not attempt an exhaustive treaty census.
3. Record the stable designated focal-point institution or office and official
   directory when published. Treaty signatories and meeting delegates are not
   assumed to be current operational contacts.
4. Review the country-applicable `governs`, `funds`, and `member`
   relationships. Keep formal groups and public authorities as sourced graph
   relationships; Party status alone does not establish unilateral governance
   over a treaty body or clearing-house system.
5. Validate the complete aggregate, apply with a fresh record timestamp, and
   re-read it. After completing a research pass, append an `agent_researched`
   review event for every researched localization through
   `PATCH /api/records/:id/review`, even when its state is unchanged. Use a fresh
   record timestamp for each review write. The API supplies the reviewer and event
   timestamp. Re-read the current state, date, and history. Human review uses the
   same dated-event workflow with an authorized reviewer.

Review dates identify completed research or review passes. `contentUpdatedAt`
identifies content edits. Preserve unknown historical review dates as unknown;
record a new event when the current pass is complete. Display the current review
date beside its state and retain earlier events in revision history.

## Source Of Truth

- Treat Cloud SQL/Postgres as the canonical editable graph.
- Do not create a parallel registry, merged CSV, or alternate bootstrap as a new source of truth.
- Use the Explorer record API for routine content backfills: deterministic
  `PUT /api/records/:id` for full record upserts, `PATCH /api/records/:id` for
  section-aware updates, and `PATCH /api/records/:id/review` for review state
  changes. Direct Postgres edits should be reserved for deliberate migration or
  repair work.
- When updating the launch export, regenerate the public bootstrap with
  `npm --workspace server run export:public`; never edit it by hand. Routine
  authoring verifies the canonical record API rather than a bootstrap artifact.
- If application code or UI-facing contracts changed, verify with `npm run build`.

## Record Shape

The lean graph schema uses:

- `nodes`: one row per country, organization, or system.
- `edges`: explicit graph relationships: `governs`, `operates`, `funds`, `member`, `contributes`, and `transfers`.
- `nodes.sources` and `edges.sources`: source objects owned by each node or relationship, with translated titles.
- `node_localizations`: per-language user-facing record text, localized details, and review state.
- `ryu_routes`: compact operational route rows for machine access.
- `saved_views`: app state.

For system nodes:

- Use `nodes.url` for the primary public URL.
- Use `nodes.record_depth` to track `stub`, `thin`, or `rich`.
- Use `nodes.properties_json` for language-neutral operational facts: approved discipline IDs, gallery asset URLs, data descriptor structure, access mechanics, and metric values.
- Use `node_localizations.title`, `summary`, and `description` for the public prose profile in each locale.
- Use `node_localizations.details_json` for localized details: aliases, gallery titles/captions, descriptor descriptions, access labels/descriptions, metric descriptions, and other language-specific prose.
- Store review snapshots in `node_localizations.review_json.history`. Each snapshot has `state`, `reviewer`, `date`, and `note`; the final entry defines current review state (`agent_researched`, `human_reviewed`, or `needs_revision`).
- The details UI shows `recordDepth` and the resolved localization's `review.state` for all users. In authenticated/author mode, it submits a new review with an explicit `reviewState` and an optional `reviewerNote`; snapshot `reviewer` and `date` are set by the server.
- Do not set review metadata in record content writes. Review state and reviewer
  notes belong in the dedicated review endpoint so the server can set reviewer
  identity and timestamps. Every review submission requires an explicit
  `reviewState` authorized for the caller and appends a new history entry.
  Note-only submissions are rejected. An omitted or null `reviewerNote` leaves
  the new entry's note empty; previous history entries remain unchanged.
- Use `ryu_routes` only for approved machine access routes that agents or other apps should call.

Do not reintroduce removed tables or fields:

- No `system_profiles`, `system_data_descriptors`, `system_access_paths`, `system_gallery_items`, `system_metrics`, or `system_identifier_schemes`.
- No `node_claims` unless a new use case proves it is needed.
- No identifiers section, confidence fields, duplicate system IDs, or generic evidence-link layer.
- No hidden parent field or `part_of` edge. Use `member` only for documented
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
- Source-backed approved `format` descriptors and justified approved `type` descriptors. Include applicable `standard`
  descriptors, or explain their absence in `details.researchGaps.standards`.
- At least one actual `read` access path, with mechanism, URL, evidence, localized
  label and description. Explain authentication, licensing, restrictions, and
  contribution arrangements in the profile/access prose as applicable.
- Matching, unique neutral/localized item IDs. Descriptors need localized
  descriptions; all descriptor labels come from the shared vocabularies.
  Type and format labels come from the shared vocabularies. Access paths need labels and descriptions; gallery items
  need titles and captions; metrics need localized descriptions.
- At least one sourced gallery item that shows a representative record, data
  product, data structure, or the kinds of data a researcher can retrieve. A
  generic homepage, logo, navigation view, or decorative image does not satisfy
  the rich-system requirement by itself.
- Source-backed metrics using only the ten approved keys, finite non-negative
  values, and observation dates (YYYY, YYYY-MM, YYYY-MM-DD, or null when unknown).
  Units and Data/Usage groups come from `shared/domain.ts`. Rich records require
  a metric or an explicit research gap for each group in every locale's
  `details.researchGaps.data` or `usage`; do not invent numbers to fill a group.
- A nonempty description and at least one source on every relationship. An edge's
  `sources` directly evidence its description; route references continue to resolve
  against the route node's `nodes.sources`. Sources contain no duplicate URL.
- Complete the connection research in Relationship Review below for rich systems,
  organizations, and countries. Persist verified material relationships with their
  descriptions and evidence on the edges, and report unsupported or unresolved
  candidates to the user. The API validates edge evidence references; passing
  validation alone does not establish adequate research or the truth of a claim.

Machine routes are optional. No approved route produces a warning; do not invent
one. Gallery assets must exist or have HTTP(S) URLs.
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
- Organizations need evidence for identity and mission, establishment, each
  supplied scale metric and office location, and asserted relationships. They
  do not need system descriptors, access paths, galleries, or routes.
- Countries need evidence for identity, treaty participation, official context,
  and asserted `governs`, `funds`, and `member` relationships.
- Minimal country/organization records may be source-complete and remain `stub`
  or `thin`. The richer system checklist is not applied to those node kinds.

Each node and edge has a dedicated `sources` JSONB object keyed by source ID.
Each entry has `id`, `url`, `title`, optional `description`, and `accessedAt`.
The key equals `id`; IDs are local to their owner. `url` is absolute HTTP(S),
`accessedAt` is a valid `YYYY-MM-DD` date, and both localized maps use supported
locale codes with non-empty text. Source descriptions hold the interpretation,
scope, and qualification of organization dates, scale figures, and office
locations. No source type, publisher, publication date, local path, note, or
source audit fields.

Node/localization/route citations resolve against `nodes.sources`; an edge's
`sources` collection directly supports its description, from either endpoint.
Node and route source references are strings (`source: "documentation"`) or lists
(`sourceRefs: ["documentation"]`). Edges do not carry a separate reference list.
There is no global source registry and no endpoint ownership field on citations.
Every source needs titles for its node's existing localizations; edge sources
cover localizations of both endpoints. Rich records require all six node locales.
Missing source translations are validation errors, not English fallback.

PUT accepts `record.sources` and `edges[].sources`. PATCH replaces a node collection
explicitly with `record.sourcesReplace`; edge upserts accept `sources`. Omission
preserves existing collections. A localization-only write never rewrites sources.
Validation applies to the final merged record. The database checks source shape,
reference resolution, and title coverage; a source cannot be removed while cited.
Adding a localization and its required source titles can be one atomic record write.

Substantive record edits invalidate affected `human_reviewed` localizations to
`needs_revision`; edits to an original localization also invalidate its translated
dependents. Shared neutral/relationship/route changes invalidate all node locales.
Node source edits invalidate reviewed localizations on that node; edge evidence edits invalidate reviewed localizations of both endpoints. Other owners of the same source ID remain independent. Sources participate in owner timestamps and existing write preconditions.
These are record-API guarantees; deliberate direct database repairs must handle
validation and review invalidation explicitly. No-op content edits preserve review
acceptance. Review history retains activity dates, actors, and notes; current
review status remains on each localization.

## Executable Example

`server/src/fixtures/rich-record.json` freezes the complete prepared FishBase
content in the canonical shape, including all six languages, standards,
Read/Write access, metrics, gallery and relationships. Its adjacent README
records the snapshot and example-only choices. It is a test/documentation
artifact, never a production source of truth or a payload to apply unchanged.

`server/src/postgresGraphRepository.test.ts` and `systemRecordShape.test.ts` load the fixture, check invalid
variants, and uses PGlite (PostgreSQL in process) to exercise the actual schema,
transactional PUT/PATCH, localization round-trips, dry runs, review invalidation,
and owner-scoped source behavior. Run `npm --workspace server test`; tests require no
production database, credentials, or network access.

## Research Standard

Prefer official and primary sources:

- Official database homepage and documentation.
- API or data portal docs.
- Download pages, repository pages, or object-storage listings.
- Citation, terms, licensing, and contact pages.
- Published impact, citation, or user-community studies when official usage numbers are not available.

For facts that may change, use current web research and record an `accessedAt` date on the owned source. Do not rely on memory for current counts, operator names, URLs, access rules, or pricing.

Every important claim should cite an ID in its owner's `sources` column. Put citation IDs on the relevant content item; translated titles stay in the source's `title` map.

## URL Validation

Access and gallery URLs must be live enough for a researcher to use. Do not add an access URL just because it appears in page text, search results, or an old import row.

Before finalizing a record:

- Run `npm --workspace server run validate:urls`. This command checks node and edge `sources.*.url`, `nodes.properties_json.access[].url`, and gallery image URLs.
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
- Review state: use the dedicated review endpoint to set `agent_researched` after
  research or `needs_revision` for follow-up. Only authorized human acceptance
  should set `human_reviewed`; do not put review metadata in localization content.

Keep organization rows minimal: localized identity and source-backed relationships. Do not assign a country code or `INT`. Use actual
responsible institutions; split combined operator labels when their members have
different responsibilities. International collaborations and EU institutions are
organizations, not placeholder countries.

## Actor Attribution

Model the actor named by the evidence. A sovereign state/government is a country
node; a ministry, agency or institution is an organization node; its information
service is a system node. A ministry acting on behalf of a state is not
automatically interchangeable with the legal contractor, dataset creator or
publisher. Keep each attribution scoped to its source and relationship.

The current `contributes` endpoint rule is organization → system. Evidence that
names a country as publisher exposes an endpoint-policy question, not a reason
to invent an organization for that government or substitute an associated
ministry. Report it for an explicitly approved contract change; preserve the
country and ministry distinction meanwhile. This node-contract refactor does
not change the six relationship endpoint rules.

## Relationship Review

The shared endpoint contract is in `shared/domain.ts`; the record API and PostgreSQL
enforce it, including when an existing node's kind changes. Self-links, duplicate
kind/source/target triples, unknown types, and retired `part_of` are rejected.

| Type | Allowed endpoints | Authoring criterion |
| --- | --- | --- |
| `governs` | country/organization -> organization/system | Formal decision authority, with scope stated. |
| `operates` | organization -> system | Management or ongoing operation; include every evidenced operator. |
| `funds` | country/organization -> organization/system | Financial support for the named recipient/activity; state current or historical period when known. |
| `member` | country -> organization; organization -> organization; system -> system | Documented membership or participating service; no automatic component hierarchy. |
| `contributes` | organization -> system | An evidenced data contribution, publication, or submission relationship. |
| `transfers` | system -> system | An evidenced data movement, including synchronization; make direction and current, historical, or planned state clear in the description. |

Well-researched connections are a required part of a rich record. Checking the
existing operator alone is insufficient. Actively discover
missing material relationships as well as verifying existing ones. There is no
minimum edge count or requirement to assert every type: evidence determines the
connections. Keep the record `thin` while material relationship research or verified
edge additions remain unfinished. Specific evidence gaps after a completed
investigation are acceptable; generic "reviewed, no additional relationship
established" findings do not satisfy this standard.

For each record, agents must:

1. Read the complete canonical record and its incident edges through the record API;
   inspect connected nodes and search for candidate endpoints to verify identities
   and kinds and reuse existing records. A consortium label does not establish its members.
2. Research governance, operation, funding, membership, contribution, and transfer
   using primary sources beyond the homepage: authority documents, member lists,
   grant and annual reports, contributor documentation, and upstream/downstream
   dataset records or export documentation, as applicable. Follow named partners
   and data destinations to their own evidence. Distinguish national, subnational,
   institutional, and collective authority. Funding a dataset does not necessarily
   fund its repository.
3. Check every asserted edge's direction, endpoints, meaning, provenance, and time
   scope. Explain the supported role or data contribution in the edge description
   and attach the supporting sources to the edge itself. For funding, identify the
   recipient/activity, any intermediary, and supported period. For transfers, identify
   the data, documented path/method, update cadence and latest observed release when
   available; distinguish live, periodic, historical, planned, and unknown status.
   A source's access date does not prove a relationship is current. Review existing
   edges as critically as new ones; a hyperlink, shared operator, scientific advice,
   or downstream reuse alone does not prove governance, membership, or a direct or
   reciprocal transfer.
4. During authorized backfills, add verified missing relationships and remove
   unsupported assertions through `PATCH /api/records/:id`; create minimal missing
   endpoint records as needed. For research-only requests, propose these changes
   without applying them. Do not invent authority, contributors, grants, or
   memberships to fill the graph.
5. Report the organizations/systems and evidence examined, what was established,
   and which candidates were withheld and why. When no edge is supported, explain
   the specific research gap or why the relationship is inapplicable. Distinguish
   historical evidence from current or planned activity and unknown continuation.
   A missing edge alone does not demonstrate that a type was reviewed.
6. Run `validateOnly=true` on the resulting aggregate before applying; re-read to
   verify both endpoints and confirm the final edge set. Reassess the research
   whenever relationships or their supporting evidence change.

Relationship content has one owner: the edge. Put the complete explanation in
`description` and the evidence for that explanation in the edge's `sources`
collection. Do not author edge `properties`, `sourceRefs`, `scope`, `status`, or
other supplemental prose fields. Add a structured field only when an actual
filter, calculation, or automated behavior requires it. Node properties and
localization details contain no separate connection summary.

The six-type/endpoint constraints were introduced by
`server/schema/009_relationship_contract.sql`; migration 018 applies the current
names and the description/sources-only edge shape. Migration 009's historical
rich-record downgrade used former localization review fields that are no longer
part of the current rich criteria. Promote records through the API only after the
current criteria pass. Regenerate the public bootstrap from Postgres after graph
changes.

## Disciplines

Use `properties.disciplines` as an array of unique IDs from `shared/domain.ts`.
The API rejects unknown IDs, duplicates, non-array values, and the retired `role`
and `disciplineFamily` properties at every record depth. Labels are translated
in `shared/vocabularyLabels/disciplines.ts`; do not store labels or translated IDs in records.

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
- `format`: an approved `dataFormats` ID from `shared/domain.ts`, identifying the concrete encoding or package in which content can be retrieved.
- `standard`: an approved `dataStandards` ID from `shared/domain.ts`, describing a documented data model, metadata schema/profile, controlled vocabulary, or quality-control convention.

Each neutral descriptor should have `id`, `category`, `label`, and optional `source`
(required for rich records). For all descriptor categories, `label` stores the canonical ID;
its translated display name comes from `shared/vocabularyLabels/dataTypes.ts`,
`dataFormats.ts`, or `dataStandards.ts`, through the shared `i18n.ts` lookup. Keep its localized entry's
`id` and `description`, and omit `label`. Standard descriptors require a resolving
source and scoped descriptions in all six locales at every record depth.

Keep descriptors broad enough to scan. Do not create one descriptor per table unless table-level detail is essential.

### Approved Standards

Use the smallest source-backed set, once per standard per system. The list is
flat. It describes documented use within the localized scope, not certification
that every record conforms. Versions and application-specific qualifications
belong in descriptions. Standards may be absent; do not invent an assignment.

| ID | Label | Definition |
| --- | --- | --- |
| darwin_core | Darwin Core | Biodiversity data terms and record model. |
| emof | Extended MeasurementOrFact (eMoF) | Measurements and facts linked to biodiversity occurrences or sampling events. |
| dna_derived_data | DNA-derived data extension | DNA-derived occurrence evidence and associated molecular methods. |
| humboldt_extension | Humboldt Extension | Biodiversity inventory and survey context, effort and completeness. |
| eml | Ecological Metadata Language (EML) | Ecological dataset metadata. |
| ggbn | GGBN Data Standard | Genomic material/sample facts used with an appropriate base schema. |
| abcd | Access to Biological Collection Data (ABCD) | Detailed biological collection/specimen data model. |
| mixs | Minimum Information about any Sequence (MIxS) | Sequence-associated sample and environmental metadata; specify checklist/package in the description. |
| bcdm | Barcode Core Data Model (BCDM) | DNA barcode records and their specimen context. |
| insdc | INSDC specifications | Shared sequence annotation, submission and controlled-vocabulary specifications; identify applicable components. |
| cf | Climate and Forecast (CF) conventions | Scientific variables, coordinates, units and observation geometry. |
| acdd | Attribute Convention for Data Discovery (ACDD) | Discovery attributes attached to scientific datasets. |
| argo | Argo data conventions | Official Argo data structures, reference tables, data modes and quality flags. |
| oceansites | OceanSITES conventions | Ocean time-series data structures and metadata profile. |
| ioos_metadata | IOOS Metadata Profile | IOOS data/metadata requirements built on CF and ACDD. |
| sgrid | SGRID conventions | Structured model-grid topology. |
| ugrid | UGRID conventions | Unstructured model-grid topology. |
| seadatanet | SeaDataNet data profiles | SeaDataNet-specific data structures and conventions; name the profile in the description. |
| nerc_vocabularies | NERC/SeaDataNet vocabularies | Controlled concepts for marine parameters, units, instruments and related data; name relevant collections. |
| qartod | QARTOD | Real-time ocean-observation quality-control tests and flag conventions; identify implementation scope. |
| iso_19115 | ISO 19115 metadata | Geographic metadata model, including applicable parts and profiles. |
| iso_19139 | ISO 19139 metadata | XML implementation schema for ISO geographic metadata. |
| iso_19115_3 | ISO 19115-3 metadata | XML implementation schema for the newer ISO geographic metadata model. |
| seadatanet_cdi | SeaDataNet CDI metadata profile | Marine discovery metadata used by the Common Data Index. |
| cioos_metadata | CIOOS metadata profile | CIOOS catalogue metadata requirements. |
| dublin_core | Dublin Core | General resource metadata elements and terms. |
| datacite | DataCite Metadata Schema | Resource citation, attribution, discovery and relationship metadata. |
| dcat | Data Catalog Vocabulary (DCAT) | Dataset, catalogue and distribution descriptions. |
| dcat_ap | DCAT Application Profile (DCAT-AP) | European application profile of DCAT; specify profile/version. |
| schema_org | Schema.org | Structured resource descriptions; specify the applicable type or ODIS publishing pattern. |
| re3data | re3data metadata schema | Research repository descriptions. |
| dif | Directory Interchange Format (DIF) | Earth-science discovery metadata. |
| fgdc_csdgm | FGDC CSDGM | Legacy geographic metadata content standard; assign only to an actual supported representation. |
| datras | DATRAS data model | Haul, length, age-related biological and litter record structures. |
| intercatch | InterCatch data model | Fisheries catch submission structures and conventions. |
| rdbes | RDBES data model | Commercial fisheries sampling and estimation input structures. |
| ices_vocabularies | ICES controlled vocabularies | ICES-managed coded values; specify the relevant vocabularies. |
| asfis | ASFIS species classification | Species codes used for fisheries statistics. |
| isscaap | ISSCAAP | Statistical classification of aquatic animals and plants. |
| isscfg | ISSCFG | Statistical classification of fishing gear. |
| fao_fishing_areas | FAO fishing areas | Standard statistical fishing-area classification. |


1. Read the current record and its sources. Research the system's official technical documentation or an actual data/metadata response. A standard's own website proves its definition, not the system's use.
2. Select only approved IDs, once each per system. New standards require an explicit human decision on the ID, definition, record and evidence, then shared vocabulary/translation deployment before use. The initial vocabulary above was approved for the 2026-09-10 rollout.
3. Attach an owner-local source to every standard descriptor, including thin/stub records. Supply a nonempty description in each of the six locales. Each description must identify the affected output, metadata interface, submission workflow or product family, and whether the convention is used, accepted, required, or recommended. A recommendation alone must not be presented as implemented support.
4. Use source-backed scope. Do not infer CF from NetCDF, Darwin Core from OBIS/GBIF links, or any standard from an operator, member, parent/child system, source dataset, or planned connector. Do not automatically assign underlying standards from a profile name.
5. Keep versions, extensions/checklists, vocabulary collections and exceptions in the description. Do not make one ID per version or parameter. Assign both a profile and its base only when documentation supports both and the description distinguishes them.
6. Formats remain encodings/packages, including Darwin Core Archive. Transport protocols stay in access/routes; licensing stays in access/profile guidance; internal reference numbers and taxonomic-reference relationships stay in prose. Do not add discipline, type or format vocabulary entries as part of this rollout.
7. No minimum standard count. When research does not establish a suitable assignment, use an empty standards set and explain the specific limitation in every locale's `details.researchGaps.standards`. Empty means no verified assignment, not no standards used. Existing unrelated descriptors remain intact.
8. Use authenticated `PATCH /api/records/:id` only. Preserve unrelated sections and content, localizations, metrics, edges, routes, review history and record depth. Array updates must retain unrelated items. New source objects contain only id, url, six-language title and accessedAt.
9. Run `validateOnly=true`, report issues, correct them, then apply using `x-ryu-record-updated-at` from a fresh read. Re-read and compare the intended sections. A stale precondition requires a fresh merge and validation; never force overwrite.
10. A standards-only audit does not make a record rich or human-reviewed. Leave record depth and review state unchanged.


PUT and PATCH reject unknown/duplicate standard IDs, localized label overrides,
missing or unresolved standard citations, and missing descriptions in any of the
six locales at every depth. Standards belong on system nodes. The `dataStandard`
filter accepts only canonical IDs. No additional production table or schema
migration is required; backfills use the Record API. Historical research batches
must normalize and verify their standard descriptors before API submission;
the historical Formats migration does not verify standards.

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

### Approved Formats

Use each format at most once per record. PUT and PATCH reject unknown IDs,
duplicate assignments, and localized format-label overrides at every depth.
The `dataFormat` search filter accepts only canonical IDs. Shared labels cover
all six languages; retain format names/acronyms such as NetCDF and GeoJSON.

| ID | Label | Meaning |
| --- | --- | --- |
| `csv` | CSV | Comma-separated text records. |
| `tsv` | TSV | Tab-separated text records, including downloads marketed as CSV when the delimiter is a tab. |
| `parquet` | Parquet | Columnar Apache Parquet data files. |
| `json` | JSON | JSON records or responses; use a more specific approved format when applicable. |
| `xml` | XML | XML records or documents. |
| `html` | HTML | Actual record or document content delivered as web pages. |
| `pdf` | PDF | PDF documents and reports. |
| `netcdf` | NetCDF | Scientific array and observation data in NetCDF files. |
| `zarr` | Zarr | Chunked arrays in a Zarr store. |
| `bufr` | BUFR | Binary observation messages using WMO BUFR. |
| `geojson` | GeoJSON | Geographic features and geometries encoded as GeoJSON. |
| `shapefile` | Shapefile | An Esri shapefile dataset and its companion files. |
| `geopackage` | GeoPackage | Geographic data in an OGC GeoPackage. |
| `kml` | KML | Geographic features in KML, including a KMZ package containing KML. |
| `esri_file_geodatabase` | Esri file geodatabase | A downloadable Esri file geodatabase and its feature classes/tables. |
| `pmtiles` | PMTiles | A PMTiles archive containing map tiles. |
| `pbf` | Protocol Buffers (PBF) | Protocol Buffers encoded content; identify the specific message schema in the description and relevant route contract. |
| `png` | PNG | PNG images, including map tiles. |
| `darwin_core_archive` | Darwin Core Archive | A Darwin Core Archive data package, distinct from use of Darwin Core terms alone. |
| `fasta` | FASTA | Biological sequences in FASTA text format. |
| `fastq` | FASTQ | Sequence reads with quality scores. |
| `genbank_flatfile` | GenBank flat file | Annotated sequence records in GenBank flat-file format. |
| `embl_flatfile` | EMBL flat file | Annotated sequence records in EMBL flat-file format. |

Assign only formats supported by evidence for that system's actual content.
A website alone does not justify HTML, and downloadable documentation does not
establish the format of the underlying data. A ZIP wrapper, DOI, database engine,
R package, REST API, WMS service, XYZ URL template, raster/grid layout, or generic
"metadata schema" is not a format tag. Keep supported access mechanics in access
paths/routes, schemas and vocabularies in Standards, and explanatory detail in
localized prose. Record format versions, compression and package contents in
descriptions; do not multiply tags for incidental encodings inside a package.
For example, GeoJSON alone does not require an additional JSON tag.

Split genuinely distinct outputs into separate descriptors, preserving their
sources and corresponding localized descriptions. Do not turn "CSV / tabular"
into CSV without checking the actual delimiter. Do not infer a format from an
unimplemented connector or planned conversion. The node's Formats describe
available content; route `format` and `deliveryFormats` remain separate operational
metadata and are not rewritten by this change.

**Adding a format requires human approval in the authoring chat.** Present the
proposed ID, definition, record and source, and why existing formats do not fit.
Wait for explicit approval, update `dataFormats` and all six translations, and
release the vocabulary before authoring the new ID. Approval of a record or
silence does not approve a vocabulary addition.

For historical imports, `server/schema/012_data_formats.sql` provides the
repeatable conversion before exporting the graph. The canonical graph was
already converted through validated, version-checked Record API patches on
2026-09-09 (56 records); this release requires no additional database migration.
The conversion normalizes explicit names, splits CSV/Parquet and DLCD query outputs, retains one
descriptor per format (preferring sourced, then canonical entries), and removes
localized format labels. It reclassifies the named Darwin Core, EML, Extended
MeasurementOrFact and re3data schemas as Standards. It preserves sourced prose
from removed interface/backend claims in the localized profile with source refs;
vague unsourced claims and unverified encodings are removed. It leaves all owner
source collections, routes, edges and review history intact, and aborts on
generated descriptor-ID collisions. It is safe to rerun.

This migration normalizes existing claims, not their research status. Missing
sources/descriptions still need backfill, and retained labels do not certify a
format assignment as reviewed. In particular, Bio-ORACLE's incorrect sequence
standard is removed; its documented NetCDF content needs a sourced descriptor.
GBIF's TSV/Parquet, Marine Regions' GeoPackage/KML and ENA's specific sequence
formats are additional research findings, not automatic expansions of vague tags.
Empty format lists are allowed for incomplete records; do not add placeholders
to satisfy rich-record requirements.

## Metrics

Use one `nodes.properties_json.metrics` array. The approved vocabulary is closed:

| Group | Keys |
| --- | --- |
| Data | `record_count`, `occurrence_count`, `sample_count`, `sequence_count`, `species_count`, `storage_size_bytes` |
| Usage | `session_count`, `download_count`, `contributor_count`, `citation_count` |

`metricDefinitions` in `shared/domain.ts` assigns each key its fixed unit and
Data/Usage group. Shared labels live in `shared/vocabularyLabels/metrics.ts`.
Agents must not write units, labels, group overrides, or alternate metric keys.
New keys, units, and material definition changes require explicit human approval
in the current authoring chat, followed by a domain/catalog release before use.
Propose the measurement, meaning, evidence, and why existing keys do not fit.
Until approved, retain the sourced finding in profile prose, not a new metric.

Each observation contains `id`, `key`, `value`, `observedAt`, `source`, and an
optional `period`. For example:

```json
{
  "id": "public-species-count",
  "key": "species_count",
  "value": 36535,
  "observedAt": "2026-02",
  "source": "official-statistics"
}
```

The source ID resolves against the owning node's `sources`. Each localization's
`details.metrics` contains matching `{ "id": "...", "description": "..." }`
entries. Rich records need non-empty descriptions in all six languages.
Validation rejects unknown keys/fields, malformed values and dates, unresolved
sources, duplicate IDs, localized label/unit overrides, and retired metric fields
at every record depth. Store values within JavaScript's safe numeric range; never
silently round an exact integer that cannot be represented.

Definitions and research rules:

- Records are native entries/rows; occurrences are occurrence records; samples are
  represented samples; sequences are sequence entries, not nucleotide bases;
  species are represented species. Explain the counting basis and scope.
  These counts can overlap; do not add them together or rank unlike units.
- Size is bytes. Convert source units carefully and describe whether the value is
  a live database, public snapshot, compressed export, or subset. Include release
  and format in the description. Do not present snapshot size as production size.
- Sessions count sessions, not visits, page views, or unique users. Downloads count
  download events, not downloaded rows. Contributors count the stated community
  or roster. Citations measure research use, not references held in the system;
  name the citation index and its scope in the description.
- Usage observations may set `period` to `day`, `month`, `year`, or `cumulative`.
  Omit it or use null when unknown. Explain the actual reporting window or whether
  this is a reported typical rate. `observedAt` alone does not establish a period.
  Do not infer monthly sessions from an unqualified session count or relabel visits.
- `observedAt` is the date the figure refers to, at its published precision.
  Unknown dates use null with an explanation. A source's `accessedAt` is the date
  consulted, and a release/version is not automatically an observation date.
- Preserve approximations, bounds, counting methods, and limitations in descriptions.
  For counts or sums derived from a source, document the selection and calculation.
  Missing values are absent, not zero. Do not annualize or derive unsupported ratios.
- Investigate Data and Usage. For rich records, if a group has no supported metric,
  explain the result in every locale's `details.researchGaps.data` or `usage`.
  Gaps may also explain missing measures within a partially populated group.
- Keep IDs stable when correcting an observation. A genuinely different period or
  release may have another observation. Preserve unrelated metrics and sources.
- Use the normal Record API workflow: fresh read, `validateOnly=true`, inspect
  errors, then apply with `x-ryu-record-updated-at`. Array replacements must retain
  unrelated items. Review state changes use the review endpoint.

### Migration from the three legacy metric fields

`server/schema/013_system_metrics.sql` moves `data.recordCount`, `data.storageSize`,
and `usage` into `metrics`, preserving IDs, values, dates and sources. A species
record count becomes `species_count`. Contributor units are normalized through
the shared definition. Unsupported measurements, including legacy `view_count`,
become profile prose with owner-local profile source references. The migration
does not establish whether SeaLifeBase sessions are monthly. Verify that evidence
before authoring a new `session_count` observation.

Run this deliberate migration after earlier schema migrations, with a backup and
coordinated app release. The new reader fails explicitly on legacy metric fields;
it must not silently hide unmigrated data. SQL is transactional and repeatable,
and aborts on ID collisions or orphaned localized evidence. It preserves sources,
edges, routes, review history and depth. Revalidate records before promoting them.
The API rejects the old fields after cutover; there is no permanent dual write.

## Access Paths

Use `nodes.properties_json.access` for access mechanics and `node_localizations.details_json.access` for localized access prose. Access and submission remain one record section, but the UI splits read paths from write/contribution paths.

Read and Write access include human and machine connections. Every access entry has exactly:

- `id`: stable ID unique within the node's access array.
- `type`: `read` or `write`. The old `submit` and `partner_sync` types are retired.
- `methods`: a nonempty, unique array from `readAccessMethods` or `writeAccessMethods`, matching the direction.
- `url`: a useful portal, documentation page, endpoint, download, URL template or storage/transfer address. Supported schemes are HTTP, HTTPS, FTP, FTPS, SFTP, rsync, S3 and GS. Never embed credentials.
- `requirements`: unique approved IDs, `[]` when the absence of prerequisites is verified, or `null` when requirements are unknown.
- `cost`: `free`, `paid`, `mixed` or `unknown`.
- `sourceRefs`: a nonempty, unique list of IDs resolving against this node's sources. The shared Source shape is unchanged.

| Read method | Meaning |
| --- | --- |
| `browse` | Search, inspect or visualize data through a website. |
| `download` | Retrieve files, exports, snapshots or stored objects. |
| `api` | Query or retrieve data programmatically, including map services and metadata harvesting. |
| `software` | Retrieve data using a client library, SDK, CLI, toolbox or application that the user runs. |
| `request` | Follow a documented process to request data. |

Hosted ERDDAP is classified by its offered browse/download/API access. Client tools are software. SPARQL, WFS, WMS and WMTS are API access; retain the interface name and its scope in the title and description. A map viewer is browse access. Metadata catalogue and harvesting access is retained, with guidance explicitly distinguishing metadata from underlying data. Do not add protocol-specific method IDs.

Write methods describe how a contributor provides data, metadata, corrections or other accepted content:

| Write method | Meaning |
| --- | --- |
| `form` | Enter or edit content through web forms. |
| `upload` | Send files, including browser uploads or managed file transfer. |
| `api` | Create, update or submit content programmatically. |
| `software` | Contribute through a client tool, CLI or application the contributor runs. |
| `request` | Contact staff or follow a mediated contribution process. |
| `harvest` | Expose or register a source that the receiving system retrieves. |

Hosted IPT and other server packages are classified by their offered form/upload/harvest workflows. Keep package, protocol and template names in guidance. DOI publication is an outcome, not a method. A read API does not establish write support.

Requirements are `account`, `api_key` (key or access token), `approval`, and `affiliation` (membership of an eligible organization or group). Tag only confirmed prerequisites for the described access. Unknown does not mean unrestricted. `approval` means permission to participate; routine curator review belongs in prose. Cost concerns obtaining data for Read or contributing/publishing it for Write, not opening documentation. Describe conditional requirements and variation in prose; split entries when conditions materially differ. Free access does not establish an unrestricted reuse licence.

Each access entry requires exactly one localized `{ id, label, description }` item in every supported locale, including thin/stub records. Labels name the destination or interface. Descriptions explain what the user receives or contributes, where to start, prerequisites and material limits. For Write, name accepted content, preparation steps, submission versus publication, curation and any upstream repository involved. Include relevant subset, snapshot, quota, licensing, map-image versus feature, and metadata-versus-data distinctions. Consolidate legacy `instructions` and `caveats` into `description`, preserving useful information. Never use boilerplate such as "Access via API."

Use multiple methods on one entry when they describe the same useful destination and conditions. The same method may occur on several entries. Consolidate redundant rows, verify destinations from official documentation and actual responses, and preserve distinct useful services. A generic project homepage rarely establishes an API or download route. Do not manufacture access for a planned system; record the gap in localized prose when no current path is verified.

The approved vocabularies live in `shared/domain.ts`, with all six translations in `shared/vocabularyLabels/access.ts`. Additions require explicit human approval in the authoring chat and a vocabulary/translation release. API validation enforces the shared shape, approved values, source resolution and six-language guidance at every depth. The old singular `method` and `source` fields are rejected for all access entries.

Do not retain outgoing preservation copies or federation plans as Write access. Preserve evidenced data movement on `transfers` edges and describe planned or unavailable contribution arrangements in sourced profile prose. Retiring an access row must not remove its source or an existing edge.

Do not add negative access rows for unavailable access. Describe a limitation on a real path in its guidance or the profile. Endpoint availability does not establish an inter-system relationship: only evidenced data movement supports a `transfers` edge, directed from provider to recipient regardless of who initiates the request. Operational agent route selection remains in `ryu_routes`.

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

Gallery images should be local, stable, and useful. Every rich system requires
at least one gallery item. `stub` and `thin` systems may keep the neutral and
localized gallery arrays empty while useful captures are still being researched.
Countries and organizations do not inherit this system-only requirement.

The existing gallery shape carries the necessary meaning without a new category:
the neutral item identifies the captured asset and source, while each localized
title and caption explains the representative record or data content shown. One
image may show both a representative record and several data types. Runtime
validation enforces a nonempty rich-system gallery, resolved sources, existing or
HTTP(S) assets, matching IDs, and nonblank titles and captions in all six locales.
Human review confirms that the described content is actually visible; do not use
keyword checks or filenames as a substitute for reviewing the image.

Avoid blocked iframes and decorative screenshots.

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

A generic homepage, logo, navigation menu, sign-in page, or decorative image may
be supplemental context after the requirement is met, but none qualifies by
itself. If no useful capture is currently available, keep the record `thin`,
document the blocked target for the human, and do not fabricate an image or
silently promote the record to `rich`.

## Identifiers

Do not add identifier sections to Ryu records. The language migration removed legacy identifiers from the long-term record model, UI, and search surface.

## Updating The DB

Use the record API, which applies each record write in one Postgres transaction.

Recommended order:

1. Create minimal missing relationship endpoint records through `/api/records`.
2. Read the system record and its current `recordUpdatedAt`.
3. Assemble its neutral fields, localizations, routes, node-owned sources, and relationship updates with their edge-owned sources. Include required title translations in the same write as localization changes.
4. Run `validateOnly=true`, resolve reported errors, then apply with the current record precondition. Use the dedicated review endpoint for review decisions.
5. Regenerate `client/public/bootstrap.public.json` when updating the launch export.
6. Run validation.

Do not delete unrelated rows for other systems. Do not change existing user or agent work outside the target system unless required by a proven correction.

## Validation Checklist

Use a fresh authenticated `GET /api/records/:id?include=localizations,sources,edges,routes`
for the target system. Validate the intended PUT/PATCH with `validateOnly=true`
and its record timestamp before applying, then re-read and compare the result.

Confirm:

- Neutral fields and all localized detail objects match the closed contract;
  supplied arrays have matching, unique item IDs.
- All six relationship types have been investigated; verified material connections
  are persisted as edges with their own evidence, scope, and time/status caveats.
  No material connection research remains unfinished.
- Required access URLs, descriptions, sources and metric evidence are present.
- Missing standards or Data/Usage metrics have specific localized research gaps.
- At least one gallery item shows a representative record or data content; its
  title and caption describe the same evidence consistently in all six locales.
- Gallery local files exist for every local `url` and `thumbnailUrl`.
- The write preserved unrelated content and used the expected review workflow.

For code/contract changes, run `npm run build` and `npm test`. These use local
PostgreSQL tests; production credentials are unnecessary. Direct database repairs
must separately run aggregate validation and handle review invalidation. The SQL
shape guard does not certify research depth, evidence truth, or translations.

## Final Summary For Users

When reporting a completed backfill, include:

- What system was updated.
- Main profile improvements.
- A concise sourced connection summary: endpoints, relationship type/direction,
  evidence, scope, and time/status caveats for material additions or corrections;
  identify unresolved candidates and why they were withheld.
- Counts of descriptors, access paths, gallery items, and metrics.
- The most important sourced metrics.
- Any caveats, especially about approximate counts, snapshot-vs-live sizes, or missing usage data.
- Validation commands that passed.

Keep the summary factual and short. Do not paste the entire record unless requested.
