import * as Application from 'expo-application';
import { Platform } from 'react-native';

import appConfig from '../../app.json';

/**
 * Resmi Android paket adı app.json'dan okunur; ikinci bir sabit tanımlanmaz.
 * iOS bundle id aynı olsa da bu kontrol yalnızca Android release derlemelerinde çalışır.
 */
const OFFICIAL_ANDROID_PACKAGE: string =
  appConfig.expo.android?.package ?? 'com.birakgitsin.app';

/**
 * Hafif anti-tamper kontrolü.
 *
 * - Geliştirme derlemelerinde (__DEV__ === true) ve iOS'ta hiçbir şey yapmaz.
 * - Release Android derlemelerinde çalışma anındaki applicationId'yi app.json
 *   içindeki resmi paket adıyla karşılaştırır.
 * - Uyuşmazlıkta uygulamayı kapatmaz (yanlış pozitifler gerçek kullanıcıyı
 *   etkilemesin diye); yalnızca production'da korunan console.error ile kayıt tutar.
 *
 * @returns Paket adı doğrulandığında veya kontrol atlandığında true.
 */
export function checkAppIntegrity(): boolean {
  if (__DEV__ || Platform.OS !== 'android') return true;

  try {
    const actualPackage = Application.applicationId;
    if (actualPackage !== OFFICIAL_ANDROID_PACKAGE) {
      console.error('[appIntegrity] Unexpected applicationId (repackaged build?)', {
        actual: actualPackage,
        expected: OFFICIAL_ANDROID_PACKAGE,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error('[appIntegrity] Package check failed', error);
    return false;
  }
}
