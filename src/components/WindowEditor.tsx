import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, fontSizes, radius, spacing } from '../theme';
import { SmokeWindow } from '../types';

type WindowEditorProps = {
  useWindows: boolean;
  windows: SmokeWindow[];
  onChange: (useWindows: boolean, windows: SmokeWindow[]) => void;
};

type PickTarget = { index: number; field: keyof SmokeWindow };

const pad = (n: number) => String(n).padStart(2, '0');
const toHHMM = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function toDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export function WindowEditor({ useWindows, windows, onChange }: WindowEditorProps) {
  const [pick, setPick] = useState<PickTarget | null>(null);

  const applyWindow = (index: number, field: keyof SmokeWindow, value: string) => {
    const next = windows.map((w, i) => (i === index ? { ...w, [field]: value } : w));
    next.sort((a, b) => (a.start > b.start ? 1 : -1));
    onChange(true, next);
  };

  const removeWindow = (index: number) => {
    const next = windows.filter((_, i) => i !== index);
    onChange(next.length > 0, next);
  };

  const onTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'set' && selected && pick) {
      applyWindow(pick.index, pick.field, toHHMM(selected));
    }
    setPick(null);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={styles.title}>İzinli pencereleri kullan</Text>
          <Text style={styles.subtitle}>
            Sigara içeceğin saat aralıklarını belirle. Hesabın bu pencerelere dağılır,
            pencere dışında içmemeyi hedeflersin.
          </Text>
        </View>
        <Switch
          value={useWindows}
          onValueChange={(v) => onChange(v, v && windows.length === 0 ? defaultWindows() : windows)}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.white}
        />
      </View>

      {useWindows ? (
        <>
          {windows.map((w, i) => (
            <View key={i} style={styles.windowRow}>
              <Pressable
                style={styles.timeBtn}
                onPress={() => setPick({ index: i, field: 'start' })}
              >
                <Text style={styles.timeText}>{w.start}</Text>
              </Pressable>
              <Text style={styles.dash}>–</Text>
              <Pressable
                style={styles.timeBtn}
                onPress={() => setPick({ index: i, field: 'end' })}
              >
                <Text style={styles.timeText}>{w.end}</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`${w.start} penceresini sil`}
                style={styles.deleteBtn}
                onPress={() => removeWindow(i)}
              >
                <Text style={styles.deleteText}>×</Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            disabled={windows.length >= 5}
            style={[styles.addBtn, windows.length >= 5 && styles.addBtnDisabled]}
            onPress={() => {
              const base = windows.length ? windows[windows.length - 1].end : '08:00';
              onChange(true, [
                ...windows,
                { start: base, end: fromMinOffset(base) },
              ]);
            }}
          >
            <Text style={styles.addText}>+ Pencere Ekle</Text>
          </Pressable>
          {pick ? (
            <DateTimePicker
              value={toDate(pick.field === 'start' ? windows[pick.index].start : windows[pick.index].end)}
              mode="time"
              is24Hour
              display="clock"
              onChange={onTimeChange}
            />
          ) : null}
          <Text style={styles.hint}>
            Gece yarısını aşan aralıklar da çalışır (ör. 22:00–02:00).
          </Text>
        </>
      ) : null}
    </View>
  );
}

function defaultWindows(): SmokeWindow[] {
  return [
    { start: '08:00', end: '09:00' },
    { start: '18:00', end: '20:00' },
  ];
}

function fromMinOffset(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = (h * 60 + m + 60) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggleInfo: { flex: 1 },
  title: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: fontSizes.sm + 4,
  },
  windowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
  },
  timeText: {
    fontSize: fontSizes.md,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  dash: { fontSize: fontSizes.lg, color: colors.textMuted },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  deleteText: { fontSize: fontSizes.lg, color: colors.danger, lineHeight: 30 },
  addBtn: {
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },
  addText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.primaryDark },
  hint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
});