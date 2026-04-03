#!/usr/bin/env bash
# Xcode "module map not found", RNScreens Fabric (ShadowNode / ComponentDescriptors) ve benzeri
# native hatalar için temiz kurulum.
#
# Kullanım:
#   bash scripts/fix-ios-xcode-build.sh           # mevcut ios/ + pod install
#   REBUILD_IOS=1 bash scripts/fix-ios-xcode-build.sh   # expo prebuild --clean + pod (önerilir: New Arch kapandıktan sonra)
#
# Sonra: Xcode KAPAT → ios/ESdiyet.xcworkspace aç (Pods.xcodeproj DEĞİL) → üstte scheme ESdiyet → Clean Build → Build

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Xcode'u kapatın (Cmd+Q)."
echo "→ DerivedData (ESdiyet) temizleniyor..."
rm -rf "$HOME/Library/Developer/Xcode/DerivedData/ESdiyet-"* 2>/dev/null || true

if [[ "${REBUILD_IOS:-}" == "1" ]]; then
  echo "→ expo prebuild --clean (ios) — app.json native ayarları yeniden yazılır..."
  npx expo prebuild --platform ios --clean
fi

if [[ -d ios ]]; then
  echo "→ ios/build temizleniyor..."
  rm -rf ios/build
  echo "→ pod install..."
  cd ios
  pod install
  cd ..
else
  echo "! ios/ yok. Çalıştırın: npx expo prebuild --platform ios"
  exit 1
fi

echo ""
echo "Tamam. Şimdi:"
echo "  1) open ios/ESdiyet.xcworkspace"
echo "  2) Sol üst scheme: ESdiyet (Pods değil)"
echo "  3) Product → Clean Build Folder (⇧⌘K)"
echo "  4) Any iOS Device (arm64) → Product → Build"
