export type SmokeWindow = {
  start: string;
  end: string;
};

export type Plan = {
  startDate: string;
  baselinePerDay: number;
  weeklyReduction: number;
  packPrice: number;
  cigarettesPerPack: number;
  currency: string;
  windows: SmokeWindow[];
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

export type AppData = {
  plan: Plan | null;
  logs: DayRecord[];
  cravings: CravingRecord[];
  badges: string[];
  isPremium: boolean;
  showLockScreen: boolean;
};

export type TabKey = 'home' | 'craving' | 'timer' | 'stats' | 'settings';

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