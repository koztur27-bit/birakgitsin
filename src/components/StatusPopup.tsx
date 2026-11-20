import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import {
  dailyGoal,
  formatCountdown,
  formatMoney,
  getLog,
  moneySavedOnDay,
  nextWindowInfo,
  riskiestHours,
  todayKey,
  totalMoneySaved,
} from '../lib/calculations';
import { fontSizes, radius, shadows, spacing } from '../theme';

type StatusPopupProps = {
  visible: boolean;
  onClose: () => void;
};

export function StatusPopup({ visible, onClose }: StatusPopupProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { data, timer } = useApp();
  const plan = data.plan;
  if (!plan) return null;

  const today = todayKey();
  const rec = getLog(data.logs, today);
  const goal = dailyGoal(plan, today, data.logs);
  const left = Math.max(0, goal - rec.smoked);
  const next = nextWindowInfo(plan);
  const risks = riskiestHours(data.cravings, 1);

  const timerText =
    timer.status === 'idle'
      ? t('statusPopup.timerIdle')
      : timer.status === 'running'
      ? `${t('statusPopup.timerRunning')} · ${formatCountdown(timer.remaining)}`
      : timer.status === 'paused'
      ? `${t('statusPopup.timerPaused')} · ${formatCountdown(timer.remaining)}`
      : t('statusPopup.timerDone');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('statusPopup.title')}</Text>

          <View style={styles.grid}>
            <View style={styles.item}>
              <Text style={styles.label}>{t('statusPopup.smoked')}</Text>
              <Text style={styles.value}>{rec.smoked}</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.label}>{t('statusPopup.goal')}</Text>
              <Text style={styles.value}>{goal}</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.label}>{t('statusPopup.left')}</Text>
              <Text style={[styles.value, { color: left > 0 ? colors.success : colors.danger }]}>{left}</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.label}>{t('statusPopup.nextWindow')}</Text>
              <Text style={styles.value}>
                {next ? `${Math.floor(next.minutes / 60)}h ${next.minutes % 60}m` : t('statusPopup.noWindow')}
              </Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.label}>{t('statusPopup.timer')}</Text>
              <Text style={styles.valueSmall}>{timerText}</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.label}>{t('statusPopup.savedToday')}</Text>
              <Text style={styles.valueSmall}>{formatMoney(moneySavedOnDay(plan, rec), plan.currency)}</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.label}>{t('statusPopup.savedTotal')}</Text>
              <Text style={styles.valueSmall}>{formatMoney(totalMoneySaved(plan, data.logs), plan.currency)}</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.label}>{t('statusPopup.risk')}</Text>
              <Text style={styles.valueSmall}>
                {risks.length ? `${String(risks[0].hour).padStart(2, '0')}:00` : t('statusPopup.riskNone')}
              </Text>
            </View>
          </View>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>{t('common.close')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: spacing.md,
    },
    sheet: {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      padding: spacing.lg,
      ...shadows.card,
    },
    title: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    item: {
      width: '48%',
      backgroundColor: colors.bg,
      borderRadius: radius.md,
      padding: spacing.sm,
    },
    label: { fontSize: fontSizes.xs, color: colors.textMuted, marginBottom: 2 },
    value: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
    valueSmall: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.text },
    closeBtn: {
      alignSelf: 'center',
      marginTop: spacing.md,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      borderRadius: radius.round,
    },
    closeText: { color: '#FFFFFF', fontWeight: '700' },
  });
