# Bırak Gitsin

Sigarayı **azaltarak bırakma** uygulaması. Her gün içilen sigarayı takip eder, günlük hedef
belirler ve hedefi aşmadığın her sigara için **para + sağlık kazancı** hesaplar.

- Platform: Android + iOS (tek kod tabanı, React Native / Expo SDK 57)
- Diller/araçlar: TypeScript
- Depolama: `AsyncStorage` (cihaz üzerinde, internet gerektirmez)
- Özellik: **İzinli sigara pencereleri** — sigara içilecek saat aralıkları tanımlanır,
  günlük hedef bu pencerelere dağıtılır, pencere dışındayken uygulama hatırlatır.
- Rozet sistemi, bildirim butonları (sigarayı say / dayandım / ertele), takvim görünümü,
  panoya yedekleme-geri yükleme.

## Telefonunda test et (dev-client)

Bu projede özel native modül (`modules/bg-status`), bildirimler ve ses kanalları var; bu yüzden **Expo Go yeterli değil**, `expo-dev-client` ile derlenmiş bir APK gerekir.

1. Bağımlılıkları kur ve tip kontrolünü çalıştır:

   ```bash
   npm ci
   npx tsc --noEmit
   ```

2. Metro'yu başlat (proje kökünü kendisi bulur):

   ```bash
   bash scripts/dev-start.sh
   ```

3. Telefonda kurulu dev-client APK'yı aç; `http://127.0.0.1:8081` adresine bağlanır. Kod kaydedilince Fast Refresh ile anında yansır.

> Dev-client APK yoksa: `npx eas-cli build -p android --profile development` veya GitHub Actions iş akışı.
> Not: Eski notlarda geçen "Expo Go ile QR okut" akışı bu native modüllerle çalışmaz.

## Proje yapısı

```
App.tsx                     Ana giriş, sekmeler ve kurulum akışını yönetir
src/
  theme.ts                  Renkler, boşluklar, tipografi (tasarım sistemi)
  types.ts                  Veri tipleri (Plan, Kayıt, Kriz…)
  storage.ts                AsyncStorage katmanı
  context/AppContext.tsx    Global durum (plan, kayıt, kriz, premium, rozetler)
  lib/calculations.ts       Tüm hesaplar: hedef, tasarruf, mil taşları
  lib/badges.ts             Rozet tanımları ve kazanım kontrolü
  lib/statusNotification.ts Kilit ekranı durumu, bildirim kategorileri, kutlama
  components/               Card, Stepper, ProgressBar, TabBar, WeekChart, CalendarGrid
  screens/
    Onboarding.tsx          İlk kurulum + plan düzenleme (7 adım)
    HomeScreen.tsx          Günlük hedef, içilen sigara, kazançlar
    CravingScreen.tsx       Nefes egzersizi + "dayandım" kaydı
    StatsScreen.tsx         Toplam tasarruf, 7 gün grafiği, takvim, rozetler, mil taşları
    SettingsScreen.tsx      Plan düzenle, test modu, yedekleme, premium, sıfırlama
```

## Gelir modeli (freemium)

- Tüm temel özellikler ücretsiz.
- `AppData.isPremium` alanı hazır; premium özellikleri açmak için
  `src/screens/SettingsScreen.tsx` içindeki "Premium" kartı üzerinden
  ilerleyebilirsin. Ödeme (IAP/Stripe) sonraki adımda entegre edilir.

## Not (bu cihaz için)

Bu geliştirme makinesi ARM (aarch64) bir ortam. `hermesc` yalnızca x86_64 için dağıtıldığından
Hermes bytecode üretimi (OTA/`expo export`) için qemu-user emülasyonu kullanılır:

```bash
bash scripts/setup-hermesc.sh   # qemu + sarmalayıcıyı kurar/onarır
npx expo export --platform android   # HBC üretimi doğrulanabilir
```

`npm ci` sonrası sarmalayıcı silinirse bu betiği tekrar çalıştır.

### APK derleme (yerel, EAS hesabı gerekmez)

```bash
bash scripts/build-apk.sh
# çıktı: ./birakgitsin.apk (varsayılan: yalnızca arm64-v8a)
```

Gereksinimler: JDK 17 + Android SDK (`platforms;android-36`, `build-tools;36.0.0`,
`ndk;27.1.12297006`). Release, prebuild'in debug keystore'u ile imzalanır; bu APK
Play Store'a yüklemek için değil, doğrudan cihaza kurmak içindir.

> **arm64 (aarch64) host notu:** Android SDK'nın `cmake`, `ninja`, NDK `clang`,
> `aapt2`, `aidl` ve `zipalign` ikilileri yalnızca x86_64 dağıtılır. `build-apk.sh`,
> bu makinede `scripts/setup-x86_64-emulation.sh` ile qemu-x86_64 köprüsünü kurar
> (amd64 libc/libstdc++/libxml2 sysroot'u + sarmalayıcılar). İlk çalıştırmada
> amd64 paketleri indirilir; `npm ci` veya SDK güncellemesinden sonra betiği
> yeniden çalıştırmak yeterlidir.

Gerçek kullanıcı dağıtımı için:

```bash
npx eas-cli build --platform android
npx eas-cli build --platform ios
```

## Önerilen yol haritası

1. İlk gerçek kullanıcılarla MVP'yi test et, geri bildirim al.
2. Ana ekran widget'ı (tek dokunuşla kayıt + ilerleme) — EAS native build gerektirir,
   Expo Go'da çalışmaz.
3. Sorumluluk ortağı / paylaşılan başarı kartı (pazarlama için sosyal kanıt).
4. Premium: detaylı raporlar, tema, rozetler.
5. Kurumsal: şirket-sigorta kanalına hazırlık.