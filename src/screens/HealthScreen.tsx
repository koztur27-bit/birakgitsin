import { useTheme } from '../context/ThemeContext';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { useApp } from '../context/AppContext';
import {
  elapsedDays,
  formatDuration,
  formatUntil,
  healthRecovery,
  milestones,
} from '../lib/calculations';
import { fontSizes, radius, shadows, spacing } from '../theme';

export function HealthScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { data } = useApp();
  const plan = data.plan;

  // Yüzdeler bırakma süresine bağlı olduğu için ekran açıkken canlı güncellenir.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const metrics = useMemo(() => (plan ? healthRecovery(plan, now) : []), [plan, now]);
  const elapsed = plan ? elapsedDays(plan, now) : 0;
  const overall = metrics.length
    ? Math.round(metrics.reduce((sum, m) => sum + m.percent, 0) / metrics.length)
    : 0;
  const [nextMilestone] = milestones().filter((m) => m.days > elapsed);

  if (!plan) return null;

  const metricColors = [colors.danger, colors.accent, colors.primary, colors.success];

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Sağlık Durumum</Text>
          <Text style={styles.subtitle}>Bırakmaya başladıktan sonra geçirdiğin süre</Text>
        </View>

        <Card style={styles.overviewCard}>
          <View style={styles.overviewTop}>
            <View>
              <Text style={styles.overviewLabel}>Genel iyileşme</Text>
              <Text style={styles.overviewTime}>{formatDuration(elapsed)}</Text>
            </View>
            <Text style={styles.overviewPercent}>%{overall}</Text>
          </View>
          <ProgressBar progress={overall / 100} color={colors.success} height={10} />
          <Text style={styles.overviewHint}>
            Dört kazanımın ortalama ilerlemesi. Her biri kendi süresinde tamamlanır.
          </Text>
        </Card>

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Kazanımlar</Text>
          <Text style={styles.sectionHint}>canlı</Text>
        </View>

        {metrics.map((metric, index) => {
          const color = metricColors[index % metricColors.length];
          return (
            <Card key={metric.key} style={styles.metricCard}>
              <View style={styles.metricTop}>
                <View style={styles.metricTitleRow}>
                  <Text style={styles.metricEmoji}>{metric.emoji}</Text>
                  <View>
                    <Text style={styles.metricLabel}>{metric.label}</Text>
                    <Text style={styles.metricTarget}>{metric.targetLabel} hedefi</Text>
                  </View>
                </View>
                <Text style={[styles.metricPercent, { color }]}>%{metric.percent}</Text>
              </View>
              <ProgressBar progress={metric.percent / 100} color={color} height={10} />
              <Text style={styles.metricDetail}>{metric.detail}</Text>
            </Card>
          );
        })}

        <Card style={styles.nextCard}>
          <Text style={styles.nextLabel}>Sıradaki sağlık kazancı</Text>
          {nextMilestone ? (
            <>
              <Text style={styles.nextTitle}>
                {nextMilestone.emoji} {nextMilestone.label}
              </Text>
              <Text style={styles.nextDetail}>{nextMilestone.detail}</Text>
              <Text style={styles.nextTime}>
                {formatUntil(nextMilestone.days - elapsed)} sonra
              </Text>
            </>
          ) : (
            <Text style={styles.nextDetail}>
              🎉 Bugüne kadar tüm büyük sağlık kilometre taşlarını geçtin.
            </Text>
          )}
        </Card>

        <View style={styles.note}>
          <Text style={styles.noteText}>
            Bu yüzdeler, uygulamadaki bırakma sürene göre hesaplanan tahmini ilerlemeyi
            gösterir. Tıbbi bir ölçüm veya tanı değildir.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  header: { gap: 2 },
  title: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: fontSizes.sm, color: colors.textMuted },
  overviewCard: { gap: spacing.sm, ...shadows.card },
  overviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overviewLabel: { fontSize: fontSizes.sm, color: colors.textMuted, fontWeight: '600' },
  overviewTime: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  overviewPercent: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: colors.success,
  },
  overviewHint: { fontSize: fontSizes.xs, color: colors.textMuted, lineHeight: 18 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionTitle: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
  sectionHint: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.success,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  metricCard: { gap: spacing.sm },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metricEmoji: { fontSize: 28 },
  metricLabel: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text },
  metricTarget: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  metricPercent: { fontSize: fontSizes.xl, fontWeight: '800' },
  metricDetail: { fontSize: fontSizes.sm, color: colors.textMuted, lineHeight: 20 },
  nextCard: { gap: 2 },
  nextLabel: { fontSize: fontSizes.sm, color: colors.textMuted, fontWeight: '600' },
  nextTitle: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text, marginTop: spacing.xs },
  nextDetail: { fontSize: fontSizes.sm, color: colors.textMuted, lineHeight: 20 },
  nextTime: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: spacing.sm,
  },
  note: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noteText: { fontSize: fontSizes.xs, color: colors.textMuted, lineHeight: 18 },
});
