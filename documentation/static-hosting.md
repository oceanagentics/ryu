# Firebase production hosting

Current production uses Firebase Hosting in project/site `ryustatic`
(`622994656148`) on the Spark plan, with no linked billing account.

- Public URL: [chm.oceanagentics.com/explorer/](https://chm.oceanagentics.com/explorer/)
- Firebase URL: [ryustatic.web.app/explorer/](https://ryustatic.web.app/explorer/)
- Published files: `client/dist`, including the derived public graph export.
- No production runtime server, database, Record API, or author UI is running.
  Restore PostgreSQL locally to edit data; see the workflow below.

Publication is manual. Pushing or merging `main` does not deploy anything.
The old Cloud Run GitHub workflow is disabled and has only a manual trigger.
Do not use `scripts/deploy.sh`, Cloud Build, or Terraform for Firebase releases.

## Build and publish

Run from the repository root using Node 24 and a clean checkout of the reviewed
release commit, normally merged `main`. For data changes, complete the local
editing/export workflow below and commit the reviewed snapshot and assets first.
Install the locked dependencies, run tests appropriate to the changes, and build:

```sh
npm ci
npm run build:static
```

Use the root base path. Remove old `APP_BASE_PATH`, `VITE_APP_BASE_PATH`, and
`VITE_BOOTSTRAP_PATH` overrides from the build environment. The checked-in
`firebase.json` and `.firebaserc` select `ryustatic`, publish only `client/dist`,
and rewrite application links to `/index.html`; existing assets take precedence.
No Firebase SDK or `firebase init` is needed.

For a local static preview, run:

```sh
npm --workspace client run preview -- --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173/explorer/` and perform the browser checks below.
If Firebase CLI authentication is missing or expired, log in with an account
that has Hosting deploy access to `ryustatic`:

```sh
npx firebase-tools@latest login
```

Publish the reviewed commit and include its SHA in the release history:

```sh
npx firebase-tools@latest deploy --only hosting --project ryustatic -m "$(git rev-parse HEAD)"
```

The predeploy hook rebuilds static mode before uploading. This updates the same
Hosting release at both public URLs; routine releases require no DNS changes.
See [Firebase's deployment documentation](https://firebase.google.com/docs/hosting/test-preview-deploy).

## Verify the release

- Open both HTTPS URLs and confirm the graph loads. Load and refresh
  `/explorer/?node=fishbase` directly, including in a browser with an old
  `chm_admin_hint` cookie; it must stay in the public app.
- Check graph/globe, catalogue/table, search and filters, record details, gallery
  images, and all six languages.
- Confirm `/bootstrap.public.json` matches the intended public export, assets
  load, and the browser shows no failed requests, console errors, or `/api/` calls.
  The public graph must contain no private reviewer identities, notes/history,
  or operational routes.
- Record the commit SHA, Firebase release, and verification result. Keep
  `ryustatic` unbilled and review Hosting storage/transfer usage in the console.

The static app searches in the browser and reads details and galleries from the
export/assets. Review state/date remain visible; online authoring and review
history are unavailable. Local server/authoring builds remain available.

## Roll back a Firebase release

In the [ryustatic Hosting console](https://console.firebase.google.com/project/ryustatic/hosting/sites/ryustatic),
find the last verified release in **Release history**, open its menu, and select
**Roll back**. This republishes the retained version, including its files and
Hosting configuration. Re-run the verification checks and record the rollback.
Keep a known working previous release when managing Hosting storage.

If the previous version is no longer retained, use its reviewed source commit
and public export in the existing checkout, install its locked dependencies,
then follow the build/publish steps above. Do not hand-edit the snapshot to undo
data changes. A Hosting rollback does not change local PostgreSQL or Git history.
See [Firebase's rollback instructions](https://firebase.google.com/docs/hosting/manage-hosting-resources#roll-back).

## Snapshot and local editing

On 2026-09-24, `https://chm.oceanagentics.com/explorer/api/graph/bootstrap`
exactly matched the checked-in snapshot after JSON parsing: **237 nodes, 274
edges, 1,027 localizations, no operational routes**. Its reviews contain only
state/date and null reviewer/note fields. This comparison is not a database backup.

After restoring the full canonical database locally, use the existing local
PostgreSQL connection settings (`DATABASE_URL`, or `PGHOST`, `PGPORT`, `PGDATABASE`,
`PGUSER`, `PGPASSWORD`). Keep credentials outside Git. Bind the local server to
loopback, since its local mode grants author access:

```sh
HOST=127.0.0.1 RYU_MODE=local npm run dev
```

Open `http://127.0.0.1:5173/admin` for the existing author UI. Apply validated
Record API edits to the local server using normal concurrency preconditions.
After edits, export from that same PostgreSQL database:

```sh
npm --workspace server run export:public
```

The existing exporter applies `toPublicBootstrap`, removing review identities,
notes/history and `ryuRoutes`. Review the snapshot diff and assets before
publishing. Never copy a private bootstrap or database dump into `client/public`
or the deploy directory. Commit the reviewed export and republish to update the
site. No production writer token belongs in the static build or Hosting files.

## Backup and retired project status

The private recovery packages on the maintainer's Mac are under
`~/Backups/ryu/2026-09-24/` and `~/Backups/ryu/2026-09-24-retirement/`.
They contain the full database dumps, checksums, restore evidence, source Git
bundles, saved container images, and Terraform state. Locate these private files
before data recovery; they are not in this public repository. The backup remains
local only, and a second durable copy is still outstanding.

The final database export matches the tested restore across the schema and all
seven tables. Database dumps, restore evidence, Git bundles, and Terraform state
checksums were rechecked successfully before the project-shutdown attempt.
The public snapshot is not a substitute for this full backup.

On 2026-09-24, the owner authorized complete shutdown of `chm-network`
(`288836337031`), superseding the earlier instruction to retain the project,
OAuth clients, and `rclone-drive-sync` identity. Billing was disconnected and
verified as `billingEnabled: false`; the project was still `ACTIVE` at that check.
Automatic approval review blocked project deletion, and the owner was given the
console shutdown steps. **Deletion has not been confirmed.** A read-only check
on 2026-09-25 could not refresh expired Google Cloud credentials. Reauthenticate
and check the project before reporting shutdown complete; do not retry deletion
through another tool to bypass the prior rejection.

`ryustatic` is a separate project. Both website URLs returned HTTP 200 after CHM
billing was disconnected. Previously accrued CHM charges can still appear.
The resource-retirement evidence below predates the billing disconnection and
must not be treated as a fresh inventory.

A future cloud deployment requires an intentional rebuild: use the saved
Terraform source, update project/backend settings, create fresh credentials and
service identities, and restore the full database. New infrastructure can use
new Terraform state; saved state is historical recovery evidence. Do not assume
old OAuth clients, API tokens, images, or cloud resources are still available.
The database restore was tested; a full cloud rebuild has not been rehearsed.

## Migration verification — 2026-09-24

Verification in the migration worktree: `npm run build:static` and the server
type-check passed; all 112 server, 27 client and 6 release-runner tests passed.
The built snapshot passed `dataIssues` and was unchanged by `toPublicBootstrap`;
all 32 referenced gallery assets exist. The output has 45 files, all below 25 MiB.
In-app browser checks against a static-only localhost server passed direct
`/explorer/?node=fishbase` loading and refresh, search, system filtering, cards,
table, globe, gallery display and switching all six languages. The server set
`chm_admin_hint=1`; the app stayed public and made no `/api/` requests. No browser
console errors were reported. These were prepublication checks; hosted
verification is recorded below.

Firebase CLI access and the `ryustatic` Hosting site were verified on 2026-09-24.
Cloud Billing returned `billingEnabled: false` and an empty `billingAccountName`.
The Firebase local Hosting server passed root and `/explorer/?node=fishbase`
rewrite checks, returned the exact public snapshot, and served the gallery image
with its correct content type. The static build passed again after configuration.

### Resource retirement — before project shutdown was requested

Firebase serves the app and public graph at `https://ryustatic.web.app` and
`https://chm.oceanagentics.com`; the existing `/explorer/` URL also responds.
The final database export was taken after disabling all four old Cloud Run
services. Its schema and all seven tables exactly match the earlier backup
restored successfully into local PostgreSQL 16. Its redacted graph also matches
Firebase: 237 nodes and 274 edges. The full database includes private reviews
and 10 operational routes. All recovery artifacts remain private, outside Git;
the full package has not been copied to GitHub.

Completed in `chm-network`:

- `chm`, `explorer`, `explorer-admin` and `explorer-api` were permanently deleted
  after the owner explicitly approved removing deletion protection.
- Cloud SQL `chm`, its database/users and Google-hosted backups were deleted.
  Project-wide instance and backup listings both return zero.
- The shared load balancer, forwarding rules, backends, serverless NEGs, proxies,
  URL maps, managed certificates and external load-balancer IP were removed.
- All 122 Artifact Registry image versions were removed after preserving the
  four deployed images with verified original manifest and blob digests.
- All 113 old Cloud Build source archives were deleted. The buckets' existing
  seven-day soft-delete policy retains 857,234,598 bytes until October 1, 2026.
- The three obsolete database secrets and two runtime/load-balancer alerts
  were removed. Project security alerts remain.
- The project, OAuth configuration and service identities, including
  `rclone-drive-sync`, were retained. CHM source/infrastructure Git history was
  added to the private recovery backup.

At the last resource inventory, the versioned Terraform state bucket, empty
build buckets, and empty Artifact Registry repository remained. The owner later
authorized full project shutdown and billing was disconnected as recorded above.
Verify live project status before any further retirement or recovery action.

Historical Cloud Run architecture and release commands are in
[the archived launch notes](finishedwork/cloud-run-migration.md).
Billing details and the research-credit application draft remain private.
