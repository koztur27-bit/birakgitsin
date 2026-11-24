# Bırak Gitsin / Let It Go — Gizlilik Politikası

**Yürürlük tarihi:** 24 Kasım 2026  
**Son güncelleme:** 24 Kasım 2026  
**E-posta / destek / KVKK başvurusu:** koztur.27@gmail.com  
**Veri sorumlusu:** [GERÇEK AD SOYAD / ŞİRKET UNVANI — YAYINDAN ÖNCE DOLDURULMALI]  
**Adres:** [GERÇEK AÇIK ADRES — YAYINDAN ÖNCE DOLDURULMALI]  
**Web:** https://koztur27-bit.github.io/birakgitsin/

> **YAYIN ÖNESİ ZORUNLULUK:** Köşeli parantezli veri sorumlusu kimliği ve adresi gerçek bilgilerle değiştirilmelidir. Bu alanlar doldurulmadan Play Console'da yayın yapılmamalıdır.

---

## 1. Kısa özet

- Uygulama **hesap açmanı istemez**; ad, e-posta veya telefon numarası toplamaz.
- Planın, sigara/kriz kayıtların, tetikleyicilerin, rozetlerin ve ayarların **yalnızca cihazında**, uygulamanın özel depolama alanında tutulur.
- **Android yedekleme kapalıdır** (`android:allowBackup=false`); sağlık davranışı verileri Google Drive yedeğine veya başka bir cihaza otomatik kopyalanmaz.
- Verilerin panoya kopyalanarak manuel yedeklenmesi mümkündür. Pano içeriği işletim sistemi ve diğer uygulamalar tarafından okunabilir; işiniz bitince panoyu temizleyin.
- Reklam (ödüllü AdMob), abonelik (Google Play Billing), isteğe bağlı AI koç ve güncelleme kontrolü (Expo Updates) sınırlı teknik amaçlarla üçüncü taraf hizmetleri kullanır.
- Verileriniz **satılmaz** ve reklam profili oluşturmak için kullanılmaz.
- Uygulama **tıbbi cihaz değildir**; tıbbi tavsiye, tanı veya tedavi sunmaz.

---

## 2. İşlenen veriler

### 2.1 Yalnızca cihazda tutulan veriler

| Veri | Amaç | Zorunluluk |
|---|---|---|
| Plan (başlangıç anı, günlük taban, haftalık azaltma, izinli saatler, para birimi) | Günlük hedef, tasarruf ve ilerleme | Evet |
| Günlük sigara kayıtları (tarih, adet, saat, pencere) | İstatistik ve hedef takibi | Evet |
| Kriz kayıtları (zaman, dayanıldı mı, şiddet, tetikleyici kategorisi) | Tetikleyici analizi, kişisel öneriler | İsteğe bağlı |
| Dayanma sayacı, rozetler, bildirim tercihleri, dil/tema | Motivasyon ve tercihler | Evet |
| Motivasyon fotoğrafı (seçilirse) | Kişisel motivasyon | İsteğe bağlı, yalnızca cihazda |
| PRO abonelik durumu | Özellik erişimi | Satın alma olursa; Play onayıyla |

Bu veriler sunucuya yüklenmez. “Tüm Verileri Sıfırla” veya uygulamayı kaldırma işlemi yerel verileri siler.

### 2.2 Google Play Billing

Abonelik (`pro_monthly`, `pro_yearly`) Google Play altyapısında yürür. Kart bilgilerini görmez, saklamaz ve iletmezsiniz; Play faturalandırma akışını yönetir. PRO yetkisi yalnızca Play'den gelen onaylı satın alma olayıyla açılır; yedekten veya elle değiştirilmiş dosyadan devralınmaz.

### 2.3 Reklamlar (AdMob)

