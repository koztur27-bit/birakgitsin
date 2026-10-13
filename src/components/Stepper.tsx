import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radius, spacing } from '../theme';

type StepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  hint?: string;
};

export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  suffix = '',
  hint,
}: StepperProps) {
  const atMin = value <= min;
  const atMax = value >= max;
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={styles.controls}>
        <Pressable
          accessibilityLabel={`${label} azalt`}
          onPress={() => onChange(Math.max(min, value - step))}
          disabled={atMin}
          style={({ pressed }) => [
            styles.button,
            atMin && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.buttonText, atMin && styles.buttonTextDisabled]}>−</Text>
        </Pressable>
        <Text style={styles.value}>
          {value}
          {suffix ? ` ${suffix}` : ''}
        </Text>
        <Pressable
          accessibilityLabel={`${label} artır`}
          onPress={() => onChange(Math.min(max, value + step))}
          disabled={atMax}
          style={({ pressed }) => [
            styles.button,
            atMax && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.buttonText, atMax && styles.buttonTextDisabled]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  info: { flex: 1, paddingRight: spacing.md },
  label: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
  },
  hint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { backgroundColor: colors.primary, opacity: 0.9 },
  buttonDisabled: { backgroundColor: colors.border, opacity: 0.6 },
  buttonText: {
    fontSize: fontSizes.xl,
    color: colors.primaryDark,
    lineHeight: 34,
  },
  buttonTextDisabled: { color: colors.textMuted },
  value: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.text,
    minWidth: 52,
    textAlign: 'center',
  },
});