# Bırak Gitsin — Yasal Sorumluluklar ve Marka/Patent Riskleri

**Uyarı:** Bu belge ürün planlaması ve risk farkındalığı içindir; **hukuki tavsiye değildir**. Yayın öncesi mutlaka bir avukat ve (gerekirse) veri koruma uzmanı ile kontrol edilmelidir.

---

## 1. Sağlık uygulaması olarak temel risk

Bırak Gitsin, sigara azaltma/bırakma davranışını destekleyen bir **sağlık odaklı uygulamadır**. Bu alan, normal tüketici uygulamalarından daha yüksek sorumluluk taşır.

### 1.1 Yapılmaması gereken iddialar
- “Tedavi eder”, “kesin bıraktırır”, “bilimsel olarak kanıtlandı”, “doktor onaylı”
- “Nikotin yoksunluğunu ortadan kaldırır”
- “İlaç yerine geçer”

### 1.2 Yapılması gerekenler
- “Destekler”, “takip eder”, “kendi kayıtlarınla”
- “Tıbbi cihaz veya tedavi değildir; sağlık profesyonelinin yerini almaz”
- Her sağlık ekranında ve mağaza açıklamasında **feragatname**
- Ağır bağımlılık, hamilelik, kalp/akciğer hastalığı, ilaç kullanımı durumlarında **ALO 171 ve doktor yönlendirmesi**

### 1.3 NRT/ilaç günlüğü riski
- “İlaç +1” butonu **tıbbi öneri** gibi algılanabilir.
- Uygulama yalnızca **doz kaydı** yapmalı; doz önermemeli, ilaç adı/etken madde önermemeli.
- “Doktorunun planına göre kullan” mesajı her ekranda görünmeli.
- Premium/P2’de NRT hatırlatıcısı eklenirse, yine tıbbi tavsiye değil “hatırlatıcı” olarak konumlandırılmalı.

---

## 2. Marka ve isim riskleri

### 2.1 “Bırak Gitsin” ismi
- **Türk Patent ve Marka Kurumu (TÜRKPATENT)** nezdinde **marka araştırması** yapılmalı.
- Benzer isimler: “Bırakabilirsin”, “Sigarayı Bırak”, “Bırakalım” vb.
- **Sınıf:** 9 (yazılım/uygulama), 41 (eğitim/sağlık bilgilendirme), 44 (sağlık hizmetleri) potansiyel.
- Uluslararası genişleme planlanıyorsa **EUIPO** (AB) ve **USPTO** (ABD) araştırması.
- Alan adı (domain) ve sosyal medya hesapları erken alınmalı.

### 2.2 Logo ve görseller
- Logo özgün olmalı; stok ikonlar lisans koşullarına uygun olmalı.
- `scripts/make_icons.py` ile üretilen sigara temalı ikon özgün; harici görsel kullanılıyorsa lisans kontrolü.

### 2.3 Uygulama adı uyumu
- Mağaza adı: “Bırak Gitsin” (iki kelime) — `app.json`’da `name` bu şekilde.
- Paket adı: `com.birakgitsin.app` — değiştirilmemeli (güncelleme sürekliliği).
- Mağaza açıklamasında başka markaların adını kullanmaktan kaçın (örn. “Smoke Free gibi”).

---

## 3. Patent ve fikri mülkiyet

### 3.1 Yazılım patentleri
- Türkiye ve AB’de **saf yazılım patentleri** genellikle kabul edilmez; algoritmalar “iş yöntemi” sayılabilir.
- **Uyarlanabilir plan algoritması** patentlenebilir bir “teknik etki” değil; ticari sır (trade secret) olarak korunması daha gerçekçi.
- Patent yerine **telif hakkı (copyright)** otomatik koruma sağlar (kod, tasarım, metin).

### 3.2 Açık kaynak lisans uyumu
- Expo, React Native ve bağımlılıklar MIT/Apache lisanslı; koşullara uyulmalı (attribution).
- `node_modules` lisansları yayın öncesi taranmalı (örn. `license-checker`).
- Üçüncü parti kod kopyalanıyorsa kaynak ve lisans belirtilmeli.

### 3.3 İçerik telif hakkı
- Sağlık kilometre taşları (örn. “20 dk sonra nabız düşer”) genel tıbbi bilgi; kaynak belirtmek iyi pratik.
- Rakip uygulamalardan metin/kod kopyalanmamalı.
- Görseller, ikonlar, müzikler lisanslı olmalı.

---

## 4. Veri koruma (KVKK / GDPR)

### 4.1 Veri türü
- Sigara sayısı, kriz kayıtları, tetikleyiciler, sağlık durumu **sağlık verisi** sayılır → **özel nitelikli kişisel veri**.
- Uygulama veriyi **cihazda** tutuyor → risk düşük ama **sıfır değil**.

