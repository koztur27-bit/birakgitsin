import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { dailyGoal, todayKey, totalMoneySaved } from './calculations';
import { ensureStatusChannel } from './statusNotification';
import { loadData, persistData } from '../storage';
import { updateWidgetData, refreshWidgets } from './widgetData';
import { AppData, DayRecord } from '../types';

export const BACKGROUND_NOTIFICATION_TASK = 'BIRAKGITSIN_BACKGROUND_NOTIFICATION_TASK';

const STATUS_ID = 'birakgitsin-status';
const CHANNEL_ID = 'birakgitsin-v2';

function mutateLogSimple(data: AppData, dateKey: string): AppData {
  const existing = data.logs.find((l) => l.date === dateKey);
  const base = existing ?? { date: dateKey, smoked: 0 };
  const smoked = Math.max(0, base.smoked + 1);
  const windowSmoked = base.windowSmoked ? [...base.windowSmoked] : [];
  const outsideSmoked = (base.outsideSmoked ?? 0) + 1;
  const times = base.times ? [...base.times] : [];
  times.push(new Date().toISOString());
  const next: DayRecord = { date: dateKey, smoked, windowSmoked, outsideSmoked, times };
  const logs = existing ? data.logs.map((l) => (l.date === dateKey ? next : l)) : [...data.logs, next];
  return { ...data, logs };
}

function fmtMoneyShort(amount: number, currency: string) {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1000) return `${sign}${currency}${(abs / 1000).toFixed(1)}k`;
  return `${sign}${currency}${Math.round(abs)}`;
}

async function syncWidget(next: AppData) {
  try {
    const plan = next.plan;
    if (!plan) return;
    const today = todayKey();
    const rec = next.logs.find((l) => l.date === today) ?? { date: today, smoked: 0 };
    const todayGoal = Math.max(0, dailyGoal(plan, today, next.logs));
    const savedTotal = totalMoneySaved(plan, next.logs);
    const quitMs = plan.startDate ? Date.now() - new Date(plan.startDate).getTime() : 0;
    const abs = Math.max(0, quitMs);
    const d = Math.floor(abs / 86400000);
    const h = Math.floor((abs % 86400000) / 3600000);
    const quitText = quitMs <= 0 ? (next.language === 'en' ? '0d 0h' : '0g 0s') : (next.language === 'en' ? `${d}d ${h}h` : `${d}g ${h}s`);
    const savingsText = fmtMoneyShort(savedTotal, plan.currency);
    updateWidgetData(rec.smoked, todayGoal, savedTotal, 0, '', quitText, savingsText, next.language || 'tr');
    try { refreshWidgets(); } catch {}
  } catch {}
}

async function publishUpdatedStatus(smoked: number) {
  if (Platform.OS === 'web') return;
  try {
    await ensureStatusChannel();
    await Notifications.scheduleNotificationAsync({
      identifier: STATUS_ID,
      content: {
        title: 'Bırak Gitsin',
        body: `İçilen: ${smoked}`,
        sound: true,
        sticky: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'birakgitsin-smart',
        data: { statusPane: true },
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
    });
  } catch {}
}

async function handleAction(actionIdentifier: string) {
  if (Platform.OS === 'web') return;
  if (actionIdentifier === 'action_add_smoked') {
    try {
      const data = await loadData();
      const next = mutateLogSimple(data, todayKey());
      await persistData(next);
      // widget + status feedback in parallel for immediate response
      const today = todayKey();
      const rec = next.logs.find((l) => l.date === today) ?? { date: today, smoked: 0 };
      await Promise.allSettled([
        syncWidget(next),
        publishUpdatedStatus(rec.smoked),
      ]);
    } catch {
      // safe fallback: at least try to refresh widgets from stored data
      try {
        const data = await loadData();
        await syncWidget(data);
      } catch {}
    }
  } else if (actionIdentifier === 'snooze30') {
    try {
      await ensureStatusChannel().catch(() => {});
      await Notifications.scheduleNotificationAsync({
        identifier: `crisis-snooze-${Date.now()}`,
        content: {
          title: 'Kriz anı hatırlatıcısı',
          body: 'Derin bir nefes al. Bu anı da atlatabilirsin — sen güçlüsün.',
          sound: 'default',
          color: '#14B8A6',
          categoryIdentifier: 'birakgitsin-smart',
          data: { type: 'smart-reminder', snoozed: true },
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 30 * 60,
          repeats: false,
        },
      });
    } catch {}
  }
}

try {
  TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
    if (error) return;
    try {
      const payload: any = data;
      if (payload && typeof payload.actionIdentifier === 'string') {
        const actionId = payload.actionIdentifier;
        if (actionId === 'action_add_smoked' || actionId === 'snooze30') {
          await handleAction(actionId);
          try {
            const notifId = payload?.notification?.request?.identifier;
            if (notifId) await Notifications.dismissNotificationAsync(notifId);
          } catch {}
        }
      }
    } catch {
      // never crash background task
    }
  });
} catch {
  // TaskManager unavailable in this environment
}

export async function registerBackgroundNotificationTask() {
  if (Platform.OS === 'web') return;
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
    if (!isRegistered) {
      await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    }
  } catch {}
}
