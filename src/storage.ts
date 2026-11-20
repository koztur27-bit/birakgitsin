import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, AppLanguage } from './types';

const STORAGE_KEY = '@birakgitsin/data/v1';

export function detectSystemLanguage(): AppLanguage {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NativeModules, Platform } = require('react-native') as typeof import('react-native');
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
    // default to English on detection failure
  }
  return 'en';
}

const defaultData: AppData = {
  plan: null,
  logs: [],
  cravings: [],
  badges: [],
  savingsGoal: null,
  crisisReminders: [],
  nrtLogs: [],
  isPremium: false,
  proUnlockUntil: 0,
  showLockScreen: true,
  language: 'en',
  slipLogs: [],
  coachUsage: { date: '', count: 0 },
};

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = { ...defaultData, language: detectSystemLanguage() };
      // İlk açılışta algılanan dili kalıcı sakla (widget/native senkronu için de).
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      } catch {}
      return fresh;
    }
    const parsed = JSON.parse(raw);
    const merged = { ...defaultData, ...parsed } as AppData;
    if (!Array.isArray(merged.slipLogs)) merged.slipLogs = [];
    if (!merged.coachUsage || typeof merged.coachUsage !== 'object') {
      merged.coachUsage = { date: '', count: 0 };
    } else {
      merged.coachUsage = {
        date: typeof (merged.coachUsage as any).date === 'string' ? (merged.coachUsage as any).date : '',
        count: Number.isFinite((merged.coachUsage as any).count) ? Math.max(0, (merged.coachUsage as any).count) : 0,
      };
    }
    if (merged.language !== 'tr' && merged.language !== 'en') {
      merged.language = detectSystemLanguage();
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {}
    }
    return merged;
  } catch {
    return { ...defaultData, language: detectSystemLanguage() };
  }
}

export async function persistData(data: AppData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Keep running even if persistence fails.
  }
}

export function clearData(): Promise<void> {
  return AsyncStorage.removeItem(STORAGE_KEY);
}