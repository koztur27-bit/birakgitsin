# Bırak Gitsin / Let It Go — Google Play & Uluslararası Uyum Denetimi

**Tarih:** 24 Kasım 2026  
**Kapsam:** Kaynak kod, Android manifest/native modüller, uygulama içi metinler, legal dokümanlar, mağaza metinleri, Google Play güncel politika metinleri.  
**Not:** Bu rapor teknik uyum değerlendirmesidir; hukuki görüş yerine geçmez. Yayından önce gerçek veri sorumlusu bilgileri ve region-specific yasal metinler hukuk danışmanınca onaylanmalıdır.

---

## 1. Genel sonuç

Uygulamanın **mimari yönü uygundur**: hesap yok, minimal izin, yerel veri, açık feragatname, bölgesel destek hatları, şeffaf PRO. Ancak denetimde **3 kritik yayın blokörü** ve bir dizi yüksek/orta risk bulundu. Kod ve doküman düzeltmelerinin çoğu bu turda yapıldı; kalan 3 blokör **senin sağlaman gereken gerçek bilgilerle** ilgilidir.

| Seviye | Konu | Durum |
|---|---|---|
| KRİTİK | Play zorunlu sağlık feragatnamesi eksik/eksik uygulanmış | ✅ Düzeltildi (mağaza + uygulama + legal) |
| KRİTİK | Sağlık iddiaları tanı/tedavi/risk garantisi içeriyordu | ✅ Yumuşatıldı |
| KRİTİK | Privacy policy "taslak", gerçek davranışla çelişiyordu | ✅ Yeniden yazıldı |
| KRİTİK | Test AdMob App ID / test reklam birimleri | ❌ **Senin kimliklerin gerekli** |
| KRİTİK | `app-ads.txt` placeholder publisher ID | ❌ **Gerçek publisher ID/domain gerekli** |
| KRİTİK | İstemcide AI API anahtarı | ✅ Kaldırıldı; proxy şart |
| YÜKSEK | Satın alma onayı olmadan PRO verilmesi | ✅ Düzeltildi |
| YÜKSEK | Kriz hatlarında yanlış numaralar | ✅ Düzeltildi (182/988/116 123 ayrıldı) |
| YÜKSEK | AI çıktısı için bildirme mekanizması yoktu | ✅ Eklendi |
| YÜKSEK | Android yedekleme açık, kilit ekranı bildirimi public | ✅ Kapatıldı / PRIVATE |
| YÜKSEK | Veri sorumlusu kimliği/adresi placeholder | ❌ **Doldurulmalı** |
| ORTA | Güncelleyici HTTP ve kullanıcı sürümünde görünür | ✅ User build'de gizlendi |
| ORTA | Reklam onayı (UMP) çağrılmıyordu | ✅ Eklendi (non-personalized korundu) |
| ORTA | Hardcoded TR metinler / yerelleştirme | ⚠️ Kısmi (ileri iterative) |

---

## 2. Google Play politika denetimi

### 2.1 Sağlık içeriği ve tıbbi cihaz sınırı (Health Content and Services)

Google Play'in ilgili politikası özetle şunu zorunlu kılıyor:

> "Other health and medical apps must include a clear disclaimer in their app description indicating that the app is **'not a medical device and does not diagnose, treat, cure, or prevent any medical condition.'**"  
> "Apps must also **remind users to consult a healthcare professional for medical advice, diagnosis, or treatment.**"

**Önceki durum:** Mağaza açıklamasında genel bir "tıbbi cihaz değildir" cümlesi vardı ama Google'ın aradığı tam ifade yoktu. Uygulama içindeki "Kalp krizi riskin azalmaya başlar", "Kanındaki karbonmonoksit seviyesi normale düşer", "İnme riskin sigara içmeyen birine yaklaşır", "Akciğer kanseri riskin yarıya iner" gibi ifadeler kişiye yönelik tıbbi tahmin/garanti algısı yaratıyordu.

**Yapılanlar:**
- Mağaza açıklamasına tam İngilizce/TR feragatname eklendi (`docs/MAGAZA-VE-LANSMAN.md`).
- `src/lib/calculations.ts` içindeki tüm milestone ve `healthRecovery` metinleri "popülasyon çalışmalarında bildirilir / bireysel sonuçlar değişir / tıbbi ölçüm değildir / garanti değildir" çerçevesine çevrildi.
- `src/i18n/translations.ts` içindeki vücut haritası "güçlü şekilde toparlanıyor / largely returned to normal" gibi ifadeleri de aynı çerçeveye çevrildi.
- `HealthScreen`, `StatsScreen`, `Onboarding` ve `CoachChatModal` içine uyarı metinleri eklendi.
- NRT (nikotin sakızı/bandı) seçeneğine "ilaçtır, doz önermeyiz, doktor/eczacıya danışın" uyarısı eklendi.