Uygulama isteğe bağlı ödüllü reklamlar (AI koç kullanım sınırını kaldırma) gösterebilir. Google AdMob; reklam sunumu, ölçümleme ve dolandırıcılığın önlenmesi amacıyla reklam kimliği, IP adresi, yaklaşık konum ve uygulama etkileşimi gibi verileri kendi politikasına göre işleyebilir. Reklam izni/tercihleri Android ayarlarından yönetilebilir.

### 2.4 AI koç

AI koç isteğe bağlıdır. Mesaj gönderdiğinizde **sizin yazdığınız serbest metin** ve anonim ilerleme sayıları (bırakma günü, içilmeyen sigara sayısı, tasarruf, tetikleyici **kategorileri**) yanıt üretmek için AI sağlayıcısına iletilir. İsim, e-posta, telefon veya konum gönderilmez; ancak serbest metne kendiniz kimlik bilgisi yazarsanız bu bilgi de iletilir — lütfen yazmayın. İstemcide API anahtarı saklanmaz; üretimde sunucu tarafı proxy kullanılmalıdır. AI çıktısı hatalı olabilir; her yanıtın altında uyarı ve uygulama içi bildirim (report) bulunur.

### 2.5 Güncelleme ve teknik veriler

Expo Updates güncelleme kontrolü sırasında uygulama sürümü, istek zamanı ve IP adresi gibi teknik veriler sağlayıcı tarafından işlenebilir. Play/kullanıcı sürümünde HTTP tabanlı APK güncelleyici arayüzü gizlidir; yalnızca geliştirme derlemesinde bulunur. Çekirdek özellikler çevrimdışı çalışır.

### 2.6 Toplamadığımız veriler

Ad, soyad, e-posta, telefon, konum, kişiler, mesajlar, fotoğraf galerisi (motivasyon fotoğrafı kullanıcı seçimi dışında), sağlık verisi satışı, reklam profillemesi.

---

## 3. Hukuki dayanak (KVKK / GDPR / UK GDPR)

- **Sözleşmenin ifası / hizmetin sunulması:** plan, kayıt ve sayaçların cihazda işlenmesi.
- **Açık rıza (KVKK m.11 / GDPR Art.9(2)(a)):** sigara kullanımı ve kriz kayıtları özel nitelikli sağlık verisi niteliğinde olabilir. Uygulamayı kullanmaya devam ederek bu verilerin yalnızca cihazınızda işlenmesine yönelik hizmeti kabul edersiniz; AI koç ve bildirimler ayrıca isteğe bağlıdır ve rıza geri çekilebilir.
- **Meşru menfaat:** güvenlik, hata giderme, temel güncelleme kontrolü.
- **Hukuki yükümlülük:** mağaza/mevzuat gereklilikleri.

Yurt dışına aktarım yalnızca yukarıdaki teknik sağlayıcıların hizmeti kapsamında, sözleşmeleri ve KVKK/GDPR aktarım koşulları çerçevesinde olur.

---

## 4. Bölgesel haklar

- **Türkiye (KVKK):** erişim, düzeltme, silme, itiraz, taşınabilirlik ve rızayı geri çekme. Başvuru: koztur.27@gmail.com — 30 gün içinde yanıt.
- **AB/EEA (GDPR) ve İngiltere (UK GDPR):** erişim, düzeltme, silme, kısıtlama, itiraz, taşınabilirlik; ayrıca yetkili denetleyici kuruma şikâyet hakkı. Veri sorumlusu kimliği yukarıda belirtilmelidir.
- **Kaliforniya (CCPA/CPRA):** Veri satışı veya "sharing" yapılmaz; hassas kişisel bilgi satışı yapılmaz. Silme/düzeltme/erişim ve ayrımcılığa uğramama hakları geçerlidir; koztur.27@gmail.com üzerinden kullanılabilir.

---

## 5. Saklama süresi

Veriler uygulamayı silene veya sıfırlayana kadar cihazda kalır. Destek e-postaları talep çözümü için en fazla 1 yıl saklanır. Yedekten PRO yetkisi devralınmaz.

