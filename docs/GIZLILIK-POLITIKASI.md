# Bırak Gitsin — Gizlilik Politikası (Taslak)

**Yürürlük tarihi:** 14 Kasım 2026  
**Son güncelleme:** 14 Kasım 2026  
**Veri sorumlusu:** [Ad Soyad / Şirket unvanı]  
**Adres:** [Açık adres]  
**E-posta:** [destek@alanadi.com]  
**Web:** [https://alanadi.com]

> Bu metin bir taslaktır. Yayına almadan önce gerçek şirket/kişi bilgileri, barındırma sağlayıcıları ve mağaza gereksinimleriyle uyumlu hale getirilmeli; gerekiyorsa hukuk danışmanına inceletilmelidir.

---

## 1. Kısa özet

- Bırak Gitsin **hesap açmanı istemez**; ad, e-posta veya telefon numarası toplamaz.
- Planın, sigara kayıtların, kriz notların ve rozetlerin **telefonunda** saklanır.
- Verilerini **reklam profili** için kullanmıyor, satmıyor veya üçüncü taraflarla paylaşmıyoruz.
- Verilerini istediğin zaman **panoya kopyalayarak** yedekleyebilir, uygulama içinden silebilirsin.
- Uygulama; bildirim, kendi kendini güncelleme ve isteğe bağlı ses çalma için bazı cihaz izinleri kullanır.

---

## 2. Hangi veriler işlenir?

### 2.1 Yalnızca cihazında saklanan veriler

| Veri | Amaç | Zorunlu mu? |
|---|---|---|
| Sigara azaltma planı (başlangıç tarihi, günlük taban, haftalık azaltma, paket fiyatı, izinli saatler) | Günlük hedef ve tasarruf hesaplama | Evet, uygulamanın çalışması için |
| Günlük sigara kayıtları (tarih, adet, saat, pencere) | İlerleme, istatistik, haftalık rapor | Evet |
| Kriz kayıtları (zaman, dayanıldı mı, şiddet, tetikleyici) | Riskli saat/tetikleyici analizi, kişisel öneriler | İsteğe bağlı |
| Rozetler ve uygulama ayarları | Motivasyon ve tercihler | Evet |
| Premium durumu (yerel işaret) | Özellik erişimi | Satın alma yapılırsa |

Bu veriler uygulamanın özel depolama alanında (AsyncStorage) tutulur. Sunucumuza yüklenmez. Uygulamayı silmen veya “Tüm Verileri Sıfırla” seçeneğini kullanman hâlinde cihazdaki veriler silinir.

**Önemli:** Yedekleme özelliğini kullandığında verilerin **panoya** kopyalanır. Pano, işletim sistemi ve diğer uygulamalar tarafından okunabilir. Yedeği yalnızca güvendiğin bir yere yapıştır; işini bitince panoyu temizle.

### 2.2 Cihazda işlenen, sunucuya gönderilmeyen veriler

- **Bildirimler:** Hatırlatma ve dayanma sayacı bildirimleri cihazda planlanır. Bildirim izni vermezsen bu özellik çalışmaz; uygulamanın geri kalanı çalışır.
- **Ses ve titreşim:** Uyarı sesi cihazda çalınır. Uygulama ses kaydı yapmaz.
- **Kurulum izni:** Kendi kendini güncelleme özelliği, indirilen APK'yı yükleyebilmek için “bilinmeyen kaynaklardan uygulama yükleme” izni ister. Bu izin yalnızca senin başlattığın güncelleme için kullanılır.

### 2.3 Güncelleme hizmeti

Uygulama, JavaScript paket güncellemelerini almak için Expo Updates altyapısına (u.expo.dev) bağlanabilir. Bu istek sırasında cihaz/uygulama sürümü, istek zamanı ve IP adresi gibi teknik veriler ilgili sağlayıcı tarafından işlenebilir. Bu veriler kimliğini doğrudan tanımlamaz ve tarafımızca reklam amacıyla kullanılmaz. Güncelleme kontrolü için internet bağlantısı gerekir; uygulamanın çekirdek özellikleri çevrimdışı çalışır.

### 2.4 Toplamadığımız veriler

- Ad, soyad, e-posta, telefon numarası
- Konum
- Kişiler, fotoğraflar, mesajlar
- Reklam kimliği
- Sağlık verisi satışı veya profillemesi

Uygulamada reklam ağı, üçüncü taraf analitik veya sosyal medya takip kiti bulunmamaktadır. İleride eklenecek olursa bu politika güncellenecek ve gerekli onaylar alınacaktır.

---

## 3. İşleme hukuki dayanağı (KVKK / GDPR)

- **Sözleşmenin ifası / hizmetin sunulması:** Plan ve kayıtların cihazda işlenmesi.
- **Açık rıza:** İsteğe bağlı kriz kayıtları, bildirim izni ve yedekleme eylemi.
- **Meşru menfaat:** Uygulama güvenliği, hata giderme ve temel güncelleme kontrolü.
- **Hukuki yükümlülük:** Mağaza/mevzuat gereklilikleri (varsa).

Özel nitelikli sağlık verisi niteliğinde olabilecek kayıtlar yalnızca cihazında ve senin kontrolünde tutulur; açık rızan olmadan işlenmez veya aktarılmaz.

---

## 4. Veri paylaşımı

Verilerin satılmaz, kiralanmaz veya reklam amacıyla paylaşılmaz. Sınırlı teknik hizmet sağlayıcıları:

- **Expo / EAS:** Güncelleme dağıtımı ve derleme altyapısı.
- **Google Play / Apple App Store:** Uygulama dağıtımı, ödeme ve mağaza hizmetleri (satın alma etkinse).
- **Barındırma / e-posta sağlayıcısı:** Yalnızca destek talebi gönderirsen.

Bu sağlayıcılar kendi gizlilik politikalarına tabidir. Yasal zorunluluk hâlinde yetkili kamu kurumlarıyla yalnızca talep edilen veriyle sınırlı paylaşım yapılabilir.

---

## 5. Saklama süresi

Veriler, uygulamayı silene veya “Tüm Verileri Sıfırla” seçeneğini kullanana kadar cihazında kalır. Sunucumuzda kullanıcı hesabı veya yedeği tutulmadığı için ayrıca saklama süresi yoktur. Destek e-postası gönderirsen, talebin çözülmesi için makul süre (en fazla 1 yıl) saklanır.

---

## 6. Hakların

KVKK ve GDPR kapsamında:

- Verilerine erişme,
- Düzeltme,
- Silme (uygulama içinden veya cihaz ayarlarından),
- İşlemeye itiraz etme,
- Veri taşınabilirliği (panoya kopyalama),
- Rızayı geri çekme

haklarına sahipsin. Talepler için **[destek@alanadi.com]** adresine yazabilirsin. Kimliğini doğrulamak için makul bilgi istenebilir; yanıt en geç 30 gün içinde verilir.

---

## 7. Çocukların gizliliği

Bırak Gitsin 18 yaş ve üzeri kullanıcılar için tasarlanmıştır. 18 yaş altındaki kişilerden bilerek veri toplamayız. Böyle bir durum fark edilirse ilgili veriler silinir.

---

## 8. Güvenlik

- Veriler cihazın uygulama özel alanında tutulur.
- Ağ üzerinden güncelleme indirilirken HTTPS kullanılır.
- Uygulama, indirilen APK'nın kurulumunu yalnızca kullanıcı onayıyla başlatır.
- Cihazının kilidini ve işletim sistemi güncellemelerini açık tutman önerilir.

Hiçbir sistem %100 güvenli değildir. Cihazın kaybolur veya başkasının eline geçerse, uygulama verilerine erişilebilir. Bu nedenle cihaz kilidi ve gerekiyorsa şifreli yedek kullan.

---

## 9. Sağlık feragatnamesi

Bırak Gitsin bir tıbbi cihaz, teşhis veya tedavi aracı değildir. İçerik ve öneriler genel bilgilendirme amaçlıdır; doktor, eczacı veya diğer sağlık profesyonellerinin tavsiyesinin yerini almaz. Hamilelik, kalp/akciğer hastalığı, psikiyatrik durumlar, ilaç kullanımı veya ciddi yoksunluk belirtileri varsa önce bir sağlık profesyoneline danış. Acil durumda **112**'yi ara.

---

## 10. Politika değişiklikleri

Bu politika güncellenirse yürürlük tarihi ve “son güncelleme” alanı değiştirilir; önemli değişiklikler uygulama içinde veya mağaza sayfasında duyurulur. Değişiklikten sonra uygulamayı kullanmaya devam etmen, güncel politikayı kabul ettiğin anlamına gelir.

---

## 11. İletişim

**Veri sorumlusu:** [Ad Soyad / Şirket]  
**E-posta:** [destek@alanadi.com]  
**Adres:** [Açık adres]  
**KVKK başvuru:** [kvkk@alanadi.com] (varsa)

---

## 12. Mağaza “Veri güvenliği” özeti (Google Play formu için)

- Veri toplanıyor mu? **Hayır** (hesap yok; veriler cihazda).
- Veri paylaşılıyor mu? **Hayır** (reklam/analitik yok).
- Veriler aktarım sırasında şifreli mi? **Evet** (HTTPS güncelleme).
- Veriler silinebilir mi? **Evet** (uygulama içi sıfırlama / uygulamayı kaldırma).
- Bağımsız güvenlik incelemesi: **Yok** (varsa güncellenir).
- Toplanan veri türleri: **Yok** (yalnızca cihazda işlenen kullanıcı içeriği).

> Not: Güncelleme hizmeti nedeniyle teknik veri işlenmesi varsa, mağaza formunda “Uygulama etkinliği / cihaz kimlikleri” bölümü sağlayıcı sözleşmesine göre işaretlenmelidir. Formu yayından önce Expo/EAS veri işleme koşullarıyla karşılaştır.
