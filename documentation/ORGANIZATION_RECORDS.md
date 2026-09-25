# Organization Records For Ryu

Use this guide when creating, researching, or backfilling a Ryu `organization`
node at any record depth. Organization records explain what an institution is,
why it exists, when it was established, its documented scale, where it maintains
offices, and how it participates in the graph.

For country authoring, see [COUNTRY_RECORDS.md](COUNTRY_RECORDS.md). For system
authoring, see [SYSTEM_RECORDS.md](SYSTEM_RECORDS.md).

## Contract Authority

The positive TypeScript contract is `shared/records/organization.ts`. The
runtime validator is `server/src/recordContracts/organization.ts`; shared
source, locale, edge, and review validation is in
`server/src/recordContracts.ts`. PostgreSQL guards are in
`server/schema/016_organization_record_shape.sql` and
`server/schema/017_node_kind_contracts.sql`. The complete synthetic example is
[`server/src/fixtures/rich-organization.json`](../server/src/fixtures/rich-organization.json).

The contract is closed. An organization cannot carry a country code, system
descriptors, disciplines, access paths, gallery content, treaty participation,
or routes. Unknown fields are invalid at every record depth.

## Record Depth

`recordDepth` records research completeness. Localization `review.state`
separately records acceptance; `rich` never means `human_reviewed`.

### Stub

A stub is the minimum organization record accepted by PostgreSQL. It reserves a
valid, globally unique node ID and identifies the node kind. No URL,
localization, source, fact, office, metric, or relationship is required.

The minimum Record API create payload is:

```json
{
  "record": { "kind": "organization" }
}
```

With `x-ryu-create-only: true`, persistence supplies `url: null`,
`recordDepth: "stub"`, `properties: {}`, and `sources: {}`. The ID comes from
`PUT /api/records/:id`. These materialized defaults are the canonical stub
shape.

### Thin

A thin organization is any structurally valid organization record with more
authored content than the canonical stub that does not meet every rich
requirement. A canonical URL, title-only localization, source, establishment
fact, metric, office, or incident relationship makes the record more than a
stub. Set `recordDepth: "thin"` when any such content is persisted.

The database tolerates optional, correctly shaped content at `stub` depth, but
that is not the authoring definition. Do not leave an enriched organization
labeled `stub`. Keep it thin while identity, six-language publication,
institutional fact research, source interpretation, or relationship review is
incomplete.

### Rich

A rich organization has a canonical HTTP(S) URL and six complete, cited
localizations with title, summary, description, aliases, and mission. Its
establishment, scale, and active office locations have each been researched;
supported facts are recorded, and every unavailable category has a specific
localized research gap. It also has at least one evidenced incident relationship
and a completed review of every applicable relationship type.

Automated validation establishes shape, completeness, vocabulary, dates, and
citation resolution. It does not establish the truth of a claim, the quality of
the institutional research, or translation quality.

## Canonical Shape

Content PUT bodies contain only optional matching `id`, `record`,
`localizations`, `edges`, and optional `incomplete`. Organization records have
no `routes` section. Do not send a GET response back unchanged: timestamps,
computed summaries, localization `locale`, and review metadata are response
fields.

| Object | Authored fields |
| --- | --- |
| `record` | `kind`, `url`, `recordDepth`, `properties`, `sources` |
| `record.properties` | Optional `established`, `metrics`, `offices` |
| Established fact | `date`, `source` |
| Scale metric | `id`, `key`, `value`, `observedAt`, `source` |
| Neutral office | `id`, `kind`, `source` |
| Localization | `title`, optional `summary`, `description`, `details`, `translatedFromLocale` |
| Localization `details` | Optional `aliases`, `profile`, `offices`, `researchGaps` |
| `details.profile` | `sourceRefs`, optional `mission` |
| Localized office | `id`, `location` |
| `details.researchGaps` | Optional `established`, `scale`, `officeLocations` explanations |
| Owned source | `id`, `url`, `title`, optional `description`, `accessedAt` |

For rich records, the three property keys and `aliases`, `profile`, and
`offices` are required even when researched values are null or empty. All six
localizations must have nonblank title, summary, description, mission, and
profile source references. Neutral and localized office IDs match exactly. A
missing establishment fact, an empty metric list, or an empty office list is
valid only when every locale contains the corresponding specific research gap.

Thin records may omit unfinished optional sections. Every supplied field at any
depth must retain the closed shape: arrays are arrays rather than null or
ID-keyed objects; IDs are stable owner-local slugs; references resolve against
the organization's sources; aliases and reference lists contain no duplicates.
The canonical stub supplies none of these optional sections.

## Establishment

`established` is either null or `{ "date": "...", "source": "..." }`.
The date uses the most precise supported value: `YYYY`, `YYYY-MM`, or
`YYYY-MM-DD`. It means the legal or documented establishment represented by the
cited source. Do not silently substitute a predecessor's founding, treaty
signature, launch, reorganization, or renaming date. Put that qualification in
the source's localized `description`.

When no authoritative establishment date is available, rich records use
`established: null` and a specific `details.researchGaps.established`
explanation in every locale.

## Scale Metrics

Scale uses independently sourced measurements with one of three approved keys:

| Key | Meaning |
| --- | --- |
| `staff_count` | The documented staff population under the source's definition. |
| `member_organization_count` | The documented number of member organizations. |
| `member_country_count` | The documented number of member countries. |

Values are finite, non-negative safe numbers. `observedAt` uses `YYYY`,
`YYYY-MM`, `YYYY-MM-DD`, or null. Organization metrics do not have a reporting
`period`, authored label, unit, or inline description. Put the measurement's
definition, scope, date qualification, and caveats in the cited source's
localized `description`. Do not mix unlike membership categories into one
count. Missing measurements are absent, not zero.

