#!/usr/bin/env bash
set -euo pipefail

image='ghcr.io/gitleaks/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f'
mode="${1:-staged}"

case "$mode" in
  staged) args=(git --staged --redact --no-banner) ;;
  history) args=(git --redact --no-banner) ;;
  *)
    echo "usage: scripts/gitleaks.sh [staged|history]" >&2
    exit 2
    ;;
esac

if command -v gitleaks >/dev/null 2>&1; then
  exec gitleaks "${args[@]}" .
fi

if command -v docker >/dev/null 2>&1; then
  exec docker run --rm --network none \
    --user "$(id -u):$(id -g)" -e HOME=/tmp \
    -v "$PWD:/repo:ro" -w /repo \
    "$image" "${args[@]}" /repo
fi

echo "gitleaks is not installed and Docker is not available" >&2
exit 1
