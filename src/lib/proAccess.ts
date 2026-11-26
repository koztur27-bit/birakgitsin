import { AppData } from '../types';
import { proNow } from './proEntitlementStore';

export const WELCOME_TRIAL_DAYS = 3;
export const AD_UNLOCK_DAYS = 1;
export const AD_UNLOCK_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type AdUnlockBlockReason = 'premium' | 'active' | 'cooldown';

export type AdUnlockAvailability =
  | { available: true }
  | { available: false; reason: AdUnlockBlockReason; remainingMs: number };

export function hasProAccess(data: AppData): boolean {
  if (data.isPremium) return true;
  const until = data.proUnlockUntil ?? 0;
  return typeof until === 'number' && until > proNow();
}

export function proUnlockRemainingMs(data: AppData): number {
  const until = data.proUnlockUntil ?? 0;
  if (!until || data.isPremium) return 0;
  return Math.max(0, until - proNow());
}

/** 3 günlük hediye hâlâ kullanılabilir mi (yedekten geri yüklemede yeniden verilmez). */
export function welcomeTrialAvailable(data: AppData): boolean {
  return !data.proTrialUsed;
}

/** Reklam ödülü şu an kullanılabilir mi? Haftada 1 hak; aktif PRO varken tüketilmez. */
export function adUnlockAvailability(data: AppData): AdUnlockAvailability {
  if (data.isPremium) return { available: false, reason: 'premium', remainingMs: 0 };
  if (hasProAccess(data)) return { available: false, reason: 'active', remainingMs: proUnlockRemainingMs(data) };
  const last = data.lastAdProGrantAt ?? 0;
  const elapsed = last > 0 ? proNow() - last : AD_UNLOCK_COOLDOWN_MS;
  if (elapsed < AD_UNLOCK_COOLDOWN_MS) {
    return { available: false, reason: 'cooldown', remainingMs: AD_UNLOCK_COOLDOWN_MS - elapsed };
  }
  return { available: true };
}

export function adProUnlockUntil(data: AppData): number {
  return Math.max(proNow(), data.proUnlockUntil ?? 0) + AD_UNLOCK_DAYS * DAY_MS;
}

/** Kullanıcıya gösterilecek engel mesajı; reklamı boşa izletmemek için öğrenilir. */
export function adBlockedText(
  data: AppData,
  t: (key: string, params?: Record<string, string>) => string,
): string {
  const availability = adUnlockAvailability(data);
  if (availability.available) return '';
  if (availability.reason === 'premium') return t('pro.adPremium');
  if (availability.reason === 'active') return t('pro.adActive');
  return t('pro.adCooldown', { time: formatUnlockRemaining(availability.remainingMs) });
}

export function formatUnlockRemaining(ms: number): string {
  if (ms <= 0) return '';
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} dk`;
  if (m === 0) return `${h} sa`;
  return `${h} sa ${m} dk`;
}
