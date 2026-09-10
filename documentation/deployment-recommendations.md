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

## Pending 2026-09-10 data release

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
the reviewed standards and Read/Write batches, validates the resulting records,
and saves expected before/after content plus minimal patches. No production
writes occur. `apply` first dry-runs every outstanding patch, then applies with
fresh record timestamps and verifies each result. A retry recognizes completed
records and refuses unexpected concurrent edits. Completed writes are recorded
in `applied.json`; verification covers the whole graph and preserved content.

The coordinated cutover remains deliberate:

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
5. Run release `publish`. With `RYU_API_TOKEN` set, preflight reads the canonical
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
