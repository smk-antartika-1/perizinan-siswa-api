#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

BRANCH="${DEPLOY_BRANCH:-main}"
REMOTE="${DEPLOY_REMOTE:-origin}"
SERVICE="${DEPLOY_SERVICE:-api}"

cd "${APP_DIR}"

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "${current_branch}" != "${BRANCH}" ]]; then
  echo "Current branch is '${current_branch}', expected '${BRANCH}'. Aborting."
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree has uncommitted changes. Commit/stash them before deploying."
  exit 1
fi

git fetch "${REMOTE}" "refs/heads/${BRANCH}:refs/remotes/${REMOTE}/${BRANCH}"

local_sha="$(git rev-parse HEAD)"
remote_sha="$(git rev-parse "${REMOTE}/${BRANCH}")"

if [[ "${local_sha}" == "${remote_sha}" ]]; then
  echo "No changes on ${REMOTE}/${BRANCH}. Nothing to deploy."
  exit 0
fi

echo "Deploying ${REMOTE}/${BRANCH}: ${local_sha} -> ${remote_sha}"

git pull --ff-only "${REMOTE}" "${BRANCH}"

compose build --pull "${SERVICE}"
compose up -d db
compose run --rm "${SERVICE}" pnpm migrate
compose up -d --force-recreate --remove-orphans

echo "Deployment complete without database reset."
