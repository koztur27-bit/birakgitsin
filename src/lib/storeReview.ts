import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Platform } from 'react-native';

const KEY = '@birakgitsin/lastStoreReviewAt';
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export async function maybeRequestStoreReview(reason: 'badge' | 'streak'): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const available = await StoreReview.isAvailableAsync();
    if (!available) return;
    const last = await AsyncStorage.getItem(KEY);
    const lastAt = last ? Number(last) : 0;
    if (lastAt && Date.now() - lastAt < MONTH_MS) return;
    // Mark before requesting to avoid repeated prompts if requestReview is a no-op
    await AsyncStorage.setItem(KEY, String(Date.now()));
    await StoreReview.requestReview();
  } catch {
    // ignore - review prompt must never break app flow
  }
}
