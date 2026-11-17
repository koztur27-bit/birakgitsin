#!/usr/bin/env bash
# arm64 makinede Android SDK'nin x86_64 araçlarını (NDK clang, aapt2, aidl,
# zipalign) qemu-user ile çalıştırır.
#
# Neden: Google'ın Linux SDK/NDK paketleri yalnızca x86_64 host ikilileri
# dağıtıyor. arm64 host'ta bu ikililer doğrudan çalışmaz; qemu-x86_64-static
# ile bir x86_64 kök dosya sistemi (libc, libstdc++, libxml2, zlib) gerekir.
#
# Kullanım: bash scripts/setup-x86_64-emulation.sh
set -euo pipefail

if [ "$(uname -m)" != "aarch64" ] && [ "$(uname -m)" != "arm64" ]; then
  echo "Bu betik yalnızca arm64 için gerekli; mevcut mimari: $(uname -m)"
  exit 0
fi

QEMU="${QEMU_X86_64:-/usr/bin/qemu-x86_64-static}"
SYSROOT="${X86_64_SYSROOT:-/opt/x86_64-sysroot}"
ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
NDK="${ANDROID_NDK_HOME:-$ANDROID_HOME/ndk/27.1.12297006}"
BT="$ANDROID_HOME/build-tools/36.0.0"
WRAP="${X86_64_WRAP:-/opt/x86_64-wrap}"

if [ ! -x "$QEMU" ]; then
  echo "HATA: $QEMU yok. Kur: apt-get install qemu-user-static" >&2
  exit 1
fi

# --- x86_64 kök dosya sistemi -------------------------------------------------
if [ ! -e "$SYSROOT/lib64/ld-linux-x86-64.so.2" ]; then
  echo "x86_64 kütüphaneleri indiriliyor..."
  if ! dpkg --print-foreign-architectures | grep -qx amd64; then
    dpkg --add-architecture amd64
  fi
  cat > /etc/apt/sources.list.d/amd64.list <<'EOF'
deb [arch=amd64] http://archive.ubuntu.com/ubuntu noble main universe
deb [arch=amd64] http://archive.ubuntu.com/ubuntu noble-updates main universe
deb [arch=amd64] http://archive.ubuntu.com/ubuntu noble-security main universe
EOF
  apt-get update -qq
  mkdir -p "$SYSROOT" /tmp/opencode/amd64-debs
  ( cd /tmp/opencode/amd64-debs
    apt-get download libc6:amd64 libgcc-s1:amd64 libstdc++6:amd64 zlib1g:amd64 libxml2:amd64
    for deb in *.deb; do dpkg-deb -x "$deb" "$SYSROOT"; done )
  mkdir -p "$SYSROOT/lib64"
  ln -sf ../usr/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2 "$SYSROOT/lib64/ld-linux-x86-64.so.2"
fi

# --- NDK bin: bin -> bin-real, bin/ her araç için qemu sarmalayıcı -----------
# clang, linkerı kendi dizininde (bin-real) arar. ld.lld'yi orada bir kabuk
# sarmalayıcısına çeviririz; böylece clang alt süreç açtığında qemu devreye
# girer ve komut satırına ekstra linker bayrağı gerekmez.
mkdir -p "$WRAP"
cat > "$WRAP/ld.lld" <<EOF
#!/bin/sh
exec $QEMU -L $SYSROOT "$NDK/toolchains/llvm/prebuilt/linux-x86_64/bin-real/ld.lld.real" "\$@"
EOF
chmod +x "$WRAP/ld.lld"

NDK_BIN="$NDK/toolchains/llvm/prebuilt/linux-x86_64/bin"
if [ -d "$NDK_BIN" ] && [ ! -d "$NDK_BIN-real" ]; then
  echo "NDK araçları sarmalanıyor: $NDK_BIN"
  mv "$NDK_BIN" "$NDK_BIN-real"
fi
if [ -f "$NDK_BIN-real/ld.lld" ] && [ ! -f "$NDK_BIN-real/ld.lld.real" ]; then
  mv "$NDK_BIN-real/ld.lld" "$NDK_BIN-real/ld.lld.real"
fi
if [ -f "$NDK_BIN-real/ld.lld.real" ]; then
  cat > "$NDK_BIN-real/ld.lld" <<EOF
#!/bin/sh
dir=\$(CDPATH= cd -- "\$(dirname -- "\$0")" && pwd)
exec $QEMU -0 ld.lld -L $SYSROOT "\$dir/ld.lld.real" "\$@"
EOF
  chmod +x "$NDK_BIN-real/ld.lld"
fi
if [ -d "$NDK_BIN-real" ]; then
  rm -rf "$NDK_BIN"
  mkdir -p "$NDK_BIN"
  # arm64 host'ta yerel clang varsa qemu yerine onu kullan. NDK clang'i 18.x
  # oldugu icin yerel clang-18 ABI/uyumluluk acisindan en yakin surumdur.
  NDK_ROOT="$NDK/toolchains/llvm/prebuilt/linux-x86_64"
  CLANG_RES="$(find "$NDK_ROOT/lib/clang" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | sort -V | tail -1)"
  CXX_INC="$NDK_ROOT/sysroot/usr/include/c++/v1"
  cat > "$NDK_BIN/.wrapper" <<'WRAPPER_EOF'
