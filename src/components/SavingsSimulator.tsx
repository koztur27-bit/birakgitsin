import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { showRewardedUnlockAd } from '../lib/ads';
import { hasProAccess } from '../lib/proAccess';
import { useTheme } from '../context/ThemeContext';
import {
  cigarettesAvoided,
  dailyGoal,
  dayKey,
  formatMoney,
  pricePerCigarette,
  todayKey,
  totalMoneySaved,
} from '../lib/calculations';
import { DayRecord, Plan } from '../types';
import { fontSizes, radius, spacing } from '../theme';
import { Card } from './Card';

type SavingsSimulatorProps = {
  plan: Plan;
  logs: DayRecord[];
};

const HORIZONS = [
  { key: '1w', label: '1 hafta', days: 7 },
  { key: '1m', label: '1 ay', days: 30 },
  { key: '3m', label: '3 ay', days: 90 },
  { key: '6m', label: '6 ay', days: 180 },
  { key: '1y', label: '1 yıl', days: 365 },
] as const;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function SavingsSimulator({ plan, logs }: SavingsSimulatorProps) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { data, grantProUnlock24h } = useApp();
  const proAllowed = hasProAccess(data);
  const [unlocking, setUnlocking] = useState(false);

  const requestProOrAd = (onUnlocked?: () => void) => {
    if (proAllowed) {
      onUnlocked?.();
      return;
    }
    Alert.alert(
      'PRO Özellik',
      'Gelişmiş simülatör senaryoları PRO kullanıcılarına özeldir. İstersen kısa bir reklam izleyerek bu özelliği 24 saat ücretsiz açabilirsin.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kısa Reklam İzle ve 24 Saat Aç',
          onPress: async () => {
            if (unlocking) return;
            setUnlocking(true);
            try {
              const res = await showRewardedUnlockAd();
              if (res.rewarded) {
                grantProUnlock24h();
                Alert.alert('Erişim açıldı', 'Gelişmiş simülatör senaryoları 24 saat boyunca açık.');
                onUnlocked?.();
              } else if (res.message) {
                Alert.alert('Reklam', res.message);
              }
            } finally {
              setUnlocking(false);
            }
          },
        },
      ],
    );
  };

  const today = todayKey();
  const baseline = Math.max(0, plan.baselinePerDay);
  const currentGoalToday = dailyGoal(plan, today, logs);
  const [mode, setMode] = useState<'goal' | 'custom'>('goal');
  const [customPerDay, setCustomPerDay] = useState<number>(currentGoalToday);

  const baseAvoided = cigarettesAvoided(plan, logs);
  const baseSaved = totalMoneySaved(plan, logs);
  const cpc = pricePerCigarette(plan);

  const projections = useMemo(() => {
    const todayDate = new Date();
    const start = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
    return HORIZONS.map((h) => {
      let futureAvoided = 0;
      for (let i = 1; i <= h.days; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const key = dayKey(d);
        let smoked: number;
        if (mode === 'goal') {
          smoked = dailyGoal(plan, key, logs);
        } else {
          smoked = clamp(customPerDay, 0, baseline);
        }
        smoked = clamp(Math.round(smoked), 0, baseline);
        futureAvoided += Math.max(0, baseline - smoked);
      }
      const totalAvoided = baseAvoided + futureAvoided;
      const totalSaved = baseSaved + futureAvoided * cpc;
      return { ...h, futureAvoided, totalAvoided, totalSaved };
    });
  }, [plan, logs, mode, customPerDay, baseline, baseAvoided, baseSaved, cpc]);

  const activePerDay = mode === 'goal' ? null : clamp(customPerDay, 0, baseline);
  const fewerThanBaseline =
    activePerDay !== null ? Math.max(0, baseline - activePerDay) : null;

  const adjust = (delta: number) => {
    const apply = () => {
      setMode('custom');
      setCustomPerDay((v) => clamp(Math.round(v + delta), 0, baseline));
    };
    if (!proAllowed) {
      requestProOrAd(apply);
      return;
    }
    apply();
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Gelecek Birikim Simülatörü</Text>
      <Text style={styles.subtitle}>
        Mevcut planın ve bugüne kadarki gerçek ilerlemene göre ileriye dönük tahmini birikim.
        Simülasyon gerçek kayıtlarını değiştirmez.
      </Text>

      <View style={styles.currentBox}>
        <Text style={styles.currentLabel}>Şu ana kadar</Text>
        <Text style={styles.currentValue}>
          {formatMoney(baseSaved, plan.currency)} · {Math.round(baseAvoided)} sigara içmedin
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Ne olursa? (tahmin)</Text>
      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeBtn, mode === 'goal' && styles.modeBtnActive]}
          onPress={() => setMode('goal')}
        >
          <Text style={[styles.modeBtnText, mode === 'goal' && styles.modeBtnTextActive]}>
            Hedefe tam uy
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeBtn, mode === 'custom' && styles.modeBtnActive, !proAllowed && styles.modeBtnLocked]}
          onPress={() => {
            if (!proAllowed) {
              requestProOrAd(() => setMode('custom'));
              return;
            }
            setMode('custom');
          }}
        >
          <Text style={[styles.modeBtnText, mode === 'custom' && styles.modeBtnTextActive]}>
            {proAllowed ? 'Kendim belirleyeyim' : 'Kendim belirleyeyim 🔒'}
          </Text>
        </Pressable>
      </View>

      {!proAllowed ? (
        <Text style={styles.customHint}>
          Gelişmiş &quot;kendim belirleyeyim&quot; senaryosu PRO özelliğidir. İstersen kısa reklam izleyerek 24 saat açabilirsin.
        </Text>
      ) : null}

      {mode === 'custom' ? (
        <View style={styles.customBox}>
          <Text style={styles.customLabel}>
            Günde içilen (tahmini): <Text style={styles.customStrong}>{clamp(customPerDay, 0, baseline)}</Text> adet
          </Text>
          {fewerThanBaseline !== null ? (
            <Text style={styles.customHint}>
              Başlangıcına göre günde {fewerThanBaseline} adet daha az.
            </Text>
          ) : null}
          <View style={styles.adjustRow}>
            <Pressable style={styles.adjustBtn} onPress={() => adjust(-1)}>
              <Text style={styles.adjustBtnText}>-1</Text>
            </Pressable>
            <Pressable style={styles.adjustBtn} onPress={() => adjust(+1)}>
              <Text style={styles.adjustBtnText}>+1</Text>
            </Pressable>
            <Pressable style={styles.adjustBtn} onPress={() => adjust(-5)}>
              <Text style={styles.adjustBtnText}>-5</Text>
            </Pressable>
            <Pressable
              style={styles.adjustBtnWide}
              onPress={() => {
                const apply = () => {
                  setMode('custom');
                  setCustomPerDay(currentGoalToday);
                };
                if (!proAllowed) {
                  requestProOrAd(apply);
                  return;
                }
                apply();
              }}
            >
              <Text style={styles.adjustBtnText}>Bugünkü hedef</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Text style={styles.customHint}>
          Her gün planındaki hedefe uyduğunu varsayar (bugünkü hedefin {currentGoalToday}).
        </Text>
      )}

      <View style={styles.table}>
        {projections.map((p) => (
          <View key={p.key} style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>{p.label}</Text>
              <Text style={styles.rowSub}>+{Math.round(p.futureAvoided)} sigara içilmez</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{formatMoney(p.totalSaved, plan.currency)}</Text>
              <Text style={styles.rowSubRight}>toplam {Math.round(p.totalAvoided)} sigara</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.note}>
        Not: “Hedefe tam uy” seçeneği mevcut plan/hedef akışına göre tahmin eder. Gerçek sonuçların
        içim ve hedef değişimlerine göre farklılaşabilir.
      </Text>
    </Card>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    card: { gap: spacing.sm },
    title: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: fontSizes.xs, color: colors.textMuted, lineHeight: 18 },
    currentBox: {
      backgroundColor: colors.primarySoft,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: 2,
    },
    currentLabel: { fontSize: fontSizes.xs, color: colors.primaryDark, fontWeight: '700' },
    currentValue: { fontSize: fontSizes.md, color: colors.primaryDark, fontWeight: '800' },
    sectionLabel: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.text, marginTop: 2 },
    modeRow: { flexDirection: 'row', gap: spacing.sm },
    modeBtn: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      backgroundColor: colors.bg,
    },
    modeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    modeBtnLocked: { borderStyle: 'dashed' },
    modeBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textMuted },
    modeBtnTextActive: { color: colors.white },
    customBox: { gap: 6 },
    customLabel: { fontSize: fontSizes.sm, color: colors.text },
    customStrong: { fontWeight: '800', color: colors.primaryDark },
    customHint: { fontSize: fontSizes.xs, color: colors.textMuted, lineHeight: 18 },
    adjustRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
    adjustBtn: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    adjustBtnWide: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    adjustBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.text },
    table: { marginTop: 2, gap: 0 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      gap: spacing.sm,
    },
    rowLeft: { flex: 1 },
    rowRight: { alignItems: 'flex-end' },
    rowLabel: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.text },
    rowSub: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 1 },
    rowSubRight: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 1 },
    rowValue: { fontSize: fontSizes.md, fontWeight: '800', color: colors.primaryDark },
    note: { fontSize: 11, color: colors.textMuted, lineHeight: 16, marginTop: 2 },
  });
