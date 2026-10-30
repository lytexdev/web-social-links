#!/usr/bin/env bash
set -euo pipefail

data_dir="${1:-./data}"
app_uid=1000
app_gid=1000

mkdir -p "$data_dir/media" "$data_dir/backups" "$data_dir/import"
chmod 750 "$data_dir" "$data_dir/media" "$data_dir/backups" "$data_dir/import"

if [[ "$(id -u)" -eq 0 ]]; then
  chown -R "$app_uid:$app_gid" "$data_dir"
elif [[ "$(id -u)" -ne "$app_uid" ]]; then
  echo "$data_dir must be owned by UID $app_uid. Run: sudo chown -R $app_uid:$app_gid $data_dir" >&2
  exit 1
fi

echo "$data_dir is ready for UID $app_uid"
