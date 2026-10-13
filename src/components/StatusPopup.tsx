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
} from '../lib/calculations';
import { colors, fontSizes, radius, shadows, spacing } from '../theme';

type StatusPopupProps = {
  visible: boolean;
  onClose: () => void;
};

function formatMinutes(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} sa ${m} dk` : `${h} sa`;
  }
  return `${min} dk`;
}

export function StatusPopup({ visible, onClose }: StatusPopupProps) {
  const { data, timer } = useApp();
  const plan = data.plan;

  const today = todayKey();
  const rec = plan ? getLog(data.logs, today) : null;
  const goal = plan ? dailyGoal(plan, today) : 0;
  const left = rec ? Math.max(0, goal - rec.smoked) : 0;
  const next = plan ? nextWindowInfo(plan) : null;

  const timerText =
    timer.status === 'idle'
      ? 'Başlatılmadı'
      : timer.status === 'done'
        ? 'Tamamlandı'
        : formatCountdown(timer.remaining);

  const nextWindow = next && plan ? plan.windows[next.index] : null;
  const risk = riskiestHours(data.cravings, 1)[0];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Durum</Text>
          <Text style={styles.sub}>Şu ana kadar içtiğin ve kalan süreler</Text>

          <View style={styles.bigRow}>
            <View style={styles.bigBox}>
              <Text style={styles.bigValue}>{rec?.smoked ?? 0}</Text>
              <Text style={styles.bigLabel}>içilen sigara</Text>
            </View>
            <View style={styles.bigBox}>
              <Text style={styles.bigValue}>{left}</Text>
              <Text style={styles.bigLabel}>kalan hakkın</Text>
            </View>
          </View>

          <View style={styles.rows}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Dayanma sayacı</Text>
              <Text style={styles.rowValue}>{timerText}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Sıradaki izinli pencere</Text>
              <Text style={styles.rowValue}>
                {next ? `${formatMinutes(next.minutes)} sonra` : '—'}
              </Text>
            </View>
            {nextWindow ? (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Pencere saati</Text>
                <Text style={styles.rowValue}>
                  {nextWindow.start}–{nextWindow.end}
                </Text>
              </View>
            ) : null}
            {plan && rec ? (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Bugün kazandın</Text>
                <Text style={styles.rowValue}>
                  {formatMoney(moneySavedOnDay(plan, rec), plan.currency)}
                </Text>
              </View>
            ) : null}
            {risk ? (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>En riskli saat</Text>
                <Text style={styles.rowValue}>
                  {String(risk.hour).padStart(2, '0')}:00 · {risk.count}×
                </Text>
              </View>
            ) : null}
          </View>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Kapat</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  title: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
  sub: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: spacing.xs },
  bigRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  bigBox: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  bigValue: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.primaryDark },
  bigLabel: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  rows: { marginTop: spacing.md, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowLabel: { fontSize: fontSizes.sm, color: colors.textMuted, fontWeight: '600', flex: 1 },
  rowValue: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text },
  closeBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  closeText: { fontSize: fontSizes.md, fontWeight: '800', color: colors.white },
});
