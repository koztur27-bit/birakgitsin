#!/usr/bin/env bash
# Hızlı OTA (havadan) güncelleme yayını.
# JS/UI değişikliklerini APK yeniden derlemeden telefonlara ulaştırır.
# Kullanım: bash scripts/publish-update.sh "değişiklik notu"
#
# Not: Yalnızca JavaScript tarafı değişir. Yeni yerel (native) kütüphane
# eklenirse yeniden `eas build` gerekir.
set -euo pipefail

PROJECT="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
MESSAGE="${1:-guncelleme}"
BRANCH="${OTA_BRANCH:-preview}"

cd "$PROJECT"

if [ -x ./node_modules/.bin/eas ]; then
  EAS_BIN="./node_modules/.bin/eas"
else
  # eas-cli artik proje bagimliligi degil (expo-doctor onerisi); npx ile gecici calistir.
  EAS_BIN="npx --yes eas-cli@latest"
fi

# Hermes bytecode bu arm64 makinede x86_64 hermesc ile uretilemedigi icin
# qemu-user emulasyonu ile calistirilir (bkz. AGENTS.md).
if [ ! -x "$PROJECT/node_modules/hermes-compiler/hermesc/linux64-bin/hermesc.real" ]; then
  echo "UYARI: hermesc qemu sarmalayicisi kurulu degil; OTA derlemesi basarisiz olabilir." >&2
  echo "       Cozum icin AGENTS.md -> 'hermesc emulasyonu' bolumune bak." >&2
fi

# Hizlandirma:
#  - EAS_SKIP_AUTO_FINGERPRINT=1 : yavas "parmak izi" adimini atlar (~30-60 sn kazanc)
#  - --platform android          : yalnizca Android paketini uretir (~yarisi)
EAS_SKIP_AUTO_FINGERPRINT=1 CI=1 $EAS_BIN update \
  --branch "$BRANCH" \
  --environment "$BRANCH" \
  --platform "${OTA_PLATFORM:-android}" \
  --message "$MESSAGE" \
  --non-interactive

echo "OTA yayinlandi: $BRANCH"
