import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import { Plan, DayRecord, SlipLog } from '../types';
import { dayKey, getLog, parseKey, slipDaySet } from '../lib/calculations';
import { fontSizes, spacing } from '../theme';

type Props = {
  plan: Plan;
  logs: DayRecord[];
  slipLogs?: SlipLog[];
  year: number;
  month: number;
};

export function StreakCalendar({ plan, logs, slipLogs = [], year, month }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday-based
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const planStart = parseKey(plan.startDate).getTime();
  const slips = React.useMemo(() => slipDaySet(slipLogs), [slipLogs]);

  const weekdays = (t('stats.weekdays') as unknown as string[]) || ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const getStatus = (day: number): 'future' | 'smokefree' | 'slip' | 'smoked' | 'before' => {
    const d = new Date(year, month, day);
    const dMid = new Date(year, month, day).getTime();
    if (dMid > todayMid) return 'future';
    if (dMid < planStart) return 'before';
    const key = dayKey(d);
    if (slips.has(key)) return 'slip';
    const rec = getLog(logs, key);
    if ((rec.smoked || 0) === 0) return 'smokefree';
    return 'smoked';
  };

  return (
    <View>
      <View style={styles.weekRow}>
        {weekdays.map((d, i) => (
          <Text key={`${d}-${i}`} style={styles.weekLabel}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) {
            return <View key={`e${i}`} style={styles.cell} />;
          }
          const status = getStatus(day);
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const circleStyle =
            status === 'smokefree'
              ? styles.circleGreen
              : status === 'slip'
                ? styles.circleYellow
                : status === 'smoked'
                  ? styles.circleSmoked
                  : status === 'before'
                    ? styles.circleBefore
                    : styles.circleFuture;
          const textStyle =
            status === 'smokefree'
              ? styles.textOnGreen
              : status === 'slip'
                ? styles.textOnYellow
                : status === 'smoked'
                  ? styles.textOnSmoked
                  : styles.textFuture;
          return (
            <View key={`${year}-${month}-${day}`} style={styles.cell}>
              <View style={[styles.circle, circleStyle, isToday && styles.todayRing]}>
                <Text style={[styles.dayNum, textStyle]}>{day}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>{t('stats.legendSmokeFree')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>{t('stats.legendSlip')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FDA4AF' }]} />
          <Text style={styles.legendText}>{t('stats.legendSmoked')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
          <Text style={styles.legendText}>{t('stats.legendFuture')}</Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
    weekLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: fontSizes.xs,
      fontWeight: '700',
      color: colors.textMuted,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: `${100 / 7}%`,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
    },
    circle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circleGreen: { backgroundColor: '#10B981' }, // emerald
    circleYellow: { backgroundColor: '#F59E0B' },
    circleSmoked: { backgroundColor: '#FECACA' },
    circleFuture: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, opacity: 0.45 },
    circleBefore: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, opacity: 0.25 },
    todayRing: { borderWidth: 2, borderColor: colors.primaryDark },
    dayNum: { fontSize: fontSizes.sm, fontWeight: '700' },
    textOnGreen: { color: '#FFFFFF' },
    textOnYellow: { color: '#3F2A00' },
    textOnSmoked: { color: '#7F1D1D' },
    textFuture: { color: colors.textMuted },
    legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: fontSizes.xs, color: colors.textMuted },
  });
