#!/usr/bin/env bash
# hermesc emulasyonunu (arm64 makinede x86_64 hermesc) kurar/onarir.
#
# Neden: `hermesc` yalnizca x86_64 icin dagitilir; OTA/EAS Update Hermes
# bytecode uretirken bu ikiliyi cagirir. Cozum: qemu-user ile calistirmak.
# `npm ci` sonrasi node_modules silinirse bu betigi tekrar calistir.
#
# Kullanim: bash scripts/setup-hermesc.sh
set -euo pipefail

PROJECT="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
HERMESC_DIR="$PROJECT/node_modules/hermes-compiler/hermesc/linux64-bin"
WRAPPER="/usr/local/bin/hermesc-emu"

if [ "$(uname -m)" != "aarch64" ] && [ "$(uname -m)" != "arm64" ]; then
  echo "Bu betik yalnizca arm64 icin gerekli; mevcut mimari: $(uname -m)"
  exit 0
fi

if [ ! -x "$HERMESC_DIR/hermesc.real" ] && [ ! -x "$HERMESC_DIR/hermesc" ]; then
  echo "HATA: hermesc bulunamadi. Once: npm ci" >&2
  exit 1
fi

if ! command -v qemu-x86_64-static >/dev/null 2>&1; then
  echo "qemu-x86_64-static bulunamadi, kuruluyor..."
  if [ "$(id -u)" = "0" ]; then
    apt-get update -qq
    apt-get install -y -qq qemu-user-static
  else
    echo "HATA: qemu-user-static kurulu degil. Kur: sudo apt-get install qemu-user-static" >&2
    exit 1
  fi
fi

if [ ! -f "$HERMESC_DIR/hermesc.real" ]; then
  mv "$HERMESC_DIR/hermesc" "$HERMESC_DIR/hermesc.real"
fi

cat > "$WRAPPER" <<'EOF'
#!/bin/sh
# x86_64 hermesc'yi arm64 makinede qemu-user ile calistirir.
exec /usr/bin/qemu-x86_64-static "$@"
EOF
chmod +x "$WRAPPER"

cat > "$HERMESC_DIR/hermesc" <<'EOF'
#!/bin/sh
# Sarmalayici: gercek x86_64 hermesc ikilisini qemu ile calistirir.
DIR=$(cd "$(dirname "$0")" && pwd)
exec /usr/local/bin/hermesc-emu "$DIR/hermesc.real" "$@"
EOF
chmod +x "$HERMESC_DIR/hermesc"

echo "hermesc qemu sarmalayicisi hazir:"
"$HERMESC_DIR/hermesc" --version | head -3
