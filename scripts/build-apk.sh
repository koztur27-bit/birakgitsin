#!/usr/bin/env bash
# Yerel (EAS/GitHub'a ihtiyac duymayan) release APK derlemesi.
#
# Gereksinimler: JDK 17, Android SDK (platform 36, build-tools 36.0.0, NDK 27.1).
# Varsayilan konumlar /opt/android-sdk ve java-17-openjdk-arm64; ANDROID_HOME /
# JAVA_HOME ile ezilebilir.
#
# Kullanim:
#   bash scripts/build-apk.sh                 # yalnizca arm64-v8a (telefon icin hizli)
#   ABIS=arm64-v8a,armeabi-v7a bash scripts/build-apk.sh
#   bash scripts/build-apk.sh --prebuild      # android/ yoksa veya sifirlanacaksa
set -euo pipefail

PROJECT="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-arm64}"
ABIS="${ABIS:-arm64-v8a}"
OUT="$PROJECT/birakgitsin.apk"

cd "$PROJECT"

if [ ! -d node_modules ]; then
  echo "HATA: node_modules yok. Once calistir: npm ci" >&2
  exit 1
fi

if [ ! -d "$ANDROID_HOME/platforms/android-36" ]; then
  echo "HATA: Android SDK bulunamadi ($ANDROID_HOME)." >&2
  echo "Gerekli: platform-tools, platforms;android-36, build-tools;36.0.0, ndk;27.1.12297006" >&2
  exit 1
fi

if [ "${1:-}" = "--prebuild" ] || [ ! -d android ]; then
  echo "Android projesi uretiliyor (expo prebuild)..."
  CI=1 npx expo prebuild --platform android --no-install --clean
fi

echo "sdk.dir=$ANDROID_HOME" > android/local.properties

if [ "$(uname -m)" = "aarch64" ] || [ "$(uname -m)" = "arm64" ]; then
  # SDK'nin x86_64 cmake/ninja/aapt2/clang ikilileri icin qemu koprusu.
  bash scripts/setup-x86_64-emulation.sh
  # arm64 host icin native cmake/ninja kullan.
  echo "cmake.dir=/usr" >> android/local.properties
  # aapt2'yi build-tools sarmalayicisindan kullan (Maven'daki x86_64 surumu degil).
  if ! grep -q '^android.aapt2FromMavenOverride=' android/gradle.properties; then
    printf '\nandroid.aapt2FromMavenOverride=%s\n' "$ANDROID_HOME/build-tools/36.0.0/aapt2" >> android/gradle.properties
  fi
fi

# QEMU'lu derlemede 60+ paralel clang bellegi tuketiyordu; yerel clang-18 ile
# 4 paralel guvenli ve hizli. Gerekirse CMAKE_BUILD_PARALLEL_LEVEL ile ezilir.
export CMAKE_BUILD_PARALLEL_LEVEL="${CMAKE_BUILD_PARALLEL_LEVEL:-4}"

# Hermes bytecode icin qemu sarmalayicisi (arm64 makine).
if [ "$(uname -m)" = "aarch64" ] && [ ! -x node_modules/hermes-compiler/hermesc/linux64-bin/hermesc.real ]; then
  bash scripts/setup-hermesc.sh
fi

cd android
./gradlew :app:assembleRelease \
  -PreactNativeArchitectures="$ABIS" \
  --no-daemon \
  --stacktrace

cd "$PROJECT"
APK="android/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$APK" ]; then
  echo "HATA: APK uretilmedi ($APK)" >&2
  exit 1
fi

cp "$APK" "$OUT"
echo
echo "APK hazir: $OUT"
ls -lh "$OUT"
