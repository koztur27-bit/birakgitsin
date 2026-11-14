This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npm ci                      # bağımlılıkları kur (package-lock.json var)
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Script'ler (`scripts/dev-start.sh`, `scripts/publish-update.sh`) proje kökünü kendi konumlarından bulur; `PROJECT_DIR` ile ezilebilir. Sabit yol varsaymazlar.

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Bu proje **Expo Router kullanmıyor**. Navigasyon `App.tsx` içinde `TabKey` state'i + `src/components/TabBar.tsx` ile yapılır; ekranlar `src/screens/` altında düz bileşenlerdir. Yeni ekran eklerken bu yapıyı izle, `src/app/` oluşturma.
- İlk kurulum/plan düzenleme akışı `App.tsx` içindeki `editing` state'i ile `Onboarding` ekranını gösterir.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

**Yerel APK (EAS hesabı gerekmez)**: `bash scripts/build-apk.sh` — Android SDK (platform 36, build-tools 36.0.0, NDK 27.1) ve JDK 17 ile `assembleRelease` çalıştırır, çıktıyı `birakgitsin.apk` olarak kopyalar. Varsayılan olarak yalnızca `arm64-v8a` derler (`ABIS` ile değiştirilir). Release, prebuild'in `debug.keystore`'u ile imzalanır; Play Store'a yükleme için değil, cihazda test/kurulum içindir.

## CI ile APK derleme (EAS bulut kotası tükendiğinde)