**Senin yapman gereken:** Play Console'da uygulama **"Health & Fitness"** kategorisinde ve sağlık uygulaması beyanını "genel sağlık/wellness, tıbbi cihaz değil" şeklinde işaretlenmeli. İçerik derecelendirmesi anketinde sigara/nikotin içeriği nedeniyle **18+ (yetişkin)** seçilmelidir.

### 2.2 Generated content (AI koç)

Google Play'in yapay zekâ içeren uygulamalar için öne çıkan gereksinimleri: içeriğin AI tarafından üretildiğinin açıkça belirtilmesi, kullanıcının uygunsuz içeriği bildirebilmesi, zararlı çıktıya karşı önlem.

**Önceki durum:** AI olduğuna dair başlık vardı ama her yanıtın altında uyarı yoktu; bildirme fonksiyonu yoktu; istemcide `EXPO_PUBLIC_AI_API_KEY` ile API anahtarı bulunuyordu; sistem promptunda yanlış kriz numarası (183 ruh sağlığı olarak) geçiyordu.

**Yapılanlar:**
- `src/lib/coachChat.ts` baştan yazıldı: API anahtarı kaldırıldı, sunucu proxy (`EXPO_PUBLIC_AI_PROXY_URL`) üzerinden anahtarsız istek, 10 sn timeout, çıktı filtresi (ilaç/doz/tanı/cure kelimeleri → güvenli yerel yanıt), her AI yanıtına ayrı feragatname, anonim bağlam açıklaması, doğrulanmış kriz hatları.
- `CoachChatModal`: her koç yanıtının altına "AI-generated · may be inaccurate · not medical advice" etiketi ve **"⚠ Bu yanıtı bildir"** butonu (mailto: koztur.27@gmail.com) eklendi; giriş mesajına veri işleme şeffaflığı eklendi.
- Kriz mesajları: TR **ALO 182** (ruh sağlığı), **ALO 171** (bırakma), **112** (acil); ABD **988**, **911**; İngiltere **116 123 Samaritans**, **999/112**; AB **112**.
- `src/lib/regionalSupport.ts`: TR acil satırındaki yanlış `112 / 183` düzeltildi, ayrı `ALO 182` satırı eklendi; GB'de `999 / 112` yerine `999` + Samaritans eklendi.

**Kalan:** Eğer AI koç gerçekten çalışacak ise sunucu tarafı proxy şart (anahtar sunucuda tutulmalı). Proxy yoksa uygulama güvenli yerel kurallı yanıtlara düşer — Play açısından sorun değil, ürün deneyimi olarak "AI" ifadesinin güncellenmesi gerekir.

### 2.3 Veri güvenliği / Data Safety

**Yapılanlar:** Yeni `docs/GIZLILIK-POLITIKASI.md` gerçek davranışla uyumlu hale getirildi. Play Console formu için önerilen işaretler raporun sonunda. Öne çıkanlar:
- Veri toplanıyor: **Evet** — uygulama etkinliği, cihaz/reklam kimlikleri (AdMob), satın alma bilgileri, AI koç serbest metni.
- Satış: **Hayır**. Hassas sağlık verisi sunucuda tutulmaz; AI koç mesajı kullanıcı içeriği olarak beyan edilir.
- Şifreli aktarım: **Evet** (HTTPS). `_dev_ HTTP updater` kullanıcı sürümünde UI'dan kaldırıldı (`!IS_USER_RELEASE` kapısı).
- Silme: **Evet** (uygulama içi sıfırlama / kaldırma). Android `allowBackup=false` eklendi (`plugins/withNoBackup.js`).
- Kilit ekranı bildirimleri `PRIVATE` yapıldı.

**Senin yapman gereken:** Play Console Data Safety formunu yukarıdaki değerlerle doldur. Emin olmadığın maddelerde "sağlayıcı sözleşmesine göre" notunu kullan.

### 2.4 Reklamlar

