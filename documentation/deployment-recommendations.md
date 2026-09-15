# Publishing Explorer

Both GitHub Actions and local publishing run `scripts/deploy.sh`. Actions owns
checkout, Node 24, dependency installation, keyless Google Cloud authentication,
and job concurrency. Build selection, data preflight, image preparation, traffic
promotion and smoke checks have one implementation in `scripts/deploy.mjs`.

## Routine releases

After committing and pushing, Actions runs the release automatically. Locally,
use Node 24, installed workspace dependencies, and a working `gcloud` login:

```sh
./scripts/deploy.sh plan
./scripts/deploy.sh
```

`plan` reads production and prints the affected services; it does not build or
change traffic. `publish` (the default) requires a clean working tree, checks the
canonical data against the current record validator, prepares images, rechecks
data and production traffic, promotes compatible revisions, and runs smoke checks.
A contract failure stops publishing before any builds.

Scope is computed separately against each service's **serving revision**, not the
previous Git commit or the latest prepared revision:

- Client implementation changes update public and admin.
- Server, shared contracts, dependency or Docker/build changes update every
  affected service.
- Documentation, research batches, release scripts and the public bootstrap
  export do not by themselves change the runtime.
- Missing source provenance or unavailable Git history conservatively rebuilds.
  New revisions carry the full `release-commit` label; images also record it.

Public/admin builds share a worker and dependency layers. Their build runs
concurrently with the API build. The API Docker target stops after the server
build, without building a frontend. Independent revisions are prepared and
promoted concurrently. Existing runtime accounts, secrets, routing and resource
settings are preserved.

## Preparation and retries

```sh
./scripts/deploy.sh prepare
./scripts/deploy.sh publish
./scripts/deploy.sh smoke
```

`prepare` reports migration requirements but may still build and stage images
with zero production traffic. It never changes the data. This is the entry point
for a coordinated migration release.

Release state is stored in `.release/<full-commit>/state.json`: build IDs,
immutable image digests, revision names, data issues and completion status.
Rerunning resumes recorded builds, reuses existing commit images and revisions,
and recomputes remaining work against actual production traffic. Actions uploads
the state file on success or failure. A fresh machine can reuse completed images;
an unfinished build ID can be recovered from that artifact.

The `.release/` directory and GitHub's temporary credential files are excluded
from Git, Cloud Build uploads and Docker context. Keep private migration snapshots
there; do not commit them. Automatic releases are serialized in Actions, and a
publish stops if production traffic changed during its preparation.

## Pending node and edge contract release

Migrations `015_country_record_shape.sql` through `018_edge_revision.sql` and their matching application image are a
coordinated, breaking release. The old application reads `note` and
`properties_json`; the new application reads `description` and the renamed edge
kinds. Do not move either side independently.

The 14 September pre-migration audit covered all 273 canonical edges: 28
`governs`, 69 `operates`, 53 `funds`, 26 `member_of`, 45 `publishes_to`, and 52
`syncs_to`. Every edge had a nonempty note and sources. Migration rehearsal
retained all 273 edges and every distinct legacy prose value while producing 28
`governs`, 69 `operates`, 53 `funds`, 26 `member`, 45 `contributes`, and 52
`transfers` rows. The resulting table contains only identity, endpoints, kind,
description, sources, and timestamps.

Use the normal coordinated-release controls: commit and prepare the application
images, obtain a fresh Cloud SQL backup, put public/admin authoring into the
maintenance window, rehearse migrations 015–018 in one rollback transaction, apply them
with the schema-capable account, promote the prepared images, run smoke checks,
and regenerate `client/public/bootstrap.public.json` from canonical Postgres.
Run `server/schema/run-node-edge-migration.mjs` from the prepared API image; its
default mode rolls back, while `--apply` also requires the successful Cloud SQL
backup ID in `BACKUP_ID` and records the coordinated release in `schema_migrations`.
The migration rejects unknown property keys, malformed prose properties,
unsupported kinds, duplicate relationships after renaming, missing descriptions,
missing evidence, and invalid endpoints before dropping legacy columns.

The read-only 14 September release preflight currently reports 3,920 aggregate
issues. Rehearsing the edge conversion removes the edge-contract portion but
leaves 3,112 pre-existing node/localization contract issues. Migration 018 does
not rewrite node content, so this application revision must remain unpublished
until that earlier data-contract work is completed or included in the same
coordinated release.

## Completed 2026-09-10 data release

Published on 2026-09-11 UTC (2026-09-10 local) from commit
`8aa2b8d6c8afcdf26ced0b9930ae92c7540ae8d6`. Public, admin and API each serve
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
  Live checks passed for public page/data, admin IAP and API authentication.
  An unknown-property dry run was rejected with the record unchanged. The browser
  displayed FishBase's standards, measurements, Read/Write access and revision history.
