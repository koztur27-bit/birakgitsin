# Bırak Gitsin — Önceliklendirilmiş Geliştirme Planı

**Tarih:** 14 Kasım 2026  
**Girdi:** `BirakGitsin-Pazar-Arastirmasi.md` rakip/özellik matrisi  
**Hedef:** Uygulamayı Türkiye'de "azaltarak bırakma" kategorisinin varsayılan uygulaması yapmak; global rakiplerle özellik değil, odak + yerelleştirme + güven ile yarışmak.

---

## 1. Yönetici özeti

Bırak Gitsin'in çekirdek özelliği (günlük hedef + izinli pencereler + kriz anı) rakiplerde de var. Bu yüzden yol haritası "daha çok özellik" değil, **daha iyi uygulanmış azaltma deneyimi** üzerine kurulmalı:

1. **Uyarlanabilir plan** — kullanıcının son 7 gününe göre hedefi otomatik yeniden hesapla (Alive/Smoless'un yaptığı, Türkiye'de yapan yok).
2. **Haftalık koç raporu** — soyut istatistik yerine "bu hafta şunu yap" önerisi.
3. **Kriz anında kişisel eylem** — tetikleyiciye göre 60 saniyelik somut adım.
4. **Doktor/eczane raporu** — paylaşılabilir özet; B2B2C kapısı.
5. **Widget** — en çok istenen özellik; tek dokunuşla kayıt ve "sonraki pencere".

İlk üçü mevcut kod tabanında 1–2 günde teslim edilebilir. Widget ve iOS mağaza lansmanı ayrı bir sprint.

---

## 2. Rakip boşlukları → bizim hamlelerimiz

| Boşluk (rakip kanıtı) | Rakip durumu | Bırak Gitsin hamlesi | Etki | Efor |
|---|---|---|---|---|
| Uyarlanabilir azaltma | Smoless "hazır olunca düşür", Alive haftalık faz | 7 günlük uyum → hedefi otomatik ayarla; "planı dondur/ hızlandır" | Yüksek | Orta |
| Haftalık anlamlı geri bildirim | Çoğu uygulama grafik gösterir, öneri vermez | Haftalık koç kartı: uyum %, en iyi gün, tetikleyici, 1 öneri | Yüksek | Düşük |
| Kriz anında kişiselleştirme | Genel nefes/oyun | Tetikleyici seç → 60 sn eylem kartı (çay, stres, arkadaş, telefon) | Yüksek | Düşük |
| Hekim/eczane köprüsü | Neredeyse yok | 30 günlük PDF/paylaşım metni; NRT alanı | Orta-yüksek | Orta |
| Widget | Sigarametre, Smoke Free | Bugünkü sayı/hedef + sonraki pencere + tek dokunuş | Yüksek | Yüksek |
| Hesapsız + offline | Freewill/Bırakabilirsin hesap istiyor | Mevcut avantajı koru; isteğe bağlı dosya yedeği | Orta | Düşük |
| NRT/ilaç takibi | Kwit, Nicotex | Sakız/band/ilaç günlüğü + hatırlatma | Orta | Orta |
| Topluluk/AI | QuitNow, Freewill | Şimdilik yapma; sadelik ve mahremiyetle ayrış | Düşük | Yüksek |
| iOS varlığı | Alive/Kwit/Freewill var | iOS build + TR mağaza sayfası | Yüksek | Yüksek |

---

## 3. Önceliklendirme (ICE)

| # | Özellik | Etki (1-10) | Güven (1-10) | Efor (1-10, düşük iyi) | Skor | Öncelik |
|---|---|---|---|---|---|---|
| 1 | Uyarlanabilir plan motoru | 9 | 8 | 5 | 14,4 | **P0** |
| 2 | Haftalık koç raporu + paylaşım | 8 | 9 | 2 | 22,5 | **P0** |
| 3 | Tetikleyiciye özel kriz eylemleri | 8 | 8 | 3 | 21,3 | **P0** |
| 4 | Doktor/eczane özeti (paylaş) | 7 | 9 | 3 | 21,0 | **P0** |
| 5 | Onboarding'de motivasyon + tetikleyici seçimi | 7 | 8 | 4 | 14,0 | **P1** |
| 6 | Android widget (bugün + sonraki pencere) | 9 | 7 | 7 | 9,0 | **P1** |
| 7 | Dosya yedeği (dışa/içe aktar) | 6 | 8 | 4 | 12,0 | **P1** |
| 8 | NRT/ilaç günlüğü | 6 | 7 | 4 | 10,5 | **P1** |
| 9 | iOS build + App Store TR | 8 | 8 | 7 | 9,1 | **P1** |
| 10 | Premium/paywall | 7 | 7 | 5 | 9,8 | **P2** |
| 11 | Bulut hesap/senkron | 5 | 6 | 7 | 4,3 | **P2** |
| 12 | Topluluk | 6 | 5 | 9 | 3,3 | **P2** |
| 13 | AI koç | 6 | 5 | 8 | 3,8 | **P2** |
| 14 | E-sigara/nargile modu | 4 | 8 | 3 | 10,7 | **P2** |

