#!/bin/bash
# Build PuttX and install it on an iPhone or iPad over the network (or USB), from a Mac with Xcode.
#
#   TEAM=ABCDE12345 ios/scripts/device.sh            # your Apple developer team id
#   TEAM=ABCDE12345 BUNDLE=com.you.puttx ios/scripts/device.sh
#   PLAIN=1 TEAM=... ios/scripts/device.sh           # a free Apple ID: no Game Center or iCloud
#
# The phone must be paired with this Mac once (Xcode > Window > Devices and Simulators, the same
# Wi-Fi), unlocked, with Developer Mode on (Settings > Privacy & Security). Find the team id in
# Xcode > Settings > Accounts, or at developer.apple.com/account under Membership.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${TEAM:?set TEAM to your Apple developer team id (Xcode > Settings > Accounts)}"
BUNDLE="${BUNDLE:-com.puttx.app}"

command -v xcodegen >/dev/null || brew install xcodegen
xcodegen >/dev/null

# a free (personal) team cannot sign Game Center or iCloud: build without those entitlements
ENT=(CODE_SIGN_ENTITLEMENTS=PuttX/PuttX.entitlements)
if [ "${PLAIN:-0}" = 1 ]; then
  printf '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict/></plist>\n' > build-plain.entitlements
  ENT=(CODE_SIGN_ENTITLEMENTS=build-plain.entitlements)
fi

# the first connected (or networked) iPhone or iPad
DEV=$(xcrun devicectl list devices 2>/dev/null | awk '/iPhone|iPad/ && /available|connected/ {for (i=1;i<=NF;i++) if ($i ~ /^[0-9A-F-]{25,}$/) {print $i; exit}}')
[ -n "$DEV" ] || { echo "no paired iPhone or iPad found: pair it in Xcode > Window > Devices and Simulators"; exit 1; }
echo "device $DEV"

xcodebuild -project PuttX.xcodeproj -scheme PuttX -configuration Release \
  -destination "generic/platform=iOS" -derivedDataPath build-device \
  -allowProvisioningUpdates DEVELOPMENT_TEAM="$TEAM" PRODUCT_BUNDLE_IDENTIFIER="$BUNDLE" \
  CODE_SIGN_STYLE=Automatic "${ENT[@]}" build | grep -E "error:|warning: .*signing|BUILD" || true

APP=build-device/Build/Products/Release-iphoneos/PuttX.app
[ -d "$APP" ] || { echo "build failed (see above)"; exit 1; }
xcrun devicectl device install app --device "$DEV" "$APP"
xcrun devicectl device process launch --device "$DEV" "$BUNDLE" || echo "installed: open PuttX on the phone (trust the developer in Settings > General > VPN & Device Management the first time)"
