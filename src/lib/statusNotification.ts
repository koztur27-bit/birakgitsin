import * as Notifications from 'expo-notifications';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

const ID = 'birakgitsin-status';
const CHANNEL_ID = 'birakgitsin-v2';
const LEGACY_CHANNEL_IDS = ['birakgitsin-status','birakgitsin-status-v2','birakgitsin-status-v3','birakgitsin-status-v4','birakgitsin-status-v5','birakgitsin-status-v6','birakgitsin-status-v7','birakgitsin-ongoing','birakgitsin-silent','birakgitsin-v1'];
const MIN_INTERVAL_MS = 60000;

type BgStatusNative = {
  showCountdown: (
    title: string,
    body: string,
    endAtMs: number,
    channelId: string,
  ) => boolean;
  clear: () => boolean;
};

// Android'e özel yerel modül: sayacı sistemin kendi kronometresiyle gösterir
// (uygulama arka planda donsa bile sayaç akmaya devam eder).
let bgStatus: BgStatusNative | null = null;
let bgStatusTried = false;

function getBgStatus(): BgStatusNative | null {
  if (Platform.OS !== 'android') return null;
  if (!bgStatusTried) {
    bgStatusTried = true;
    try {
      bgStatus = requireOptionalNativeModule<BgStatusNative>('BgStatus');
    } catch {
      bgStatus = null;
    }
  }
  return bgStatus;
}

let lastText = '';
let lastPosted = 0;
let posted = false;
let channelReady = false;

export async function ensureStatusChannel(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (channelReady) return;
  try {
    // Eski kanalları sil (önbellek/ikon/kilit ekranı ayarlarını kır)
    for (const ch of LEGACY_CHANNEL_IDS) {
      await Notifications.deleteNotificationChannelAsync(ch).catch(() => {});
    }
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Bırak Gitsin Bildirimleri',
      description: 'Sayaç, hatırlatıcı ve akıllı bildirimler',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      enableVibrate: true,
      enableLights: false,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    channelReady = true;
  } catch {
    // channel unavailable
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await ensureStatusChannel();
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

export async function sendTestLockStatus(
  text = 'İçilen: 0 · Sayaç: 30:00',
): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const granted = await ensureNotificationPermission();
  if (granted) {
    await publishLockStatus(`${text} (test)`, true);
  }
  return granted;
}

// Teşhis: izin, kanal, gönderim ve tepsi durumunu döndürür.
export async function debugLockStatus(): Promise<string> {
  if (Platform.OS === 'web') return 'Web: bildirim yok.';
  const lines: string[] = [];
  lines.push('kanal=' + CHANNEL_ID);
  lines.push('yerel_modul=' + (getBgStatus() ? 'var' : 'yok'));
  let granted = false;
  try {
    granted = await ensureNotificationPermission();
    const p = await Notifications.getPermissionsAsync();
    lines.push(`izin granted=${p.granted} status=${String(p.status)}`);
  } catch (e) {
    lines.push('izin HATA: ' + String(e));
  }
  try {
    const ch = await Notifications.getNotificationChannelAsync(CHANNEL_ID);
    if (ch) {
      lines.push(
        `kanal_ayar importance=${String(ch.importance)} sound=${String(
          ch.sound,
        )} vis=${String((ch as { lockscreenVisibility?: number }).lockscreenVisibility)}`,
      );
    } else {
      lines.push('kanal_ayar=yok');
    }
  } catch (e) {
    lines.push('kanal_ayar HATA: ' + String(e));
  }
  if (granted) {
    try {
      // Test bildirimi de gerçek gibi 30:00'dan geri saysın.
      const testEnd = Date.now() + 30 * 60 * 1000;
      await publishLockStatus('İçilen: 0', true, testEnd);
      lines.push('gonderim=OK');
    } catch (e) {
      lines.push('gonderim HATA: ' + String(e));
    }
    await new Promise((r) => setTimeout(r, 1600));
    try {
      const list = await Notifications.getPresentedNotificationsAsync();
      const ids = list
        .map((n) => `${n.request.identifier}|${String(n.request.content.title)}`)
        .join('; ');
      lines.push(`tepsi=${list.length} [${ids}]`);
    } catch (e) {
      lines.push('tepsi HATA: ' + String(e));
    }
  } else {
    lines.push('gonderim=YOK (izin yok)');
  }
  return lines.join(' | ');
}

export async function requestStatusPermission(): Promise<void> {
  if (Platform.OS === 'web') return;
  await ensureNotificationPermission();
}

export async function registerNotificationCategories(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.setNotificationCategoryAsync('birakgitsin-status', [
      {
        identifier: 'smoke',
        buttonTitle: 'Sigara içtim',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'resisted',
        buttonTitle: 'Dayandım',
        options: { opensAppToForeground: true },
      },
    ]);
    await Notifications.setNotificationCategoryAsync('birakgitsin-alarm', [
      {
        identifier: 'smoke',
        buttonTitle: 'Sigara içtim',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'snooze5',
        buttonTitle: '5 dk ertele',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'resisted',
        buttonTitle: 'Dayandım',
        options: { opensAppToForeground: true },
      },
    ]);
    await Notifications.setNotificationCategoryAsync('birakgitsin-smart', [
      {
        identifier: 'action_add_smoked',
        buttonTitle: '+1 İçtim',
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'snooze30',
        buttonTitle: 'Ertele',
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'smoke',
        buttonTitle: 'Sigara içtim',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'snooze5',
        buttonTitle: '5 dk ertele',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'resisted',
        buttonTitle: 'Dayandım',
        options: { opensAppToForeground: true },
      },
    ]);
  } catch {
    // categories unavailable
  }
}