- The public export was refreshed from the canonical production public endpoint.
  Temporary schema jobs and maintenance revisions were deleted; service templates
  were restored to normal startup. Private evidence remains in
  `.release/8aa2b8d6c8afcdf26ced0b9930ae92c7540ae8d6/`.

The priority rich-record research drafts are a separate batch and were not applied
by this release.

### Procedure used for the coordinated cutover

The closed system contract additionally requires the repairs and schema step in
[the system shape rollout audit](SYSTEM_RECORD_SHAPE_ROLLOUT.md). The previously
prepared data had eight incompatible systems; their metadata-only repairs are
now live and verified. The runner recognizes them and rehearses migration 014
locally. Rerun preparation against a fresh read before cutover; earlier snapshots
predating the repairs will conflict. Apply `014_system_record_shape.sql` only after the
metrics, standards, access and shape repairs have passed aggregate validation,
before reopening public/admin traffic. Migration 014 performs no content cleanup
and refuses incompatible data. Do not treat an older successful preparation as
validation for the new contract.

The committed one-time runner is
`scripts/releases/2026-09-10-data.mjs`. It requires `RYU_API_TOKEN` and uses the
canonical Record API. Its modes accept an optional state-directory argument:

```sh
node --import tsx scripts/releases/2026-09-10-data.mjs prepare
node --import tsx scripts/releases/2026-09-10-data.mjs validate
node --import tsx scripts/releases/2026-09-10-data.mjs apply
node --import tsx scripts/releases/2026-09-10-data.mjs verify
```

`prepare` fresh-reads the complete graph, rehearses metrics SQL locally, merges
the reviewed standards, Read/Write and system-shape repair batches, validates the resulting records,
and saves expected before/after content plus minimal patches. No production
writes occur. `apply` first dry-runs every outstanding patch, then applies with
fresh record timestamps and verifies each result. A retry recognizes completed
records and refuses unexpected concurrent edits. Completed writes are recorded
in `applied.json`; verification covers the whole graph and preserved content.

The coordinated cutover procedure is:

1. Commit source, run release `prepare`, and prepare the data using the same
   commit/state directory. Obtain a successful Cloud SQL backup.
2. Run `server/schema/run-metrics-migration.mjs` from the prepared API image in
   a temporary job using the schema admin account. Its default is a transaction
   rehearsal followed by rollback; `--apply` commits. Record the backup and job
   execution IDs with the release state.
3. After approval of the maintenance window, route public/admin to maintenance,
   apply the metrics migration, and move API traffic to its prepared revision.
4. Run the data runner's `apply` and `verify`. These use authenticated API
   reads and writes while the browser services are in maintenance.
5. Apply schema 014 after aggregate validation, then run release `publish`. With
   `RYU_API_TOKEN` set, preflight reads the canonical
   record API, so it can validate the converted graph before reopening public/admin.
   It reuses the already prepared images and skips the API if it is already current.
6. Verify the live UI, refresh the public export from canonical Postgres, record
   release results, and delete temporary migration jobs and maintenance revisions.

A backup plus matching application/data restore is the rollback path for a
breaking migration. Never return legacy readers to the converted graph. The
normal deploy command does not run SQL, apply research batches, or put the site
into maintenance automatically.

## Existing infrastructure notes

### Workload Identity & IAM Configuration
To support this pipeline, the `explorer-build-sa@chm-network.iam.gserviceaccount.com` Service Account was **manually** granted the following permissions via the `gcloud` CLI:
- `roles/cloudbuild.builds.editor` (to create builds)
- `roles/storage.admin` (to upload source code to the staging bucket)
- `roles/run.admin` (to update Cloud Run services)
- `roles/serviceusage.serviceUsageConsumer` (to consume project quota)
- `roles/iam.serviceAccountUser` (to act as the runtime service account)

> [!WARNING]
> **Manual Configuration Gap:** The WIF provider, identity pool bindings, and the broad IAM deployment grants listed above were executed manually. They are **not yet represented** in the shared CHM Terraform. To make this setup reproducible and permanently secure as the source of truth, these identities and grants must be ported to Terraform.

## 3. Terraform Lifecycle Alignment

Because these automated "fast deploys" update the Cloud Run container images dynamically, the `google_cloud_run_v2_service` resources in your shared CHM infrastructure Terraform must contain a lifecycle block to ignore image drift:

```hcl
lifecycle {
  ignore_changes = [
    template[0].containers[0].image,
  ]
}
```

> [!WARNING]
> **Current Terraform Risk:** The local CHM Terraform currently lacks this `ignore_changes` block. **Until this lands in Terraform, any subsequent `terraform apply` can unintentionally roll image versions back** to whatever older tag is hardcoded in the state. This block must be added before your next infrastructure update.
