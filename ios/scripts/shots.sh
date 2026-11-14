#!/usr/bin/env bash
# Screenshots of every scene on an iPad and an iPhone simulator, for review (CI uploads them).
# Usage: ios/scripts/shots.sh <PuttX.app> <out dir>
# Every simulator call has a hard time limit and says what it is doing, so a stuck simulator fails
# loudly instead of hanging the job.
set -uo pipefail
APP="$1"; OUT="$2"; mkdir -p "$OUT"
BUNDLE=com.puttx.app
# a route, then any extra launch arguments after a bar
ROUTES=("title" "profiles" "worlds" "world:5" "map:5" "hole:1-1|-render exported" "hole:1-1|-render hand" "hole:1-9|-render exported" "hole:5-3" "hole:7-2" "hole:8-1" "hole:6-4" "card:1" "shop")
lim() { local s=$1; shift; perl -e 'alarm shift; exec @ARGV' "$s" "$@"; }
say() { echo "[$(date +%H:%M:%S)] $*"; }
pick() { xcrun simctl list devices available -j | python3 -c "
import json,sys,re
d=json.load(sys.stdin)['devices']
names=[x['udid']+' '+x['name'] for k,v in d.items() if 'iOS' in k for x in v]
m=[n for n in names if re.search(sys.argv[1], n)]
print(m[-1].split(' ')[0] if m else '')" "$1"; }
fails=0
for spec in "ipad|iPad Pro 13" "iphone|iPhone 1[6-9] Pro\$"; do
  tag="${spec%%|*}"; dev=$(pick "${spec#*|}")
  [ -z "$dev" ] && { say "no simulator for $tag"; fails=$((fails+1)); continue; }
  say "$tag: booting $dev"
  lim 240 xcrun simctl boot "$dev" 2>&1 | grep -v "current state: Booted" || true
  lim 300 xcrun simctl bootstatus "$dev" -b >/dev/null || { say "$tag: boot timed out"; fails=$((fails+1)); continue; }
  say "$tag: installing"
  lim 120 xcrun simctl install "$dev" "$APP" || { say "$tag: install failed"; fails=$((fails+1)); continue; }
  for spec in "${ROUTES[@]}"; do
    r="${spec%%|*}"; extra=""; [ "$spec" != "$r" ] && extra="${spec#*|}"
    lim 20 xcrun simctl terminate "$dev" "$BUNDLE" 2>/dev/null || true
    say "$tag: $r $extra"
    # shellcheck disable=SC2086
    lim 60 xcrun simctl launch "$dev" "$BUNDLE" -demo -route "$r" $extra >/dev/null || { say "$tag: launch $r failed"; fails=$((fails+1)); continue; }
    # a cold launch on CI can take a while: retake until the frame is not the plain launch screen
    f="$OUT/$tag-${r//:/-}${extra:+-${extra##* }}.png"
    # a hole compiles its custom shaders on first draw: give it longer
    waits="6 5 8"; [ "${r%%:*}" = "hole" ] && waits="12 6 8"
    for wait in $waits; do
      sleep $wait
      lim 30 xcrun simctl io "$dev" screenshot "$f" >/dev/null || { say "$tag: screenshot $r failed"; break; }
      python3 -c "
import sys,zlib
d=open(sys.argv[1],'rb').read()
sys.exit(0 if len(d) > 150000 else 1)" "$f" && break
      say "$tag: $r still launching"
    done
  done
  lim 60 xcrun simctl shutdown "$dev" || true
done
ls -1 "$OUT"
say "$fails failures"
exit $((fails > 0))
