#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -euo pipefail

PROJECT_ID="chm-network"
REGION="us-east4"
REPO_NAME="chm-apps"

# Ensure we are in the root directory (where cloudbuild.yaml lives)
cd "$(dirname "$0")/.."

# Guard: Ensure the working tree is clean
# Without this, uncommitted changes get uploaded to Cloud Build but tagged
# with the HEAD SHA, leading to a mismatched image tag.
if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: You have uncommitted changes."
  echo "Please commit or stash them before deploying so the deployed image accurately matches the Git SHA."
  git status --short
  exit 1
fi

# Get short SHA for image tags
SHA=$(git rev-parse --short HEAD)
echo "Starting manual deployment for commit: $SHA"

echo "================================================="
echo "1. Building Public and Admin Images (Cloud Build)"
echo "================================================="
gcloud builds submit \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --config cloudbuild.release.yaml \
  --substitutions _PUBLIC_IMAGE=us-east4-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/explorer-public:${SHA},_PUBLIC_CACHE_IMAGE=us-east4-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/explorer-public:latest,_ADMIN_IMAGE=us-east4-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/explorer-admin:${SHA},_ADMIN_CACHE_IMAGE=us-east4-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/explorer-admin:latest \
  .

echo "================================================="
echo "2. Building API Image (Cloud Build)"
echo "================================================="
gcloud builds submit \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --config cloudbuild.yaml \
  --substitutions _IMAGE=us-east4-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/explorer-api:${SHA},_CACHE_IMAGE=us-east4-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/explorer-api:latest,_APP_BASE_PATH=/,_VITE_APP_MODE=public,_VITE_CAN_REVIEW_NODES=false \
  .

echo "================================================="
echo "3. Deploying Explorer (Public)"
echo "================================================="
gcloud run deploy explorer \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --image us-east4-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/explorer-public:${SHA} \
  --quiet

echo "================================================="
echo "4. Deploying Explorer Admin"
echo "================================================="
gcloud run deploy explorer-admin \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --image us-east4-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/explorer-admin:${SHA} \
  --quiet

echo "================================================="
echo "5. Deploying Explorer API"
echo "================================================="
gcloud run deploy explorer-api \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --image us-east4-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/explorer-api:${SHA} \
  --quiet

echo "================================================="
echo "6. Running Post-Deploy Smoke Checks"
echo "================================================="

check_status() {
  local url="$1"
  local expected="$2"
  local label="$3"
  local status

  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [[ "$status" =~ $expected ]]; then
    echo "OK [HTTP $status] $label"
  else
    echo "ERROR [HTTP $status] $label failed at $url"
    exit 1
  fi
}

check_status "https://chm.oceanagentics.org/explorer" "^(200|301)$" "public Explorer path"
check_status "https://chm.oceanagentics.org/explorer/" "^200$" "public Explorer page"
check_status "https://chm.oceanagentics.org/explorer/admin" "^302$" "admin IAP redirect"
check_status "https://chm.oceanagentics.org/explorer/api/graph/bootstrap" "^200$" "public bootstrap JSON"

api_url="https://chm.oceanagentics.org/api/records"
missing_body=$(mktemp)
missing_status=$(curl -sS -o "$missing_body" -w "%{http_code}" "$api_url")
if [ "$missing_status" = "401" ] && grep -q '"missing_bearer_token"' "$missing_body"; then
  echo "OK [HTTP 401] $api_url rejects missing bearer token"
else
  echo "ERROR [HTTP $missing_status] $api_url did not reject missing bearer token as expected"
  cat "$missing_body"
  rm -f "$missing_body"
  exit 1
fi
rm -f "$missing_body"

invalid_body=$(mktemp)
invalid_status=$(
  curl -sS -o "$invalid_body" -w "%{http_code}" \
    -H "Authorization: Bearer invalid" \
    "$api_url"
)
if [ "$invalid_status" = "403" ] && grep -q '"invalid_bearer_token"' "$invalid_body"; then
  echo "OK [HTTP 403] $api_url rejects invalid bearer token"
else
  echo "ERROR [HTTP $invalid_status] $api_url did not reject invalid bearer token as expected"
  cat "$invalid_body"
  rm -f "$invalid_body"
  exit 1
fi
rm -f "$invalid_body"

echo "================================================="
echo "Deployment Complete!"
echo "================================================="
