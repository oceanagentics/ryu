# Deployment Release History

Status: completed and archived. Use
[`AGENTS.md`](../../AGENTS.md#production-deployment) for current deployment
pathways and
[`deployment-recommendations.md`](../deployment-recommendations.md) for
unimplemented deployment work.

## 2026-09-14 node and edge contract release

Published on 2026-09-15 UTC (2026-09-14 local) from application commit
`9f53d6dfd02d1da9d209b7904a6837e080354a5a`. Public and admin served the
normal-startup `explorer-release-9f53d6d-live` and
`explorer-admin-release-9f53d6d-live` revisions; API served
`explorer-api-release-9f53d6dfd02d`.

The 14 September pre-migration audit covered all 273 canonical edges: 28
`governs`, 69 `operates`, 53 `funds`, 26 `member_of`, 45 `publishes_to`, and 52
`syncs_to`. Every edge had a nonempty note and sources. Migration rehearsal
retained all 273 edges and every distinct legacy prose value while producing 28
`governs`, 69 `operates`, 53 `funds`, 26 `member`, 45 `contributes`, and 52
`transfers` rows. The resulting table contains only identity, endpoints, kind,
description, sources, and timestamps.

- Cloud SQL backup `1789432999281` completed successfully before cutover.
- Rollback rehearsal `explorer-node-edge-9f53d6d-rv7tv` and apply execution
  `explorer-node-edge-9f53d6d-jfsjx` ran migrations 015–018 in one transaction.
  Both preserved 237 nodes, 1,017 localizations, 273 edges, 10 routes and two
  saved views, with zero invalid node, localization, route or edge rows. The
  apply is recorded as `2026-09-14-node-edge-contracts` in `schema_migrations`.
- The Record API dry-ran, applied and read-verified four rich country records and
  nine rich organization records. It also recorded 78 dated `agent_researched`
  events, one for every locale on every released record. The reviewed Flanders
  funding relationship increased the canonical graph to 274 edges.
- Final live smoke checks passed for public page/data, admin IAP and API
  authentication. The public export was regenerated from canonical Postgres and
  contained 22 rich records: four countries, nine organizations and nine systems.
- The two one-off migration/diagnostic jobs and the maintenance revisions created
  for this cutover were deleted after verification.

The checked-in `server/schema/run-node-edge-migration.mjs` is the audit record of
the coordinated schema execution. Its default mode rolls back; `--apply` requires
a successful backup ID in `BACKUP_ID` and refuses a repeated ledger entry.

## 2026-09-10 data release

Published on 2026-09-11 UTC (2026-09-10 local) from commit
`8aa2b8d6c8afcdf26ced0b9930ae92c7540ae8d6`. Public, admin and API each served
100% traffic on their `release-8aa2b8d6c8af` revision.

- Cloud SQL backup `1789091540017` completed successfully before cutover.
- Prepared-image metrics rehearsal `explorer-migrate-8aa2b8d6c8af-7ft44`
  rolled back; apply execution `explorer-migrate-8aa2b8d6c8af-cftqh` committed
  migration 013 and removed all legacy metric fields.
- All 60 Record API patches passed new-contract dry runs and timestamped writes.
  Readback matched all 137 records: 61 systems, 128 edges, 10 operational routes,
  87 standard assignments, 110 Read paths, 47 Write paths and eight metrics.
  Existing sources, depth, relationships, routes and reviews were preserved.
- Schema 014 execution `explorer-migrate-8aa2b8d6c8af-2rd6n` installed both
  structural guards, passed a repeat execution and preserved all record content.
- The production build, 95 application tests and six release-runner tests passed.
  Live checks passed for public page/data, admin IAP and API authentication. An
  unknown-property dry run was rejected with the record unchanged. The browser
  displayed FishBase's standards, measurements, Read/Write access and revision
  history.
- The public export was refreshed from canonical production Postgres. Temporary
  schema jobs and maintenance revisions were deleted; service templates were
  restored to normal startup. Private evidence remains in
  `.release/8aa2b8d6c8afcdf26ced0b9930ae92c7540ae8d6/` when retained locally.

The priority rich-record research drafts were a separate batch and were not
applied by this release.

### Coordinated cutover used

The closed system contract additionally required the repairs and schema step in
[`SYSTEM_RECORD_SHAPE_ROLLOUT.md`](SYSTEM_RECORD_SHAPE_ROLLOUT.md). The prepared
data had eight incompatible systems; their metadata-only repairs were applied
and verified before the cutover. Migration 014 performs no content cleanup and
refuses incompatible data.

The one-time runner is `scripts/releases/2026-09-10-data.mjs`. Its `prepare`,
`validate`, `apply`, and `verify` modes used the canonical Record API, fresh
record timestamps, dry runs, readback, retry recognition, and conflict refusal.
The coordinated sequence was:

1. Prepare source and data from the same commit/state directory and obtain a
   successful Cloud SQL backup.
2. Rehearse and then apply the metrics migration from a temporary job using the
   schema account.
3. Route browser services to maintenance, apply the migration, and move API
   traffic to the compatible prepared revision.
4. Apply and verify the authenticated Record API patches.
5. Apply schema 014 only after aggregate validation, then publish the prepared
   browser revisions.
6. Verify the live UI, refresh the public export, record results, and delete
   temporary jobs and maintenance revisions.

A backup plus matching application/data restore was the rollback path. Legacy
readers could not safely return to the converted graph.
