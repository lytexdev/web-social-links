#!/usr/bin/env bash
set -euo pipefail

env_file="${1:-.env}"
secrets=(APP_ENCRYPTION_KEY ANALYTICS_HMAC_KEY)

if [[ ! -f "$env_file" ]]; then
  echo "$env_file not found. Run: cp .env.example $env_file" >&2
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl is required" >&2
  exit 1
fi

for name in "${secrets[@]}"; do
  value="$(openssl rand -base64 32 | tr -d '\n')"
  if grep -Eq "^${name}=.+$" "$env_file"; then
    echo "kept      $name"
  elif grep -Eq "^${name}=$" "$env_file"; then
    sed -i.bak "s|^${name}=$|${name}=${value}|" "$env_file"
    rm -f "${env_file}.bak"
    echo "generated $name"
  else
    printf '%s=%s\n' "$name" "$value" >>"$env_file"
    echo "added     $name"
  fi
done

chmod 600 "$env_file"

if grep -Eq '^INITIAL_ADMIN_PASSWORD=$' "$env_file"; then
  echo "INITIAL_ADMIN_PASSWORD is empty, the first login uses admin123 until you change it."
  echo "Set your own value before exposing the app."
fi
