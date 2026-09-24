# Temporary static Ryu hosting

Prepared 2026-09-24 to remove recurring Google Cloud hosting costs while funding
is sought. This is a staged migration, not a record of completed cloud retirement.
PostgreSQL remains the editable source of truth; the static site serves a public
export. No database, DNS, or running service has been changed by this preparation.

## Build and publish

Use Node 24 and the locked dependencies:

```sh
npm ci
npm run build:static
```

Publish **only `client/dist`** to Cloudflare Pages, with no Functions, database,
Worker, or Google Cloud runtime. For Pages Git integration, use repository root,
build command `npm run build:static`, output directory `client/dist`, and Node 24.
Do not set the existing Cloud Run `APP_BASE_PATH`, `VITE_APP_BASE_PATH`, or
`VITE_BOOTSTRAP_PATH` environment overrides on this project. The default build
serves from `/`; Pages' SPA fallback also preserves `/explorer/?node=fishbase`
links when the whole hostname is eventually moved. Do not add a top-level
`404.html`, which would disable that fallback.

The static mode forces the public UI, searches the loaded graph in the browser,
reads record details and galleries from the snapshot/assets, and ignores old CHM
admin cookies. Review state/date remain visible; review history, online authoring,
and the Record API are unavailable. Existing server/public and local authoring
builds remain available. `VITE_STATIC_PREVIEW=true` still works for research previews.

Pages' [static requests are free and unlimited](https://developers.cloudflare.com/pages/functions/pricing/).
The [Free plan limits](https://developers.cloudflare.com/pages/platform/limits/)
include 500 builds/month, 20,000 files, and 25 MiB per asset. The current public
assets fit; the largest is approximately 12.2 MiB. Rely on the documented
[SPA and cache defaults](https://developers.cloudflare.com/pages/configuration/serving-pages/).
These terms do not eliminate charges from resources retained in Google Cloud.

Before switching a domain, verify the Pages preview: graph and globe, catalogue,
search/filtering, record links on direct load and refresh, all six languages,
gallery images, and no `/api/` requests. Check with an existing `chm_admin_hint`
cookie too. Host account access and the final hostname remain to be confirmed.

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
site. No production writer token belongs in a Pages environment.

## Backup and retirement sequence

The shared CHM infrastructure must be retired through its owning infrastructure
workflow. This Ryu change does not edit that checkout. The inspected Sept 24
inventory is the starting point; re-read live dependencies before any deletion.

1. **Preserve the full database before retiring SQL.** Pause authoring during the
   final export; take a Cloud SQL backup and a full logical PostgreSQL 16 dump
   of `explorer`, including schema, records/localizations, sources, routes, review
   history, and migration state. Save required grants/role definitions separately.
   Keep an encrypted copy outside GCP, with a checksum and a second durable copy.
   Do not rely on an instance-bound backup surviving instance deletion.
2. **Prove recovery.** Restore into an empty local PostgreSQL 16 database, apply
   required local roles/grants, compare table counts and record/source/route/review
   content with the dump source, run the existing repository/contract checks, and
   open the local author UI. Export its redacted snapshot and compare it to the
   frozen public graph. Keep the dump and restore evidence private. A snapshot
   alone cannot restore the private canonical data.
3. **Publish and verify Pages.** Deploy the static output to a preview first.
   Refresh the final export if records changed since Sept 24. Merge the reviewed
   branch through a PR; Cloud Run's workflow is manual-only in this change.
   Configure static publishing in the selected Cloudflare account.
4. **Resolve shared CHM routes and change DNS.** The load balancer currently owns
   both `chm.oceanagentics.com` and `.org`. `/` and `/login` serve `chm`;
   `/explorer` serves Ryu; `/explorer/admin` serves the admin app; `/api/records`
   serves the writer API. A DNS record moves a whole hostname, not one path.
   Preserve the CHM homepage on static hosting (or approve replacing it), retire
   its login/admin links, and preserve old Ryu URLs before moving the hostname.
   A new Ryu subdomain by itself does not remove the shared load-balancer bill.
5. **Retire paid runtimes and routing after the new site and recovery pass.**
   Remove `explorer`, `explorer-admin`, `explorer-api`, and the separately owned
   `chm` Cloud Run service. `chm` has a minimum instance of one. Remove both global
   HTTP/HTTPS forwarding rules, target proxies, backend services/serverless NEGs,
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
console errors were reported. Hosted Pages verification still remains.

Pending: Cloudflare account access, hostname, full private backup and verified local
restore, CHM homepage/routing cutover, paid-resource retirement, and subsequent
billing verification. Billing details and the research-credit application draft
are maintained privately outside this public repository.
