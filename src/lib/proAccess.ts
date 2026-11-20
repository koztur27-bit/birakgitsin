import { AppData } from '../types';

export function hasProAccess(data: AppData): boolean {
  if (data.isPremium) return true;
  const until = data.proUnlockUntil ?? 0;
  return typeof until === 'number' && until > Date.now();
}

export function proUnlockRemainingMs(data: AppData): number {
  const until = data.proUnlockUntil ?? 0;
  if (!until || data.isPremium) return 0;
  return Math.max(0, until - Date.now());
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
