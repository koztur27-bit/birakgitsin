import { Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

/**
 * Kendi kendini güncelleme.
 * Önce OTA (havadan güncelleme) denenir: EAS Update ile yayınlanan JS paketi
 * APK yeniden kurulmadan indirilir ve uygulama anında yenilenir.
 * OTA yoksa/başarısızsa yedek olarak yeni APK indirilip kurulum ekranı açılır.
 */
export const UPDATE_APK_URL = 'http://127.0.0.1:8124/birakgitsin.apk';

export type UpdateResult = { ok: boolean; message: string };

// Tanı: her adımı panoya yaz (BG-UPD). Böylece butonun nerede takıldığı
// telefon kapalıyken bile okunabilir.
const updLines: string[] = [];
async function note(msg: string): Promise<void> {
  const t = new Date().toISOString().slice(11, 19);
  updLines.push(`${t} ${msg}`);
  while (updLines.length > 24) updLines.shift();
  try {
    await Clipboard.setStringAsync(`BG-UPD\n${updLines.join('\n')}`);
  } catch {
    // ignore
  }
}

async function checkOta(): Promise<UpdateResult | null> {
  try {
    if (__DEV__) {
      await note('DEV modu: OTA atlandi');
      return { ok: true, message: 'Geliştirme modu: OTA atlandı (Metro kullanılıyor).' };
    }
    const Updates = await import('expo-updates');
    const u = Updates as unknown as {
      updateId?: string | null;
      channel?: string;
      runtimeVersion?: string;
    };
    await note(
      `enabled=${Updates.isEnabled} updateId=${String(u.updateId)} channel=${String(
        u.channel,
      )} runtime=${String(u.runtimeVersion)}`,
    );
    if (!Updates.isEnabled) {
      await note('OTA kapali -> APK adimina gec');
      return null;
    }
    const check = await Updates.checkForUpdateAsync();
    await note(`checkForUpdate isAvailable=${check.isAvailable}`);
    if (!check.isAvailable) {
      await note('OTA yeni surum yok -> APK adimina gec');
      return null;
    }
    await note('OTA fetch basliyor');
    await Updates.fetchUpdateAsync();
    await note('OTA fetch bitti -> reload');
    await Updates.reloadAsync();
    return { ok: true, message: 'Güncelleme indirildi, yeniden başlatılıyor...' };
  } catch (e) {
    await note('checkOta HATA: ' + (e instanceof Error ? e.message : String(e)));
    return null;
  }
}

export async function downloadAndInstallUpdate(): Promise<UpdateResult> {
  await note('--- Guncelle basildi ---');
  if (Platform.OS !== 'android') {
    await note('platform android degil');
    return { ok: false, message: 'Bu özellik yalnızca Android uygulamasında çalışır.' };
  }

  const ota = await checkOta();
  if (ota) {
    await note('OTA sonucu: ' + ota.message);
    return ota;
  }

  try {
    const FileSystem = await import('expo-file-system/legacy');
    const IntentLauncher = await import('expo-intent-launcher');

    const baseDir = FileSystem.cacheDirectory;
    if (!baseDir) {
      await note('cacheDirectory yok');
      return { ok: false, message: 'Geçici klasöre erişilemedi.' };
    }

    const fileUri = `${baseDir}birakgitsin-update.apk`;

    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }

    await note(`APK indiriliyor: ${UPDATE_APK_URL}`);
    const res = await FileSystem.downloadAsync(UPDATE_APK_URL, fileUri);
    await note(`APK sonuc status=${res ? res.status : 'yok'}`);

    if (!res || res.status !== 200) {
      const code = res ? res.status : 'ağ hatası';
      return {
        ok: false,
        message: `Güncelleme alınamadı (${code}). OTA da yedek sunucu da ulaşılamadı.`,
      };
    }

    const contentUri = await FileSystem.getContentUriAsync(fileUri);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      type: 'application/vnd.android.package-archive',
      flags: 1,
    });
    await note('kurulum ekrani acildi');

    return { ok: true, message: 'Yeni APK indirildi. Kurulum ekranı açıldı.' };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await note(`APK HATA: ${msg}`);
    return { ok: false, message: `Güncelleme başarısız: ${msg}` };
  }
}
