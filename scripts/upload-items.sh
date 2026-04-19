#!/bin/bash
# Usage: ./upload-items.sh <dir-or-file> <category> [owner]
#   ./upload-items.sh ./pics/shirts top
#   ./upload-items.sh ./pics/shirt.png top
#   ./upload-items.sh ./pics/pants bottom alishba
set -e

BASE="${BASE:-https://wardrobe-backend-fh53.onrender.com}"
TARGET="${1:?directory or image file required}"
CAT="${2:?category required (top|bottom|shoes|...)}"
OWNER="${3:-ali}"

command -v jq >/dev/null || { echo "jq not installed" >&2; exit 1; }

upload_one() {
  local img="$1"
  local id
  id=$(curl -sf -X POST "$BASE/api/items" \
    -H "Content-Type: application/json" \
    -H "X-User: $OWNER" \
    -d "{\"category\":\"$CAT\"}" | jq -r '.id')

  if [ -z "$id" ] || [ "$id" = "null" ]; then
    echo "FAIL create: $img"
    return 1
  fi

  if curl -sf -X POST "$BASE/api/items/$id/image" \
       -H "X-User: $OWNER" \
       -F "image=@$img" > /dev/null; then
    echo "OK  $img → $id"
    return 0
  else
    echo "FAIL upload: $img ($id)"
    return 1
  fi
}

count=0 ok=0 fail=0

if [ -f "$TARGET" ]; then
  count=1
  if upload_one "$TARGET"; then ok=1; else fail=1; fi
elif [ -d "$TARGET" ]; then
  shopt -s nullglob nocaseglob
  cd "$TARGET"
  for img in *.png *.jpg *.jpeg *.webp; do
    [ -e "$img" ] || continue
    count=$((count+1))
    if upload_one "$img"; then ok=$((ok+1)); else fail=$((fail+1)); fi
  done
else
  echo "not a file or directory: $TARGET" >&2
  exit 1
fi

echo "---"
echo "total: $count  ok: $ok  fail: $fail"