> ICE = Etki × Güven ÷ Efor. Efor düşükse skor yükselir.

---

## 4. P0 — 0–14 gün (bu sprintte uygulanacak)

### 4.1 Uyarlanabilir plan motoru

**Sorun:** `dailyGoal` şu an `baseline - hafta × haftalıkAzaltma`; kullanıcı hedefi tutturamazsa plan umursamıyor, tutarsa da hızlanmıyor.

**Çözüm (uygulandı):**
- `Plan` tipine `adaptive?: boolean` eklendi; eski planlarda alan yoksa **açık** kabul edilir.
- Önceki haftada **en az 4 gün** kayıt varsa:
  - Ortalama, o haftanın hedefinin **%85'i veya altındaysa** sonraki hafta azaltma 1 artırılır (hızlan).
  - Ortalama, hedefin **%115'inden yüksekse** azaltma 1 düşürülür (stabilize).
  - Aksi halde kullanıcının seçtiği haftalık azaltma uygulanır.
- Kayıt unutulan günler ortalamaya katılmaz; 4 günden az kayıtta plan kullanıcı temposunda kalır.
- Haftalık hedefler aynı plan/kayıt dizisi için bir kez hesaplanıp önbelleklenir; `goalStreak` gibi gün gün gezen çağrılar yavaşlamaz.
- `dailyGoal(plan, dateKey, logs)`, `todayGoal(plan, logs)`, `currentWindowAllowance(plan, date, logs)` saf fonksiyonlar olarak güncellendi.
- Ayarlar'da **"Uyarlanabilir plan"** anahtarı, Ana sayfa'da hedefin altında kısa bir bilgi satırı var.
- Plan düzenleme akışı mevcut `adaptive` değerini korur.

**Kabul kriterleri (karşılandı):**
- Önceki hafta ≥4 gün ve ortalama hedefin %85 altı → sonraki hafta hedef 1 azalır.
- Önceki hafta ≥4 gün ve ortalama hedefin %115 üstü → hedef sabit kalır.
- Geçmiş günlerin hedefi sonradan değişmez (her hafta yalnızca kendinden önceki kayıtlara bakar).
- Yeterli kayıt yoksa plan kullanıcının seçtiği hızda ilerler.
- `npx tsc --noEmit` + `npx expo lint` temiz; manuel senaryolarla doğrulandı.


### 4.2 Haftalık koç raporu

**UI:** İstatistik ekranının en üstüne "Bu hafta" kartı:
- Uyum: hedefi tuttuğun gün / 7
- Ortalama: günde X sigara (hedef Y)
- En iyi gün + en zor gün
- En sık tetikleyici + en riskli saat
- Tasarruf (haftalık)
- Tek cümle öneri (kural tabanlı):
  - Uyum ≥ 6/7 → "Harika. Haftaya hedefi 1 düşürelim mi?"
  - Uyum 3–5 → "Sabah penceresini 30 dk kaydırmayı dene."
  - Uyum ≤ 2 → "Hedefi değiştirmeden önce 3 gün aynı planı dene; istersen stabilize moduna geç."
- "Paylaş" butonu: RN `Share` ile metin (yeni bağımlılık yok).

**Kabul kriterleri:** Rapor boş veride çökmez; 7 günden az veride "veri toplanıyor" gösterir; paylaşım metni Türkçe ve anonim.

### 4.3 Tetikleyiciye özel kriz eylemleri

Mevcut kriz ekranında tetikleyici seçimi var. Seçime göre "60 saniyelik eylem" kartı ekle:
- Çay/kahve → "Bardağı bırak, 10 adım yürü, ağzını çalkala."
- Stres → "4-7-8 nefes + 30 sn soğuk su."
- Arkadaş/ortam → "Ortamdan 5 dk ayrıl; birine 'şu an zorlanıyorum' yaz."
- Telefon/boşluk → "Telefonu ters çevir; 20 sn oyunu aç."
- Yemek sonrası → "Dişini fırçala veya sakız çiğne."
- Alkol → "Bir bardak su; sigara yerine yürüyüş."
- Diğer → genel nefes.
Kart, seçim yapılınca otomatik açılır; "Dayandım" ile kapanır ve kayda geçer.

### 4.4 Doktor/eczane özeti

İstatistik ekranına "Özeti paylaş" butonu:
- Son 30 gün: günlük ortalama, hedef uyumu, toplam tasarruf, kriz sayısı/dayanma oranı, en riskli saatler.
- Metin: "Bu özet Bırak Gitsin uygulamasından, kullanıcının kendi kayıtlarıyla oluşturuldu. Tıbbi tavsiye değildir."
- `Share.share({ message })`.
- PDF üretimi P1 (expo-print eklenirse).