---

## 6. Güvenlik

Uygulama özel depolama, Android yedekleme kapatma (`allowBackup=false`), kilit ekranı bildirimlerinde `PRIVATE` görünürlük, HTTPS üzerinden güncelleme/AI isteği ve Play faturalandırma kullanır. Cihaz kilidi ve işletim sistemi güncellemeleri kullanıcı sorumluluğundadır.

---

## 7. Çocukların gizliliği

Uygulama **18 yaş ve üzeri** yetişkinler içindir (ABD'de tütün ürünleri için yasal yaş 21'dir). 18 yaş altındaki kişilerden bilerek veri toplanmaz; tespit edilirse silinir.

---

## 8. Tıbbi sorumluluk reddi (Google Play zorunlu metin)

**Bu uygulama bir tıbbi cihaz değildir ve herhangi bir tıbbi durumu teşhis etmez, tedavi etmez, iyileştirmez veya önlemez.** İçerik genel bilgilendirme ve motivasyon amaçlıdır. Tıbbi tavsiye, tanı veya tedavi için bir sağlık uzmanına danışın. Hamilelik, kronik hastalık, ilaç kullanımı veya ciddi yoksunluk belirtilerinde önce hekiminize başvurun. Acil durumda yerel acil numarayı (AB/İngiltere 112, ABD 911, Türkiye 112) arayın; ruhsal krizde ALO 182 (TR), 988 (ABD), 116 123 Samaritans (İngiltere).

---

## 9. Yapay zekâ şeffaflığı (EU AI Act / Play Generated Content)

AI koç, yapay zekâ tarafından üretilen metinler sunar. Sistem, tıbbi tavsiye/ilaç dozu önermeyecek şekilde yönlendirilir; çıktı otomatik olarak filtrelenir ve güvenli olmayan yanıtlar yerel yanıtlara düşürülür. Kullanıcılar her yanıtın altındaki **“Bu yanıtı bildir”** bağlantısıyla içerik bildirebilir. AI destekli olmayan tamamen yerel yanıtlar da mevcuttur.

---

## 10. Değişiklikler ve iletişim

Politika güncellenirse tarih değiştirilir; önemli değişiklikler uygulama/mağaza üzerinden duyurulur.

**E-posta:** koztur.27@gmail.com  
**Veri sorumlusu / adres:** yayından önce doldurulmalı.

---

## 11. Google Play “Veri güvenliği” formu — önerilen işaretler

| Soru | Yanıt |
|---|---|
| Veri toplanıyor mu? | **Evet** (uygulama içi kullanım verileri, tanımlayıcılar, satın alma bilgileri — aşağıdaki amaçlarla) |
| Uygulama etkinliği | **Evet** (özellikle reklam ölçümü ve güncelleme kontrolü; AI koç kullanım sayısı cihazda) |
| Cihaz kimlikleri / reklam kimliği | **Evet** (AdMob, izin/ayara bağlı) |
| Satın alma bilgileri | **Evet** (Google Play Billing) |
| Kişisel bilgiler | **Hayır** (ad/e-posta/telefon toplanmaz) |
| Hassas bilgi (sağlık) | Uygulama içi veriler cihazda; sunucuya gönderilmez. AI koç serbest metni gönderir → formda **Evet, kullanıcı içeriği** olarak beyan edilmelidir. |
| Amaçlar | Uygulama işlevleri, reklam, satın alma doğrulama, güvenlik |
| Paylaşım | **Evet** — hizmet sağlayıcılar (Google/AdMob, Play Billing, Expo, AI sağlayıcısı) |
| Satış | **Hayır** |
| Şifreli aktarım | **Evet** (HTTPS) |
| Silme | **Evet** (uygulama içi sıfırlama / kaldırma) |
| Bağımsız güvenlik incelemesi | **Hayır** |
