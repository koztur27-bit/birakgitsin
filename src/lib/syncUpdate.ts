import { Alert, Linking } from 'react-native';
import { refreshWidgets } from './widgetData';

export const APP_VERSION = '2.4.1';
const RELEASES_API = 'https://api.github.com/repos/koztur27-bit/birakgitsin/releases/tags/apk-latest';
const RELEASES_PAGE = 'https://github.com/koztur27-bit/birakgitsin/releases/tag/apk-latest';

type UpdateStatus = 'upToDate' | 'updateAvailable' | 'error';

type UpdateCheckResult = {
  status: UpdateStatus;
  latestVersion?: string;
  downloadUrl?: string;
};

function extractVersion(text: string): string | null {
  const m = /v?(\d+\.\d+\.\d+)/.exec(text || '');
  return m ? m[1] : null;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((p) => parseInt(p, 10) || 0);
  const pb = b.split('.').map((p) => parseInt(p, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}

async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => controller?.abort(), 12000);
    const res = await fetch(RELEASES_API, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'BirakGitsin/1.3.0',
      },
      signal: controller?.signal,
    }).finally(() => clearTimeout(timer));

    if (!res.ok) return { status: 'error' };
    const data: any = await res.json();
    const latest =
      extractVersion(String(data?.name ?? '')) ||
      extractVersion(String(data?.body ?? '')) ||
      extractVersion(String(data?.tag_name ?? ''));
    if (!latest) return { status: 'error' };

    const cmp = compareVersions(latest, APP_VERSION);
    if (cmp > 0) {
      const assetUrl = data?.assets?.[0]?.browser_download_url;
      const downloadUrl = assetUrl || data?.html_url || RELEASES_PAGE;
      return { status: 'updateAvailable', latestVersion: `v${latest}`, downloadUrl };
    }
    return { status: 'upToDate', latestVersion: `v${latest}` };
  } catch {
    return { status: 'error' };
  }
}

async function openUrlSafe(url: string) {
  try {
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // fallback below
  }
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Bağlantı açılamadı', url);
  }
}

export async function syncWidgetsAndCheckUpdate(): Promise<void> {
  try {
    refreshWidgets();
  } catch {
    // ignore
  }

  const result = await checkForAppUpdate();

  if (result.status === 'upToDate') {
    Alert.alert('Güncelleme', `Uygulamanız güncel (v${APP_VERSION})`);
    return;
  }

  if (result.status === 'updateAvailable') {
    const versionLabel = result.latestVersion ?? 'yeni';
    const url = result.downloadUrl ?? RELEASES_PAGE;
    Alert.alert(
      'Yeni sürüm mevcut',
      `Güncel sürüm: ${versionLabel}\nYüklü sürüm: v${APP_VERSION}\n\nYeni APK'yı indirmek için bağlantıyı açabilirsiniz.`,
      [
        { text: 'Kapat', style: 'cancel' },
        { text: 'APK\'yı İndir', onPress: () => openUrlSafe(url) },
      ],
    );
    return;
  }

  Alert.alert(
    'Güncelleme kontrol edilemedi',
    'GitHub sürüm bilgisine şu anda erişilemedi. İnternet bağlantınızı kontrol edip tekrar deneyebilir veya sürümler sayfasını açabilirsiniz.',
    [
      { text: 'Kapat', style: 'cancel' },
      { text: 'Sürümler Sayfasını Aç', onPress: () => openUrlSafe(RELEASES_PAGE) },
    ],
  );
}
