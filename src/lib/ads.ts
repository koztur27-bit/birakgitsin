import { Platform } from 'react-native';

// Google'ın resmi test kimlikleri. Play Console / AdMob hesap kimlikleriyle
// yayın öncesi değiştirilecek.
export const TEST_REWARDED_AD_UNIT_ID =
  Platform.OS === 'ios'
    ? 'ca-app-pub-3940256099942544/1712485313'
    : 'ca-app-pub-3940256099942544/5224354917';

export const TEST_BANNER_AD_UNIT_ID =
  Platform.OS === 'ios'
    ? 'ca-app-pub-3940256099942544/2934735716'
    : 'ca-app-pub-3940256099942544/6300978111';

export const ADS_CONFIG = {
  rewardedAdUnitId: TEST_REWARDED_AD_UNIT_ID,
  bannerAdUnitId: TEST_BANNER_AD_UNIT_ID,
  // Yayına geçerken AdMob App ID'lerini app.json içindeki
  // react-native-google-mobile-ads plugin alanına girin.
};

type AdsModule = any;
let _ads: AdsModule | null | undefined;

function getAds(): AdsModule | null {
  if (_ads !== undefined) return _ads;
  if (Platform.OS === 'web') {
    _ads = null;
    return _ads;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _ads = require('react-native-google-mobile-ads');
  } catch {
    _ads = null;
  }
  return _ads;
}

let mobileAdsInitialized = false;

export async function initAds(): Promise<boolean> {
  const ads = getAds();
  if (!ads?.default) return false;
  try {
    if (!mobileAdsInitialized) {
      await ads.default().initialize();
      mobileAdsInitialized = true;
    }
    return true;
  } catch {
    return false;
  }
}

export async function showRewardedUnlockAd(): Promise<{ rewarded: boolean; message?: string }> {
  if (Platform.OS === 'web') {
    return {
      rewarded: false,
      message:
        'Ödüllü reklam bu ortamda kullanılamıyor. Gerçek cihazda (test reklam kimliğiyle) çalışır.',
    };
  }
  const ads = getAds();
  if (!ads?.RewardedAd || !ads?.RewardedAdEventType || !ads?.TestIds) {
    return {
      rewarded: false,
      message:
        'Reklam modülü şu anda hazır değil. Bu sürümde AdMob altyapısı test kimlikleriyle yapılandırıldı; gerçek cihazda ve doğru kurulumda çalışır.',
    };
  }
  try {
    await initAds();
    const adUnitId = __DEV__ ? ads.TestIds.REWARDED : ADS_CONFIG.rewardedAdUnitId;
    const rewarded = ads.RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    return await new Promise((resolve) => {
      let earned = false;
      let settled = false;
      const finish = (result: { rewarded: boolean; message?: string }) => {
        if (settled) return;
        settled = true;
        try {
          unsubLoaded();
          unsubEarned();
          unsubClosed();
          unsubError();
        } catch {}
        resolve(result);
      };

      const unsubLoaded = rewarded.addAdEventListener(ads.RewardedAdEventType.LOADED, () => {
        try {
          rewarded.show();
        } catch (e: any) {
          finish({ rewarded: false, message: e?.message || 'Reklam gösterilemedi.' });
        }
      });
      const unsubEarned = rewarded.addAdEventListener(
        ads.RewardedAdEventType.EARNED_REWARD,
        () => {
          earned = true;
        },
      );
      const unsubClosed = rewarded.addAdEventListener(ads.AdEventType?.CLOSED ?? 'closed', () => {
        finish(
          earned
            ? { rewarded: true }
            : { rewarded: false, message: 'Reklam tamamlanmadı, erişim açılmadı.' },
        );
      });
      const unsubError = rewarded.addAdEventListener(ads.AdEventType?.ERROR ?? 'error', (err: any) => {
        finish({ rewarded: false, message: err?.message || 'Reklam yüklenemedi.' });
      });

      try {
        rewarded.load();
      } catch (e: any) {
        finish({ rewarded: false, message: e?.message || 'Reklam yüklenemedi.' });
      }

      // Güvenlik zaman aşımı
      setTimeout(() => {
        if (!settled) finish({ rewarded: false, message: 'Reklam zaman aşımına uğradı.' });
      }, 45000);
    });
  } catch (e: any) {
    return { rewarded: false, message: e?.message || 'Reklam gösterilemedi.' };
  }
}
