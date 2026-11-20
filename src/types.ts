export type SmokeWindow = {
  start: string;
  end: string;
};

export type CessationAid = 'none' | 'gum' | 'patch' | 'pill';

export type Plan = {
  startDate: string;
  baselinePerDay: number;
  weeklyReduction: number;
  packPrice: number;
  cigarettesPerPack: number;
  currency: string;
  windows: SmokeWindow[];
  /** Son 7 günün uyumuna göre hedefi otomatik ayarlar. Eski planlarda yoksa açık kabul edilir. */
  adaptive?: boolean;
  cessationAid?: CessationAid;
  /** Ağır tiryaki modu: yüksek baz tüketimde daha kademeli/gerçekçi azaltma ve ek destek. */
  heavySmokerMode?: boolean;
};

export type DayRecord = {
  date: string;
  smoked: number;
  windowSmoked?: number[];
  outsideSmoked?: number;
  times?: string[];
};

export type CravingRecord = {
  timestamp: string;
  resisted: boolean;
  intensity?: number;
  trigger?: string;
};

export type NrtKind = 'gum' | 'patch' | 'pill';

export type NrtLog = {
  timestamp: string;
  kind: NrtKind;
  amount: number;
};

export type SavingsGoal = {
  title: string;
  target: number;
};

export type CrisisReminder = {
  id: string;
  time: string; // HH:mm
  label: string;
  enabled: boolean;
};

export type AppData = {
  plan: Plan | null;
  logs: DayRecord[];
  cravings: CravingRecord[];
  badges: string[];
  nrtLogs?: NrtLog[];
  savingsGoal?: SavingsGoal | null;
  crisisReminders?: CrisisReminder[];
  isPremium: boolean;
  /** Ödüllü reklamla açılan geçici PRO erişiminin bitiş zamanı (ms). */
  proUnlockUntil?: number;
  showLockScreen: boolean;
};

export type TabKey = 'home' | 'craving' | 'timer' | 'stats' | 'health' | 'settings';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

export type TimerState = {
  minutes: number;
  remaining: number;
  status: TimerStatus;
};

export type DayStat = {
  date: string;
  goal: number;
  smoked: number;
};