import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Plan } from '../types';
import { dailyGoal, getLog } from '../lib/calculations';
import { colors, fontSizes, radius, spacing } from '../theme';

type Props = {
  plan: Plan;
  logs: { date: string; smoked: number }[];
  year: number;
  month: number;
};

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function dayStatus(plan: Plan, logs: Props['logs'], key: string): 'none' | 'ok' | 'over' {
  const goal = dailyGoal(plan, key);
  const rec = getLog(logs, key);
  if (rec.smoked === 0) return 'none';
  return rec.smoked <= goal ? 'ok' : 'over';
}

export function CalendarGrid({ plan, logs, year, month }: Props) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const today = new Date();
  const isCurrent =
    today.getFullYear() === year && today.getMonth() === month;

  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <View>
      <View style={styles.weekRow}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={styles.weekLabel}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) {
            return <View key={`e${i}`} style={styles.cell} />;
          }
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const status = dayStatus(plan, logs, key);
          const isFuture =
            year > today.getFullYear() ||
            (year === today.getFullYear() && month > today.getMonth()) ||
            (year === today.getFullYear() && month === today.getMonth() && day > today.getDate());
          const isToday = isCurrent && day === today.getDate();
          return (
            <View
              key={key}
              style={[
                styles.cell,
                isToday && styles.cellToday,
                isFuture && styles.cellFuture,
              ]}
            >
              <Text
                style={[
                  styles.dayNum,
                  isToday && styles.dayNumToday,
                  status === 'ok' && styles.dayOk,
                  status === 'over' && styles.dayOver,
                ]}
              >
                {day}
              </Text>
              {status !== 'none' ? (
                <View
                  style={[
                    styles.dot,
                    status === 'ok' ? styles.dotOk : styles.dotOver,
                  ]}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const sizes = { cell: 42 };

const styles = StyleSheet.create({
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
    height: sizes.cell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellToday: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  cellFuture: { opacity: 0.35 },
  dayNum: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
  },
  dayNumToday: { color: colors.primaryDark, fontWeight: '800' },
  dayOk: { color: colors.success, fontWeight: '800' },
  dayOver: { color: colors.danger, fontWeight: '800' },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  dotOk: { backgroundColor: colors.success },
  dotOver: { backgroundColor: colors.danger },
});