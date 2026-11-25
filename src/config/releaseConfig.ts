/**
 * Yayın öncesi doldurulması gereken tüm dış kimlik/adres alanlarının TEK kaynağı.
 *
 * Kural: Burada TODO_MARKER taşıyan hiçbir alan gerçek yayına çıkmaz.
 * `missingReleaseFields()` CI/yardımcı script tarafından kontrol edilebilir.
 */
export const TODO_MARKER = 'TODO: YAYIN ÖNCESİ DOLDUR';

export const RELEASE_CONFIG = {
  supportEmail: 'koztur.27@gmail.com',

  admob: {
    /** Gerçek App ID: ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY */
    androidAppId: TODO_MARKER,
    /** Gerçek App ID (iOS): ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY */
    iosAppId: TODO_MARKER,
    /** Ödüllü reklam unit ID: ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY */
    rewardedAdUnitId: TODO_MARKER,
    /** Banner unit ID (opsiyonel) */
    bannerAdUnitId: TODO_MARKER,
    /** Ortam değişkeni override'ları: EXPO_PUBLIC_ADMOB_* */
    env: {
      androidAppId: (process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || '').trim(),
      iosAppId: (process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || '').trim(),
      rewardedAdUnitId: (process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID || '').trim(),
      bannerAdUnitId: (process.env.EXPO_PUBLIC_ADMOB_BANNER_ID || '').trim(),
    },
  },

  appAdsTxt: {
    /** Google AdMob publisher ID: pub-XXXXXXXXXXXXXXXX */
    publisherId: TODO_MARKER,
    /** Geliştirici domaini, ör. birakgitsin.com */
    developerDomain: TODO_MARKER,
    /** https://<domain>/app-ads.txt adresi yayında olmalı */
    url: TODO_MARKER,
  },

  dataController: {
    /** Gerçek ad soyad / şirket unvanı (KVKK / GDPR / CCPA) */
    name: TODO_MARKER,
    /** Açık posta adresi */
    address: TODO_MARKER,
    email: 'koztur.27@gmail.com',
    /** AB'de yerleşik değilse GDPR Art.27 temsilcisi gerekebilir */
    euRepresentative: TODO_MARKER,
  },

  ai: {
    /** Canlı AI proxy endpoint; yoksa yerel rule-based yanıt kullanılır */
    proxyUrl: (process.env.EXPO_PUBLIC_AI_PROXY_URL || '').trim(),
  },

  appIntegrity: {
    /**
     * İzin verilen imza sertifikası SHA-256 parmak izleri (büyük/küçük harf duyarsız).
     * 1) Yerel/CI upload key zaten doğrulandı.
     * 2) Play App Signing etkinleştirilirse Google'ın app signing key parmak izi BURAYA eklenmeli.
     *    Eklenmezse Play'den yüklenen sürüm "imza uyuşmazlığı" loglar (uygulama kapanmaz).
     */
    allowedSignatureSha256: [
      '85a453d977a3fcbe340c80ada2d164576120d3b4c95ee785cd992dce855017ff',
      TODO_MARKER,
    ],
  },
} as const;

export function isPlaceholder(value: string | undefined | null): boolean {
  if (!value) return true;
  return value.includes(TODO_MARKER) || value.includes('<') || value.includes('XXXX');
}

/** Yayına çıkmadan önce doldurulması gereken alanların insan okunabilir listesi. */
export function missingReleaseFields(): string[] {
  const missing: string[] = [];
  if (isPlaceholder(RELEASE_CONFIG.admob.androidAppId)) missing.push('AdMob Android App ID');
  if (isPlaceholder(RELEASE_CONFIG.admob.iosAppId)) missing.push('AdMob iOS App ID');
  if (isPlaceholder(RELEASE_CONFIG.admob.rewardedAdUnitId)) missing.push('AdMob ödüllü reklam Unit ID');
  if (isPlaceholder(RELEASE_CONFIG.appAdsTxt.publisherId)) missing.push('AdMob publisher ID (app-ads.txt)');
  if (isPlaceholder(RELEASE_CONFIG.appAdsTxt.developerDomain)) missing.push('Geliştirici domain (app-ads.txt hosting)');
  if (isPlaceholder(RELEASE_CONFIG.dataController.name)) missing.push('Veri sorumlusu adı / şirket unvanı');
  if (isPlaceholder(RELEASE_CONFIG.dataController.address)) missing.push('Veri sorumlusu açık adresi');
  if (RELEASE_CONFIG.appIntegrity.allowedSignatureSha256.some(isPlaceholder)) {
    missing.push('Play App Signing sertifika SHA-256');
  }
  return missing;
}
