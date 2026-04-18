#!/usr/bin/env bash
#
# Copy all data + images from local wardrobe to hosted wardrobe.
#
# Required env vars:
#   LOCAL_DB    = postgresql://postgres:password@localhost:5432/wardrobe
#   REMOTE_DB   = Render External Database URL (append ?sslmode=require)
#   REMOTE_API  = https://your-backend.onrender.com
#
# Optional:
#   UPLOADS_DIR = ./uploads/raw  (default)
#
# This WIPES the remote tables before copying. Do not run against production
# data you want to keep on the remote side.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

: "${LOCAL_DB:=postgresql://wardrobe:wardrobe@localhost:5432/wardrobe}"
: "${REMOTE_DB:?set REMOTE_DB to Render External Database URL}"
: "${REMOTE_API:?set REMOTE_API to hosted backend URL}"
: "${UPLOADS_DIR:=$REPO_ROOT/uploads/raw}"

TABLES=(clothing_items outfits outfit_items outfit_logs outfit_log_items)

echo "LOCAL_DB   : $LOCAL_DB"
echo "REMOTE_DB  : ${REMOTE_DB%%\?*}..."
echo "REMOTE_API : $REMOTE_API"
echo "UPLOADS    : $UPLOADS_DIR"
echo
echo "This will WIPE the remote tables and replace them with local data."
read -r -p "Continue? [y/N] " reply
[[ "$reply" =~ ^[Yy]$ ]] || { echo "aborted."; exit 1; }

echo "→ Checking connections..."
psql "$LOCAL_DB"  -c "SELECT 1" >/dev/null
psql "$REMOTE_DB" -c "SELECT 1" >/dev/null

echo "→ Truncating remote tables..."
truncate_list=$(IFS=,; echo "${TABLES[*]}")
psql "$REMOTE_DB" -c "TRUNCATE $truncate_list RESTART IDENTITY CASCADE;"

echo "→ Dumping local data and piping to remote..."
dump_args=()
for t in "${TABLES[@]}"; do dump_args+=(-t "$t"); done
pg_dump --data-only --no-owner --no-privileges "${dump_args[@]}" "$LOCAL_DB" \
  | psql --single-transaction --set ON_ERROR_STOP=1 "$REMOTE_DB"

echo "→ Uploading images from $UPLOADS_DIR..."
count=0
fail=0
set +e
shopt -s nullglob
for file in "$UPLOADS_DIR"/*.png; do
  id=$(basename "$file" .png)
  http=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$REMOTE_API/api/items/$id/image" -F "image=@$file")
  if [ "$http" = "202" ] || [ "$http" = "200" ]; then
    count=$((count + 1))
  else
    echo "   ! $id (HTTP $http — orphan file?)"
    fail=$((fail + 1))
  fi
done
shopt -u nullglob
set -e

echo
echo "✓ Migration complete."
echo "  images uploaded: $count"
if [ "$fail" -gt 0 ]; then
  echo "  failed:          $fail"
  exit 1
fi