#!/bin/sh
# arm64 host: NDK'nin x86_64 clang'i yerine yerel clang-18 kullan (qemu'dan
# ~100x hizli). Yerel clang yoksa eski qemu yoluna dus.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
name=$(basename -- "$0")
real="$dir-real/$name"

# Yerel LLVM araclari (arsiv/ranlib/strip) qemu gerektirmez.
case "$name" in
  llvm-ar|llvm-ar-18) [ -x /usr/bin/llvm-ar-18 ] && exec /usr/bin/llvm-ar-18 "$@" ;;
  llvm-ranlib|ranlib|llvm-ranlib-18) [ -x /usr/bin/llvm-ranlib-18 ] && exec /usr/bin/llvm-ranlib-18 "$@" ;;
  llvm-strip|strip|llvm-strip-18) [ -x /usr/bin/llvm-strip-18 ] && exec /usr/bin/llvm-strip-18 "$@" ;;
  clang-scan-deps|clang-scan-deps-18) [ -x /usr/bin/clang-scan-deps-18 ] && exec /usr/bin/clang-scan-deps-18 "$@" ;;
esac

case "$name" in
  clang|clang++|clang-18|*-clang|*-clang++)
    if [ -x /usr/bin/clang++-18 ]; then
      link=1
      for arg in "$@"; do
        case "$arg" in
          -c|-E|-S|-M|-MM) link=0 ;;
        esac
      done
      case "$name" in
        *++*)
          if [ "$link" = 1 ]; then
            exec /usr/bin/clang++-18 -resource-dir "@CLANG_RES@" -stdlib=libc++ \
              -rtlib=compiler-rt -fuse-ld=/usr/bin/ld.lld-18 "$@" -lunwind
          else
            exec /usr/bin/clang++-18 -resource-dir "@CLANG_RES@" \
              -isystem "@CXX_INC@" "$@"
          fi
          ;;
        *)
          if [ "$link" = 1 ]; then
            exec /usr/bin/clang-18 -resource-dir "@CLANG_RES@" \
              -rtlib=compiler-rt -fuse-ld=/usr/bin/ld.lld-18 "$@"
          else
            exec /usr/bin/clang-18 -resource-dir "@CLANG_RES@" "$@"
          fi
          ;;
      esac
    fi
    ;;
esac

extra=""
case "$name" in
  clang|clang++|clang-18|*-clang|*-clang++) extra="-fintegrated-cc1" ;;
esac
exec @QEMU@ -L @SYSROOT@ "$real" $extra "$@"
WRAPPER_EOF
  sed -i \
    -e "s|@CLANG_RES@|$CLANG_RES|g" \
    -e "s|@CXX_INC@|$CXX_INC|g" \
    -e "s|@QEMU@|$QEMU|g" \
    -e "s|@SYSROOT@|$SYSROOT|g" \
    "$NDK_BIN/.wrapper"
  chmod +x "$NDK_BIN/.wrapper"
  for tool in "$NDK_BIN-real"/*; do
    name="$(basename "$tool")"
    if readelf -h "$tool" >/dev/null 2>&1; then
      # Gerçek x86_64 ELF ikilisi: qemu ile çalıştır.
      ln -sf .wrapper "$NDK_BIN/$name"
    else
      # NDK'nın hedefe özel kabuk betiği (ör. aarch64-linux-android24-clang):
      # betik bin/ içinden çalışsın ki çağırdığı clang yine sarmalayıcı olsun.
      ln -sf "../bin-real/$name" "$NDK_BIN/$name"
    fi
  done
fi

# --- build-tools: aapt2, aidl, zipalign gibi x86_64 ikilileri -----------------
for name in aapt aapt2 aidl bcc_compat dexdump llvm-rs-cc split-select zipalign; do
  f="$BT/$name"
  [ -f "$f" ] || continue
  [ -f "$f.real" ] && continue
  if ! readelf -h "$f" 2>/dev/null | grep -q 'X86-64'; then
    continue
  fi
  echo "build-tools sarmalanıyor: $name"
  mv "$f" "$f.real"
  cat > "$f" <<EOF
#!/bin/sh
dir=\$(CDPATH= cd -- "\$(dirname -- "\$0")" && pwd)
export LD_LIBRARY_PATH="\$dir/lib64:\$dir/lib"
exec $QEMU -L $SYSROOT "\$dir/\$(basename -- "\$0").real" "\$@"
EOF
  chmod +x "$f"
done

# --- doğrulama ---------------------------------------------------------------
echo "NDK clang testi:"
"$NDK_BIN/aarch64-linux-android24-clang" --version | head -2
echo "aapt2 testi:"
"$BT/aapt2" version

# Bazı modüller (ör. expo-updates) farklı bir NDK sürümü ister. Kurulu tüm
# NDK'ları hazırla; alt çağrı aynı işi tekrar etmesin diye BG_NDK_LOOP konur.
if [ -z "${BG_NDK_LOOP:-}" ]; then
  for extra_ndk in "$ANDROID_HOME"/ndk/*; do
    [ -d "$extra_ndk" ] || continue
    [ "$extra_ndk" = "$NDK" ] && continue
    echo "Ek NDK hazırlanıyor: $(basename "$extra_ndk")"
    BG_NDK_LOOP=1 ANDROID_NDK_HOME="$extra_ndk" bash "$0"
  done
fi

echo "Hazır."
