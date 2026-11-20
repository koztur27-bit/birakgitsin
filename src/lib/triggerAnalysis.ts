import { CravingRecord, SlipLog } from '../types';

export type TriggerKey = 'coffee' | 'stress' | 'meal' | 'social' | 'other';

const TRIGGER_LABELS: Record<TriggerKey, { tr: string; en: string }> = {
  coffee: { tr: 'Kahve', en: 'Coffee' },
  stress: { tr: 'Stres', en: 'Stress' },
  meal: { tr: 'Yemek', en: 'Meal' },
  social: { tr: 'Sosyal Ortam', en: 'Social setting' },
  other: { tr: 'Diğer', en: 'Other' },
};

export function normalizeTrigger(raw?: string | null): TriggerKey {
  const s = (raw || '').toLowerCase();
  if (!s) return 'other';
  if (/kahve|çay|cay|coffee|tea/.test(s)) return 'coffee';
  if (/stres|stress|gergin|sinir|anger|anx/.test(s)) return 'stress';
  if (/yemek|meal|food|after/.test(s) && /yemek|meal|food|sonra|after/.test(s)) return 'meal';
  if (/yemek|meal|food/.test(s)) return 'meal';
  if (/sosyal|social|ortam|party|friend|arkadaş/.test(s)) return 'social';
  return 'other';
}

export function analyzeTriggers(cravings: CravingRecord[], slipLogs: SlipLog[]) {
  const counts: Record<TriggerKey, number> = { coffee: 0, stress: 0, meal: 0, social: 0, other: 0 };
  const hourBuckets = Array.from({ length: 24 }, () => 0);

  for (const c of cravings || []) {
    const k = normalizeTrigger(c.trigger);
    // count all crisis records in hour/total analysis; triggers only when selected
    hourBuckets[new Date(c.timestamp).getHours()] += 1;
    if (c.trigger) counts[k] += 1;
  }
  // slip logs also contribute to time analysis
  for (const s of slipLogs || []) {
    const d = new Date(s.timestamp);
    if (!Number.isNaN(d.getTime())) hourBuckets[d.getHours()] += 1;
    if (s.trigger) counts[normalizeTrigger(s.trigger)] += 1;
  }

  const totalEvents = (cravings?.length || 0) + (slipLogs?.length || 0);
  const triggerEntries = (Object.keys(counts) as TriggerKey[])
    .map((k) => ({ key: k, count: counts[k] }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count);

  const primary = triggerEntries.length ? triggerEntries[0] : null;

  // find peak hour range (2-hour window with max sum)
  let bestStart = 0;
  let bestSum = -1;
  for (let h = 0; h < 24; h++) {
    const sum = hourBuckets[h] + hourBuckets[(h + 1) % 24];
    if (sum > bestSum) {
      bestSum = sum;
      bestStart = h;
    }
  }
  const hasAnyHour = hourBuckets.some((v) => v > 0);
  const peakRange = hasAnyHour
    ? { start: bestStart, end: (bestStart + 2) % 24, count: bestSum }
    : null;

  // top 6 hours for chart display
  const hourEntries = hourBuckets
    .map((count, hour) => ({ hour, count }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .sort((a, b) => a.hour - b.hour);

  const maxTrigger = triggerEntries.length ? triggerEntries[0].count : 1;
  const maxHour = hourEntries.length ? Math.max(...hourEntries.map((e) => e.count)) : 1;

  return {
    counts,
    triggerEntries,
    primary,
    peakRange,
    hourBuckets,
    hourEntries,
    totalEvents,
    maxTrigger: Math.max(1, maxTrigger),
    maxHour: Math.max(1, maxHour),
    slipCount: (slipLogs || []).length,
    crisisCount: (cravings || []).length,
  };
}

export function adviceForTrigger(key: TriggerKey, locale: 'tr' | 'en'): string {
  const tr: Record<TriggerKey, string> = {
    coffee: 'En çok Kahve kaynaklı zorlanıyorsun; kahve rutininle sigarayı ayırmayı dene (farklı bardak, kısa yürüyüş veya su).',
    stress: 'En çok Stres kaynaklı zorlanıyorsun; kriz anında 4-7-8 nefes veya 60 sn mini oyunu açmayı dene.',
    meal: 'En çok Yemek sonrası zorlanıyorsun; yemekten sonra diş fırçalama veya kısa bir yürüyüş rutini eklemeyi dene.',
    social: 'En çok Sosyal Ortam kaynaklı zorlanıyorsun; ortamlarda elini meşgul edecek bir alternatif (su, sakız) bulmayı dene.',
    other: 'Tetikleyicilerini fark ettikçe kontrolün artar; kriz anında SOS araçlarını ve koç sohbetini kullanmayı dene.',
  };
  const en: Record<TriggerKey, string> = {
    coffee: 'Coffee is your main trigger; try separating smoking from your coffee routine (different cup, short walk, or water).',
    stress: 'Stress is your main trigger; try 4-7-8 breathing or the 60s bubble game during a craving.',
    meal: 'After meals is your main trigger; try brushing your teeth or taking a short walk after eating.',
    social: 'Social settings are your main trigger; keep an alternative handy (water, gum) to keep your hands busy.',
    other: 'Noticing your triggers builds control; use SOS tools and the coach chat during cravings.',
  };
  return (locale === 'en' ? en : tr)[key];
}

export function triggerLabel(key: TriggerKey, locale: 'tr' | 'en'): string {
  return TRIGGER_LABELS[key][locale];
}

export function formatHourRange(start: number, end: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(start)}:00–${pad(end)}:00`;
}
