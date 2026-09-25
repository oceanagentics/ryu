# Country Records For Ryu

Use this guide when creating, researching, or backfilling a Ryu `country` node
at any record depth. Country records are compact ocean-governance profiles: they
identify the country, explain the relevant public and marine context, record
researched treaty participation, and connect the country to organizations and
systems through evidenced relationships.

For organization authoring, see
[ORGANIZATION_RECORDS.md](ORGANIZATION_RECORDS.md). For system authoring, see
[SYSTEM_RECORDS.md](SYSTEM_RECORDS.md).

## Contract Authority

The positive TypeScript contract is `shared/records/country.ts`. The runtime
validator is `server/src/recordContracts/country.ts`; shared source, locale,
edge, and review validation is in `server/src/recordContracts.ts`. PostgreSQL
guards are in `server/schema/015_country_record_shape.sql` and
`server/schema/017_node_kind_contracts.sql`. The complete synthetic example is
[`server/src/fixtures/rich-country.json`](../server/src/fixtures/rich-country.json).

The contract is closed. A country cannot carry a system or organization URL,
description, descriptors, disciplines, metrics, offices, access paths,
galleries, or routes. Unknown fields are invalid at every record depth.

## Record Depth

`recordDepth` records research completeness. Localization `review.state`
separately records acceptance; `rich` never means `human_reviewed`.

### Stub

A stub is the minimum country record accepted by PostgreSQL. It reserves a
valid, globally unique node ID and identifies the node kind. No country code,
localization, source, treaty, or relationship is required.

The minimum Record API create payload is:

```json
{
  "record": { "kind": "country" }
}
```

With `x-ryu-create-only: true`, persistence supplies `countryCode: null`,
`recordDepth: "stub"`, `properties: {}`, and `sources: {}`. The ID comes from
`PUT /api/records/:id`. These materialized defaults are the canonical stub
shape.

### Thin

A thin country is any structurally valid country record with more authored
content than the canonical stub that does not meet every rich requirement. A
country code, title-only localization, profile source, treaty item, or incident
relationship makes the record more than a stub. Set `recordDepth: "thin"` when
any such content is persisted.

The database tolerates optional, correctly shaped content at `stub` depth, but
that is not the authoring definition. Do not leave an enriched country labeled
`stub`. Keep it thin while identity, six-language publication, treaty research,
source coverage, or relationship review remains incomplete.

### Rich

A rich country has an uppercase ISO alpha-3 identity code, a source-backed
profile in all six supported locales, and at least one fully researched treaty
participation item with matching localized content. Every treaty explicitly in
scope for the record has been investigated, and the applicable `governs`,
`funds`, and `member` relationships have been reviewed. No relationship is
required merely to reach a count; evidence determines whether an edge exists.

Automated validation establishes shape, completeness, vocabulary, dates, and
citation resolution. It does not establish the truth of a claim, the adequacy of
the treaty scope, or translation quality.

## Canonical Shape

Content PUT bodies contain only optional matching `id`, `record`,
`localizations`, `edges`, and optional `incomplete`. Country records have no
`routes` section. Do not send a GET response back unchanged: timestamps,
computed summaries, localization `locale`, and review metadata are response
fields.

| Object | Authored fields |
| --- | --- |
| `record` | `kind`, `countryCode`, `recordDepth`, `properties`, `sources` |
| `record.properties` | Optional `treatyParticipation` |
| Localization | `title`, optional `summary`, optional `details`, optional `translatedFromLocale` |
| Localization `details` | Optional `aliases`, `profile`, `treatyParticipation` |
| `details.profile` | `sourceRefs` |
| Neutral treaty participation | `id`, `status`, `signatureDate`, `consentMethod`, `depositDate`, `effectiveDate`, `focalPointUrl`, `sourceRefs` |
| Localized treaty participation | `id`, `title`, `description`, `focalPoint` |
| Owned source | `id`, `url`, `title`, optional `description`, `accessedAt` |

For rich records, `properties.treatyParticipation` and every listed localization
section are required; all six locales must be present. Rich titles, summaries,
profile source references, and treaty descriptions are nonblank. Aliases may be
empty. Neutral and localized treaty IDs must match exactly.

Thin records may omit unfinished optional sections. Every supplied field at any
depth must retain the closed shape: arrays are arrays rather than null or
ID-keyed objects; IDs are stable owner-local slugs; references resolve against
the country's sources; aliases and reference lists contain no duplicates. The
canonical stub supplies none of these optional sections.

