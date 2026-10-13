import { DevSettings, Platform } from 'react-native';

export function reloadApp(): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
    return;
  }
  try {
    DevSettings.reload();
  } catch {
    // release builds have no dev reload
  }
}