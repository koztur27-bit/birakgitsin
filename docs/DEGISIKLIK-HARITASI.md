# Bırak Gitsin — Değişiklik Haritası (İletişim Rehberi)

Bu belge, “şu özelliği ekle/değiştir” isteklerini hangi dosyada yapacağımızı hızlıca eşleştirmek için hazırlanmıştır. Sayfa içi bölümler için `src/components/ScreenMapModal.tsx` içindeki “Harita” modalı da kullanılabilir.

## 1. Ekranlar (UI değişiklikleri)

| İstediğiniz değişiklik | Dosya | Not |
|---|---|---|
| Ana sayfa düzeni, yeşil kart, sayaç, para kartları, pencereler, sağlık kazancı | `src/screens/HomeScreen.tsx` | Bölüm numaraları `src/lib/screenMap.ts` ile eşleşir |
| Kriz anı araçları (nefes, sayaç, topraklama, oyun) | `src/screens/CravingScreen.tsx` | Tetikleyici seçimi ve eylem kartı burada |
| Tetikleyiciye özel kriz eylemleri | `src/lib/coach.ts` | `triggerAction()` fonksiyonu |
| İstatistikler, takvim, rozetler, riskli saatler, tetikleyiciler | `src/screens/StatsScreen.tsx` | Haftalık koç raporu kartı burada |
| Ayarlar, plan özeti, yedekleme, güncelleme kartı, uyarlanabilir plan anahtarı | `src/screens/SettingsScreen.tsx` | |
| İlk kurulum / plan düzenleme akışı | `src/screens/Onboarding.tsx` | Adım sayısı `STEPS` |
| Durum popup (bugünkü hedef/sayaç) | `src/components/StatusPopup.tsx` | |
| Takvim grid’i | `src/components/CalendarGrid.tsx` | |
| Üst çubuk, sekme çubuğu | `src/components/TabBar.tsx`, `src/App.tsx` | Navigasyon Expo Router kullanmıyor |

## 2. İş mantığı ve veri

| İstediğiniz değişiklik | Dosya | Not |
|---|---|---|
| Günlük hedef, uyarlanabilir plan, haftalık koç raporu, doktor özeti, para/sağlık hesapları | `src/lib/calculations.ts` | `dailyGoal`, `weeklyReport`, `doctorSummary`, `todayGoal` |
| Kriz eylem kartı içerikleri | `src/lib/coach.ts` | `triggerAction()` |
| Rozet koşulları | `src/lib/badges.ts` | `badgeDefs`, `evaluateBadges` |
| Veri modeli (Plan, DayRecord, CravingRecord) | `src/types.ts` | Geriye uyumlu alanlar `?` ile eklenir |
| Kalıcılık, bildirimler, log ekleme/geri alma, yedekleme | `src/context/AppContext.tsx` | `mutateLog`, `persist`, `logCigarette` |
| Tema, renkler, yazı boyutları | `src/theme.ts` | |
| Ekran haritası numaraları | `src/lib/screenMap.ts` | `SCREEN_MAP` |

## 3. Bildirim, güncelleme ve cihaz entegrasyonu

| İstediğiniz değişiklik | Dosya | Not |
|---|---|---|
| Durum bildirimi / alarm | `src/lib/statusNotification.ts` | |
| APK self-update adresi ve indirme | `src/lib/updater.ts` | `UPDATE_APK_URL` |
| OTA / sayfa yenileme | `src/lib/reload.ts`, `src/lib/updater.ts` | |
| Widget / native modül | `modules/bg-status/`, `plugins/withInstallPermission` | Config plugin gerekir |

## 4. Build, mağaza ve dokümantasyon

| İstediğiniz değişiklik | Dosya | Not |
|---|---|---|
| Uygulama adı, paket, izinler, plugin listesi | `app.json` | `name: "Bırak Gitsin"`, `package: "com.birakgitsin.app"` |
| Yerel APK derleme | `scripts/build-apk.sh` | `bash scripts/build-apk.sh` |
| x86_64 SDK/NDK emülasyonu | `scripts/setup-x86_64-emulation.sh` | arm64 host için |
| Hermes emülasyonu | `scripts/setup-hermesc.sh` | |
| Hermes komutu (arm64 Linux) | `plugins/withHermesCommand.js` | Yalnızca Linux/arm64’te devreye girer |
| Mağaza/ASO/lansman planı | `docs/MAGAZA-VE-LANSMAN.md` | |
| Öncelikli geliştirme planı | `docs/ONCELIKLI-GELISTIRME-PLANI.md` | |
| Gizlilik politikası taslağı | `docs/GIZLILIK-POLITIKASI.md` | |

## 5. Sık istek → hızlı eşleşme

- **“Hedefi değiştir / uyarlanabilir planı kapat”** → `src/lib/calculations.ts` (`dailyGoal`, `goalForPlanWeek` mantığı) + `SettingsScreen.tsx` anahtarı
- **“Haftalık raporu değiştir”** → `StatsScreen.tsx` koç kartı + `calculations.ts` (`weeklyReport`)
- **“Doktor özetini değiştir”** → `calculations.ts` (`doctorSummary`) + `StatsScreen.tsx` butonu
- **“Kriz eylemlerini değiştir”** → `src/lib/coach.ts` (`ACTIONS`)
- **“Rozet ekle”** → `src/lib/badges.ts`
- **“Yeni ekran ekle”** → `src/screens/` + `src/App.tsx` (Expo Router yok; `TabKey` state)
- **“Renk/tema değiştir”** → `src/theme.ts`
- **“APK üret”** → `bash scripts/build-apk.sh`

> Not: `android/` ve `ios/` klasörleri gitignore’dadır; native değişiklikler `app.json` ve config plugin’ler üzerinden yapılır. `scripts/build-apk.sh` gerekli emülasyon ve gradle ayarlarını otomatik ekler.