export async function celebrate(title: string, body: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await ensureStatusChannel();
    await Notifications.dismissNotificationAsync('birakgitsin-party').catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: 'birakgitsin-party',
      content: {
        title,
        body,
        sound: 'default',
        categoryIdentifier: 'birakgitsin-smart',
        data: { badgeParty: true },
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        repeats: false,
      },
    });
  } catch {
    // notifications unavailable
  }
}

export async function publishLockStatus(
  text: string,
  force = false,
  endAtMs = 0,
): Promise<void> {
  if (Platform.OS === 'web') return;
  const now = Date.now();
  if (!force && text === lastText) return;
  if (!force && now - lastPosted < MIN_INTERVAL_MS) return;
  lastText = text;
  lastPosted = now;
  posted = true;

  await ensureStatusChannel();

  // Öncelik: yerel kronometre modülü. Sayaç JS'ten bağımsız, sistem
  // tarafından işlenir; bu yüzden arka planda/kilitliyken de akar.
  const native = getBgStatus();
  if (native) {
    try {
      // Kronometre sayacı kendisi gösterir; gövdede tekrar yazmayalım.
      native.showCountdown('Bırak Gitsin', text, endAtMs, CHANNEL_ID);
      return;
    } catch {
      // modül çağrısı başarısızsa expo-notifications'a düş
    }
  }

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: ID,
      content: {
        title: 'Bırak Gitsin',
        body: text,
        // "sound: true" bildirimi sessiz olmaktan çıkarır (MIUI kilit ekranında
        // gösterir). Gerçek ses kanalın sesidir ve o da silent.wav (sessiz).
        sound: true,
        sticky: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'birakgitsin-smart',
        data: { statusPane: true },
      },
      trigger: { channelId: CHANNEL_ID },
    });
  } catch {
    // notifications unavailable
  }
}

export function clearLockStatus(): void {
  if (Platform.OS === 'web') return;
  if (!posted && lastText === '') return;
  posted = false;
  lastText = '';
  try {
    const native = getBgStatus();
    if (native) native.clear();
  } catch {
    // ignore
  }
  try {
    Notifications.dismissNotificationAsync(ID).catch(() => {});
  } catch {
    // ignore
  }
}