When no applicable authoritative measurement is available, a rich record uses
an empty `metrics` array and a specific `details.researchGaps.scale` explanation
in every locale.

## Offices

Offices are a sourced list, never an office count. Each neutral item has a
stable `id`, an approved `kind` (`headquarters` or `office`), and one `source`.
Each localization contains one matching `{ "id", "location" }` item.

Include only documented active organizational offices. Do not count member
institutions, project sites, hosted secretariats, mailing addresses, or inferred
places. Users may derive a count from the list. When no authoritative current
office directory is available, a rich record uses empty neutral and localized
arrays plus a specific `details.researchGaps.officeLocations` explanation in
every locale.

## Organization Prose

Write publication-ready, factual institutional prose.

- `title` is the localized official or commonly recognized name.
- `summary` briefly identifies the organization and its role.
- `description` explains mandate, institutional setting, material scope, and
  operational context without duplicating every structured fact.
- `details.aliases` contains useful localized acronyms and former or alternate
  names.
- `details.profile.mission` states the sourced mission or purpose in concise
  localized language.
- `details.profile.sourceRefs` supports identity, mission, and important profile
  claims.
- `translatedFromLocale` points to a different localization included on the
  record, or is null for original prose.

Translate the same facts and qualifications naturally into Arabic, Chinese,
English, French, Russian, and Spanish. Model the responsible institution named
by the evidence. A ministry, agency, international body, consortium, or company
is an organization; its information service is a separate system.

## Sources And Evidence

Prefer official identity and mission pages, constituting instruments, annual
reports, audited reports, member lists, and official contact or office
directories. Current facts must be freshly checked rather than recalled from
memory.

Sources are owned by the organization and keyed by their own ID. Each source
contains exactly `id`, `url`, `title`, optional `description`, and `accessedAt`.
`url` is absolute HTTP(S), `accessedAt` is `YYYY-MM-DD`, and title maps contain
nonblank values for every localization that uses the source. Rich records have
all six title translations.

Every source cited by `established`, `metrics`, or `offices` must also have a
nonblank `description` in all six locales. That description carries the fact's
meaning and qualification: legal date versus predecessor history, staff versus
consultants, membership scope, or active office status. There is no global
source registry.

Profile references resolve against `record.sources`. Relationship evidence
belongs to the edge's own `sources` collection, not the organization. Source
completeness measures resolved citations, not whether the institution publishes
every potentially useful fact.

## Relationship Review

Organization nodes can participate in these relationships:

| Type | Allowed direction | Evidence threshold |
| --- | --- | --- |
| `governs` | country/organization -> organization/system | Formal decision authority, with its scope stated. |
| `operates` | organization -> system | Ongoing management or operation. |
| `funds` | country/organization -> organization/system | Documented financial support, recipient/activity, and period when known. |
| `member` | country -> organization or organization -> organization | Documented membership or participation. |
| `contributes` | organization -> system | Documented data contribution, publication, or submission. |

Funding, membership, shared infrastructure, an address, scientific advice, or a
hyperlink does not imply governance. A country's participation in a council does
not mean that it unilaterally governs the organization.

Before marking an organization rich, read every incident edge, inspect candidate
endpoint records, and research every applicable relationship type with primary
sources. Check direction, endpoint kind, scope, provenance, and time status.
Persist only material supported connections. Rich requires at least one
evidenced incident relationship, but no minimum count beyond that substitutes
for complete research.

Each edge has exactly `id`, `sourceNodeId`, `targetNodeId`, `kind`,
`description`, and `sources`. The description carries the complete relationship
meaning, including material scope and timing; edge sources directly support it.
Do not add edge `properties`, `sourceRefs`, `scope`, or `status` fields.

## Record API Workflow

PostgreSQL is the canonical editable graph. During static hosting, restore it
locally and use the local Record API; the hosted API is offline. Follow
[the static hosting runbook](static-hosting.md#snapshot-and-local-editing) to
export and publish data changes. Research CSVs and
`client/public/bootstrap.public.json` are import/export artifacts, not alternate
sources of truth.

1. Read `GET /api/records/:id?include=localizations,sources,edges` and retain its
   current `recordUpdatedAt`.
2. Research identity, mission, establishment, scale, active offices, and
   relationships.
3. Assemble only organization-shaped sections. Use `recordDepth: "thin"` until
   every rich criterion is satisfied.
4. Run the intended write with `validateOnly=true`, correct every issue, then
   apply it with `x-ryu-record-updated-at` from the fresh read.
5. Re-read the aggregate and compare the intended content and edges.
6. After a completed research pass, append `agent_researched` for each researched
   localization through `PATCH /api/records/:id/review`. The server supplies the
   reviewer identity and timestamp. Only an authorized reviewer may set
   `human_reviewed`.

PUT and PATCH validate the resulting aggregate, including retained content.
Omitted existing localizations, sources, and edges are preserved rather than
deleted. A rich record cannot use `incomplete: true`. Review state changes use
the review endpoint, never a content payload.

For contract or application changes, run `npm run build` and `npm test`. Routine
content writes use the API dry run and re-read verification. Regenerate the
public bootstrap with `npm --workspace server run export:public` only when the
launch export itself is being updated.

## Completion Report

Report the organization updated, identity and mission improvements,
establishment/scale/office findings, and relationships added, corrected, or
withheld. Identify specific unresolved questions and distinguish historical,
current, planned, and unknown status. Include the validation commands that
passed; do not paste the entire record unless requested.
