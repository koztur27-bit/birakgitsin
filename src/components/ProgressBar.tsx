import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type ProgressBarProps = {
  progress: number;
  color?: string;
  height?: number;
  label?: string;
};

export function ProgressBar({
  progress,
  color = colors.primary,
  height = 10,
  label,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.wrap}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.percent}>{Math.round(clamped * 100)}%</Text>
        </View>
      ) : null}
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        <View
          style={[
            styles.fill,
            { width: `${clamped * 100}%`, backgroundColor: color, borderRadius: height / 2 },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  percent: { fontSize: 13, color: colors.text, fontWeight: '700' },
  track: { backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%' },
});