EAS bulut kotası tükenince (aylık 15 Android derleme; sıfırlanma her ayın 1'i) APK'yı GitHub Actions üzerinde `eas build --local` ile derleriz — bulut kotasını **harcamaz** ve EAS'in yönettiği mevcut keystore'u kullanır, yani imza aynı kalır (kurulumda veriler korunur).

- Depo: `koztur-bit/birakgitsin` (private). **Dikkat:** bu ortamda `gh` hesabı `koztur27-bit` olarak girişli ve depo bu hesapla erişilemiyor ("Repository not found"). CI tetiklemeden önce erişimi olan hesapla `gh auth login` yapılmalı ya da depo yeniden oluşturulmalı. `gh` CLI: `/usr/local/bin/gh`.
- İş akışı: `.github/workflows/android.yml` (`workflow_dispatch` + `v*` etiketleri); `timeout-minutes: 120`.
- Gizli anahtar: Actions secret `EXPO_TOKEN`.
- Tetikle: `gh workflow run android.yml --repo koztur-bit/birakgitsin -f profile=preview`
- **Arka planda izle, komutu bloklamayın**: ilk derleme ~15–30 dk sürer; `gh run watch <id> --repo koztur-bit/birakgitsin --exit-status` uzun bir işi **arka plan görevi** olarak çalıştırın ve bitince indirilecek artifact'ı (`birakgitsin-apk`) raporlayın. Kullanıcıyı `sleep` ile bekletmeyin.
- `plugins/withCiFastBuild.js` yayın derlemesinde tüm alt projelerde lint görevlerini kapatır. **Kaldırma**: Android lint düşük kaynaklı CI sunucularında çok yavaştır ve `lintVitalAnalyzeRelease` fatal hatasında derlemeyi saatlerce kilitleyebilir. Ayrıca Gradle JVM bellek/paralel/önbellek ayarlarını da ekler.
- `android/` ve `ios/` asla commit edilmez (gitignore); EAS derlemesi bunları kendi geçici kopyasında `expo prebuild` ile üretir.

## Rules

- Ana sayfada (üst çubuk) her zaman bir **"Güncelle"** butonu bulunmalıdır; Ayarlar'da da **"Son sürümü yükle"** kartı korunmalıdır. Web'de bu butonlar `src/lib/reload.ts` içindeki `reloadApp()` ile sayfayı yeniler. **Android'de** ise `src/lib/updater.ts` içindeki `downloadAndInstallUpdate()` ile yeni APK'yı indirip Android kurulum ekranını açar (kendi kendini güncelleme). Ana sayfadaki **"↻ Sayfayı yenile"** çubuğu her zaman `reloadApp()` çağırır. Bu butonları kaldırma veya bozma.
- Kendi kendini güncelleme için `expo-file-system` + `expo-intent-launcher` kullanılır ve `./plugins/withInstallPermission` config plugin'i manifeste `REQUEST_INSTALL_PACKAGES` iznini ve `usesCleartextTraffic="true"` ekler. APK adresi `src/lib/updater.ts` içindeki `UPDATE_APK_URL` sabitidir (varsayılan `http://127.0.0.1:8124/birakgitsin.apk`); yeni APK derlendikten sonra web sunucusu klasörüne `birakgitsin.apk` olarak kopyalanmalıdır. Buton tanı için her adımı panoya yazar (önek `BG-UPD`); takıldığında `android_device.py clipboard-get` ile oku. **Sunucu kalıcı başlatma**: bash aracı komut bitince alt süreçleri öldürür; sunucu `setsid bash -c 'cd /tmp/opencode/birakgitsin-web && exec python3 -m http.server 8124 >/tmp/opencode/webserver.log 2>&1 </dev/null' &` ile başlatılmalı (bu şekilde komut bitince de yaşar). Sunucu kapalıysa buton "indirilemedi" der.
- Uygulama simgeleri (sigara temalı) `scripts/make_icons.py` ile üretilir (harici kütüphane gerekmez, saf Python). Çalıştır: `python3 scripts/make_icons.py <web_klasoru>`. Bu betik `assets/icon.png`, `assets/favicon.png`, `assets/android-icon-*.png` ve web ikonlarını üretir. Simgeyi değiştirmek için betiği düzenle; `assets/icon.png`'yi elle başka bir görselle ezme. Varsayılan stil: koyu daire içinde **alevli sigara** (`draw_cigarette(..., flame=True)`).
- **Ekran Haritası**: Ana sayfadaki bölümlerin numaralı sözlüğü `src/lib/screenMap.ts` (`SCREEN_MAP`) içinde tutulur ve `src/components/ScreenMapModal.tsx` ile gösterilir. Ana sayfa üst çubuğundaki **"Harita"** butonu modalı açar; modalda **"Numaraları ana sayfada göster"** anahtarı bölümlerin yanına `src/components/MapBadge.tsx` numara balonlarını (1–8, 3a–3f) ekler. Bu bölüm/numara eşlemesini ve kitapçığı koru; yeni bölüm eklersen `SCREEN_MAP` ile numaraları da güncelle.
- Web PWA çıktısı `/tmp/opencode/web-export.sh` ile üretilir (expo export + manifest + service worker + ikonlar); statik sunucu `127.0.0.1:8124` portunda servis edilir.
- **HIZLI GÜNCELLEME (OTA)**: Proje `expo-updates` + EAS Update kullanır (`app.json` → `updates.url`, `runtimeVersion: appVersion`; `eas.json` → her profilde `channel`). JS/UI değişikliklerini **APK yeniden derlemeden** telefona ulaştırmak için: `bash scripts/publish-update.sh "not"` (içinde `eas update --branch preview --environment preview`). Yayından sonra uygulama açılışta güncellemeyi indirir; uygulama içi **"Güncelle"** butonu da `src/lib/updater.ts` içindeki `checkOta()` ile bunu tetikler. Yalnızca **yeni yerel (native) kütüphane** eklenince `eas build` gerekir.
- **ANLIK ÖNİZLEME (en hızlı döngü, geliştirme aşaması)**: Telefonda **dev-client** APK kuruludur (`eas build --profile development --platform android`, paket adı aynı `com.birakgitsin.app`, veriler korunur). Geliştirirken `bash scripts/dev-start.sh` ile Metro (port 8081) başlatılır; telefon aynı makinede olduğu için dev-client `http://127.0.0.1:8081`'e bağlanır. Kod kaydedilir kaydedilmez **Fast Refresh** ile <1 sn'de uygulamaya yansır — OTA/`eas update`/APK derleme **gerekmez**. Dev-client'ta native modüller de vardır (bildirim, alarm vb.). JS değişikliklerini bitirince normal kullanıcı için `scripts/publish-update.sh` ile OTA yayınlanır; kullanıcı normal APK'ya dönmek isterse `preview`/`production` profili ile `eas build` yapılır. Dev-client'ın her açılışta sunucuya ihtiyacı vardır (Metro kapalıysa bağlanamaz).
- **hermesc emülasyonu (kritik)**: Bu makine `aarch64`; `hermesc` ise `x86_64`. OTA/EAS Update Hermes bytecode üretirken hermesc'yi çağırır. Çözüm: `qemu-user-static` + `node_modules/hermes-compiler/hermesc/linux64-bin/hermesc` yolunda **sarmalayıcı script** (`hermesc.real` = gerçek x86_64 binary). Kurulum/onarım için tek komut: `bash scripts/setup-hermesc.sh` (qemu yoksa apt ile kurar). `node_modules` silinip yeniden kurulursa bu betiği tekrar çalıştır.
- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
