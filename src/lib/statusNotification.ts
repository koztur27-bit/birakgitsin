import * as Notifications from 'expo-notifications';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

const ID = 'birakgitsin-status';
const CHANNEL_ID = 'birakgitsin-status-v6';
const LEGACY_CHANNEL_ID = 'birakgitsin-status';
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
    // Eski kanalları sil (kilit ekranında gizleniyorlardı).
    await Notifications.deleteNotificationChannelAsync(LEGACY_CHANNEL_ID).catch(() => {});
    await Notifications.deleteNotificationChannelAsync('birakgitsin-status-v2').catch(() => {});
    await Notifications.deleteNotificationChannelAsync('birakgitsin-status-v3').catch(() => {});
    await Notifications.deleteNotificationChannelAsync('birakgitsin-status-v4').catch(() => {});
    await Notifications.deleteNotificationChannelAsync('birakgitsin-status-v5').catch(() => {});
    // DİKKAT: "sound: null" kanalı sessiz yapıyor; MIUI sessiz bildirimleri
    // kilit ekranında gizliyor. Bu yüzden duyulmayan bir ses (silent.wav)
    // tanımlıyoruz ki bildirim "normal" sayılsın ama ses çıkmasın.
    // Önem = DEFAULT: böylece saniyede bir güncellendiğinde üstte açılır
    // pencere (heads-up) çıkmaz, ama bildirim panelde/kilit ekranında kalır.
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Kilit ekranı durumu',
      description: 'İçilen sigara sayısı ve sayacı kilit ekranında gösterir.',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'silent.wav',
      enableVibrate: false,
      enableLights: false,
      showBadge: false,
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

async function presentedSnapshot(): Promise<string> {
  try {
    const list = await Notifications.getPresentedNotificationsAsync();
    const ours = list.filter((n) => n.request.identifier === ID).length;
    const total = list.length;
    return `tepsi_toplam=${total} bizimki=${ours}`;
  } catch (e) {
    return 'tepsi HATA: ' + String(e);
  }
}

// Teşhis: izin, kanal, gönderim ve tepsi durumunu döndürür.
export async function debugLockStatus(): Promise<string> {
  if (Platform.OS === 'web') return 'Web: bildirim yok.';
  const lines: string[] = [];
  let granted = false;
  try {
    await ensureStatusChannel();
    lines.push('kanal=' + CHANNEL_ID);
  } catch {
    lines.push('kanal=HATA');
  }
  try {
    granted = await ensureNotificationPermission();
    const p = await Notifications.getPermissionsAsync();
    lines.push(`izin granted=${p.granted} status=${String(p.status)}`);
  } catch (e) {
    lines.push('izin HATA: ' + String(e));
  }
  if (granted) {
    try {
      await publishLockStatus('İçilen: 0 · Sayaç: 30:00', true);
      lines.push('gonderim=OK');
    } catch (e) {
      lines.push('gonderim HATA: ' + String(e));
    }
    await new Promise((r) => setTimeout(r, 1600));
    lines.push(await presentedSnapshot());
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
  } catch {
    // categories unavailable
  }
}

export async function celebrate(title: string, body: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.dismissNotificationAsync('birakgitsin-party').catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: 'birakgitsin-party',
      content: {
        title,
        body,
        sound: 'default',
        data: { badgeParty: true },
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
      native.showCountdown('BırakGitsin', text, endAtMs, CHANNEL_ID);
      return;
    } catch {
      // modül çağrısı başarısızsa expo-notifications'a düş
    }
  }

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: ID,
      content: {
        title: 'BırakGitsin',
        body: text,
        // "sound: true" bildirimi sessiz olmaktan çıkarır (MIUI kilit ekranında
        // gösterir). Gerçek ses kanalın sesidir ve o da silent.wav (sessiz).
        sound: true,
        sticky: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'birakgitsin-status',
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