---

## 5. P1 — 15–45 gün

1. **Onboarding kişiselleştirme:** "Neden bırakıyorsun?" (sağlık, para, aile, hamilelik, spor) + "Tetikleyicilerin" çoklu seçim. Ana sayfada motivasyon kartı; kriz ekranında öncelikli tetikleyiciler.
2. **Widget:** Android `AppWidgetProvider` + `bg-status` modülüne `updateWidget` metodu; bugünkü sayı/hedef, sonraki pencere, tek dokunuş. Config plugin ile manifest/XML.
3. **Dosya yedeği:** `expo-file-system` ile JSON dışa aktar; `expo-sharing` veya Share ile paylaş. İçe aktarma için `expo-document-picker`.
4. **NRT günlüğü:** Sakız/band/ilaç doz hatırlatıcısı; planla entegre.
5. **iOS build:** EAS veya yerel macOS; App Store TR metinleri hazır.
6. **Erişilebilirlik:** dinamik yazı boyutu, kontrast, ekran okuyucu etiketleri.

---

## 6. P2 — 45–120 gün

- Premium: sınırsız plan, gelişmiş rapor, widget temaları, NRT, yedekleme.
- Bulut hesap (opsiyonel, hesapsız mod korunur).
- AI koç (tetikleyici + geçmiş veriyle).
- Topluluk/hesap verebilirlik ortağı.
- B2B2C: eczane, işyeri hekimi, sigorta; anonim aggregate rapor.
- E-sigara/nargile kapsamı.
- İngilizce/Arapça yerelleştirme (ihracat).

---

## 7. Teknik mimari notları

### Veri modeli değişiklikleri (geriye uyumlu)
```ts
type Plan = {
  // mevcut alanlar...
  adaptive?: boolean;          // varsayılan true
  // P1: motivation?: string; topTriggers?: string[];
};
```
Eski kayıtlar `adaptive` alanı olmadan da açık kabul edilir; ayrı bir migrasyon gerekmez.

### Saf fonksiyonlar (mevcut)
- `dailyGoal(plan, dateKey, logs)` → uyarlanabilir günlük hedef
- `todayGoal(plan, logs)` / `currentWindowAllowance(plan, date, logs)`
- `weeklyReport(plan, logs, cravings, endKey)` → haftalık koç raporu
- `doctorSummary(plan, logs, cravings, endKey, n)` → 30 günlük paylaşılabilir özet
- `triggerAction(trigger)` → `{ title, body, seconds, tool, toolLabel }` (`src/lib/coach.ts`)


### Testler
Projede test altyapısı yok; P0 için en azından `npx tsc --noEmit` + manuel senaryo. P1'de `vitest` ekle (RN bağımsız saf fonksiyonlar).

---

## 8. KPI'lar

| Aşama | Metrik | Hedef |
|---|---|---|
| Aktivasyon | Onboarding tamamlama | ≥ %70 |
| Alışkanlık | İlk 3 gün en az 1 kayıt | ≥ %50 |
| Tutundurma | D7 / D30 | ≥ %25 / ≥ %10 |
| Plan uyumu | Hedefi tutan gün oranı | ≥ %60 |
| Kriz | Dayanma oranı | ≥ %55 |
| Gelir | Premium dönüşüm (P2) | ≥ %2 |
| Mağaza | Puan / yorum | ≥ 4,5 / 100+ |
| Paylaşım | Haftalık rapor paylaşan | ≥ %8 |

---

## 9. Riskler ve önlemler

- **Kapsam şişmesi:** P0 dışına çıkma; widget/AI/topluluk ayrı sprint.
- **Adaptif planın yanlış hızlanması:** en az 4 kayıtlı gün ve %85/%115 eşikleri; kullanıcıya Ayarlar'dan "Uyarlanabilir plan" anahtarı.
- **Sağlık iddiası:** "tedavi", "bilimsel garanti" yok; "kendi kayıtların" vurgusu.
- **Gizlilik:** veri cihazda; paylaşım kullanıcı eylemiyle.
- **Widget bakımı:** config plugin + prebuild testi; her Expo sürümünde doğrula.

---

## 10. Bu sprintte teslim edilecekler

- [x] Pazar/rakip raporu
- [x] `dailyGoal` + uyarlanabilir plan + UI anahtarı
- [x] Haftalık koç kartı + paylaşım
- [x] Tetikleyici eylem kartları
- [x] Doktor özeti paylaşımı
- [x] `npx tsc --noEmit`, `npx expo lint`
- [x] Yeni APK (34 MB, arm64-v8a, debug keystore ile imzalı; cihaza kuruldu/kurulabilir)

---

*Bu plan, kamuya açık rakip verileri ve mevcut kod tabanı incelemesine dayanır; tıbbi veya yatırım tavsiyesi değildir.*
