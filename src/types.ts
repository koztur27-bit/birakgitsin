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

export type SlipLog = {
  timestamp: string;
  trigger?: string;
};

export type CoachUsage = {
  date: string; // YYYY-MM-DD
  count: number;
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

export type AppLanguage = 'tr' | 'en';

export type QuitMotivation = {
  text?: string;
  photoUri?: string;
};

export type HappinessPrompts = {
  first24h?: boolean;
  sosPassed?: boolean;
  savings500?: boolean;
  /** Kullanıcı "Harika gidiyor" dedi - bir daha gösterme */
  positiveResponse?: boolean;
  /** Son gösterim/yanıt zamanı (ms) - negatif veya iptal için 30 gün bekle */
  lastPromptAt?: number;
};

export type AppData = {
  plan: Plan | null;
  logs: DayRecord[];
  cravings: CravingRecord[];
  badges: string[];
  savingsGoal?: SavingsGoal | null;
  crisisReminders?: CrisisReminder[];
  isPremium: boolean;
  /** Ödüllü reklamla açılan geçici PRO erişiminin bitiş zamanı (ms). */
  proUnlockUntil?: number;
  showLockScreen: boolean;
  /** Uygulama dili. İlk açılışta sistem dilinden algılanır ve kalıcı saklanır. */
  language?: AppLanguage;
  /** "1 Dal İçtim" kaçamak kayıtları (tetikleyici analizi için). */
  slipLogs?: SlipLog[];
  /** Bırakma koçu günlük mesaj kullanımı (günde 5 ücretsiz). */
  coachUsage?: CoachUsage;
  /** Duygusal motivasyon çapası: bırakma sebebi notu ve/veya fotoğraf. */
  quitMotivation?: QuitMotivation | null;
  /** İlk kurulum sonrası "Gelecek Kazanım" şok/umut ekranı gösterildi mi? */
  futureOnboardingShown?: boolean;
  /** "Yolculuğun Nasıl Gidiyor?" 5 yıldız filtresi pencerelerinin gösterilme durumu. */
  happinessPrompts?: HappinessPrompts;
  /** Kullanıcıya özel davet kodu (arkadaş davet sistemi). */
  inviteCode?: string;
  /** Arkadaş davet kodu girilerek +7 gün PRO ödülü alındı mı? */
  inviteRedeemed?: boolean;
  /** Günlük bırakma yemini verilen günler (YYYY-MM-DD). */
  dailyPledges?: string[];
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