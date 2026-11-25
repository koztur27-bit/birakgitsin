import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, Linking, Platform, Vibration } from 'react-native';
import { badgeById, evaluateBadges } from '../lib/badges';
import { addPurchaseListeners, ENTITLEMENT_PRODUCT_IDS } from '../lib/billing';
import { maybeRequestStoreReview } from '../lib/storeReview';
import { adProUnlockUntil, adUnlockAvailability } from '../lib/proAccess';
import { cigarettesAvoided, formatCountdown, formatMoney, getLog, todayKey, totalMoneySaved } from '../lib/calculations';
import { playAlarmFor, stopAlarm, vibrateFive } from '../lib/alarm';
import {
  celebrate,
  clearLockStatus,
  consumeNativeQuickAction,
  ensureNotificationPermission,
  publishLockStatus,
  registerNotificationCategories,
  RESISTED_ACTION,
  SMOKED_ACTION,
  SOS_ACTION,
} from '../lib/statusNotification';
import {
  AppData,
  AppLanguage,
  CrisisReminder,
  DayRecord,
  HappinessPrompts,
  Plan,
  QuitMotivation,
  SavingsGoal,
  TimerState,
  TimerStatus,
} from '../types';
import { clearData, generateInviteCode, loadData, persistData } from '../storage';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const cat = notification?.request?.content?.categoryIdentifier;
      // Alarm zamanı geldiğinde (süre bitti) açılır pencere de göster.
      const isAlarm = cat === 'birakgitsin-alarm' || cat === 'birakgitsin-party';
      return {
        // Sayaç her saniye güncellendiği için durum bildiriminde açılır pencere
        // (banner) istemiyoruz; bildirim panelde/kilit ekranında kalsın.
        shouldShowBanner: isAlarm,
        shouldShowList: true,
        // Ses kanaldan gelir (durum kanalı = varsayılan sistem sesi).
        shouldPlaySound: true,
        shouldSetBadge: false,
      };
    },
  });
}

type LogOptions = { dateKey?: string; windowIndex?: number | null; trigger?: string };

