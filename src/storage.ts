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
    // default to Turkish on detection failure
  }
  // Varsayılan başlangıç dili Türkçe'dir; İngilizce yalnızca kullanıcı seçtiğinde aktif olur.
  return 'tr';
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
  language: 'tr',
  slipLogs: [],
  coachUsage: { date: '', count: 0 },
  quitMotivation: null,
  futureOnboardingShown: false,
  happinessPrompts: {},
  inviteRedeemed: false,
  dailyPledges: [],
};

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'BG';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = { ...defaultData, language: 'tr' as AppLanguage, inviteCode: generateInviteCode() };
      // İlk açılışta varsayılan dili (Türkçe) kalıcı sakla (widget/native senkronu için de).
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
    if (merged.quitMotivation && typeof merged.quitMotivation !== 'object') {
      merged.quitMotivation = null;
    } else if (merged.quitMotivation) {
      merged.quitMotivation = {
        text: typeof merged.quitMotivation.text === 'string' ? merged.quitMotivation.text : '',
        photoUri: typeof merged.quitMotivation.photoUri === 'string' ? merged.quitMotivation.photoUri : undefined,
      };
    }
    if (!merged.happinessPrompts || typeof merged.happinessPrompts !== 'object') {
      merged.happinessPrompts = {};
    }
    if (!merged.inviteCode || typeof merged.inviteCode !== 'string') {
      merged.inviteCode = generateInviteCode();
    }
    if (!Array.isArray(merged.dailyPledges)) {
      merged.dailyPledges = [];
    } else {
      merged.dailyPledges = merged.dailyPledges.filter((x: any) => typeof x === 'string');
    }
    merged.inviteRedeemed = !!merged.inviteRedeemed;
    merged.futureOnboardingShown = !!merged.futureOnboardingShown;
    if (merged.language !== 'tr' && merged.language !== 'en') {
      merged.language = 'tr';
    }
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {}
    return merged;
  } catch {
    return { ...defaultData, language: 'tr' as AppLanguage, inviteCode: generateInviteCode() };
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