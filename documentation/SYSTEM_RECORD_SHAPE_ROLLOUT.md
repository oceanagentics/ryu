# System record shape rollout

This implementation closes system properties and localized details around the
FishBase shape. The API validates final PUT/PATCH aggregates at all depths;
`server/schema/014_system_record_shape.sql` guards SQL/import structure. The
reference schema contains the same guard. Neither validator removes unknown
content, and migration 014 refuses installation over incompatible records.

## Reviewed data and completed metadata repairs

The audit used the prepared 2026-09-10 data release at commit
`3b103c189498c757948f98f99d32632c6fe9d845`, following its metrics conversion and
standards/Read/Write merges. It is an audit snapshot, not a new data registry or
a current production certification. Of 61 system records, 53 pass the new
aggregate validator. Eight needed the repairs below. The prepared FishBase
content also passes with `recordDepth: rich`; production and prepared depth
remain unchanged by this implementation.

| System | Repaired fields / issue |
| --- | --- |
| `ecotrust-oregon-fisheries-uses-values` | `caveats`, `domains`, `priority`, `sourceRefs`, `geographies`, `capabilities` |
| `gebco-web-services` | `priority`, `sourceRefs`; orphaned English descriptor entry |
| `noaa-cetacean-bia` | `caveats`, `domains`, `priority`, `sourceRefs`, `geographies`, `capabilities` |
| `noaa-esi-wa-or-marine-mammals` | `caveats`, `domains`, `priority`, `sourceRefs`, `geographies`, `capabilities` |
| `odfw-commercial-landings` | `caveats`, `domains`, `priority`, `sourceRefs`, `geographies`, `capabilities` |
| `openstreetmap-standard-raster-tiles` | `domains`, `families`, `priority`, `sourceRefs`, `geographies`, `capabilities`, `layerBehavior`, `implicitBackground` |
| `oregon-dlcd-coastal-gis` | `priority`, `sourceRefs` |
| `protomaps-basemap` | `priority`, `sourceRefs`; orphaned English descriptor entry |

The repair batch is
[`research/2026-09-10-system-shape-repairs/repairs.json`](../research/2026-09-10-system-shape-repairs/repairs.json).
All eight metadata-only patches passed API dry runs, were applied through the
canonical Record API with fresh timestamp preconditions, and matched expected
content on readback. This removed 38 legacy property fields, preserved context
and citations in 48 localized profiles, and relocated two orphaned descriptor
notes. Sources, edges, routes, depth, review history and the current metrics/access
representations were preserved. Evidence is in
`.release/90cd46f-system-shape-repairs/metadata-only`.

The release runner includes the same batch after metrics, standards and access
conversion and recognizes already repaired records. The fresh post-repair
preparation is in `.release/90cd46f-system-shape-repairs/migration-after-metadata`;
use it instead of the earlier pre-repair state. Aggregate validation passes for
all 137 prepared records, including all 61 systems, and migration 014 passes
twice locally. The full pending release was also rehearsed through repository
dry-run/apply/readback for 60 patches. The metrics/access conversion and schema
014 have not been applied in production.

The batch retains the exact legacy values and previous descriptions as conflict
checks. Preparation refuses changed values, changed profiles or changed orphan
entries instead of overwriting concurrent research. It accepts already repaired
values on retries. The content is relocated as follows:

- Geographic context, subject context and caveats are preserved in profiles in
  all six locales, with owner-local citations in `details.profile.sourceRefs`.
  Existing sources and access dates are retained; this is a metadata repair,
  not a new source-verification pass.
- Project priorities remain in the active MVP/source plans. Operational route
  priority remains its own numeric field; some routes also already retain the
  historical MVP planning priority in their metadata.
- Existing disciplines remain unchanged. Removed `domains`/`families` are not
  added as new discipline IDs.
- Existing operational routes and their connector contracts retain machine
  capabilities. The OpenStreetMap route already stores layer behavior and the
  explicit-background setting. No route is manufactured to relocate metadata;
  NOAA ESI and Protomaps have no recorded routes in the repaired snapshot.
- GEBCO's orphaned visual-context note and Protomaps' regional-extract guidance
  move into profile prose, retaining their English text and adding translations.
  Neither is a type, format or standard descriptor.

The legacy portal projection reads node `domains`, `families`, `geographies`,
`capabilities` and `caveats`; the Record API geography filter reads `geographies`.
After repair, portal domains derive from approved disciplines and capabilities
from routes/descriptors/access. Ad hoc node tags no longer appear as capabilities
or domains. Geographic context remains searchable in descriptions, but legacy
structured geography filters no longer match these systems. System-level
`caveats` arrays become empty; caveats remain in the profile, and existing route
caveats remain on their owning routes. These are deliberate consequences of
removing the old metadata; the consumer APIs are not extended or reinterpreted.
Structured record geography remains deferred.

Missing descriptor/gallery translations on thin records are incomplete research,
not malformed structure. Their supplied IDs must resolve to neutral items;
complete ID coverage is required for rich. Existing stricter access, standard
and metric localization requirements still apply.

## Release sequence

1. Fresh-read canonical records, reconcile the prepared repairs with current data,
   and retain existing sources, substantive prose, edges, routes and review
   history. Use the existing release runner; do not overwrite its earlier
   reviewed snapshot or apply the example fixture.
2. Re-run preparation with the new aggregate validator. Review every issue and
   verify the intended discovery behavior. An older preparation result is not
   proof of compatibility. Preparation also rehearses migration 014 twice on
   the converted local snapshot. The eight metadata repairs are already live;
   the metrics, standards, access and schema cutover remains pending.
3. Follow the coordinated maintenance/backup procedure in
   [deployment recommendations](deployment-recommendations.md). During cutover,
   complete the pending metrics migration and validated record repairs.
4. Apply `014_system_record_shape.sql` with schema-capable credentials after the
   content is compatible. It is transactional and repeatable; a failed audit
   rolls back its installation without changing record content. For historical
   imports, apply the shape guard after conversion, never disable it on a live
   writer to accept legacy data.
5. Run full aggregate validation, readback and application smoke checks before
   reopening browser traffic. SQL guards check structure; the API additionally
   checks approved vocabularies, citations, localization joins and rich content.

Tests exercise the fixed FishBase example, malformed variants at every depth,
PUT/PATCH dry-run/apply parity, unchanged data after rejection, direct SQL,
node-kind changes, raw stored-content validation, and migration refusal/reruns.
No new database table, schema-version field, vocabulary, API family or generic
schema framework is introduced.
