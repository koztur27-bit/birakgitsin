import { NativeModules, Platform } from 'react-native';

const { BirakGitsinPinWidget } = NativeModules;

export type PinWidgetResult = {
  ok: boolean;
  reason?: 'unsupported' | 'failed' | 'error' | string;
};

/** Cihaz/launcher widget sabitlemeyi destekliyor mu? */
export async function canPinHomeWidget(): Promise<boolean> {
  if (Platform.OS !== 'android' || !BirakGitsinPinWidget) return false;
  try {
    return !!(await BirakGitsinPinWidget.canPinWidget());
  } catch {
    return false;
  }
}

/** Sistem onay penceresini acarak widget'i ana ekrana sabitler. */
export async function requestPinHomeWidget(size: string = '2x2'): Promise<PinWidgetResult> {
  if (Platform.OS !== 'android' || !BirakGitsinPinWidget) {
    return { ok: false, reason: 'unsupported' };
  }
  try {
    const ok = await BirakGitsinPinWidget.pinWidget(size);
    return ok ? { ok: true } : { ok: false, reason: 'failed' };
  } catch (error: any) {
    return { ok: false, reason: error?.code ?? 'error' };
  }
}

/** MIUI/HyperOS izin ekranini (yoksa uygulama ayarlarini) acar. */
export async function openWidgetPermissionSettings(): Promise<boolean> {
  if (Platform.OS !== 'android' || !BirakGitsinPinWidget) return false;
  try {
    return !!(await BirakGitsinPinWidget.openWidgetPermissionSettings());
  } catch {
    return false;
  }
}

export async function pinHomeWidget(size: string = '2x2'): Promise<boolean> {
  const result = await requestPinHomeWidget(size);
  return result.ok;
}
