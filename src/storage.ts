import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData } from './types';

const STORAGE_KEY = '@birakgitsin/data/v1';

const defaultData: AppData = {
  plan: null,
  logs: [],
  cravings: [],
  badges: [],
  savingsGoal: null,
  isPremium: false,
  showLockScreen: true,
};

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw);
    return { ...defaultData, ...parsed };
  } catch {
    return defaultData;
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