import { useTheme } from '../context/ThemeContext';
import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { MapBadge } from '../components/MapBadge';
import { ProgressBar } from '../components/ProgressBar';
import { WithdrawalGuide } from '../components/WithdrawalGuide';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { detectRegion, supportLines } from '../lib/regionalSupport';
import {
  bodyRenewalMap,
  BodyRenewalOrganId,
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
  const { t, locale } = useI18n();
  const plan = data.plan;
  const isEn = (data.language || locale || 'tr') === 'en';
  const region = detectRegion();
  const support = supportLines(region, isEn ? 'en' : 'tr');

  // Yüzdeler bırakma süresine bağlı olduğu için ekran açıkken canlı güncellenir.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const [selectedOrgan, setSelectedOrgan] = useState<BodyRenewalOrganId | null>(null);

  const metrics = useMemo(() => (plan ? healthRecovery(plan, now) : []), [plan, now]);
  const organs = useMemo(() => (plan ? bodyRenewalMap(plan, now) : []), [plan, now]);
  const elapsed = plan ? elapsedDays(plan, now) : 0;
  const overall = metrics.length
    ? Math.round(metrics.reduce((sum, m) => sum + m.percent, 0) / metrics.length)
    : 0;
  const [nextMilestone] = milestones().filter((m) => m.days > elapsed);

  if (!plan) return null;

  const metricColors = [colors.danger, colors.accent, colors.primary, colors.success];

  const organStageText = (id: BodyRenewalOrganId, percent: number): string => {
    if (percent >= 100) return t(`health.bodyMapOrgans.${id}.done`);
    if (percent >= 60) return t(`health.bodyMapOrgans.${id}.late`);
    if (percent >= 25) return t(`health.bodyMapOrgans.${id}.mid`);
    return t(`health.bodyMapOrgans.${id}.early`);
  };

  const selected = selectedOrgan ? organs.find((o) => o.id === selectedOrgan) : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.titleRow}><MapBadge code="9" /><Text style={styles.title}>Sağlık Durumum</Text></View>
          <Text style={styles.subtitle}>Bırakmaya başladıktan sonra geçirdiğin süre</Text>
        </View>

        <Text style={{fontSize:11,color:'#64748B',paddingHorizontal:4,paddingBottom:8,lineHeight:15}}>
          {isEn
            ? 'This app does not provide medical advice, diagnosis, or treatment. Consult a healthcare professional for health decisions.'
            : 'Bu uygulama tibbi tavsiye, teshis veya tedavi sunmaz. Saglik kararlariniz icin bir saglik uzmanina danisin.'}
        </Text>

        {support.map((ln) => (
          <Pressable key={ln.id} onPress={() => { if (ln.action === 'call') { try { Linking.openURL('tel:' + ln.number.replace(/\s/g, '')); } catch {} } else if (ln.url) { try { Linking.openURL(ln.url); } catch {} } }} style={{padding:12,borderRadius:12,backgroundColor:'#FEE2E2',marginBottom:8}} accessibilityRole="button" accessibilityLabel={ln.label}>
            <Text style={{fontWeight:'800',color:'#991B1B'}}>{ln.label}</Text>
            <Text style={{color:'#7F1D1D',fontSize:12,marginTop:2}}>{ln.number}</Text>
          </Pressable>
        ))}

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
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>{t('health.bodyMapTitle')}</Text>
            <Text style={styles.sectionSub}>{t('health.bodyMapSubtitle')}</Text>
          </View>
          <Text style={styles.sectionHint}>canlı</Text>
        </View>

        <View style={styles.organGrid}>
          {organs.map((organ) => {
            const done = organ.percent >= 100;
            return (
              <Pressable
                key={organ.id}
                style={({ pressed }) => [
                  styles.organCard,
                  done && styles.organCardDone,
                  pressed && { opacity: 0.9 },
                ]}
                onPress={() => setSelectedOrgan(organ.id)}
              >
                <Text style={styles.organEmoji}>{organ.emoji}</Text>
                <Text style={styles.organTitle} numberOfLines={2}>
                  {t(`health.bodyMapOrgans.${organ.id}.title`)}
                </Text>
                <Text style={[styles.organPercent, done && { color: '#059669' }]}>%{organ.percent}</Text>
                <View style={styles.organBarWrap}>
                  <View
                    style={[
                      styles.organBarFill,
                      { width: `${organ.percent}%`, backgroundColor: done ? '#10B981' : colors.primary },
                    ]}
                  />
                </View>
                <Text style={styles.organTap}>{t('health.bodyMapTap')}</Text>
              </Pressable>
            );
          })}
        </View>

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

        <View style={styles.note}>
          <Text style={styles.noteText}>
            {isEn
              ? 'These percentages show estimated progress based on your smoke-free time in the app. They are for general motivation and personal tracking, not a medical measurement or diagnosis.'
              : 'Bu yüzdeler, uygulamadaki bırakma sürene göre hesaplanan tahmini ilerlemeyi gösterir. Genel motivasyon ve kişisel takip amaçlıdır; tıbbi ölçüm veya tanı değildir.'}
          </Text>
        </View>

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Yoksunluk Belirtisi Rehberi</Text>
        </View>
        <WithdrawalGuide />
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelectedOrgan(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedOrgan(null)} />
          {selected ? (
            <View style={styles.modalCard}>
              <View style={styles.modalHead}>
                <Text style={styles.modalEmoji}>{selected.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{t(`health.bodyMapOrgans.${selected.id}.title`)}</Text>
                  <Text style={styles.modalPercent}>%{selected.percent} · {t('health.bodyMapProgress')}</Text>
                </View>
              </View>
              <View style={styles.modalBarBg}>
                <View
                  style={[
                    styles.modalBarFill,
                    { width: `${selected.percent}%`, backgroundColor: selected.percent >= 100 ? '#10B981' : colors.primary },
                  ]}
                />
              </View>
              <Text style={styles.modalSection}>{t('health.bodyMapCurrent')}</Text>
              <Text style={styles.modalText}>{organStageText(selected.id, selected.percent)}</Text>
              <Text style={styles.modalSection}>
                {selected.percent >= 100 ? t('health.bodyMapComplete') : t('health.bodyMapRemaining', { time: formatUntil(selected.remainingDays) })}
              </Text>
              {selected.percent < 100 ? (
                <Text style={styles.modalText}>
                  {isEn
                    ? `About ${Math.max(0, Math.ceil(selected.remainingDays))} day(s) to reach 100% for this milestone (based on ${selected.targetDays} days target).`
                    : `Bu hedefte %100 için yaklaşık ${Math.max(0, Math.ceil(selected.remainingDays))} gün kaldı (${selected.targetDays} günlük hedef).`}
                </Text>
              ) : null}
              <Pressable style={styles.modalCloseBtn} onPress={() => setSelectedOrgan(null)}>
                <Text style={styles.modalCloseText}>{t('health.bodyMapClose')}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  header: { gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
    gap: spacing.sm,
  },
  sectionTitle: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
  sectionSub: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  sectionHint: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.success,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  organGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  organCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  organCardDone: { borderColor: '#34D399', backgroundColor: '#ECFDF5' },
  organEmoji: { fontSize: 30 },
  organTitle: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.text, textAlign: 'center', minHeight: 36 },
  organPercent: { fontSize: fontSizes.lg, fontWeight: '900', color: colors.primaryDark },
  organBarWrap: { width: '100%', height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  organBarFill: { height: '100%', borderRadius: 4 },
  organTap: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: '600' },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  modalHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  modalEmoji: { fontSize: 36 },
  modalTitle: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
  modalPercent: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.primaryDark, marginTop: 2 },
  modalBarBg: { height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden', marginVertical: 4 },
  modalBarFill: { height: '100%', borderRadius: 5 },
  modalSection: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.text, marginTop: spacing.xs },
  modalText: { fontSize: fontSizes.sm, color: colors.textMuted, lineHeight: 20 },
  modalCloseBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalCloseText: { color: colors.white, fontWeight: '800', fontSize: fontSizes.md },
});
