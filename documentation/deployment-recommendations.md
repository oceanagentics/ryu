# Deployment Future Work

Status: deferred Cloud Run candidates, not current Firebase deployment work.
The former runtimes and database were retired. Apply none of the infrastructure
steps below unless a cloud rebuild is explicitly commissioned. Current manual
Firebase publishing, verification, and rollback are documented in
[`static-hosting.md`](static-hosting.md). Completed release evidence is
archived in
[`finishedwork/deployment-release-history.md`](finishedwork/deployment-release-history.md).
Remove an item here when it is completed or deliberately rejected.

## Reassess saved-view removal after restoring PostgreSQL

Migration `server/schema/019_remove_saved_views.sql` is the planned cleanup
migration; the verified retirement backup still contains `saved_views`.
Check compatibility with the restored database and chosen app version before
applying it. If hosted services are rebuilt, treat it as a backward-incompatible
post-deploy cleanup:

1. Finish and verify the application changes that stop every service from
   querying `saved_views`.
2. Publish the compatible application release to all three services and confirm
   that no old revision receives traffic.
3. Take a Cloud SQL backup, apply migration 019 with schema-capable credentials,
   and verify the schema and live smoke checks.
4. Do not route a legacy revision back to the database after the table is
   removed. Archive the release evidence and remove this item when complete.

## Add a full pre-production test gate

The disabled Cloud Run workflow contains only `scripts/deploy.test.mjs` before
authentication and publishing. Before reintroducing automated deployment,
consider a pull-request or pre-authentication check for application tests/builds.
Keep the focused release-runner test, but do not treat it as application coverage.

## Decide the production approval policy

Current publication is an explicit Firebase CLI action. Pushes and merges do
not publish; the Cloud Run workflow is disabled and manual-only. If automation
is later requested, choose its release approval and branch-protection policy
before enabling it.

## Improve rollout recovery

The retained Cloud Run runner prepares revisions without traffic, then promotes
affected services concurrently to 100% and smoke-tests afterward. Before using
it in a rebuilt deployment, decide whether the operational risk justifies:

- a canary or hold point before full traffic;
- automatic rollback, or a tested one-command manual rollback, when smoke fails;
- ordered promotion or explicit recovery rules for a partial multi-service
  promotion.

If the former all-at-once model is acceptable, document that decision and
discard this item instead of adding unused rollout machinery.

## Verify infrastructure ownership

The CHM Terraform source and private recovery package describe retired
infrastructure. For a newly commissioned cloud deployment, audit the rebuilt
infrastructure for:

- the GitHub Workload Identity pool/provider and service-account binding;
- the deployment service account's least-privilege IAM roles;
- Cloud Run image ownership or lifecycle behavior that prevents an infrastructure
  apply from reverting an Actions-published image.

Codify anything that is still manual. If all three are already managed, record
the owning modules in `AGENTS.md` and remove this item.
