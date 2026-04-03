#!/usr/bin/env bash
# Xcode "module map not found" / "Unable to resolve Foundation UIKit Expo" hataları için temiz kurulum.
# Kullanım: bash scripts/fix-ios-xcode-build.sh
# Sonra: Xcode'u KAPAT → ios/ESdiyet.xcworkspace aç (asla .xcodeproj değil) → Product → Clean Build → Build

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Xcode'u kapatın (Cmd+Q)."
echo "→ DerivedData (ESdiyet) temizleniyor..."
rm -rf "$HOME/Library/Developer/Xcode/DerivedData/ESdiyet-"* 2>/dev/null || true

if [[ -d ios ]]; then
  echo "→ ios/build temizleniyor..."
  rm -rf ios/build
  echo "→ pod install..."
  cd ios
  pod install
  cd ..
else
  echo "! ios/ yok. Önce: npx expo prebuild --platform ios"
  exit 1
fi

echo ""
echo "Tamam. Şimdi:"
echo "  1) open ios/ESdiyet.xcworkspace"
echo "  2) Product → Clean Build Folder (⇧⌘K)"
echo "  3) Any iOS Device (arm64) seç → Product → Build"
