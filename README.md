# BırakGitsin

Sigarayı **azaltarak bırakma** uygulaması. Her gün içilen sigarayı takip eder, günlük hedef
belirler ve hedefi aşmadığın her sigara için **para + sağlık kazancı** hesaplar.

- Platform: Android + iOS (tek kod tabanı, React Native / Expo SDK 57)
- Diller/araçlar: TypeScript
- Depolama: `AsyncStorage` (cihaz üzerinde, internet gerektirmez)
- Özellik: **İzinli sigara pencereleri** — sigara içilecek saat aralıkları tanımlanır,
  günlük hedef bu pencerelere dağıtılır, pencere dışındayken uygulama hatırlatır.
- Rozet sistemi, bildirim butonları (sigarayı say / dayandım / ertele), takvim görünümü,
  panoya yedekleme-geri yükleme.

## Telefonunda test et (Expo Go)

1. Telefonuna **Expo Go** uygulamasını kur (Play Store / App Store).
2. Projeyi çalıştır:

   ```bash
   cd birakgitsin
   npm start
   ```

3. Terminalde çıkan **QR kodu** Expo Go ile okut.

> Bunu çalıştırdığım cihazda dev sunucusu zaten açık: http://localhost:8081
> (Expo Go'da "Enter URL" → `exp://localhost:8081` da olur.)

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
    Onboarding.tsx          İlk kurulum + plan düzenleme (6 adım)
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

Bu geliştirme makinesi ARM (Android) bir ortam. O yüzden yerelde `expo export`
(sıkı Hermes bytecode) çalışmaz; **Expo Go ile test ve EAS cloud build** sorunsuz
çalışır. Gerçek kullanıcı dağıtımı için:

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