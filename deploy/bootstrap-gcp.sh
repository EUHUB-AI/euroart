#!/usr/bin/env bash
# EUROART — GCP Cloud Run deployment bootstrap
#
# Interactive setup that:
#   1. asks for your service-account JSON key and deployment settings,
#   2. stores the key as a GitHub Actions secret (GCP_SA_KEY),
#   3. generates .github/workflows/deploy-gcp.yml which builds the Bun static
#      site into a container, pushes it to Artifact Registry, and deploys it
#      to Cloud Run on every push to the chosen branch.
#
# The SA key itself is NEVER written into the repository.
#
# Requirements:
#   - bash, python3 (for JSON parsing)
#   - gh CLI authenticated against the repo (optional — without it the
#     script prints the secret-setup instructions instead)
#
# The deployment service account needs:
#   - roles/run.admin
#   - roles/artifactregistry.admin
#   - roles/serviceusage.serviceUsageAdmin
#   - roles/iam.serviceAccountUser on the Cloud Run runtime service account

set -euo pipefail

bold=$(tput bold 2>/dev/null || true); dim=$(tput dim 2>/dev/null || true)
yel=$(tput setaf 3 2>/dev/null || true); blu=$(tput setaf 4 2>/dev/null || true)
rst=$(tput sgr0 2>/dev/null || true)

repo_root=$(cd "$(dirname "$0")/.." && pwd)
workflow_dir="$repo_root/.github/workflows"
workflow_file="$workflow_dir/deploy-gcp.yml"
default_branch=$(git -C "$repo_root" branch --show-current 2>/dev/null || true)
default_branch=${default_branch:-main}

echo
echo "${yel}${bold}  ▄▄ EUROART ▄▄${rst}  ${blu}${bold}GCP deployment bootstrap${rst}"
echo "  ${dim}Bun static site → Artifact Registry → Cloud Run${rst}"
echo

ask() { # ask <prompt> <default> -> REPLY
  local prompt="$1" default="${2:-}"
  if [ -n "$default" ]; then
    read -r -p "  ${prompt} ${dim}[${default}]${rst}: " REPLY
    REPLY="${REPLY:-$default}"
  else
    while true; do
      read -r -p "  ${prompt}: " REPLY
      [ -n "$REPLY" ] && break
      echo "  ${yel}This value is required.${rst}"
    done
  fi
}

ask_optional() { # ask_optional <prompt> -> REPLY
  local prompt="$1"
  read -r -p "  ${prompt} ${dim}[leave blank]${rst}: " REPLY
}

ask_yes_no() { # ask_yes_no <prompt> <default Y|n> -> REPLY yes|no
  local prompt="$1" default="${2:-Y}" hint
  if [ "$default" = "Y" ]; then hint="[Y/n]"; else hint="[y/N]"; fi
  read -r -p "  ${prompt} ${dim}${hint}${rst}: " REPLY
  REPLY="${REPLY:-$default}"
  case "$REPLY" in
    [Yy]*) REPLY="yes" ;;
    *) REPLY="no" ;;
  esac
}

# ── 1. Service-account key ─────────────────────────────────────────
while true; do
  ask "Path to service-account JSON key" ""
  sa_path="${REPLY/#\~/$HOME}"
  if [ ! -f "$sa_path" ]; then
    echo "  ${yel}File not found: $sa_path${rst}"
    continue
  fi
  if sa_info=$(python3 - "$sa_path" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
assert d.get("type") == "service_account", "not a service-account key"
print(d["project_id"]); print(d["client_email"])
PY
  ); then
    sa_project=$(echo "$sa_info" | sed -n 1p)
    sa_email=$(echo "$sa_info" | sed -n 2p)
    echo "  ${dim}✓ key for ${sa_email}${rst}"
    break
  else
    echo "  ${yel}That file is not a valid service-account JSON key.${rst}"
  fi
done

# ── 2. Deployment settings ─────────────────────────────────────────
ask "GCP project ID" "$sa_project";                         project="$REPLY"
ask "Cloud Run service name" "euroart-web";                  service="$REPLY"
ask "GCP region" "europe-west1";                             region="$REPLY"
ask "Artifact Registry repository" "euroart";                artifact_repo="$REPLY"
ask "Deploy on pushes to branch" "$default_branch";          branch="$REPLY"
ask_yes_no "Allow unauthenticated public access" "Y";        public_access="$REPLY"
ask_optional "Cloud Run runtime service account email";      runtime_sa="$REPLY"

if [ "$public_access" = "yes" ]; then
  allow_unauthenticated="true"
else
  allow_unauthenticated="false"
fi

