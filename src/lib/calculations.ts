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

export function currentWindowAllowance(
  plan: Plan,
  date: Date = new Date(),
  logs: DayRecord[] = [],
): number {
  const idx = currentWindowIndex(plan, date);
  if (idx < 0) return 0;
  return windowAllowances(todayGoal(plan, logs), plan.windows)[idx] ?? 0;
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

/**
 * Sağlık kazanımları için gerçek bırakma anı kullanılır.
 * Eski planlarda `startedAt` yoksa gün bazlı sayım yapılır; böylece ilk gün
 * gece yarısından itibaren yanlış ilerleme gösterilmez.
 */
export function healthElapsedDays(plan: Plan, now: number = Date.now()): number {
  if (plan.baselinePerDay <= 0) return 0;
  const startedAt = plan.startedAt ? Date.parse(plan.startedAt) : NaN;
  if (Number.isFinite(startedAt)) {
    return Math.max(0, (now - startedAt) / MS_DAY);
  }
  return daysSinceStart(plan, dayKey(new Date(now)));
}

function addDaysKey(key: string, days: number): string {
  const d = parseKey(key);
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

/**
 * Bir haftanın hedefini, o haftaya kadarki kayıtlara göre hesaplar.
 *
 * Uyarlanabilir plan (varsayılan açık):
 * - Önceki haftada en az 4 gün kayıt varsa ve ortalama hedefin %15 altındaysa
 *   bir sonraki hafta azaltmayı 1 artır.
 * - Ortalama hedefin %15 üstündeyse o hafta azaltmayı 1 düşür (stabilize).
 * - Yeterli kayıt yoksa kullanıcının seçtiği haftalık azaltma uygulanır.
 *
 * Geçmiş haftalar yalnızca kendinden önceki kayıtlara baktığı için sonradan
 * değişmez; böylece istatistikler ve seriler tutarlı kalır.
 */
type GoalCache = {
  logs: DayRecord[] | null;
  signature: string;
  goals: number[];
};

// Aynı plan/kayıt dizisi için haftalık hedefleri bir kez hesapla. `goalStreak`
// gibi gün gün gezen çağrılar aksi halde her gün için tüm haftaları yeniden
// hesaplar.
let goalCache: GoalCache | null = null;

function planGoalSignature(plan: Plan): string {
  return [
    plan.startDate,
    plan.baselinePerDay,
    plan.weeklyReduction,
    plan.adaptive === false ? 0 : 1,
    plan.heavySmokerMode ? 1 : 0,
  ].join('|');
}

function goalsUpTo(plan: Plan, logs: DayRecord[], week: number): number[] {
  const signature = planGoalSignature(plan);
  if (!goalCache || goalCache.logs !== logs || goalCache.signature !== signature) {
    goalCache = {
      logs,
      signature,
      goals: [Math.max(0, plan.baselinePerDay)],
    };
  }
  const goals = goalCache.goals;
  while (goals.length <= week) {
    const w = goals.length;
    const previous = goals[w - 1] ?? Math.max(0, plan.baselinePerDay);
    const startKey = addDaysKey(plan.startDate, (w - 1) * 7);
    const endKey = addDaysKey(plan.startDate, w * 7 - 1);
    const weekLogs = logs.filter((l) => l.date >= startKey && l.date <= endKey);
    const logged = weekLogs.length;
    const average =
      logged > 0 ? weekLogs.reduce((sum, l) => sum + l.smoked, 0) / logged : 0;

    const heavy = !!plan.heavySmokerMode && plan.baselinePerDay >= 20;
    let reduction = Math.max(0, plan.weeklyReduction);
    if (heavy) {
      // Ağır tiryaki: hedef daha kademeli düşsün, ani zorlayıcı adımlar olmasın.
      const gentleCap = plan.baselinePerDay >= 30 ? 1 : 2;
      reduction = Math.min(reduction, gentleCap);
    }
    if (plan.adaptive !== false && logged >= 4 && plan.weeklyReduction > 0) {
      if (average <= previous * 0.85) {
        // Rahat gidiyorsa hafif hızlan; ağır modda yine kademeli kal.
        reduction = heavy ? Math.min(reduction + 1, gentleCapForHeavy(plan)) : reduction + 1;
      } else if (average > previous * 1.15) {
        reduction = Math.max(0, reduction - 1); // zorlanıyor: koru
      }
    }
    goals.push(Math.max(0, previous - reduction));
  }
  return goals;
}

function gentleCapForHeavy(plan: Plan): number {
  return plan.baselinePerDay >= 30 ? 1 : 2;
}

export function dailyGoal(plan: Plan, dateKey: string, logs: DayRecord[] = []): number {
  const week = Math.max(0, Math.floor(daysSinceStart(plan, dateKey) / 7));
  const goals = goalsUpTo(plan, logs, week);
  return goals[week] ?? Math.max(0, plan.baselinePerDay);
}

export function todayGoal(plan: Plan, logs: DayRecord[] = []): number {
  return dailyGoal(plan, todayKey(), logs);
}

export function pricePerCigarette(plan: Plan): number {
  return plan.packPrice / plan.cigarettesPerPack;
}

export function getLog(logs: DayRecord[], dateKey: string): DayRecord {
  const safeLogs = Array.isArray(logs) ? logs : [];
  logs = safeLogs as DayRecord[];
  return logs.find((l) => l.date === dateKey) ?? { date: dateKey, smoked: 0 };
}

export function totalSmoked(logs: DayRecord[]): number {
  const safeLogs = Array.isArray(logs) ? logs : [];
  return safeLogs.reduce((sum, l) => sum + (l?.smoked || 0), 0);
}

/**
 * Başlangıç tarihinden bugüne kadar içilmeyen sigara sayısı.
 * Kayıt olmayan günler "hiç sigara içilmedi" kabul edilir; böylece planı yeni
 * girilmiş kullanıcılar da 0 yerine gerçek birikimini görür.
 * Widget'taki WidgetStorage.readSavingsText() ile aynı formüldür.
 */
export function avoidedCigarettesTotal(
  plan: Plan,
  logs: DayRecord[],
  now: number = Date.now(),
): number {
  logs = Array.isArray(logs) ? logs : [];
  const start = parseKey(plan.startDate);
  const current = new Date(now);
  const todayMidnight = new Date(current.getFullYear(), current.getMonth(), current.getDate());
  const wholeDays = Math.max(
    0,
    Math.round((todayMidnight.getTime() - start.getTime()) / MS_DAY),
  );
  const dayFraction = Math.max(
    0,
    Math.min(1, (now - todayMidnight.getTime()) / MS_DAY),
  );
  const safeLogs = Array.isArray(logs) ? logs : [];
  const smokedByDate = new Map(safeLogs.map((l) => [l.date, l.smoked || 0]));

  let avoided = 0;
  for (let i = 0; i < wholeDays; i++) {
    const key = dayKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    avoided += Math.max(0, plan.baselinePerDay - (smokedByDate.get(key) ?? 0));
  }
  avoided += Math.max(
    0,
    plan.baselinePerDay * dayFraction - (smokedByDate.get(dayKey(todayMidnight)) ?? 0),
  );
  return avoided;
}

export function cigarettesAvoided(plan: Plan, logs: DayRecord[]): number {
  return avoidedCigarettesTotal(plan, logs);
}

export function avoidedOnDay(plan: Plan, record: DayRecord): number {
  return Math.max(0, plan.baselinePerDay - record.smoked);
}

export function moneySavedOnDay(plan: Plan, record: DayRecord): number {
  return avoidedOnDay(plan, record) * pricePerCigarette(plan);
}

export function totalMoneySaved(plan: Plan, logs: DayRecord[]): number {
  return avoidedCigarettesTotal(plan, logs) * pricePerCigarette(plan);
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
  const safeLogs = Array.isArray(logs) ? logs : [];
  return lastNDays(n, endKey).map((date) => ({
    date,
    goal: dailyGoal(plan, date, safeLogs),
    smoked: getLog(safeLogs, date).smoked,
  }));
}

export function goalStreak(plan: Plan, logs: DayRecord[]): number {
  logs = Array.isArray(logs) ? logs : [];
  let streak = 0;
  let key = todayKey();
  const start = parseKey(plan.startDate);
  for (let i = 0; i < 3650; i++) {
    const day = parseKey(key);
    // Plan başlangıcından önceki günler seriye sayılmaz.
    if (day.getTime() < start.getTime()) break;
    const record = getLog(logs, key);
    const goal = dailyGoal(plan, key, logs);
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

export function pledgeStreak(pledges: string[] = [], endKey: string = todayKey()): number {
  const set = new Set(pledges || []);
  if (set.size === 0) return 0;
  let streak = 0;
  let key = endKey;
  // If today not pledged yet, allow streak to continue from yesterday.
  if (!set.has(key)) {
    const d = parseKey(key);
    key = dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
  }
  for (let i = 0; i < 3650; i++) {
    if (!set.has(key)) break;
    streak += 1;
    const d = parseKey(key);
    key = dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
  }
  return streak;
}

export function hasSlipOnDay(slipLogs: { timestamp: string }[] = [], dateKeyStr: string): boolean {
  return (slipLogs || []).some((s) => dayKey(new Date(s.timestamp)) === dateKeyStr);
}

export function slipDaySet(slipLogs: { timestamp: string }[] = []): Set<string> {
  const out = new Set<string>();
  (slipLogs || []).forEach((s) => {
    try {
      out.add(dayKey(new Date(s.timestamp)));
    } catch {}
  });
  return out;
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

export type HealthMetric = {
  key: 'pulse' | 'carbonMonoxide' | 'tasteSmell' | 'lungs';
  label: string;
  emoji: string;
  percent: number;
  targetLabel: string;
  detail: string;
};

/**
 * Bırakma süresine göre dört temel sağlık kazanımının tahmini ilerlemesi.
 * Tıbbi ölçüm değil; uygulamanın mevcut kilometre taşlarıyla aynı zaman
 * çizelgesini kullanan motive edici bir göstergedir.
 */
export function healthRecovery(plan: Plan, now: number = Date.now()): HealthMetric[] {
  const elapsed = healthElapsedDays(plan, now);
  const defs = [
    {
      key: 'pulse' as const,
      label: 'Nabız',
      emoji: '💓',
      days: 20 / 1440,
      targetLabel: '20 dakika',
      detail: 'Nabzın ve tansiyonun normale dönmeye başlar.',
      done: 'Nabzın normale dönme yolculuğunu tamamladı.',
    },
    {
      key: 'carbonMonoxide' as const,
      label: 'Karbonmonoksit',
      emoji: '🩸',
      days: 0.5,
      targetLabel: '12 saat',
      detail: 'Kanındaki karbonmonoksit seviyesi normale düşer.',
      done: 'Kanındaki karbonmonoksit seviyesi normale döndü.',
    },
    {
      key: 'tasteSmell' as const,
      label: 'Tat / Koku',
      emoji: '🌼',
      days: 2,
      targetLabel: '2 gün',
      detail: 'Tat ve koku duyuların belirgin şekilde keskinleşir.',
      done: 'Tat ve koku duyuların belirgin şekilde keskinleşti.',
    },
    {
      key: 'lungs' as const,
      label: 'Akciğer',
      emoji: '🫁',
      days: 3,
      targetLabel: '3 gün',
      detail: 'Akciğerlerindeki nikotin temizlenir, nefesin rahatlar.',
      done: 'Akciğerlerindeki nikotin temizlenme sürecini tamamladın.',
    },
  ];

  return defs.map((d) => {
    const percent = Math.max(0, Math.min(100, Math.round((elapsed / d.days) * 100)));
    return {
      key: d.key,
      label: d.label,
      emoji: d.emoji,
      percent,
      targetLabel: d.targetLabel,
      detail: percent >= 100 ? d.done : d.detail,
    };
  });
}


export type BodyRenewalOrganId = 'heart' | 'lungs' | 'blood' | 'tasteSmell' | 'skinEnergy';

export type BodyRenewalOrgan = {
  id: BodyRenewalOrganId;
  emoji: string;
  percent: number;
  targetDays: number;
  remainingDays: number;
  elapsed: number;
};

export function bodyRenewalMap(plan: Plan, now: number = Date.now()): BodyRenewalOrgan[] {
  const elapsed = healthElapsedDays(plan, now);
  const defs: { id: BodyRenewalOrganId; emoji: string; targetDays: number }[] = [
    { id: 'heart', emoji: '❤️', targetDays: 90 },
    { id: 'lungs', emoji: '🫁', targetDays: 270 },
    { id: 'blood', emoji: '🩸', targetDays: 1 },
    { id: 'tasteSmell', emoji: '🌼', targetDays: 14 },
    { id: 'skinEnergy', emoji: '✨', targetDays: 60 },
  ];
  return defs.map((d) => {
    const percent = Math.max(0, Math.min(100, Math.round((elapsed / d.targetDays) * 100)));
    const remainingDays = Math.max(0, d.targetDays - elapsed);
    return { id: d.id, emoji: d.emoji, percent, targetDays: d.targetDays, remainingDays, elapsed };
  });
}

export function formatMoney(amount: number, currency: string): string {
  return `${amount.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export function formatMoneyShort(amount: number, currency: string): string {
  return `${Math.round(amount).toLocaleString('tr-TR')} ${currency}`;
}

export function formatDayShort(dateKey: string): string {
  const d = parseKey(dateKey);
  return `${d.getDate()}.${d.getMonth() + 1}`;
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
  cravings = Array.isArray(cravings) ? cravings : [];
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

function cravingsInRange(
  cravings: CravingRecord[],
  startKey: string,
  endKey: string,
): CravingRecord[] {
  return cravings.filter((c) => {
    const key = dayKey(new Date(c.timestamp));
    return key >= startKey && key <= endKey;
  });
}

export type WeeklyReport = {
  startKey: string;
  endKey: string;
  loggedDays: number;
  metDays: number;
  totalSmoked: number;
  averageSmoked: number;
  averageGoal: number;
  saved: number;
  cravings: number;
  resisted: number;
  resistedRate: number;
  topTrigger: string | null;
  riskHour: number | null;
  bestDay: DayStat | null;
  hardestDay: DayStat | null;
  change: number | null;
  headline: string;
  suggestion: string;
};

/**
 * Son 7 günün koç raporu. Yalnızca kayıt girilen günler ortalamaya katılır;
 * böylece kayıt unutulan günler ceza gibi görünmez. Karşılaştırma için bir
 * önceki 7 gün kullanılır.
 */
export function weeklyReport(
  plan: Plan,
  logs: DayRecord[],
  cravings: CravingRecord[],
  endKey = todayKey(),
): WeeklyReport {
  const keys = lastNDays(7, endKey);
  const rows = keys.map((date) => ({
    date,
    goal: dailyGoal(plan, date, logs),
    smoked: getLog(logs, date).smoked,
    logged: logs.some((l) => l.date === date),
  }));
  const loggedRows = rows.filter((r) => r.logged);
  const totalSmoked = loggedRows.reduce((sum, r) => sum + r.smoked, 0);
  const averageSmoked = loggedRows.length ? totalSmoked / loggedRows.length : 0;
  const averageGoal = loggedRows.length
    ? loggedRows.reduce((sum, r) => sum + r.goal, 0) / loggedRows.length
    : dailyGoal(plan, endKey, logs);
  const metDays = loggedRows.filter((r) => r.smoked <= r.goal).length;
  const saved = loggedRows.reduce(
    (sum, r) => sum + moneySavedOnDay(plan, { date: r.date, smoked: r.smoked }),
    0,
  );
  const rangeCravings = cravingsInRange(cravings, keys[0], endKey);
  const resisted = rangeCravings.filter((c) => c.resisted).length;
  const resistedRate = rangeCravings.length
    ? Math.round((resisted / rangeCravings.length) * 100)
    : 0;
  const topTrigger = topTriggerCounts(rangeCravings, 1)[0]?.trigger ?? null;
  const riskHour = rangeCravings.length
    ? (riskiestHours(rangeCravings, 1)[0]?.hour ?? null)
    : null;

  const bestDay = loggedRows.length
    ? (loggedRows.reduce((best, r) => (r.smoked < best.smoked ? r : best)) as DayStat)
    : null;
  const hardestDay = loggedRows.length
    ? (loggedRows.reduce((worst, r) => (r.smoked > worst.smoked ? r : worst)) as DayStat)
    : null;

  const prevKeys = lastNDays(7, addDaysKey(keys[0], -1));
  const prevRows = prevKeys.map((date) => ({
    date,
    smoked: getLog(logs, date).smoked,
    logged: logs.some((l) => l.date === date),
  }));
  const prevLogged = prevRows.filter((r) => r.logged);
  const prevAverage = prevLogged.length
    ? prevLogged.reduce((sum, r) => sum + r.smoked, 0) / prevLogged.length
    : 0;
  const change = loggedRows.length && prevLogged.length ? averageSmoked - prevAverage : null;

  const adherence = loggedRows.length ? metDays / loggedRows.length : 0;
  let headline = 'Veri toplanıyor';
  let suggestion = 'Bugün tek bir kayıt ekle; rapor 3 gün sonra anlam kazanır.';
  if (loggedRows.length > 0) {
    if (adherence >= 0.85) {
      headline = 'Harika bir hafta';
      suggestion =
        'Hedefini haftaya 1 sigara daha düşürmeyi dene. Uyarlanabilir plan bunu senin için otomatik yapar.';
    } else if (adherence >= 0.5) {
      headline = 'İyi gidiyorsun';
      suggestion = riskHour
        ? `En riskli saat ${String(riskHour).padStart(2, '0')}:00 civarı. O saatte 5 dakikalık bir yürüyüş ekle.`
        : 'Bir sonraki hafta için tek bir küçük hedef seç; hepsini aynı anda değiştirme.';
    } else {
      headline = 'Bu hafta zordu';
      suggestion =
        "Hedefi değiştirmeden 3 gün aynı planı dene. İstersen Ayarlar'dan uyarlanabilir planı kapat; tempo tamamen senin kontrolünde olsun.";
    }
    if (topTrigger) {
      suggestion += ` En sık tetikleyicin: ${topTrigger}.`;
    }
  }

  return {
    startKey: keys[0],
    endKey,
    loggedDays: loggedRows.length,
    metDays,
    totalSmoked,
    averageSmoked,
    averageGoal,
    saved,
    cravings: rangeCravings.length,
    resisted,
    resistedRate,
    topTrigger,
    riskHour,
    bestDay,
    hardestDay,
    change,
    headline,
    suggestion,
  };
}
