import { NativeModules, Platform } from 'react-native';

const { BirakGitsinShortcut } = NativeModules;

export async function pinHomeShortcut(): Promise<boolean> {
  if (Platform.OS !== 'android' || !BirakGitsinShortcut) return false;
  try {
    const ok = await BirakGitsinShortcut.pinShortcut();
    return !!ok;
  } catch {
    return false;
  }
}
