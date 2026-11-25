# Yayın Öncesi Manuel Doldurma Listesi

Tüm değerler **tek kaynak** olarak `src/config/releaseConfig.ts` içindedir.
`TODO: YAYIN ÖNCESİ DOLDUR` taşıyan hiçbir alan yayına çıkmaz.

- [ ] AdMob Android App ID (`EXPO_PUBLIC_ADMOB_ANDROID_APP_ID` veya config)
- [ ] AdMob iOS App ID (`EXPO_PUBLIC_ADMOB_IOS_APP_ID` veya config)
- [ ] Ödüllü reklam Unit ID (`EXPO_PUBLIC_ADMOB_REWARDED_ID` veya config)
- [ ] Banner Unit ID (opsiyonel)
- [ ] `app.json` → `react-native-google-mobile-ads` gerçek App ID'leri
- [ ] `docs/app-ads.txt` gerçek publisher ID
- [ ] `https://<domain>/app-ads.txt` hosting
- [ ] Veri sorumlusu adı / şirket unvanı
- [ ] Veri sorumlusu açık adresi
- [ ] GDPR Art.27 AB temsilcisi (gerekirse)
- [ ] Play App Signing sertifika SHA-256 (App Signing opt-in sonrası)
- [ ] AI proxy endpoint (`EXPO_PUBLIC_AI_PROXY_URL`, opsiyonel)

Kontrol: `missingReleaseFields()` fonksiyonu eksik alanları döndürür.
