# Deployment Architecture & Recommendations

This document outlines the deployment pathways for the Ryu Explorer application. To eliminate friction, we have implemented a dual-track deployment strategy: a fully automated CI/CD pipeline for standard operations, and a streamlined local script for rapid, manual deployments.

## 1. Local Deployment (Quick/Manual)

For rapid deployments that bypass CI queues, or for testing changes locally as an admin, use the unified deploy script.

**Command:**
```bash
./scripts/deploy.sh
```
*This script automates manual copy-pasting. It ensures a clean working tree, extracts the Git SHA, submits the cached builds to Cloud Build, deploys the `explorer`, `explorer-admin`, and `explorer-api` services sequentially, and runs final post-deploy smoke checks for the public Explorer page, admin IAP redirect, bootstrap JSON, and expected bearer-token API denials.*

## 2. Continuous Deployment Pipeline (GitHub Actions)

Standard production deployments happen automatically when code is pushed to the `main` branch, requiring zero human intervention.

**Configuration:**
- **Workflow:** `.github/workflows/deploy.yml` triggers on pushes or merges to `main`.
- **Authentication (Keyless):** The pipeline authenticates to Google Cloud securely using Workload Identity Federation instead of static service account JSON keys.
- **Execution:** It runs the same Cloud Build and Cloud Run commands as the local script, followed by automated smoke checks for the public Explorer page, admin IAP redirect, bootstrap JSON, and expected bearer-token API denials.

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