### 4.2 Yapılması gerekenler
- **KVKK aydınlatma metni** ve (gerekirse) **açık rıza** metni.
- **Gizlilik politikası URL**’si mağazada ve uygulamada erişilebilir olmalı (`docs/GIZLILIK-POLITIKASI.md` taslağı var).
- Veri işleme envanteri: hangi veri, nerede, ne kadar süre, kim erişir.
- **Yedekleme paylaşımı** kullanıcı eylemiyle (Share) → kullanıcı sorumluluğunda, ama uygulama “paylaş” butonuyla tetikliyor; metin içinde “paylaşılan veriden kullanıcı sorumludur” notu.
- Çökme raporlama kapalıysa mağaza gereksinimleri kontrol edilmeli.

### 4.3 Veri güvenliği formu (Google Play)
- “Data safety” formunda: cihazda saklanan veriler, üçüncü taraf yok, şifreleme (AsyncStorage şifreli değil → “not encrypted” işaretlenecek).
- İzinler gerekçeli: bildirim, yükleme, mikrofon (ses uyarısı için).

---

## 5. Mağaza ve platform politikaları

### 5.1 Google Play
- **Sağlık uygulaması** kategorisi → daha sıkı inceleme.
- **Tıbbi cihaz** iddiası yok → “Medical” değil “Health & Fitness”.
- **18+ içerik derecelendirmesi** (sigara).
- **Veri güvenliği formu** doldurulmalı.
- **İzin metinleri** gerekçeli (özellikle `REQUEST_INSTALL_PACKAGES`).
- **Test:** temiz kurulum, plan oluşturma, bildirim, yedekleme, güncelleme.

### 5.2 Apple App Store (P1)
- iOS build + App Store TR metinleri.
- HealthKit entegrasyonu yoksa daha basit; varsa ek inceleme.
- “Sağlık” kategorisi + feragatname.

### 5.3 Self-update (APK indirme)
- `REQUEST_INSTALL_PACKAGES` izni + `usesCleartextTraffic` → mağaza incelemesinde sorgulanabilir.
- Play Store dışında dağıtım (sideload) için kabul edilebilir ama kullanıcıya açıkça anlatılmalı.

---

## 6. Sorumluluk sınırlama (Terms of Service)

### 6.1 Eklenmesi gerekenler
- **“Olduğu gibi” (as-is) sunum**, garanti yok.
- **Sorumluluk sınırlaması:** veri kaybı, cihaz hasarı, sağlık sonuçları için sorumluluk reddi.
- **Kullanıcı sorumluluğu:** sağlık kararları kullanıcıya ait; uygulama tavsiye değildir.
- **Acil durum:** “Acil durumda 112/ALO 171” yönlendirmesi.
- **Hesap/bulut yoksa:** veri kaybı riski kullanıcıya ait (yedekleme önerisi).

### 6.2 Premium/abonelik (P2)
- Tüketici koruma: fiyat, yenileme, iptal koşulları açık.
- Mağaza (Play/App Store) abonelik kurallarına uyum.
- “Yakında” özellikleri satmamak (yanıltıcı reklam riski).

---

## 7. Marka/patent için hemen yapılacaklar

1. **TÜRKPATENT marka araştırması** (“Bırak Gitsin” + logo).
2. **Alan adı** ve sosyal medya hesaplarını al.
3. **Gizlilik politikası** ve **kullanım koşulları** sayfalarını yayına al.
4. **Açık kaynak lisans taraması** (`license-checker`).
5. **Sağlık feragatnamesi** tüm ekranlarda ve mağaza açıklamasında.
6. **ALO 171** ve doktor yönlendirmesi görünür.
7. **Veri güvenliği formu** (Play) doldur.
8. **İmza anahtarı** güvenli yedekleme (Play App Signing).
9. **Terms of Service** taslağı (avukat onayı).

---

## 8. Risk matrisi

| Risk | Olasılık | Etki | Önlem |
|---|---|---|---|
| Sağlık iddiası nedeniyle mağaza reddi | Orta | Yüksek | Feragatname + “destekler” dili |
| Marka ihlali (isim benzerliği) | Düşük-Orta | Yüksek | TÜRKPATENT araştırması |
| Veri kaybı nedeniyle güven kaybı | Orta | Orta | Yedekleme + uyarı |
| NRT/ilaç kaydı tıbbi tavsiye sayılması | Orta | Yüksek | “Kayıt only” konumlandırma |
| Premium yanıltıcı vaat | Düşük | Orta | “Yakında” yerine net tarih |
| Açık kaynak lisans ihlali | Düşük | Orta | Lisans taraması |
| Self-update izni mağaza sorunu | Orta | Orta | Sideloading açık anlatım |

---

## 9. Sonuç

Bırak Gitsin’in en büyük yasal riski **sağlık uygulaması** olmasından kaynaklanıyor. Temel strateji:

- **Tıbbi cihaz/tedavi iddiası yok.**
- **Kendi kayıtlarınla destekler** dili.
- **Gizlilik politikası + kullanım koşulları** yayında.
- **Marka araştırması** erken.
- **Veri kaybı** için yedekleme ve kullanıcı sorumluluğu açık.

Bu belge bir **başlangıç kontrol listesi**dir; yayın öncesi mutlaka hukuki danışman onayı alınmalıdır.