- `requestNonPersonalizedAdsOnly: true` zaten vardı — kişiselleştirilmiş reklam yok.
- `initAds()` içine `AdsConsent.requestInfoUpdate/showForm` çağrısı eklendi (EEA/UK için).
- **Blokör:** `app.json` ve `src/lib/ads.ts` hâlâ Google **test** App ID / test birim ID kullanıyor. Gerçek AdMob App ID (Android + iOS) ve ödüllü reklam birim ID'si gerekli.
- **Blokör:** `docs/app-ads.txt` placeholder. Gerçek publisher ID (örn. `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`) ve geliştirici domaininde `/app-ads.txt` hosting'i gerekli.

### 2.5 Uygulama içi satın alma

**Sorun:** `purchasePro()` başarı döndüğünde doğrudan `setPremium(true)` çağrılıyordu; yani Play onayı gelmeden PRO açılıyordu. Yedekten `isPremium: true` gelince de yetki devralınıyordu.

**Düzeltme:** `purchasePro()` artık yalnızca ödeme akışını başlatıyor (`started`); yetki yalnızca `addPurchaseListeners()` içinde, `ENTITLEMENT_PRODUCT_IDS` ile eşleşen onaylı satın alma olayında veriliyor (`src/context/AppContext.tsx`). Backup/restore `isPremium: false` yapıldı; kullanıcı "Satın alımları geri yükle" ile Play'den doğrulayabilir. Abonelik yenileme/iptal/iade metni `pro.subscriptionLegal` TR/EN güncellendi, ProScreen'a Google Play iade politikası linki eklendi.

**Senin yapman gereken:** Play Console'da `pro_monthly` ve `pro_yearly` ürünlerini (abonelik) tanımla, fiyatlandır, test kullanıcılarıyla satın alma/iptal/iade akışını test et. Uzun vadede sunucu tarafı receipt doğrulaması önerilir (client-only yetki, root/jailbreak cihazlarda hâlâ manipüle edilebilir).

### 2.6 İzinler ve teknik

- Manifest'te yalnızca `POST_NOTIFICATIONS` var; kamera, konum, mikrofon, depolama, SYSTEM_ALERT_WINDOW blocked. ✅
- `targetSdkVersion 36`, imza DN `CN=Birak Gitsin`, SHA-256 doğrulandı. ✅
- `versionCode 98` (bu tur: vc97 yaş kapısı + yerelleştirme, vc98 R8/minify).
- Kodi imzalı sürümlerde `expo-updates` var; Data Safety'de teknik veri olarak beyan edildi.

---

## 3. Bölgesel / yasal değerlendirme

### 3.1 Türkiye — KVKK

Sigara kullanımı, kriz kayıtları ve yoksunluk verileri **özel nitelikli kişisel veri** (sağlık verisi) sayılabilir. KVKK m.11 açık rıza veya m.28 istisnaları gerekir. Uygulamada veriler yalnızca cihazda; AI koç isteğe bağlı ve şeffaf. Başvuru e-posta adresi `koztur.27@gmail.com`. 112 acil, ALO 171 bırakma, ALO 182 ruh sağlığı, YEDAM 115 hatları eklendi.

**Eksik:** Veri sorumlusu gerçek ad/şirket unvanı ve açık adres hâlâ placeholder. Yayından önce doldurulmalı; gerçek kişi ise KVKK başvuru sürecine hazır olunmalı.

### 3.2 AB / EEA — GDPR ve AI Act

- GDPR Art.9(2)(a) açık rıza, Art.13/14 şeffaflık, erişim/silme/taşınabilirlik/itiraz hakları dokümana eklendi.
- Kilit ekranı gizliliği ve yedekleme kapatma veri minimization ile uyumlu.
- **EU AI Act (Art.50 şeffaflık):** AI koç açıkça AI olarak etiketlendi, her yanıt uyarı+bildirme ile sunuluyor. Uygulama "high-risk AI" kapsamına girmiyor (tıbbi cihaz değil, karar destek değil) ama tıbbi tavsiye sınırı korunmalı.
- **Eksik:** AB'de yerleşik olunmadan Avrupa kullanıcılarına hizmet veriliyorsa GDPR Art.27 **AB temsilcisi** atanması gerekebilir. Ayrıca veri sorumlusu kimliği tamamlanmalı.

### 3.3 İngiltere — UK GDPR

GDPR ile paralel haklar dokümana eklendi. ICO'ya şikâyet hakkı metinde. Reklam onayı (UMP) eklendi. Yaş sınırı 18+ (tütün ürünleri bağlamında).