## Treaty Participation

Use `status` for the current legal position: `party`,
`signatory_not_party`, `not_party`, or `withdrawn`. Use `consentMethod` for the
distinct international act: `ratification`, `acceptance`, `approval`,
`accession`, or `definitive_signature`. Do not reduce these concepts to a
`ratified` boolean.

`signatureDate`, `depositDate`, and `effectiveDate` use `YYYY-MM-DD` or null.
Record dates only when the official status source supplies the corresponding
act. `focalPointUrl` is an official HTTP(S) directory or page, or null; never
copy a personal email address into it. `sourceRefs` is nonempty for every treaty
item and resolves against the country's source collection.

The localized `title` uses the recognized treaty name in that language. The
localized `description` explains participation and material qualifications,
including reservations, declarations, provisional application, unusual legal
history, or an explicit as-of date for pending action. The localized
`focalPoint` names the stable designated institution or office, or is null.
Treaty signatories and meeting delegates are not assumed to be current contacts.

Research every treaty deliberately placed in scope for the country record, but
do not imply that a rich record is an exhaustive treaty census.

## Country Prose

Write publication-ready, factual prose about the country and its institutions.
Make those entities the subjects of sentences. Internal project and research
process notes belong in documentation or review history, not public prose.

- `title` is the localized country name.
- `summary` is the country introduction, normally two or three sentences with
  useful geographic, ocean, and institutional context.
- `details.aliases` contains useful search or citation aliases.
- `details.profile.sourceRefs` cites the important profile claims.
- `translatedFromLocale` points to a different localization included on the
  record, or is null for original prose.

Translate the same facts and qualifications naturally into Arabic, Chinese,
English, French, Russian, and Spanish. The country contract deliberately has no
separate localization `description`; put the coherent public introduction in
`summary` and treaty-specific prose on the treaty item.

## Sources And Evidence

Use official and primary sources: government identity pages, treaty depositary
status tables, official focal-point directories, legislation, and formal
institutional documents. Current facts must be freshly checked rather than
recalled from memory.

Sources are owned by the country and keyed by their own ID. Each source contains
exactly `id`, `url`, `title`, optional `description`, and `accessedAt`.
`url` is absolute HTTP(S), `accessedAt` is `YYYY-MM-DD`, and title maps contain
nonblank values for every localization that uses the source. Rich records have
all six title translations. There is no global source registry.

Profile and treaty references resolve against `record.sources`. Relationship
evidence belongs to the edge's own `sources` collection, not the country. Source
completeness measures resolved citations, not whether the upstream body has
published every possible fact.

## Relationship Review

Country nodes may author these outgoing relationships:

| Type | Allowed endpoint | Evidence threshold |
| --- | --- | --- |
| `governs` | country -> organization/system | Formal decision authority, with its scope stated. |
| `funds` | country -> organization/system | Documented financial support, recipient/activity, and period when known. |
| `member` | country -> organization | Documented membership or participation. |

A treaty Party is not automatically a unilateral governor of the treaty body or
its clearing-house system. Shared geography, funding, an address, or a hyperlink
does not establish governance or membership.

Before marking a country rich, read every incident edge, inspect candidate
endpoint records, research the three applicable relationship types with primary
sources, and check direction, scope, provenance, and time status. Persist only
material supported connections. Each edge has exactly `id`, `sourceNodeId`,
`targetNodeId`, `kind`, `description`, and `sources`; the description carries the
full relationship meaning and the edge sources directly support it. Do not add
edge `properties`, `sourceRefs`, `scope`, or `status` fields.

## Record API Workflow

PostgreSQL is the canonical editable graph. During static hosting, restore it
locally and use the local Record API; the hosted API is offline. Follow
[the static hosting runbook](static-hosting.md#snapshot-and-local-editing) to
export and publish data changes. Research CSVs and
`client/public/bootstrap.public.json` are import/export artifacts, not alternate
sources of truth.

1. Read `GET /api/records/:id?include=localizations,sources,edges` and retain its
   current `recordUpdatedAt`.
2. Research identity, profile, scoped treaties, focal points, and relationships.
3. Assemble only the country-shaped sections. Use `recordDepth: "thin"` until
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

Report the country updated, identity/profile improvements, treaties researched,
focal-point findings, and relationships added, corrected, or withheld. Identify
specific unresolved questions and distinguish historical, current, planned, and
unknown status. Include the validation commands that passed; do not paste the
entire record unless requested.
