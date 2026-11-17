import { NativeModules, Platform } from 'react-native';

const { BirakGitsinPinWidget } = NativeModules;

export async function pinHomeWidget(size: string = '2x2'): Promise<boolean> {
  if (Platform.OS !== 'android' || !BirakGitsinPinWidget) return false;
  try {
    const ok = await BirakGitsinPinWidget.pinWidget(size);
    return !!ok;
  } catch {
    return false;
  }
}
