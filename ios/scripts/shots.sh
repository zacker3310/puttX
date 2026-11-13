#!/usr/bin/env bash
# Screenshots of every scene on an iPad and an iPhone simulator, for review (CI uploads them).
# Usage: ios/scripts/shots.sh <PuttX.app> <out dir>
set -euo pipefail
APP="$1"; OUT="$2"; mkdir -p "$OUT"
BUNDLE=com.puttx.app
ROUTES=("title" "profiles" "worlds" "world:5" "map:5" "hole:5-3" "hole:1-1" "card:1" "map:99")
pick() { xcrun simctl list devices available -j | python3 -c "
import json,sys,re
d=json.load(sys.stdin)['devices']
names=[x['udid']+' '+x['name'] for k,v in d.items() if 'iOS' in k for x in v]
m=[n for n in names if re.search(sys.argv[1], n)]
print(m[-1].split(' ')[0] if m else '')" "$1"; }
for spec in "ipad|iPad Pro 13" "iphone|iPhone 1[6-9] Pro$"; do
  tag="${spec%%|*}"; dev=$(pick "${spec#*|}")
  [ -z "$dev" ] && { echo "no simulator for $tag"; continue; }
  xcrun simctl boot "$dev" 2>/dev/null || true
  xcrun simctl bootstatus "$dev" -b
  xcrun simctl install "$dev" "$APP"
  for r in "${ROUTES[@]}"; do
    xcrun simctl terminate "$dev" "$BUNDLE" 2>/dev/null || true
    xcrun simctl launch "$dev" "$BUNDLE" -demo -route "$r" >/dev/null
    sleep 4
    xcrun simctl io "$dev" screenshot "$OUT/$tag-${r//:/-}.png" >/dev/null
  done
  xcrun simctl shutdown "$dev" || true
done
ls -1 "$OUT"
