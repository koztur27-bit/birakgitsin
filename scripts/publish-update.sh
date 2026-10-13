#!/usr/bin/env bash
# Hızlı OTA (havadan) güncelleme yayını.
# JS/UI değişikliklerini APK yeniden derlemeden telefonlara ulaştırır.
# Kullanım: bash scripts/publish-update.sh "değişiklik notu"
#
# Not: Yalnızca JavaScript tarafı değişir. Yeni yerel (native) kütüphane
# eklenirse yeniden `eas build` gerekir.
set -euo pipefail

PROJECT="/root/workspace/birakgitsin"
MESSAGE="${1:-guncelleme}"
BRANCH="${OTA_BRANCH:-preview}"

cd "$PROJECT"

# Hermes bytecode bu arm64 makinede x86_64 hermesc ile uretilemedigi icin
# qemu-user emulasyonu ile calistirilir (bkz. AGENTS.md).
if [ ! -x "$PROJECT/node_modules/hermes-compiler/hermesc/linux64-bin/hermesc.real" ]; then
  echo "UYARI: hermesc qemu sarmalayicisi kurulu degil." >&2
fi

# Hizlandirma:
#  - EAS_SKIP_AUTO_FINGERPRINT=1 : yavas "parmak izi" adimini atlar (~30-60 sn kazanc)
#  - --platform android          : yalnizca Android paketini uretir (~yarisi)
EAS_SKIP_AUTO_FINGERPRINT=1 CI=1 ./node_modules/.bin/eas update \
  --branch "$BRANCH" \
  --environment "$BRANCH" \
  --platform "${OTA_PLATFORM:-android}" \
  --message "$MESSAGE" \
  --non-interactive

echo "OTA yayinlandi: $BRANCH"
