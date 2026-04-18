#!/usr/bin/env bash
#
# Re-create every local item on the hosted backend, uploading the LOCAL clean
# PNG as the hosted RAW image. Hosted backend has no rembg, so its raw→clean
# fallback will copy that clean PNG into the clean slot unchanged.
#
# Env:
#   LOCAL_API  = http://localhost:8081     (default)
#   REMOTE_API = https://your-app.onrender.com  (required)
#
# Note: new items on the hosted side get NEW uuids. Outfits / logs are not
# copied by this script — use the other migration script for full-state.

set -euo pipefail

: "${LOCAL_API:=http://localhost:8081}"
: "${REMOTE_API:?set REMOTE_API to hosted backend URL}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "LOCAL_API  : $LOCAL_API"
echo "REMOTE_API : $REMOTE_API"
echo

command -v jq >/dev/null || { echo "jq is required"; exit 1; }

items_json=$(curl -fsS "$LOCAL_API/api/items")
total=$(echo "$items_json" | jq 'length')
echo "found $total items on local"
echo

ok=0
fail=0
skipped=0

for i in $(seq 0 $((total - 1))); do
  row=$(echo "$items_json" | jq -c ".[$i]")
  id=$(echo "$row" | jq -r '.id')
  category=$(echo "$row" | jq -r '.category')
  sub=$(echo "$row" | jq -r '.sub_category // ""')
  material=$(echo "$row" | jq -r '.material // ""')
  colors=$(echo "$row" | jq -c '.colors // []')
  scale=$(echo "$row" | jq -r '.display_scale // 1')
  clean_url=$(echo "$row" | jq -r '.image_url // ""')

  if [ -z "$clean_url" ] || [ "$clean_url" = "null" ]; then
    echo "  ~ $id  skip (no clean image)"
    skipped=$((skipped + 1))
    continue
  fi

  # clean_url is absolute on hosted, relative on local (/uploads/clean/xxx.png)
  if [[ "$clean_url" == http* ]]; then
    src="$clean_url"
  else
    src="${LOCAL_API}${clean_url}"
  fi

  local_png="$TMP_DIR/$id.png"
  if ! curl -fsS -o "$local_png" "$src"; then
    echo "  ! $id  download failed ($src)"
    fail=$((fail + 1))
    continue
  fi

  # 1. create item row on remote
  body=$(jq -n \
    --arg cat "$category" \
    --arg sub "$sub" \
    --arg mat "$material" \
    --argjson cols "$colors" \
    '{category:$cat, sub_category:$sub, material:$mat, colors:$cols}')

  created=$(curl -fsS -X POST "$REMOTE_API/api/items" \
    -H "Content-Type: application/json" \
    -d "$body") || {
      echo "  ! $id  create failed"
      fail=$((fail + 1))
      continue
    }

  new_id=$(echo "$created" | jq -r '.id')

  # 2. upload the local CLEAN png as remote RAW
  http=$(curl -sS -o /dev/null -w "%{http_code}" \
    -X POST "$REMOTE_API/api/items/$new_id/image" \
    -F "image=@$local_png")

  if [ "$http" != "202" ] && [ "$http" != "200" ]; then
    echo "  ! $id → $new_id  image upload HTTP $http"
    fail=$((fail + 1))
    continue
  fi

  # 3. preserve display_scale if non-default
  if [ "$scale" != "1" ] && [ "$scale" != "null" ]; then
    curl -fsS -o /dev/null -X PUT "$REMOTE_API/api/items/$new_id" \
      -H "Content-Type: application/json" \
      -d "{\"display_scale\": $scale}" || true
  fi

  ok=$((ok + 1))
  echo "  ✓ $id → $new_id  ($category${sub:+/$sub})"
done

echo
echo "done."
echo "  created : $ok"
echo "  skipped : $skipped"
echo "  failed  : $fail"
[ "$fail" -gt 0 ] && exit 1 || true