type AppContextValue = {
  data: AppData;
  ready: boolean;
  setPlan: (plan: Plan) => void;
  logCigarette: (opts?: LogOptions) => void;
  logSlip: (opts?: LogOptions) => { avoided: number };
  undoCigarette: (opts?: LogOptions) => void;
  logCraving: (resisted: boolean, meta?: { intensity?: number; trigger?: string }) => void;
  setSavingsGoal: (goal: SavingsGoal | null) => void;
  setCrisisReminders: (reminders: CrisisReminder[]) => Promise<void>;
  resetAll: () => void;
  setPremium: (value: boolean) => void;
  grantProUnlock24h: () => void;
  grantProUnlockDays: (days: number) => void;
  grantAdProUnlock: () => { ok: boolean; reason?: 'premium' | 'active' | 'cooldown'; remainingMs?: number };
  setShowLockScreen: (value: boolean) => void;
  setLanguage: (language: AppLanguage) => void;
  confirmAge: () => void;
  incrementCoachUsage: () => void;
  setQuitMotivation: (motivation: QuitMotivation | null) => void;
  markFutureOnboardingShown: () => void;
  markHappinessPrompt: (action: 'positive' | 'negative' | 'dismiss') => void;
  redeemInviteCode: (code: string) => { ok: boolean; message?: string };
  pledgeToday: () => void;
  timer: TimerState;
  setTimerDuration: (minutes: number) => void;
  startTimer: (minutes?: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  dismissTimer: () => void;
  extendTimer: (extraMinutes: number) => void;
  restoreData: (data: AppData) => void;
  exportedJson: () => string;
  sosRequest: number;
  openSos: () => void;
  flashMessage: string | null;
  showFlash: (message: string) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

const defaultTimer: TimerState = { minutes: 30, remaining: 1800, status: 'idle' };

// Açılıştan sonra bu süre boyunca (uygulama ön plandayken) kilit ekranı
// bildirimi gönderilmez; böylece ilk açılışta bildirim çıkmaz.
const BOOT_GRACE_MS = 30000;
// Uygulama (JS paketi) açılış anı: render sırasında Date.now() çağırmamak için
// modül yüklenirken bir kez hesaplanır.
const BOOT_AT = Date.now();

const CRISIS_CHANNEL = 'birakgitsin-v2';

async function ensureCrisisChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(CRISIS_CHANNEL, {
      name: 'Kriz ve motivasyon hatırlatıcıları',
      description: 'Akıllı kriz ve motivasyon bildirimleri',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 120],
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  } catch {
    // ignore
  }
}

function crisisBody(data: AppData): string {
  const plan = data.plan;
  if (!plan) return 'Derin bir nefes al. Bu anı da atlatabilirsin — sen güçlüsün.';
  const saved = totalMoneySaved(plan, data.logs);
  const avoided = cigarettesAvoided(plan, data.logs);
  const currency = plan.currency || '₺';
  const savedText = formatMoney(saved, currency);
  const goal = data.savingsGoal;
  if (goal && goal.target > 0) {
    const remaining = Math.max(0, goal.target - saved);
    if (remaining <= 0) {
      return `Harikasın! ${savedText} biriktirdin ve hedefin "${goal.title}" için hazırsın. Bu krizi de atlat.`;
    }
    return `Şu ana kadar ${savedText} biriktirdin, "${goal.title}" hedefine ${formatMoney(remaining, currency)} kaldı. ${avoided} sigara içmedin — devam!`;
  }
  return `Şu ana kadar ${savedText} biriktirdin ve ${avoided} sigara içmedin. Bu anı da atlatabilirsin.`;
}

async function syncCrisisReminderSchedules(reminders: CrisisReminder[] | undefined, data: AppData) {
  if (Platform.OS === 'web') return;
  const list = (reminders ?? []).filter((r) => r && r.enabled);
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => (n.identifier || '').startsWith('crisis-'))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch {
    // ignore
  }
  if (!list.length) return;
  await ensureCrisisChannel();
  const body = crisisBody(data);
  for (const r of list) {
    const m = /^([0-9]{1,2}):([0-9]{2})$/.exec(r.time || '');
    if (!m) continue;
    const hour = Math.min(23, Math.max(0, parseInt(m[1], 10)));
    const minute = Math.min(59, Math.max(0, parseInt(m[2], 10)));
    const title = r.label ? `${r.label} · Kriz anı hatırlatıcısı` : 'Kriz anı hatırlatıcısı';
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `crisis-${r.id}`,
        content: {
          title,
          body,
          sound: 'default',
          color: '#14B8A6',
          categoryIdentifier: 'birakgitsin-smart',
          data: { type: 'smart-reminder', reminderId: r.id },
          ...(Platform.OS === 'android' ? { channelId: CRISIS_CHANNEL } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    } catch {
      // ignore individual schedule failures
    }
  }
}


async function scheduleSmartSnoozeNotification(title: string, body: string) {
  if (Platform.OS === 'web') return;
  try {
    await ensureCrisisChannel();
    await Notifications.scheduleNotificationAsync({
      identifier: `crisis-snooze-${Date.now()}`,
      content: {
        title,
        body,
        sound: 'default',
        color: '#14B8A6',
        categoryIdentifier: 'birakgitsin-smart',
        data: { type: 'smart-reminder', snoozed: true },
        ...(Platform.OS === 'android' ? { channelId: CRISIS_CHANNEL } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 30 * 60,
        repeats: false,
      },
    });
  } catch {
    // ignore
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>({
    plan: null,
    logs: [],
    cravings: [],
    badges: [],
    savingsGoal: null,
    isPremium: false,
    proUnlockUntil: 0,
    proTrialUsed: false,
    welcomeTrialGrantedAt: 0,
    lastAdProGrantAt: 0,
    showLockScreen: true,
    slipLogs: [],
    coachUsage: { date: '', count: 0 },
    quitMotivation: null,
    futureOnboardingShown: false,
    happinessPrompts: {},
    inviteRedeemed: false,
    dailyPledges: [],
    ageConfirmed: false,
  });
  const [ready, setReady] = useState(false);
  const [timer, setTimer] = useState<TimerState>(defaultTimer);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  // Bildirim kısayoluyla açılan SOS isteği (HomeScreen modalını tetikler).
  const [sosRequest, setSosRequest] = useState(0);
  // Bildirim aksiyonlarının anlık onay mesajı (kısa süreli toast).
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showFlash = (message: string) => {
    setFlashMessage(message);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashMessage(null), 2800);
  };

  const endAtRef = useRef(0);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifIdRef = useRef<string | null>(null);
  const timerRef = useRef<TimerState>(defaultTimer);
  const prevStatusRef = useRef<TimerStatus>(defaultTimer.status);
  const prevSmokedRef = useRef(0);
  const permRequestedRef = useRef(false);
  const remoteActionRef = useRef<Record<string, () => void>>({});

  useEffect(() => {
    (async () => {
      const loaded = await loadData();
      const have = loaded.badges ?? [];
      const earned = evaluateBadges(loaded, have);
      const enriched =
        earned.length > 0 ? { ...loaded, badges: [...have, ...earned] } : loaded;
      setData(enriched);
      setReady(true);
    })();
  }, []);

  // PRO yetkisi yalnızca Google Play'den onaylanmış satın alma olaylarıyla verilir.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    return addPurchaseListeners(
      (productId) => {
        if (productId && ENTITLEMENT_PRODUCT_IDS.includes(productId)) {
          setData((prev) => (prev.isPremium ? prev : { ...prev, isPremium: true }));
        }
      },
      () => {},
    );
  }, []);

  useEffect(() => {
    if (ready && data.isPremium) persistData(data).catch(() => {});
    // yalnızca satın alma durumu değiştiğinde kalıcı yaz
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, data.isPremium]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    // Kategori etiketleri cihaz/uygulama diline göre (TR/EN) kaydedilir.
    registerNotificationCategories(data.language === 'en' ? 'en' : 'tr').catch(() => {});
  }, [data.language]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const handleNotifAction = (res: Notifications.NotificationResponse | null) => {
      if (!res) return;
      const action = res.actionIdentifier;
      if (!action || action === Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      if (action === 'action_add_smoked' || action === 'snooze30') {
        Notifications.dismissNotificationAsync(res.notification.request.identifier).catch(() => {});
      }
      remoteActionRef.current[action]?.();
    };
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      handleNotifAction(res);
    });
    Notifications.getLastNotificationResponseAsync()
      .then((res) => {
        handleNotifAction(res);
      })
      .catch(() => {});
    return () => sub.remove();
  }, []);

  // Yerel kronometre bildirimindeki native hızlı aksiyonlar uygulamayı
  // açtığında ilgili JS handler'ına yönlendirilir.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const consume = () => {
      const action = consumeNativeQuickAction();
      if (action) remoteActionRef.current[action]?.();
    };
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') consume();
    });
    consume();
    return () => sub.remove();
  }, []);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      setAppState(next);
      if ((prev === 'background' || prev === 'inactive') && next === 'active') {
        void (async () => {
          try {
            const loaded = await loadData();
            const have = loaded.badges ?? [];
            const earned = evaluateBadges(loaded, have);
            const enriched = earned.length > 0 ? { ...loaded, badges: [...have, ...earned] } : loaded;
            setData(enriched);
          } catch {}
        })();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!permRequestedRef.current && data.plan && data.showLockScreen) {
      permRequestedRef.current = true;
      void (async () => {
        const granted = await ensureNotificationPermission();
        let permInfo = 'izin: bilinmiyor';
        try {
          const p = await Notifications.getPermissionsAsync();
          permInfo = `izin granted=${p.granted} status=${String(p.status)} canAskAgain=${p.canAskAgain}`;
        } catch (e) {
          permInfo = 'izin HATA: ' + String(e);
        }
        try {
          await Clipboard.setStringAsync(
            `BG-DIAG ${new Date().toISOString()} | ${permInfo} | showLockScreen=${data.showLockScreen}`,
          );
        } catch {
          // ignore
        }
        if (!granted) {
          Alert.alert(
            'Bildirim izni kapalı',
            'Kilit ekranı bildirimi için bildirim izni gerekiyor. Ayarlardan izni açabilirsin.',
            [
              { text: 'Tamam' },
              { text: 'Ayarları aç', onPress: () => Linking.openSettings() },
            ],
          );
        }
      })();
    }
  }, [data.plan, data.showLockScreen]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void (async () => {
      try {
        const p = await Notifications.getPermissionsAsync();
        await Clipboard.setStringAsync(
          `BG-BOOT ${new Date().toISOString()} granted=${p.granted} status=${String(
            p.status,
          )} plan=${!!data.plan} showLock=${data.showLockScreen}`,
        );
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!ready || !data.plan || !data.showLockScreen) return;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const list = await Notifications.getPresentedNotificationsAsync();
          const ours = list.filter(
            (n) => n.request.identifier === 'birakgitsin-status',
          ).length;
          await Clipboard.setStringAsync(
            `BG-TRAY ${new Date().toISOString()} toplam=${list.length} bizimki=${ours}`,
          );
        } catch {
          // ignore
        }
      })();
    }, 2500);
    return () => clearTimeout(t);
  }, [ready, data.plan, data.showLockScreen]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!data.plan || !data.showLockScreen) {
      clearLockStatus();
      return;
    }
    // Uygulama açılır açılmaz bildirim çıkmasın: açılıştan sonraki ilk
    // BOOT_GRACE_MS boyunca (uygulama ön plandayken) gönderme. Ekranı kilitlersen
    // (uygulama arka plana geçince) hemen gönderilir; ön planda kalırsan kısa
    // süre sonra gönderilir.
    const withinBootGrace = Date.now() - BOOT_AT < BOOT_GRACE_MS;
    const goingBackground = appState !== 'active';
    const running = timer.status === 'running';
    // Sayaç çalışarken geri sayımı native kronometre gösterir (JS gerekmez).
    // Zamanlayıcı çalışmıyorsa ilk açılışta bildirim çıkmasın (boot grace).
    if (withinBootGrace && !goingBackground && !running) {
      return;
    }
    const today = todayKey();
    const rec = getLog(data.logs, today);
    const statusChanged = prevStatusRef.current !== timer.status;
    const smokedChanged = prevSmokedRef.current !== rec.smoked;
    prevStatusRef.current = timer.status;
    prevSmokedRef.current = rec.smoked;
    const endAt = running ? endAtRef.current : 0;
    const timerText = formatCountdown(timer.remaining);
    publishLockStatus(
      running ? `İçilen: ${rec.smoked}` : `İçilen: ${rec.smoked} · Sayaç: ${timerText}`,
      statusChanged || smokedChanged || goingBackground,
      endAt,
    );
  }, [timer.remaining, timer.status, data.logs, data.plan, data.showLockScreen, appState]);

  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  useEffect(() => {
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
      stopAlarm();
      if (Platform.OS !== 'web') {
        Vibration.cancel();
        if (notifIdRef.current) {
          Notifications.cancelScheduledNotificationAsync(notifIdRef.current).catch(() => {});
        }
      }
    };
  }, []);

  const persist = async (next: AppData) => {
    setData(next);
    await persistData(next);
  };

  const setPlan = (plan: Plan) => persist({ ...data, plan });

  const clearTicker = () => {
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  };

  const stopAlarmFx = () => {
    Vibration.cancel();
    stopAlarm();
  };

  const cancelScheduled = async () => {
    if (Platform.OS === 'web') return;
    if (notifIdRef.current) {
      await Notifications.cancelScheduledNotificationAsync(notifIdRef.current).catch(() => {});
      notifIdRef.current = null;
    }
  };

  const scheduleNotif = async (secs: number) => {
    if (Platform.OS === 'web') return;
    try {
      const perms = await Notifications.getPermissionsAsync();
      if (!perms.granted) {
        await Notifications.requestPermissionsAsync();
      }
      await cancelScheduled();
      notifIdRef.current = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Bırak Gitsin',
          body: 'Dayanma süren doldu. Harika iş çıkardın, devam et!',
          sound: 'default',
          categoryIdentifier: 'birakgitsin-smart',
          ...(Platform.OS === 'android' ? { channelId: CRISIS_CHANNEL } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secs,
        },
      });
    } catch {
      notifIdRef.current = null;
    }
  };

  const beginCountdown = (baseMinutes: number, secs: number) => {
    clearTicker();
    stopAlarmFx();
    cancelScheduled();
    endAtRef.current = Date.now() + secs * 1000;
    tickerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      const next: TimerState = { ...timerRef.current, remaining: left, status: 'running' };
      timerRef.current = next;
      setTimer(next);
      if (left <= 0) {
        clearTicker();
        playAlarmFor(3000);
        vibrateFive();
        const done: TimerState = { ...timerRef.current, remaining: 0, status: 'done' };
        timerRef.current = done;
        setTimer(done);
      }
    }, 200);
    const running: TimerState = { minutes: baseMinutes, remaining: secs, status: 'running' };
    timerRef.current = running;
    setTimer(running);
    scheduleNotif(secs);
  };

  const restartTimerForSmoke = () => {
    const m = timerRef.current.minutes;
    beginCountdown(m, m * 60);
  };

  const setTimerDuration = (minutes: number) => {
    clearTicker();
    stopAlarmFx();
    cancelScheduled();
    const next: TimerState = { minutes, remaining: minutes * 60, status: 'idle' };
    timerRef.current = next;
    setTimer(next);
  };

  const startTimer = (minutes?: number) => {
    const m = minutes ?? timerRef.current.minutes;
    beginCountdown(m, m * 60);
  };

  const pauseTimer = () => {
    clearTicker();
    const next: TimerState = { ...timerRef.current, status: 'paused' };
    timerRef.current = next;
    setTimer(next);
  };

  const resumeTimer = () => {
    const t = timerRef.current;
    if (t.remaining > 0) beginCountdown(t.minutes, t.remaining);
  };

  const resetTimer = () => {
    clearTicker();
    stopAlarmFx();
    cancelScheduled();
    const next: TimerState = {
      minutes: timerRef.current.minutes,
      remaining: timerRef.current.minutes * 60,
      status: 'idle',
    };
    timerRef.current = next;
    setTimer(next);
  };

  const dismissTimer = () => resetTimer();

  const extendTimer = (extraMinutes: number) => {
    clearTicker();
    stopAlarmFx();
    cancelScheduled();
    const t = timerRef.current;
    const next: TimerState = {
      minutes: t.minutes + extraMinutes,
      remaining: t.remaining + extraMinutes * 60,
      status: 'idle',
    };
    timerRef.current = next;
    setTimer(next);
  };

  const mutateLog = (dateKey: string, dir: 1 | -1, windowIndex: number | null): AppData => {
    const existing = data.logs.find((l) => l.date === dateKey);
    const base = existing ?? { date: dateKey, smoked: 0 };
    const smoked = Math.max(0, base.smoked + dir);
    const windowSmoked = base.windowSmoked ? [...base.windowSmoked] : [];
    let outsideSmoked = base.outsideSmoked ?? 0;
    const times = base.times ? [...base.times] : [];

    if (windowIndex !== null && windowIndex >= 0) {
      const cur = windowSmoked[windowIndex] ?? 0;
      windowSmoked[windowIndex] = Math.max(0, cur + dir);
    } else {
      outsideSmoked = Math.max(0, outsideSmoked + dir);
    }

    if (dir === 1) {
      times.push(new Date().toISOString());
    } else if (times.length > 0) {
      times.pop();
    }

    const next: DayRecord = { date: dateKey, smoked, windowSmoked, outsideSmoked, times };
    const logs = existing
      ? data.logs.map((l) => (l.date === dateKey ? next : l))
      : [...data.logs, next];
    return { ...data, logs };
  };

  const withBadges = (next: AppData, announce: boolean): AppData => {
    const have = next.badges ?? [];
    const earned = evaluateBadges(next, have);
    if (earned.length === 0) return next;
    if (announce && Platform.OS !== 'web') {
      earned.forEach((id) => {
        const def = badgeById(id);
        if (def) {
          celebrate(`Yeni rozet kazandın!`, `${def.title}\n${def.desc}`).catch(() => {});
        }
      });
      maybeRequestStoreReview('badge').catch(() => {});
    }
    return { ...next, badges: [...have, ...earned] };
  };

  const logCigarette = (opts?: LogOptions) => {
    const next = withBadges(mutateLog(opts?.dateKey ?? todayKey(), 1, opts?.windowIndex === undefined ? null : opts.windowIndex), true);
    persist(next);
    restartTimerForSmoke();
    // Sigara içildiğinde kısa ses + titreşim uyarısı ver.
    playAlarmFor(1200);
    if (Platform.OS === 'web') {
      try {
        (globalThis as any).navigator?.vibrate?.(250);
      } catch {
        // ignore
      }
    } else {
      try {
        Vibration.vibrate(250);
      } catch {
        // ignore
      }
    }
  };

  // Şefkatli "kaçamak" kaydı: +1 sigara işler, tasarruf/ilerleme sıfırlanmaz;
  // sert alarm/sayaç yeniden başlatma yok, yalnızca nazik geri bildirim.
  const logSlip = (opts?: LogOptions): { avoided: number } => {
    const mutated = withBadges(
      mutateLog(opts?.dateKey ?? todayKey(), 1, opts?.windowIndex === undefined ? null : opts.windowIndex),
      true,
    );
    const slipEntry = { timestamp: new Date().toISOString(), trigger: opts?.trigger };
    const next = { ...mutated, slipLogs: [...(mutated.slipLogs ?? []), slipEntry] };
    persist(next);
    if (Platform.OS === 'web') {
      try {
        (globalThis as any).navigator?.vibrate?.(40);
      } catch {
        // ignore
      }
    } else {
      try {
        Vibration.vibrate(40);
      } catch {
        // ignore
      }
    }
    const avoided = next.plan ? cigarettesAvoided(next.plan, next.logs) : 0;
    return { avoided };
  };

  const undoCigarette = (opts?: LogOptions) =>
    persist(mutateLog(opts?.dateKey ?? todayKey(), -1, opts?.windowIndex === undefined ? null : opts.windowIndex));

  const logCraving = (
    resisted: boolean,
    meta?: { intensity?: number; trigger?: string },
  ) =>
    persist(
      withBadges(
        {
          ...data,
          cravings: [
            ...data.cravings,
            {
              timestamp: new Date().toISOString(),
              resisted,
              intensity: meta?.intensity,
              trigger: meta?.trigger,
            },
          ],
        },
        true,
      ),
    );


  const setSavingsGoal = (goal: SavingsGoal | null) => {
    const next = { ...data, savingsGoal: goal };
    persist(next);
    syncCrisisReminderSchedules(next.crisisReminders, next).catch(() => {});
  };

  const setCrisisReminders = async (reminders: CrisisReminder[]) => {
    const next = { ...data, crisisReminders: reminders };
    persist(next);
    await syncCrisisReminderSchedules(reminders, next);
  };

  const resetAll = () => {
    clearData();
    clearLockStatus();
    if (Platform.OS !== 'web') {
      Notifications.getAllScheduledNotificationsAsync()
        .then((all) =>
          Promise.all(
            all
              .filter((n) => (n.identifier || '').startsWith('crisis-'))
              .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
          ),
        )
        .catch(() => {});
    }
    const fresh: AppData = {
      plan: null,
      logs: [],
      cravings: [],
      badges: [],
      savingsGoal: null,
      crisisReminders: [],
      isPremium: false,
      proUnlockUntil: 0,
      proTrialUsed: true,
      welcomeTrialGrantedAt: Date.now(),
      lastAdProGrantAt: 0,
      showLockScreen: true,
      language: data.language || 'tr',
      slipLogs: [],
      coachUsage: { date: '', count: 0 },
      quitMotivation: null,
      futureOnboardingShown: false,
      happinessPrompts: {},
      inviteCode: generateInviteCode(),
      inviteRedeemed: false,
      dailyPledges: [],
    };
    setData(fresh);
    persistData(fresh).catch(() => {});
  };

  const setPremium = (value: boolean) => persist({ ...data, isPremium: value });

  const grantProUnlockDays = (days: number) => {
    const ms = Math.max(1, Math.floor(days)) * 24 * 60 * 60 * 1000;
    persist({ ...data, proUnlockUntil: Math.max(Date.now(), data.proUnlockUntil || 0) + ms });
  };

  // Haftada 1 reklam ödülü: aktif PRO varken hak tüketilmez, 7 gün bekleme süresi vardır.
  const grantAdProUnlock = () => {
    const availability = adUnlockAvailability(data);
    if (!availability.available) {
      return { ok: false, reason: availability.reason, remainingMs: availability.remainingMs };
    }
    const now = Date.now();
    persist({
      ...data,
      lastAdProGrantAt: now,
      proUnlockUntil: adProUnlockUntil(data),
    });
    return { ok: true };
  };

  // Mevcut çağrılar için geriye dönük uyumluluk; yeni akış haftalık kotaya bağlı.
  const grantProUnlock24h = () => grantAdProUnlock();

  const setShowLockScreen = (value: boolean) => persist({ ...data, showLockScreen: value });

  const setLanguage = (language: AppLanguage) => persist({ ...data, language });

  const incrementCoachUsage = () => {
    const today = todayKey();
    const prev = data.coachUsage;
    const count = prev && prev.date === today ? Math.max(0, prev.count) + 1 : 1;
    persist({ ...data, coachUsage: { date: today, count } });
  };

  const setQuitMotivation = (motivation: QuitMotivation | null) => {
    const clean = motivation
      ? {
          text: typeof motivation.text === 'string' ? motivation.text.trim().slice(0, 200) : '',
          photoUri: typeof motivation.photoUri === 'string' && motivation.photoUri ? motivation.photoUri : undefined,
        }
      : null;
    persist({ ...data, quitMotivation: clean && (clean.text || clean.photoUri) ? clean : null });
  };

  const markFutureOnboardingShown = () => {
    if (data.futureOnboardingShown) return;
    persist({ ...data, futureOnboardingShown: true });
  };

  const confirmAge = () => {
    if (data.ageConfirmed) return;
    persist({ ...data, ageConfirmed: true });
  };

  const markHappinessPrompt = (action: 'positive' | 'negative' | 'dismiss') => {
    const prev = data.happinessPrompts || {};
    const next: HappinessPrompts = { ...prev, lastPromptAt: Date.now() };
    if (action === 'positive') {
      next.positiveResponse = true;
    }
    persist({ ...data, happinessPrompts: next });
  };

  const redeemInviteCode = (code: string): { ok: boolean; message?: string } => {
    const normalized = (code || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!normalized) return { ok: false, message: 'empty' };
    if (data.inviteRedeemed) return { ok: false, message: 'already' };
    if (normalized === (data.inviteCode || '').trim().toUpperCase()) {
      return { ok: false, message: 'self' };
    }
    if (!/^BG[A-Z0-9]{4,10}$/.test(normalized)) {
      return { ok: false, message: 'invalid' };
    }
    const ms = 7 * 24 * 60 * 60 * 1000;
    const nextUntil = Math.max(Date.now(), data.proUnlockUntil || 0) + ms;
    persist({ ...data, proUnlockUntil: nextUntil, inviteRedeemed: true });
    return { ok: true };
  };

  const pledgeToday = () => {
    const key = todayKey();
    const pledges = data.dailyPledges || [];
    if (pledges.includes(key)) return;
    persist({ ...data, dailyPledges: [...pledges, key] });
  };

  const restoreData = (incoming: AppData) => {
    const clean: AppData = {
      plan: incoming.plan ?? null,
      logs: Array.isArray(incoming.logs) ? incoming.logs : [],
      cravings: Array.isArray(incoming.cravings) ? incoming.cravings : [],
      badges: Array.isArray(incoming.badges) ? incoming.badges : [],
      savingsGoal:
        incoming.savingsGoal && typeof incoming.savingsGoal.title === 'string'
          ? {
              title: incoming.savingsGoal.title,
              target: Number(incoming.savingsGoal.target) || 0,
            }
          : null,
      crisisReminders: Array.isArray(incoming.crisisReminders)
        ? incoming.crisisReminders
            .filter((r: any) => r && typeof r.time === 'string')
            .map((r: any, i: number) => ({
              id: typeof r.id === 'string' ? r.id : `cr-${Date.now()}-${i}`,
              time: r.time,
              label: typeof r.label === 'string' ? r.label : '',
              enabled: r.enabled !== false,
            }))
        : [],
      // Yedekten PRO yetkisi devralınmaz; Play'den "Satın alımları geri yükle" ile doğrulanır.
      isPremium: false,
      // Yaş onayı yedekle aktarılmaz; güvenli tarafta kalıp tekrar sorulur.
      ageConfirmed: false,
      proUnlockUntil:
        typeof incoming.proUnlockUntil === 'number' && Number.isFinite(incoming.proUnlockUntil)
          ? incoming.proUnlockUntil
          : 0,
      // Hediye hakkı cihaza bağlıdır; yedekten geri yüklenince yeniden verilmez.
      proTrialUsed: true,
      welcomeTrialGrantedAt:
        typeof (incoming as any).welcomeTrialGrantedAt === 'number'
          ? (incoming as any).welcomeTrialGrantedAt
          : 0,
      lastAdProGrantAt:
        typeof (incoming as any).lastAdProGrantAt === 'number' ? (incoming as any).lastAdProGrantAt : 0,
      showLockScreen: incoming.showLockScreen !== false,
      language: incoming.language === 'tr' || incoming.language === 'en' ? incoming.language : (data.language || 'tr'),
      slipLogs: Array.isArray((incoming as any).slipLogs)
        ? (incoming as any).slipLogs
            .filter((s: any) => s && typeof s.timestamp === 'string')
            .map((s: any) => ({ timestamp: s.timestamp, trigger: typeof s.trigger === 'string' ? s.trigger : undefined }))
        : [],
      coachUsage:
        (incoming as any).coachUsage && typeof (incoming as any).coachUsage === 'object'
          ? {
              date: typeof (incoming as any).coachUsage.date === 'string' ? (incoming as any).coachUsage.date : '',
              count: Number.isFinite((incoming as any).coachUsage.count) ? Math.max(0, (incoming as any).coachUsage.count) : 0,
            }
          : { date: '', count: 0 },
      quitMotivation:
        incoming.quitMotivation && typeof incoming.quitMotivation === 'object'
          ? {
              text: typeof (incoming.quitMotivation as any).text === 'string' ? (incoming.quitMotivation as any).text : '',
              photoUri:
                typeof (incoming.quitMotivation as any).photoUri === 'string'
                  ? (incoming.quitMotivation as any).photoUri
                  : undefined,
            }
          : null,
      futureOnboardingShown: !!incoming.futureOnboardingShown,
      happinessPrompts:
        incoming.happinessPrompts && typeof incoming.happinessPrompts === 'object'
          ? {
              first24h: !!(incoming.happinessPrompts as any).first24h,
              sosPassed: !!(incoming.happinessPrompts as any).sosPassed,
              savings500: !!(incoming.happinessPrompts as any).savings500,
              positiveResponse: !!(incoming.happinessPrompts as any).positiveResponse,
              lastPromptAt:
                typeof (incoming.happinessPrompts as any).lastPromptAt === 'number'
                  ? (incoming.happinessPrompts as any).lastPromptAt
                  : undefined,
            }
          : {},
      inviteCode: typeof incoming.inviteCode === 'string' && incoming.inviteCode ? incoming.inviteCode : (data.inviteCode || generateInviteCode()),
      inviteRedeemed: !!incoming.inviteRedeemed,
      dailyPledges: Array.isArray((incoming as any).dailyPledges)
        ? (incoming as any).dailyPledges.filter((x: any) => typeof x === 'string')
        : (data.dailyPledges || []),
    };
    persist(clean);
    if (Platform.OS !== 'web') {
      Notifications.getAllScheduledNotificationsAsync()
        .then((all) =>
          Promise.all(
            all
              .filter((n) => !(n.identifier || '').startsWith('crisis-'))
              .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
          ),
        )
        .then(() => syncCrisisReminderSchedules(clean.crisisReminders, clean))
        .catch(() => {});
    }
  };

  const exportedJson = () => JSON.stringify(data, null, 2);

  // Uygulama hazır olduğunda ve veriler değiştikçe kriz hatırlatıcılarını
  // (güncel tasarruf/hedef metniyle) yeniden planla.
  useEffect(() => {
    if (!ready) return;
    syncCrisisReminderSchedules(data.crisisReminders, data).catch(() => {});
  }, [ready, data]);

  // Bildirim aksiyonları en güncel handler'ları kullansın diye render sonrası
  // (effect içinde) güncellenir; render sırasında ref yazılmaz.
  useEffect(() => {
    remoteActionRef.current = {
      smoke: () => logCigarette(),
      resisted: () => dismissTimer(),
      snooze5: () => extendTimer(5),
      action_add_smoked: () => {
        logCigarette();
      },
      confirm_resisted: () => {
        logCraving(true);
      },
      snooze30: () => {
        const title = 'Kriz anı hatırlatıcısı';
        const body = crisisBody(data);
        scheduleSmartSnoozeNotification(title, body).catch(() => {});
      },
      [SOS_ACTION]: () => {
        // Kısa haptic + uygulamayı açıp doğrudan SOS nefes modalını göster.
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        setSosRequest((n) => n + 1);
      },
      [RESISTED_ACTION]: () => {
        // Başarı haptiği + direnen istek kaydı + anlık onay + sayaç yenileme.
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        logCraving(true, { trigger: 'notification_quick_action' });
        const isEn = data.language === 'en';
        const today = todayKey();
        const resistedToday =
          data.cravings.filter(
            (c) => c.resisted && String(c.timestamp).slice(0, 10) === today,
          ).length + 1;
        const smoked = getLog(data.logs, today).smoked;
        const cheer = isEn
          ? 'Amazing! You resisted 1 more craving 💪'
          : 'Harika! 1 krize daha direndin 💪';
        showFlash(cheer);
        celebrate(
          isEn ? `💪 ${resistedToday} cravings resisted` : `💪 Bugün ${resistedToday} kriz`,
          cheer,
        ).catch(() => {});
        publishLockStatus(
          isEn
            ? `Smoked: ${smoked} · Resisted: ${resistedToday}`
            : `İçilen: ${smoked} · Dayanılan: ${resistedToday}`,
          true,
          endAtRef.current,
        ).catch(() => {});
      },
      [SMOKED_ACTION]: () => {
        // Yargılamadan +1 kaydı, nazik haptic ve destekleyici geri bildirim.
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        logSlip({ trigger: 'notification_quick_action' });
        const isEn = data.language === 'en';
        const today = todayKey();
        const smoked = getLog(data.logs, today).smoked + 1;
        const resistedToday = data.cravings.filter(
          (c) => c.resisted && String(c.timestamp).slice(0, 10) === today,
        ).length;
        const support = isEn
          ? 'Saved. No problem, we can delay the next one together.'
          : 'Kaydedildi. Sorun değil, bir sonrakini birlikte erteleyebiliriz.';
        showFlash(support);
        celebrate(
          isEn ? `🚬 ${smoked} today · recorded` : `🚬 Bugün ${smoked} · kaydedildi`,
          support,
        ).catch(() => {});
        publishLockStatus(
          isEn
            ? `Smoked: ${smoked} · Resisted: ${resistedToday}`
            : `İçilen: ${smoked} · Dayanılan: ${resistedToday}`,
          true,
          endAtRef.current,
        ).catch(() => {});
      },
    };
  });

  const value: AppContextValue = {
    data,
    ready,
    setPlan,
    logCigarette,
    logSlip,
    undoCigarette,
    logCraving,
    setSavingsGoal,
    setCrisisReminders,
    resetAll,
    setPremium,
    grantProUnlock24h,
    grantProUnlockDays,
    grantAdProUnlock,
    setShowLockScreen,
    setLanguage,
    confirmAge,
    incrementCoachUsage,
    setQuitMotivation,
    markFutureOnboardingShown,
    markHappinessPrompt,
    redeemInviteCode,
    pledgeToday,
    timer,
    setTimerDuration,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    dismissTimer,
    extendTimer,
    restoreData,
    exportedJson,
    sosRequest,
    openSos: () => setSosRequest((n) => n + 1),
    flashMessage,
    showFlash,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}