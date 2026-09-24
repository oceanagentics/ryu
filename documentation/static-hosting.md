# Temporary static Ryu hosting

Prepared 2026-09-24 to remove recurring Google Cloud hosting costs while funding
is sought. Firebase is serving the static site. The old Cloud Run apps, Cloud
SQL instance and shared load balancer have been deleted. The verified full
PostgreSQL backup preserves the editable source of truth; the static site serves
a public export. Read the current status below before any deployment or recovery
operation.

## Build and publish

Use Node 24 and the locked dependencies:

```sh
npm ci
npm run build:static
```

Publish **only `client/dist`** to Firebase Hosting in project/site `ryustatic`
(`622994656148`) on the Spark plan. The checked-in `firebase.json` and
`.firebaserc` configure this target; no `firebase init` or Firebase SDK is needed.
Use the CLI through `npx` to avoid a system-wide installation:

```sh
npx firebase-tools@latest login
npx firebase-tools@latest deploy --only hosting --project ryustatic
```

The deploy command runs `npm run build:static` before uploading. It publishes to
`https://ryustatic.web.app`; it does not change the existing CHM domain or deploy
Cloud Run, Functions, a database, or Firebase App Hosting. Run it from the checkout
containing this configuration and the reviewed static build changes.

Publication is manual: pushing or merging to `main` does not publish the site.
The old Cloud Run workflow is disabled on GitHub, and its configuration accepts
manual dispatch only. Re-enable it only for an intentional Cloud Run recovery.
No GitHub-to-Firebase deployment workflow is configured.

Do not set the existing Cloud Run `APP_BASE_PATH`, `VITE_APP_BASE_PATH`, or
`VITE_BOOTSTRAP_PATH` environment overrides when building. The default build
serves from `/`; the Hosting rewrite to `/index.html` also preserves
`/explorer/?node=fishbase` links when the whole hostname is eventually moved.
Existing assets are served before the SPA rewrite.

The static mode forces the public UI, searches the loaded graph in the browser,
reads record details and galleries from the snapshot/assets, and ignores old CHM
admin cookies. Review state/date remain visible; review history, online authoring,
and the Record API are unavailable. Existing server/public and local authoring
builds remain available. `VITE_STATIC_PREVIEW=true` still works for research previews.

Keep `ryustatic` on [Spark](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
with no linked Cloud Billing account. Linking billing automatically upgrades it
to Blaze. Spark includes custom domains/HTTPS and bounded free Hosting storage
and transfer; exceeding a quota can block deployment or pause the site rather
than bill overages. Monitor the [Hosting usage](https://firebase.google.com/docs/hosting/usage-quotas-pricing)
and current [pricing](https://firebase.google.com/pricing) in the console. These
terms do not eliminate charges from resources retained in `chm-network`.

Before switching a domain, verify the Firebase site: graph and globe, catalogue,
search/filtering, record links on direct load and refresh, all six languages,
gallery images, and no `/api/` requests. Check with an existing `chm_admin_hint`
cookie too. Configure a custom domain only after the shared CHM routing decision.

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
npm run build:static
```

The existing exporter applies `toPublicBootstrap`, removing review identities,
notes/history and `ryuRoutes`. Review the snapshot diff and assets before
publishing. Never copy a private bootstrap or database dump into `client/public`
or the deploy directory. Commit the reviewed export and republish to update the
site. No production writer token belongs in the static build or Hosting files.

## Backup and retirement sequence

The shared CHM infrastructure must be retired through its owning infrastructure
workflow. This Ryu change does not edit that checkout. The inspected Sept 24
inventory is the starting point; re-read live dependencies before any deletion.

1. **Preserve the full database before retiring SQL.** Pause authoring during the
   final export; take a Cloud SQL backup and a full logical PostgreSQL 16 dump
   of `explorer`, including schema, records/localizations, sources, routes, review
   history, and migration state. Save required grants/role definitions separately.
   Keep the full backup privately outside GCP, with a checksum and a second
   durable copy. The owner chose an unencrypted backup.
   Do not rely on an instance-bound backup surviving instance deletion.
2. **Prove recovery.** Restore into an empty local PostgreSQL 16 database, apply
   required local roles/grants, compare table counts and record/source/route/review
   content with the dump source, run the existing repository/contract checks, and
   open the local author UI. Export its redacted snapshot and compare it to the
   frozen public graph. Keep the dump and restore evidence private. A snapshot
   alone cannot restore the private canonical data.
3. **Publish and verify Firebase Hosting.** Deploy to `ryustatic.web.app` first.
   Refresh the final export if records changed since Sept 24. Merge the reviewed
   branch through a PR; Cloud Run's workflow is manual-only in this change.
   Keep `ryustatic` on Spark with billing disabled.
4. **Resolve shared CHM routes and change DNS.** Before retirement, the load
   balancer owned both `chm.oceanagentics.com` and `.org`. `/` and `/login` served
   `chm`; `/explorer` served Ryu; `/explorer/admin` served the admin app;
   `/api/records` served the writer API. A DNS record moves a whole hostname,
   not one path.
   Preserve the CHM homepage on static hosting (or approve replacing it), retire
   its login/admin links, and preserve old Ryu URLs before moving the hostname.
   A new Ryu subdomain by itself does not remove the shared load-balancer bill.
5. **Retire paid runtimes and routing after the new site and recovery pass.**
   Remove `explorer`, `explorer-admin`, `explorer-api`, and the separately owned
   `chm` Cloud Run service. `chm` formerly kept one minimum instance. Remove both
   global HTTP/HTTPS forwarding rules, target proxies, backend services/serverless NEGs,
   URL map, unused certificate resources, and reserved load-balancer IP through
   the CHM infrastructure workflow. Check for dependent services/jobs first.
6. **Remove remaining paid storage deliberately.** Only after verified restoration,
   retire Cloud SQL instance `chm`; merely stopping it retains storage costs.
   Inventory/delete unneeded `chm-apps` images and Cloud Build/export bucket
   objects after preserving recovery artifacts outside GCP. Review retention,
   versioning/soft-delete and backup charges, other buckets/repositories, logging,
   secrets, DNS zones, scheduled jobs and any residual Compute resources.
7. **Verify costs.** Re-inventory billable resources and inspect daily billing by
   service/SKU after reporting catches up. Remaining accrued September charges
   are still payable. Claim zero recurring GCP hosting cost only after retirement
   and billing verification, not after publishing the static frontend.

Preserve the `chm-network` project, OAuth configuration and
`rclone-drive-sync@chm-network.iam.gserviceaccount.com`, which supports Shared Drive
uploads. Do not delete the project or broadly remove service identities.

## Current evidence and remaining gates

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

### Shutdown status — 2026-09-24

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

The versioned Terraform state bucket remains to manage the preserved project
resources (approximately 11 MB at retirement), along with empty build buckets
and the empty Artifact Registry repository. Soft-deleted build archives and state
storage can still incur charges; zero recurring cost has not been established.
Complete the second durable backup copy and inspect billing after retention
expires and reporting catches up. The full private backup remains local only.

The original CHM infrastructure source still defines the deleted hosting
resources: a normal full apply can recreate paid hosting. Recover only through
an intentional plan, reviewing the local retirement override first. Republish
the saved image archives, recreate infrastructure, import the full database,
create fresh credentials, update any recreated IAP backend IDs, verify the
database and app, and cut over traffic deliberately. The database restore was
tested; a full cloud rebuild has not been rehearsed.

Billing details and the research-credit application draft are maintained
privately outside this public repository.
