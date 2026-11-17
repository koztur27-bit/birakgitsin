import { useTheme } from '../context/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DayStat } from '../types';
import { fontSizes, radius, spacing } from '../theme';

type WeekChartProps = {
  stats: DayStat[];
};

export function WeekChart({ stats }: WeekChartProps) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const maxVal = Math.max(1, ...stats.flatMap((s) => [s.goal, s.smoked]));
  const dayLabels = stats.map((s) => {
    const [, mStr, dStr] = s.date.split('-');
    const d = new Date(Number(s.date.slice(0, 4)), Number(mStr) - 1, Number(dStr));
    return d.toLocaleDateString('tr-TR', { weekday: 'short' }).replace('.', '');
  });

  return (
    <View style={styles.chart}>
      <View style={styles.barsRow}>
        {stats.map((s, i) => {
          const goalH = Math.round((s.goal / maxVal) * 130);
          const smokeH = Math.round((s.smoked / maxVal) * 130);
          return (
            <View key={s.date} style={styles.day}>
              <View style={styles.barGroup}>
                <View style={styles.smokeBar}>
                  <View style={[styles.smokeFill, { height: Math.max(3, smokeH) }]} />
                </View>
                <View
                  style={[
                    styles.goalBar,
                    { height: Math.max(2, goalH) },
                    s.smoked > s.goal && styles.goalBarOver,
                  ]}
                />
              </View>
              <Text style={styles.dayLabel}>{dayLabels[i]}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendSmoke]} />
          <Text style={styles.legendText}>İçilen</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendGoal]} />
          <Text style={styles.legendText}>Hedef</Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  chart: { marginTop: spacing.md },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
  },
  day: { flex: 1, alignItems: 'center', gap: spacing.sm },
  barGroup: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  smokeBar: { width: 10, justifyContent: 'flex-end' },
  smokeFill: { width: 10, borderRadius: radius.sm, backgroundColor: colors.primary },
  goalBar: {
    width: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  goalBarOver: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
  dayLabel: { fontSize: fontSizes.xs, color: colors.textMuted },
  legend: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendSwatch: { width: 12, height: 12, borderRadius: 4 },
  legendSmoke: { backgroundColor: colors.primary },
  legendGoal: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary },
  legendText: { fontSize: fontSizes.xs, color: colors.textMuted },
});