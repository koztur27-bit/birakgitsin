import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, Linking, Platform, Vibration } from 'react-native';
import { badgeById, evaluateBadges } from '../lib/badges';
import { formatCountdown, getLog, todayKey } from '../lib/calculations';
import { playAlarmFor, stopAlarm, vibrateFive } from '../lib/alarm';
import {
  celebrate,
  clearLockStatus,
  ensureNotificationPermission,
  publishLockStatus,
  registerNotificationCategories,
} from '../lib/statusNotification';
import { AppData, DayRecord, NrtKind, Plan, TimerState, TimerStatus } from '../types';
import { clearData, loadData, persistData } from '../storage';

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

type LogOptions = { dateKey?: string; windowIndex?: number | null };

type AppContextValue = {
  data: AppData;
  ready: boolean;
  setPlan: (plan: Plan) => void;
  logCigarette: (opts?: LogOptions) => void;
  undoCigarette: (opts?: LogOptions) => void;
  logCraving: (resisted: boolean, meta?: { intensity?: number; trigger?: string }) => void;
  logNrt: (kind: NrtKind, amount?: number) => void;
  resetAll: () => void;
  setPremium: (value: boolean) => void;
  setShowLockScreen: (value: boolean) => void;
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
};

const AppContext = createContext<AppContextValue | null>(null);

const defaultTimer: TimerState = { minutes: 30, remaining: 1800, status: 'idle' };

// Açılıştan sonra bu süre boyunca (uygulama ön plandayken) kilit ekranı
// bildirimi gönderilmez; böylece ilk açılışta bildirim çıkmaz.
const BOOT_GRACE_MS = 30000;
// Uygulama (JS paketi) açılış anı: render sırasında Date.now() çağırmamak için
// modül yüklenirken bir kez hesaplanır.
const BOOT_AT = Date.now();

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>({
    plan: null,
    logs: [],
    cravings: [],
    badges: [],
    isPremium: false,
    showLockScreen: true,
  });
  const [ready, setReady] = useState(false);
  const [timer, setTimer] = useState<TimerState>(defaultTimer);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

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

  useEffect(() => {
    if (Platform.OS === 'web') return;
    registerNotificationCategories();
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const action = res.actionIdentifier;
      if (action && action !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
        remoteActionRef.current[action]?.();
      }
    });
    Notifications.getLastNotificationResponseAsync()
      .then((res) => {
        if (!res) return;
        const action = res.actionIdentifier;
        if (action && action !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
          remoteActionRef.current[action]?.();
        }
      })
      .catch(() => {});
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', setAppState);
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
          categoryIdentifier: 'birakgitsin-alarm',
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

  const logNrt = (kind: NrtKind, amount = 1) =>
    persist({
      ...data,
      nrtLogs: [...(data.nrtLogs ?? []), { timestamp: new Date().toISOString(), kind, amount }],
    });

  const resetAll = () => {
    clearData();
    clearLockStatus();
    setData({
      plan: null,
      logs: [],
      cravings: [],
      badges: [],
      isPremium: false,
      showLockScreen: true,
    });
  };

  const setPremium = (value: boolean) => persist({ ...data, isPremium: value });

  const setShowLockScreen = (value: boolean) => persist({ ...data, showLockScreen: value });

  const restoreData = (incoming: AppData) => {
    const clean: AppData = {
      plan: incoming.plan ?? null,
      logs: Array.isArray(incoming.logs) ? incoming.logs : [],
      cravings: Array.isArray(incoming.cravings) ? incoming.cravings : [],
      badges: Array.isArray(incoming.badges) ? incoming.badges : [],
      nrtLogs: Array.isArray(incoming.nrtLogs) ? incoming.nrtLogs : [],
      isPremium: !!incoming.isPremium,
      showLockScreen: incoming.showLockScreen !== false,
    };
    persist(clean);
    if (Platform.OS !== 'web') {
      Notifications.getAllScheduledNotificationsAsync()
        .then((all) =>
          all.forEach((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
        )
        .catch(() => {});
    }
  };

  const exportedJson = () => JSON.stringify(data, null, 2);

  // Bildirim aksiyonları en güncel handler'ları kullansın diye render sonrası
  // (effect içinde) güncellenir; render sırasında ref yazılmaz.
  useEffect(() => {
    remoteActionRef.current = {
      smoke: () => logCigarette(),
      resisted: () => dismissTimer(),
      snooze5: () => extendTimer(5),
    };
  });

  const value: AppContextValue = {
    data,
    ready,
    setPlan,
    logCigarette,
    undoCigarette,
    logCraving,
    logNrt,
    resetAll,
    setPremium,
    setShowLockScreen,
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}