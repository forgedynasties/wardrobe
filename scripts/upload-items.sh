#!/bin/bash
# Usage: ./upload-items.sh <directory> <category> [owner]
#   ./upload-items.sh ./pics/shirts top
#   ./upload-items.sh ~/wardrobe/pants bottom alishba
set -e

BASE="${BASE:-https://wardrobe-backend-fh53.onrender.com}"
DIR="${1:?directory required}"
CAT="${2:?category required (top|bottom|shoes|...)}"
OWNER="${3:-ali}"

if [ ! -d "$DIR" ]; then
  echo "not a directory: $DIR" >&2
  exit 1
fi

command -v jq >/dev/null || { echo "jq not installed" >&2; exit 1; }

shopt -s nullglob nocaseglob
cd "$DIR"

count=0 ok=0 fail=0
for img in *.png *.jpg *.jpeg *.webp; do
  [ -e "$img" ] || continue
  count=$((count+1))

  id=$(curl -sf -X POST "$BASE/api/items" \
    -H "Content-Type: application/json" \
    -H "X-User: $OWNER" \
    -d "{\"category\":\"$CAT\"}" | jq -r '.id')

  if [ -z "$id" ] || [ "$id" = "null" ]; then
    echo "FAIL create: $img"
    fail=$((fail+1))
    continue
  fi

  if curl -sf -X POST "$BASE/api/items/$id/image" \
       -H "X-User: $OWNER" \
       -F "image=@$img" > /dev/null; then
    echo "OK  $img → $id"
    ok=$((ok+1))
  else
    echo "FAIL upload: $img ($id)"
    fail=$((fail+1))
  fi
done

echo "---"
echo "total: $count  ok: $ok  fail: $fail"
