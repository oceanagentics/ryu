# Deployment Future Work

Status: unimplemented candidates only. The current production pathways are in
[`AGENTS.md`](../AGENTS.md#production-deployment). Completed release evidence is
archived in
[`finishedwork/deployment-release-history.md`](finishedwork/deployment-release-history.md).
Remove an item here when it is completed or deliberately rejected.

## Finish the saved-view removal release

Migration `server/schema/019_remove_saved_views.sql` is the planned cleanup
migration, but it is not yet a production fact. Treat it as a
backward-incompatible post-deploy cleanup:

1. Finish and verify the application changes that stop every service from
   querying `saved_views`.
2. Publish the compatible application release to all three services and confirm
   that no old revision receives traffic.
3. Take a Cloud SQL backup, apply migration 019 with schema-capable credentials,
   and verify the schema and live smoke checks.
4. Do not route a legacy revision back to the database after the table is
   removed. Archive the release evidence and remove this item when complete.

## Add a full pre-production test gate

The production workflow currently runs only `scripts/deploy.test.mjs` before it
authenticates and publishes. Add a pull-request check or a pre-authentication
deployment step that runs the complete application test suite and build checks.
Keep the focused release-runner test, but do not treat it as application coverage.

## Decide the production approval policy

The current workflow deploys every push to `main` without a GitHub environment
approval. Either configure a protected production environment with required
reviewers and an explicit branch policy, or record that reviewed pushes to
`main` intentionally constitute production approval. Confirm the actual `main`
branch-protection settings as part of this decision.

## Improve rollout recovery

The runner prepares revisions without traffic, then promotes affected services
concurrently to 100% and smoke-tests afterward. Decide whether the operational
risk justifies:

- a canary or hold point before full traffic;
- automatic rollback, or a tested one-command manual rollback, when smoke fails;
- ordered promotion or explicit recovery rules for a partial multi-service
  promotion.

If the current all-at-once model is acceptable, document that decision and
discard this item instead of adding unused rollout machinery.

## Verify infrastructure ownership

The infrastructure source is not present in this checkout, so the old claims
about missing Terraform resources could not be verified and have been removed.
Audit the authoritative CHM infrastructure repository for:

- the GitHub Workload Identity pool/provider and service-account binding;
- the deployment service account's least-privilege IAM roles;
- Cloud Run image ownership or lifecycle behavior that prevents an infrastructure
  apply from reverting an Actions-published image.

Codify anything that is still manual. If all three are already managed, record
the owning modules in `AGENTS.md` and remove this item.
