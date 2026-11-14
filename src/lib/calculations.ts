import { CravingRecord, DayRecord, DayStat, Plan, SmokeWindow } from '../types';

const MS_DAY = 86400000;

export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function fromMin(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function nowMin(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function windowMinutes(w: SmokeWindow): number {
  const start = toMin(w.start);
  const end = toMin(w.end);
  return end > start ? end - start : end - start + 1440;
}

export function isTimeInWindow(min: number, w: SmokeWindow): boolean {
  const start = toMin(w.start);
  const end = toMin(w.end);
  return end > start ? min >= start && min < end : min >= start || min < end;
}

export function currentWindowIndex(plan: Plan, date: Date = new Date()): number {
  if (!plan.windows.length) return -1;
  const min = nowMin(date);
  return plan.windows.findIndex((w) => isTimeInWindow(min, w));
}

export function nextWindowInfo(plan: Plan, date: Date = new Date()): { index: number; minutes: number } | null {
  const min = nowMin(date);
  if (!plan.windows.length) return null;
  let best: { index: number; minutes: number } | null = null;
  plan.windows.forEach((w, i) => {
    const start = toMin(w.start);
    let diff = start - min;
    if (diff <= 0) diff += 1440;
    if (!best || diff < best.minutes) best = { index: i, minutes: diff };
  });
  return best;
}

export function windowAllowances(goal: number, windows: SmokeWindow[]): number[] {
  if (!windows.length) return [];
  const weights = windows.map(windowMinutes);
  const total = weights.reduce((a, b) => a + b, 0);
  // Tüm pencereler 0 dakikaysa bölme hatası yerine hedefi ilk pencereye ver.
  if (total <= 0) {
    const result = windows.map(() => 0);
    result[0] = Math.max(0, goal);
    return result;
  }
  const base = weights.map((w) => (goal * w) / total);
  const floors = base.map((v) => Math.floor(v));
  let remaining = goal - floors.reduce((a, b) => a + b, 0);
  const result = [...floors];
  const order = weights
    .map((w, i) => ({ w, i }))
    .sort((a, b) => b.w - a.w || 0);
  order.forEach(({ i }) => {
    if (remaining > 0) {
      result[i] += 1;
      remaining -= 1;
    }
  });
  return result;
}

export function currentWindowAllowance(plan: Plan, date: Date = new Date()): number {
  const idx = currentWindowIndex(plan, date);
  if (idx < 0) return 0;
  return windowAllowances(todayGoal(plan), plan.windows)[idx] ?? 0;
}

export function windowSmokedOn(record: DayRecord, index: number): number {
  return record.windowSmoked?.[index] ?? 0;
}

export function logInWindow(plan: Plan, record: DayRecord, date: Date = new Date()): { index: number } | null {
  const idx = currentWindowIndex(plan, date);
  return idx >= 0 ? { index: idx } : null;
}

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dayKey(new Date());
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function daysBetween(a: Date, b: Date): number {
  const x = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const y = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((y.getTime() - x.getTime()) / MS_DAY);
}

export function daysSinceStart(plan: Plan, dateKey = todayKey()): number {
  return Math.max(0, daysBetween(parseKey(plan.startDate), parseKey(dateKey)));
}

export function elapsedDays(plan: Plan, now: number = Date.now()): number {
  const start = parseKey(plan.startDate);
  return Math.max(0, (now - start.getTime()) / MS_DAY);
}

export function dailyGoal(plan: Plan, dateKey: string): number {
  const week = Math.floor(daysSinceStart(plan, dateKey) / 7);
  return Math.max(0, plan.baselinePerDay - week * plan.weeklyReduction);
}

export function todayGoal(plan: Plan): number {
  return dailyGoal(plan, todayKey());
}

export function pricePerCigarette(plan: Plan): number {
  return plan.packPrice / plan.cigarettesPerPack;
}

export function getLog(logs: DayRecord[], dateKey: string): DayRecord {
  return logs.find((l) => l.date === dateKey) ?? { date: dateKey, smoked: 0 };
}

export function totalSmoked(logs: DayRecord[]): number {
  return logs.reduce((sum, l) => sum + l.smoked, 0);
}

export function cigarettesAvoided(plan: Plan, logs: DayRecord[]): number {
  return logs.reduce((sum, l) => sum + avoidedOnDay(plan, l), 0);
}

export function avoidedOnDay(plan: Plan, record: DayRecord): number {
  return Math.max(0, plan.baselinePerDay - record.smoked);
}

export function moneySavedOnDay(plan: Plan, record: DayRecord): number {
  return avoidedOnDay(plan, record) * pricePerCigarette(plan);
}

export function totalMoneySaved(plan: Plan, logs: DayRecord[]): number {
  return logs.reduce((sum, l) => sum + moneySavedOnDay(plan, l), 0);
}

export function lastNDays(n: number, endKey = todayKey()): string[] {
  const end = parseKey(endKey);
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth(), end.getDate() - i);
    keys.push(dayKey(d));
  }
  return keys;
}

export function buildDaysStat(plan: Plan, logs: DayRecord[], n: number, endKey = todayKey()): DayStat[] {
  return lastNDays(n, endKey).map((date) => ({
    date,
    goal: dailyGoal(plan, date),
    smoked: getLog(logs, date).smoked,
  }));
}