### 3.4 ABD — CCPA/CPRA

Veri satışı/share yok; hassas kişisel bilgi satışı yok. Gizlilik politikasında CCPA bölümü ve silme/erişim/düzeltme hakkı eklendi. "Do Not Sell or Share My Personal Information" linki gerekmiyor (satış yapılmıyor) ama politika metninde bu açıkça ifade edilmeli — eklendi.

### 3.5 Diğer ülkeler

Bölgesel destek hatları `detectRegion()` ile TR/US/GB/EU/JP/global seçiliyor; Japonya ve global için acil numara bilgisi "local emergency number" olarak bırakıldı (yanlış numara vermemek için). Bu, yanlış yönlendirme riskini azaltıyor.

---

## 4. Bu turda değiştirilen dosyalar

- `src/lib/calculations.ts` — sağlık metinleri, `healthElapsedDays()` (ilk gün/geçmiş plan düzeltmesi korundu)
- `src/lib/coachChat.ts` — güvenlik, kriz hatları, API anahtarı kaldırma, çıktı filtresi
- `src/components/CoachChatModal.tsx` — AI etiketi, bildir butonu, şeffaflık
- `src/lib/regionalSupport.ts` — doğru acil/ruh sağlığı hatları
- `src/lib/billing.ts`, `src/screens/ProScreen.tsx`, `src/context/AppContext.tsx` — satın alma yetkisi
- `src/screens/HealthScreen.tsx`, `src/screens/StatsScreen.tsx`, `src/screens/Onboarding.tsx`, `src/i18n/translations.ts` — feragatnameler ve yumuşatılmış iddialar
- `src/lib/statusNotification.ts`, `plugins/withNoBackup.js`, `app.json` — gizlilik/güvenlik
- `src/screens/SettingsScreen.tsx` — HTTP güncelleyici user build'de gizlendi
- `src/lib/ads.ts` — UMP onay akışı
- `src/lib/legalContent.ts`, `docs/privacy-policy.html`, `docs/terms-of-use.html`, `docs/GIZLILIK-POLITIKASI.md`, `docs/MAGAZA-VE-LANSMAN.md` — yasal metinler
- `docs/PLAY-UYUM-RAPORU-2026-11-24.md` — bu rapor

**vc97/vc98 ekleri:** `src/components/AgeGate.tsx`, `src/i18n/translations.ts`, `src/lib/calculations.ts`, `plugins/withR8Security.js`, `proguard-rules.expo.append`, `.github/workflows/build.yml`, `docs/MAGAZA-VE-LANSMAN.md`.

Doğrulama: `npx tsc --noEmit` ✅ · `npm run lint` ✅ (0 hata).

---

## 5. Yayına geçmeden önce senden istenenler (blokörler)

1. **Gerçek AdMob App ID'leri** (Android `ca-app-pub-...~...`, iOS `ca-app-pub-...~...`) ve **ödüllü reklam birim ID'si**. Gelirse `app.json` + `src/lib/ads.ts` güncellenir.
2. **AdMob publisher ID + geliştirici domain** → `docs/app-ads.txt` gerçek içerikle değiştirilir ve `https://<domain>/app-ads.txt` yayına alınır.
3. **Gerçek veri sorumlusu adı/şirketi ve açık adres** → gizlilik politikası ve uygulama içi legal metinlere işlenir.
4. **AI proxy endpoint'i** (opsiyonel): AI koç canlı kalacaksa sunucu tarafı anahtarlı proxy gerekir. Aksi halde güvenli yerel yanıtlarla devam ederiz ve "AI destekli" ifadesini "kurallı koç" olarak güncelleriz.
5. **Play Console manuel adımları:** Data Safety formu, Health app beyanı, 18+ content rating anketi, IAP ürünleri (`pro_monthly`/`pro_yearly`), store listing (kısa/tam açıklama, ekran görüntüleri), test tracking.

---

## 6. Ek önerilerim

