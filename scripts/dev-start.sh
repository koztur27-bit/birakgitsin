#!/usr/bin/env bash
# ANLIK ONIZLEME (Fast Refresh) icin Metro dev sunucusunu baslatir.
# Telefondaki "dev-client" APK bu sunucuya baglanir; JS/kod degisiklikleri
# kaydettigin anda (<1 sn) uygulamaya yansir. APK derlemesi / OTA / bekleme yok.
#
# Kullanim: bash scripts/dev-start.sh
# Dur:      pkill -f "expo/bin/cli start"   (veya telefonu kapat)
#
# Not: Anlik onizleme yalnizca JavaScript degisiklikleri icin gecerlidir.
# Yeni bir yerel (native) kutuphane eklenirse yeniden `eas build --profile development` gerekir.
set -euo pipefail

PROJECT="/root/workspace/birakgitsin"
PORT="${METRO_PORT:-8081}"
LOG="/tmp/opencode/metro.log"

cd "$PROJECT"

if curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$PORT/status"; then
  echo "Metro zaten calisiyor: http://127.0.0.1:$PORT"
  exit 0
fi

rm -f "$LOG"
setsid bash -c "exec env NODE_OPTIONS=--max-old-space-size=2560 node ./node_modules/expo/bin/cli start --dev-client --port $PORT" </dev/null >"$LOG" 2>&1 &
echo "Metro baslatiliyor... (log: $LOG)"
sleep 20
tail -6 "$LOG"
echo
echo "Telefondaki dev-client uygulamasini ac ve gerekirse sunucu adresini gir: http://127.0.0.1:$PORT"