export function goalStreak(plan: Plan, logs: DayRecord[]): number {
  let streak = 0;
  let key = todayKey();
  const start = parseKey(plan.startDate);
  for (let i = 0; i < 3650; i++) {
    const day = parseKey(key);
    // Plan başlangıcından önceki günler seriye sayılmaz.
    if (day.getTime() < start.getTime()) break;
    const record = getLog(logs, key);
    const goal = dailyGoal(plan, key);
    if (record.smoked <= goal) {
      streak += 1;
      const d = parseKey(key);
      key = dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
    } else {
      break;
    }
  }
  return streak;
}

export type Milestone = {
  id: string;
  label: string;
  days: number;
  detail: string;
  emoji: string;
};

export function milestones(): Milestone[] {
  return [
    {
      id: 'm1',
      label: '20 dakika',
      days: 20 / 1440,
      emoji: '💓',
      detail: 'Nabzın ve tansiyonun normale dönmeye başlar.',
    },
    {
      id: 'm2',
      label: '12 saat',
      days: 0.5,
      emoji: '🫁',
      detail: 'Kanındaki karbonmonoksit seviyesi normale düşer.',
    },
    {
      id: 'm3',
      label: '1 gün',
      days: 1,
      emoji: '❤️',
      detail: 'Kalp krizi riskin azalmaya başlar.',
    },
    {
      id: 'm4',
      label: '2 gün',
      days: 2,
      emoji: '👃',
      detail: 'Tat ve koku duyuların belirgin şekilde keskinleşir.',
    },
    {
      id: 'm5',
      label: '3 gün',
      days: 3,
      emoji: '🌬️',
      detail: 'Akciğerlerindeki nikotin temizlenir, nefesin rahatlar.',
    },
    {
      id: 'm6',
      label: '1 hafta',
      days: 7,
      emoji: '⚡',
      detail: 'Sinir uçları yenilenmeye başlar, yoksunluk azalır.',
    },
    {
      id: 'm7',
      label: '2 hafta',
      days: 14,
      emoji: '🏃',
      detail: 'Kan dolaşımın ve akciğer fonksiyonun belirgin artar.',
    },
    {
      id: 'm8',
      label: '1 ay',
      days: 30,
      emoji: '🧘',
      detail: 'Öksürük ve nefes darlığı azalır, akciğerlerin temizlenir.',
    },
    {
      id: 'm9',
      label: '3 ay',
      days: 90,
      emoji: '💪',
      detail: 'Akciğer kapasiten ve genel dayanıklılığın artar.',
    },
    {
      id: 'm10',
      label: '9 ay',
      days: 270,
      emoji: '🛡️',
      detail: 'Akciğerlerin enfeksiyonlara karşı direnci artar.',
    },
    {
      id: 'm11',
      label: '1 yıl',
      days: 365,
      emoji: '🎉',
      detail: 'Koroner kalp hastalığı riskin yarı yarıya azalır.',
    },
    {
      id: 'm12',
      label: '5 yıl',
      days: 1825,
      emoji: '🧠',
      detail: 'İnme riskin sigara içmeyen birine yaklaşır.',
    },
    {
      id: 'm13',
      label: '10 yıl',
      days: 3650,
      emoji: '🏆',
      detail: 'Akciğer kanseri riskin yarıya iner.',
    },
    {
      id: 'm14',
      label: '15 yıl',
      days: 5475,
      emoji: '👑',
      detail: 'Kalp hastalığı riskin hiç içmeyenle aynı seviyeye iner.',
    },
  ];
}

export function formatMoney(amount: number, currency: string): string {
  return `${amount.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export function formatCountdown(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(r).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatDuration(days: number): string {
  if (days <= 0) return 'Bugün başladın';
  if (days < 1) return `${Math.round(days * 24)} saat`;
  if (days < 30) return `${Math.floor(days)} gün`;
  if (days < 365) {
    const m = Math.floor(days / 30);
    const r = Math.floor(days % 30);
    return r > 0 ? `${m} ay ${r} gün` : `${m} ay`;
  }
  const y = Math.floor(days / 365);
  const r = Math.floor(days % 365);
  return r > 0 ? `${y} yıl ${r} gün` : `${y} yıl`;
}

export function formatUntil(days: number): string {
  if (days <= 0) return 'şimdi';
  const mins = days * 1440;
  if (mins < 60) return `${Math.max(1, Math.round(mins))} dakika`;
  const hours = days * 24;
  if (hours < 48) return `${Math.max(1, Math.round(hours))} saat`;
  return `${Math.ceil(days)} gün`;
}

export function cravingHours(cravings: CravingRecord[]): number[] {
  const hours = new Array(24).fill(0) as number[];
  cravings.forEach((c) => {
    const h = new Date(c.timestamp).getHours();
    if (h >= 0 && h < 24) hours[h] += 1;
  });
  return hours;
}

export function topTriggerCounts(
  cravings: CravingRecord[],
  n = 4,
): { trigger: string; count: number }[] {
  const map = new Map<string, number>();
  cravings.forEach((c) => {
    if (c.trigger) map.set(c.trigger, (map.get(c.trigger) ?? 0) + 1);
  });
  return [...map.entries()]
    .map(([trigger, count]) => ({ trigger, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export function riskiestHours(
  cravings: CravingRecord[],
  n = 3,
): { hour: number; count: number }[] {
  return cravingHours(cravings)
    .map((count, hour) => ({ hour, count }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export function averageIntensity(cravings: CravingRecord[]): number | null {
  const rated = cravings.filter((c) => typeof c.intensity === 'number');
  if (!rated.length) return null;
  return rated.reduce((s, c) => s + (c.intensity ?? 0), 0) / rated.length;
}