echo
echo "  ${bold}Summary${rst}"
echo "    project    : $project"
echo "    service    : $service"
echo "    region     : $region"
echo "    registry   : $region-docker.pkg.dev/$project/$artifact_repo"
echo "    branch     : $branch"
echo "    public     : $allow_unauthenticated"
if [ -n "$runtime_sa" ]; then
echo "    runtime SA : $runtime_sa"
fi
echo "    deploy SA  : $sa_email"
echo "    secret     : GCP_SA_KEY (GitHub Actions)"
echo
read -r -p "  Proceed? [Y/n]: " ok
case "${ok:-Y}" in [Yy]*|"") ;; *) echo "  Aborted."; exit 1;; esac

# ── 3. GitHub secret ───────────────────────────────────────────────
echo
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  cd "$repo_root"
  gh secret set GCP_SA_KEY < "$sa_path"
  echo "  ${dim}✓ secret GCP_SA_KEY set via gh CLI${rst}"
else
  echo "  ${yel}gh CLI not available — set the secret manually:${rst}"
  echo "    GitHub → repo → Settings → Secrets and variables → Actions"
  echo "    → New repository secret → name: GCP_SA_KEY"
  echo "    → value: the full contents of $sa_path"
fi

# ── 4. Workflow ────────────────────────────────────────────────────
mkdir -p "$workflow_dir"
cat > "$workflow_file" <<YML
# Generated by deploy/bootstrap-gcp.sh — builds the Bun static site,
# pushes a container image to Artifact Registry, and deploys Cloud Run
# on every push to '$branch'.
name: Deploy to Cloud Run

on:
  push:
    branches: ["$branch"]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: deploy-gcp
  cancel-in-progress: true

env:
  PROJECT_ID: $project
  REGION: $region
  SERVICE: $service
  ARTIFACT_REPOSITORY: $artifact_repo
  ALLOW_UNAUTHENTICATED: "$allow_unauthenticated"
  RUNTIME_SERVICE_ACCOUNT: "$runtime_sa"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: "1.3.4"

      - name: Verify static build
        run: |
          bun install
          bun run build

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: \${{ secrets.GCP_SA_KEY }}

      - name: Set up gcloud
        uses: google-github-actions/setup-gcloud@v2
        with:
          project_id: \${{ env.PROJECT_ID }}

      - name: Enable required APIs
        run: |
          gcloud services enable \\
            run.googleapis.com \\
            artifactregistry.googleapis.com \\
            --project="\$PROJECT_ID"

      - name: Create Artifact Registry repository if needed
        run: |
          if ! gcloud artifacts repositories describe "\$ARTIFACT_REPOSITORY" \\
            --project="\$PROJECT_ID" --location="\$REGION" >/dev/null 2>&1; then
            gcloud artifacts repositories create "\$ARTIFACT_REPOSITORY" \\
              --project="\$PROJECT_ID" \\
              --location="\$REGION" \\
              --repository-format=docker \\
              --description="Container images for \$SERVICE"
          fi

      - name: Configure Docker for Artifact Registry
        run: gcloud auth configure-docker "\$REGION-docker.pkg.dev" --quiet

      - name: Build container image
        run: |
          IMAGE="\$REGION-docker.pkg.dev/\$PROJECT_ID/\$ARTIFACT_REPOSITORY/\$SERVICE:\$GITHUB_SHA"
          docker build --tag "\$IMAGE" .
          echo "IMAGE=\$IMAGE" >> "\$GITHUB_ENV"

      - name: Push container image
        run: docker push "\$IMAGE"

      - name: Deploy Cloud Run service
        run: |
          access_flag=(--no-allow-unauthenticated)
          if [ "\$ALLOW_UNAUTHENTICATED" = "true" ]; then
            access_flag=(--allow-unauthenticated)
          fi

          runtime_sa_flag=()
          if [ -n "\$RUNTIME_SERVICE_ACCOUNT" ]; then
            runtime_sa_flag=(--service-account "\$RUNTIME_SERVICE_ACCOUNT")
          fi

          gcloud run deploy "\$SERVICE" \\
            --project="\$PROJECT_ID" \\
            --region="\$REGION" \\
            --platform=managed \\
            --image="\$IMAGE" \\
            --port=3000 \\
            "\${access_flag[@]}" \\
            "\${runtime_sa_flag[@]}"

      - name: Done
        run: |
          url=\$(gcloud run services describe "\$SERVICE" \\
            --project="\$PROJECT_ID" --region="\$REGION" \\
            --format="value(status.url)")
          echo "Deployed → \$url"
YML

echo "  ${dim}✓ workflow written to .github/workflows/deploy-gcp.yml${rst}"
echo
echo "  ${bold}Next steps${rst}"
echo "    1. Review and commit the workflow:"
echo "         git add Dockerfile .dockerignore .github/workflows/deploy-gcp.yml && git commit -m 'Add Cloud Run deploy workflow'"
echo "    2. Push to '$branch' (or run the workflow manually from the Actions tab)."
echo "    3. The workflow prints the Cloud Run URL after deployment."
echo
