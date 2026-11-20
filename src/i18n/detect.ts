import { NativeModules, Platform } from 'react-native';

export type AppLanguage = 'tr' | 'en';

export function detectSystemLanguage(): AppLanguage {
  try {
    let locale: string | undefined;
    if (Platform.OS === 'android') {
      locale = NativeModules.I18nManager?.localeIdentifier;
    } else if (Platform.OS === 'ios') {
      const settings = NativeModules.SettingsManager?.settings;
      locale =
        settings?.AppleLocale ||
        (Array.isArray(settings?.AppleLanguages) ? settings.AppleLanguages[0] : undefined);
    }
    if (!locale) {
      locale = Intl.DateTimeFormat().resolvedOptions().locale;
    }
    const lower = String(locale || '').toLowerCase();
    if (lower.startsWith('tr')) return 'tr';
  } catch {
    // default to Turkish on detection failure
  }
  // Varsayılan başlangıç dili Türkçe'dir; İngilizce yalnızca kullanıcı seçtiğinde aktif olur.
  return 'tr';
}

export function localeTag(lang: AppLanguage): string {
  return lang === 'tr' ? 'tr-TR' : 'en-US';
}