- ~~Yaş kapısı~~ **Tamamlandı (vc97):** `AgeGate` ilk açılışta 18+ onayı alıyor, yalnızca cihazda saklıyor; yedekten geri yüklemede tekrar soruluyor.
- **Sunucu tarafı fatura doğrulaması (backend şartı):** Şu an client-side entitlement Play onayına bağlı ama root'lu cihazlarda manipülasyon teorik olarak mümkün. Play Developer API ile sunucu doğrulaması için backend gerekir.
- ~~Yerelleştirme temizliği~~ **Tamamlandı (vc97):** Sağlık/istatistik başlıkları, 14 kilometre taşı, 4 sağlık kazanımı ve haftalık koç raporu `translations.ts`'e taşındı.
- **Hukuki inceleme:** Özellikle KVKK açık rıza metni ve AB temsilcisi konusu bir avukat tarafından gözden geçirilmelidir.

---

## 7. Kod güvenliği, imza ve klon riski (vc98)

**AAB şifrelenmez, imzalanır.** Şifreli AAB Play tarafından okunamaz ve reddedilir. Dosya HTTPS ile aktarılır, Play tarafında korunur; imza ise dosyanın bize ait olduğunu ve değişmediğini kanıtlar (dijital mühür). Aktarım güvenliği ile dosya şifrelemesi aynı şey değildir.

**Play App Signing (Console'da yapılacak):**
- İki anahtar vardır: **upload key** (`birakgitsin-release.jks`, CI'da AAB'yi imzalar; kaybolursa sıfırlanabilir) ve **app signing key** (Google'da saklanan asıl anahtar; kullanıcıya giden APK'ları imzalar).
- İlk AAB yüklemesinde **“Use Google-generated app signing key”** seçilmelidir. Uygulama daha önce yayınlanmadığı için mevcut keystore'u app signing key olarak yüklemeye gerek yoktur.
- Bundan sonra tüm AAB'ler aynı upload key ile imzalanmalıdır; farklı keystore Play tarafından reddedilir.
- Keystore ve şifreler yalnızca GitHub Secrets + çevrimdışı yedekte; `.gitignore` ile repo dışında. ✅

**Kod koruması:**
- R8/minify + resource shrinking: `plugins/withR8Security.js` ile her prebuild'de açılır (`android.enableMinifyInReleaseBuilds=true`, `android.enableShrinkResourcesInReleaseBuilds=true`).
- `proguard-rules.expo.append` → Expo Modules, React Native/Hermes/JSI, Reanimated, Play Billing/Review/Updates ve AdMob için keep kuralları.
- R8 etkisi: kullanıcı APK **54.293.468 → 42.414.326 bayt** (~%22), AAB **41.8 MB → 36.6 MB**.
- Hermes zaten açık (`hermesEnabled=true`); JS düz metin olarak paketlenmez.
- **Sınır:** R8 ve Hermes kodu okunmayı **zorlaştırır**, imkânsız kılmaz. Metinler, görseller ve AI proxy adresi çıkarılabilir. Sırlar istemcide tutulmuyor (AI anahtarı yok, AdMob ID'leri sır değil). ✅

**Kalan riskler ve backend gereksinimleri:**
1. **Klon:** APK indirilip başka isimle yayınlanabilir. Mağaza açıklamasına “RESMİ KAYNAK” uyarısı eklendi. Tespitte Play IP/tedir formuyla kaldırtma yapılır; git commit geçmişi ve marka tescili delil olarak kullanılır.
2. **Yerel PRO manipülasyonu:** Sunucu tarafı receipt doğrulaması olmadan root'lu cihazlarda aşılabilir → backend şartı.
3. **Play Integrity API:** İstemcide token almak tek başına koruma sağlamaz; token'ın sunucuda doğrulanması gerekir → backend şartı. Backend gelince eklenecek.
4. **AI proxy:** Endpoint görülebilir; gerçek AI açılırsa proxy'de API anahtarı, origin kontrolü ve rate limiting sunucuda olmalı.

**Klon şikâyet şablonu (hazır metin):**

> Merhaba, ben `com.birakgitsin.app` paket adlı “Bırak Gitsin / Let It Go” uygulamasının geliştiricisiyim. Resmi sürüm yalnızca Google Play ve App Store üzerinden yayınlanmaktadır. Aşağıdaki uygulama/URL bizim iznimiz olmadan adımızı, ikonumuzu ve/veya uygulama içeriğimizi kopyalamaktadır: [KLON PAKET ADI / URL]. Resmi sürüm: [PLAY STORE LINK]. Eser sahibi olduğuma dair deliller: özel GitHub deposundaki commit geçmişi ve [MARKA TESCİL NO, varsa]. İlgili içeriğin Google Play politikası uyarınca kaldırılmasını talep ediyorum. İletişim: koztur.27@gmail.com.
