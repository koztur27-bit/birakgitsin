import { useTheme } from '../context/ThemeContext';
import React, { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarGrid } from '../components/CalendarGrid';
import { Card } from '../components/Card';
import { SavingsSimulator } from '../components/SavingsSimulator';
import { SuccessShareCard, SuccessShareCardHandle } from '../components/SuccessShareCard';
import { ProgressBar } from '../components/ProgressBar';
import { WeekChart } from '../components/WeekChart';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { badgeDefs } from '../lib/badges';
import { analyzeTriggers, adviceForTrigger, triggerLabel, formatHourRange } from '../lib/triggerAnalysis';
import { computeMedals } from '../lib/medals';
import {
  averageIntensity,
  buildDaysStat,
  cigarettesAvoided,
  cravingHours,
  dailyGoal,
  daysSinceStart,
  doctorSummary,
  elapsedDays,
  formatDayShort,
  formatDuration,
  formatMoney,
  formatMoneyShort,
  formatUntil,
  getLog,
  milestones,
  riskiestHours,
  topTriggerCounts,
  totalMoneySaved,
  totalSmoked,
  todayKey,
  weeklyReport,
} from '../lib/calculations';
import { fontSizes, radius, spacing } from '../theme';

const MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

export function StatsScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { data } = useApp();
  const { t, locale } = useI18n();
  const plan = data.plan;
  const shareCardRef = useRef<SuccessShareCardHandle>(null);
  const shareSuccess = async () => {
    await shareCardRef.current?.share();
  };
  const now = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const cursor = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);

  if (!plan) return null;

  const week = buildDaysStat(plan, data.logs, 7);
  const avg = week.reduce((s, d) => s + d.smoked, 0) / week.length;
  const days = daysSinceStart(plan);
  const saved = totalMoneySaved(plan, data.logs);
  const avoided = cigarettesAvoided(plan, data.logs);
  const triggerMap = analyzeTriggers(data.cravings, data.slipLogs ?? []);
  const medals = computeMedals(data);
  const shareChallenge = async () => {
    try {
      const msg = t('medals.challengeMsg', {
        days: Math.max(0, days),
        saved: formatMoney(saved, plan.currency),
      });
      await Share.share({ title: t('medals.challengeTitle'), message: msg });
    } catch {
      Alert.alert(t('alerts.error') || 'Hata', locale === 'en' ? 'Could not share right now.' : 'Şu anda paylaşım açılamadı.');
    }
  };
  const smoked = totalSmoked(data.logs);
  const list = milestones();
  const todayRecord = getLog(data.logs, todayKey());

  const monthPrefix = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
  const monthLogs = data.logs.filter((l) => l.date.startsWith(monthPrefix));
  const monthSmoked = monthLogs.reduce((s, l) => s + l.smoked, 0);
  const monthOK = monthLogs.filter((l) => l.smoked <= dailyGoal(plan, l.date, data.logs)).length;
  const monthOver = monthLogs.filter((l) => l.smoked > dailyGoal(plan, l.date, data.logs)).length;
  const officialDaysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const badges = data.badges ?? [];
  const badgesWon = badges.length;
  const elapsed = elapsedDays(plan);
  const reachedCount = list.filter((m) => elapsed >= m.days).length;
  const nextHealth = list[reachedCount];
  const prevHealthDays = reachedCount > 0 ? list[reachedCount - 1].days : 0;
  const healthProgress = nextHealth
    ? Math.min(1, Math.max(0, (elapsed - prevHealthDays) / (nextHealth.days - prevHealthDays)))
    : 1;
  const riskHours = riskiestHours(data.cravings, 3);
  const riskMax = riskHours.length ? riskHours[0].count : 1;
  const triggers = topTriggerCounts(data.cravings, 4);
  const hourHist = cravingHours(data.cravings);
  const avgIntensity = averageIntensity(data.cravings);
  const report = weeklyReport(plan, data.logs, data.cravings);

  const shareWeekly = async () => {
    try {
      await Share.share({
        title: 'Bırak Gitsin — haftalık rapor',
        message: [
          `Bırak Gitsin · ${report.startKey} – ${report.endKey}`,
          `${report.headline}: ${report.metDays}/${report.loggedDays} gün hedefi tuttun.`,
          `Ortalama ${report.averageSmoked.toFixed(1)} sigara/gün (hedef ${report.averageGoal.toFixed(1)}).`,
          report.change !== null
            ? `Geçen haftaya göre günde ${Math.abs(report.change).toFixed(1)} sigara ${
                report.change <= 0 ? 'daha az' : 'daha fazla'
              }.`
            : null,
          `Tasarruf: ${formatMoney(report.saved, plan.currency)}.`,
          report.cravings
            ? `Krizlerde ${report.resisted}/${report.cravings} kez dayandın (%${report.resistedRate}).`
            : null,
          report.topTrigger ? `En sık tetikleyici: ${report.topTrigger}.` : null,
          '',
          'Bırak Gitsin ile sigarayı azaltıyorum.',
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } catch {
      Alert.alert('Paylaşılamadı', 'Şu anda paylaşım ekranı açılamadı.');
    }
  };

  const shareDoctor = async () => {
    try {
      await Share.share({
        title: 'Bırak Gitsin — doktor/eczacı özeti',
        message: doctorSummary(plan, data.logs, data.cravings),
      });
    } catch {
      Alert.alert('Paylaşılamadı', 'Şu anda paylaşım ekranı açılamadı.');
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>İstatistikler</Text>
          <Pressable style={styles.shareSuccessBtn} onPress={shareSuccess}>
            <Text style={styles.shareSuccessBtnText}>Başarımı Paylaş</Text>
          </Pressable>
        </View>

        <Card style={styles.coachCard}>
          <View style={styles.coachHead}>
            <View style={styles.coachHeadText}>
              <Text style={styles.cardLabel}>Haftalık koç raporu</Text>
              <Text style={styles.coachHeadline}>{report.headline}</Text>
            </View>
            <View style={styles.coachBadge}>
              <Text style={styles.coachBadgeValue}>
                {report.loggedDays ? `${report.metDays}/${report.loggedDays}` : '—'}
              </Text>
              <Text style={styles.coachBadgeLabel}>hedef</Text>
            </View>
          </View>

          <View style={styles.coachMetrics}>
            <View style={styles.coachMetric}>
              <Text style={styles.coachMetricValue}>
                {report.loggedDays ? report.averageSmoked.toFixed(1) : '—'}
              </Text>
              <Text style={styles.coachMetricLabel}>sigara/gün</Text>
            </View>
            <View style={styles.coachMetric}>
              <Text style={styles.coachMetricValue}>
                {report.cravings ? `${report.resisted}/${report.cravings}` : '—'}
              </Text>
              <Text style={styles.coachMetricLabel}>krizde dayandın</Text>
            </View>
            <View style={styles.coachMetric}>
              <Text style={styles.coachMetricValue}>
                {formatMoneyShort(report.saved, plan.currency)}
              </Text>
              <Text style={styles.coachMetricLabel}>bu hafta tasarruf</Text>
            </View>
          </View>

          <Text style={styles.coachSuggestion}>{report.suggestion}</Text>

          {report.bestDay && report.hardestDay ? (
            <Text style={styles.coachMeta}>
              En iyi gün {formatDayShort(report.bestDay.date)} ({report.bestDay.smoked}) · en zor
              gün {formatDayShort(report.hardestDay.date)} ({report.hardestDay.smoked})
            </Text>
          ) : null}

          <View style={styles.shareRow}>
            <Pressable
              accessibilityRole="button"
              onPress={shareWeekly}
              style={[styles.shareBtn, styles.shareBtnPrimary]}
            >
              <Text style={[styles.shareBtnText, styles.shareBtnTextPrimary]}>
                Raporu paylaş
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={shareDoctor} style={styles.shareBtn}>
              <Text style={styles.shareBtnText}>Doktor özeti</Text>
            </Pressable>
          </View>
        </Card>

        <View style={styles.grid}>
          <Card style={styles.gridCard}>
            <Text style={styles.cardLabel}>Toplam tasarruf</Text>
            <Text style={styles.bigMoney}>{formatMoney(saved, plan.currency)}</Text>
            <Text style={styles.cardHint}>{plan.currency} karşılığı içilmeyen sigara</Text>
          </Card>
          <Card style={styles.gridCard}>
            <Text style={styles.cardLabel}>İçmediğin sigara</Text>
            <Text style={styles.bigNumber}>{avoided}</Text>
            <Text style={styles.cardHint}>
              {formatDuration(days)} boyunca {smoked} adet içtin
            </Text>
          </Card>
        </View>

        <SavingsSimulator plan={plan} logs={data.logs} />

        <Card>
          <Text style={styles.cardLabel}>Son 7 gün</Text>
          <WeekChart stats={week} />
          <Text style={styles.avgText}>
            Son 7 günün ortalaması: {avg.toFixed(1)} sigara / gün
          </Text>
        </Card>

        <Card>
          <View style={styles.monthHead}>
            <Pressable
              onPress={() => setMonthOffset(monthOffset - 1)}
              style={styles.monthNav}
              hitSlop={8}
            >
              <Text style={styles.monthNavText}>‹</Text>
            </Pressable>
            <Text style={styles.monthTitle}>
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </Text>
            <Pressable
              onPress={() => setMonthOffset(monthOffset + 1)}
              style={styles.monthNav}
              hitSlop={8}
              disabled={monthOffset >= 0}
            >
              <Text
                style={[styles.monthNavText, monthOffset >= 0 && styles.monthNavDisabled]}
              >
                ›
              </Text>
            </Pressable>
          </View>
          <Text style={styles.calendarLegend}>
            <Text style={{ color: colors.success, fontWeight: '800' }}>yeşil</Text> hedef
            altı · <Text style={{ color: colors.danger, fontWeight: '800' }}>kırmızı</Text>{' '}
            hedef üstü · çerçeve bugün
          </Text>
          <View style={styles.calendarWrap}>
            <CalendarGrid
              plan={plan}
              logs={data.logs}
              year={cursor.getFullYear()}
              month={cursor.getMonth()}
            />
          </View>
          {monthSmoked > 0 ? (
            <Text style={styles.avgText}>
              {MONTHS[cursor.getMonth()]} özeti: {monthSmoked} sigara içildi ·{' '}
              {monthOK} gün hedefin altında · {monthOver} gün üstünde ·
              {monthLogs.length > 0
                ? ` ortalama ${(monthSmoked / monthLogs.length).toFixed(1)} /gün`
                : ''}
            </Text>
          ) : (
            <Text style={styles.avgText}>Bu ay şimdilik kayıt yok.</Text>
          )}
          <Text style={styles.calendarHint}>
            {Math.round((monthOK / Math.max(1, officialDaysInMonth)) * 100)}% hedefi
            tutturma oranı (ay başına göre)
          </Text>
        </Card>

        <Card>
          <Text style={styles.cardLabel}>Rozetlerim</Text>
          <Text style={styles.cardHint}>
            {badgesWon} / {badgeDefs().length} rozet kazandın. Rozet kazanınca kutlama
            bildirimi alırsın.
          </Text>
          <View style={styles.badgeGrid}>
            {badgeDefs().map((b) => {
              const won = badges.includes(b.id);
              return (
                <View key={b.id} style={[styles.badge, won && styles.badgeWon]}>
                  <Text style={styles.badgeEmoji}>{won ? b.emoji : '🔒'}</Text>
                  <Text
                    style={[styles.badgeTitle, !won && styles.badgeTitleLocked]}
                    numberOfLines={2}
                  >
                    {b.title}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        <Card>
          <Text style={styles.cardLabel}>{t('medals.title')}</Text>
          <Text style={styles.cardHint}>{t('medals.subtitle')}</Text>
          <View style={styles.medalGrid}>
            {medals.map((m) => {
              const def = (t('medals.list') as any)[m.id] || { title: m.id, desc: '' };
              const pct = Math.round(m.progress * 100);
              return (
                <View key={m.id} style={[styles.medalCard, m.earned ? styles.medalCardEarned : styles.medalCardLocked]}>
                  <Text style={[styles.medalIcon, !m.earned && styles.medalIconLocked]}>{m.earned ? '🏅' : '🔒'}</Text>
                  <Text style={[styles.medalTitle, !m.earned && styles.medalTitleLocked]} numberOfLines={2}>{def.title}</Text>
                  <Text style={styles.medalDesc} numberOfLines={2}>{def.desc}</Text>
                  <View style={styles.medalProgressTrack}>
                    <View style={[styles.medalProgressFill, { width: `${pct}%`, backgroundColor: m.earned ? colors.success : colors.primary }]} />
                  </View>
                  <Text style={[styles.medalStatus, m.earned && styles.medalStatusEarned]}>
                    {m.earned ? t('medals.earned') : `${t('medals.progress')}: %${pct}`}
                  </Text>
                </View>
              );
            })}
          </View>
          <Pressable style={({ pressed }) => [styles.challengeBtn, pressed && { opacity: 0.85 }]} onPress={shareChallenge}>
            <Text style={styles.challengeBtnText}>{t('medals.challengeBtn')}</Text>
          </Pressable>
        </Card>

        <Card>
          <Text style={styles.cardLabel}>Sağlık kilometre taşları</Text>
          {nextHealth ? (
            <>
              <Text style={styles.healthNext}>
                Sıradaki: {nextHealth.emoji} {nextHealth.label} ·{' '}
                {formatUntil(nextHealth.days - elapsed)} kaldı
              </Text>
              <View style={styles.healthBar}>
                <ProgressBar progress={healthProgress} color={colors.primary} height={8} />
              </View>
            </>
          ) : (
            <Text style={styles.healthNext}>
              🎉 Tüm büyük sağlık kilometre taşlarını geçtin!
            </Text>
          )}
          <View style={styles.milestones}>
            {list.map((m) => {
              const reached = elapsed >= m.days;
              return (
                <View key={m.id} style={styles.milestoneRow}>
                  <View style={[styles.milestoneDot, reached && styles.milestoneDotDone]}>
                    {reached ? (
                      <Text style={styles.milestoneCheck}>✓</Text>
                    ) : (
                      <Text style={styles.milestoneEmoji}>{m.emoji}</Text>
                    )}
                  </View>
                  <View style={styles.milestoneBody}>
                    <Text
                      style={[
                        styles.milestoneLabel,
                        reached && styles.milestoneLabelDone,
                      ]}
                    >
                      {m.label}
                    </Text>
                    <Text style={styles.milestoneDetail}>{m.detail}</Text>
                  </View>
                  <Text style={[styles.milestoneFlag, reached && styles.milestoneFlagDone]}>
                    {reached ? 'kazanıldı' : 'bekliyor'}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        <Card>
          <Text style={styles.cardLabel}>İstek & tetik analizi</Text>
          {data.cravings.length === 0 ? (
            <Text style={styles.cardHint}>
              Kriz sekmesinde isteklerini kaydettikçe burada canının hangi saatlerde ve hangi
              durumlarda çektiğini göstereceğiz.
            </Text>
          ) : (
            <>
              <Text style={styles.analysisHead}>En riskli saatler</Text>
              {riskHours.map((r) => (
                <View key={r.hour} style={styles.riskRow}>
                  <Text style={styles.riskHour}>
                    {String(r.hour).padStart(2, '0')}:00–{String((r.hour + 1) % 24).padStart(2, '0')}
                    :00
                  </Text>
                  <View style={styles.riskBarWrap}>
                    <View
                      style={[
                        styles.riskBar,
                        { width: `${Math.max(8, (r.count / riskMax) * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.riskCount}>{r.count}×</Text>
                </View>
              ))}
              <Text style={styles.analysisHead}>En sık tetikleyiciler</Text>
              {triggers.length > 0 ? (
                <View style={styles.chipWrap}>
                  {triggers.map((t) => (
                    <View key={t.trigger} style={styles.triggerChip}>
                      <Text style={styles.triggerChipText}>
                        {t.trigger} · {t.count}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.cardHint}>Henüz tetikleyici işaretlenmedi.</Text>
              )}
              {avgIntensity != null ? (
                <Text style={styles.cardHint}>
                  Ortalama istek şiddeti: {avgIntensity.toFixed(1)} / 5
                </Text>
              ) : null}
              <Text style={styles.cardHint}>
                Toplam {hourHist.reduce((a, b) => a + b, 0)} istek kaydın var.
              </Text>
            </>
          )}
        </Card>

        <Card>
          <Text style={styles.cardLabel}>{t('triggerMap.title')}</Text>
          <Text style={styles.cardHint}>{t('triggerMap.subtitle')}</Text>
          {triggerMap.totalEvents === 0 ? (
            <Text style={[styles.cardHint, { marginTop: spacing.sm }]}>{t('triggerMap.noData')}</Text>
          ) : (
            <>
              <View style={styles.tmSummaryRow}>
                <View style={styles.tmSummaryBox}>
                  <Text style={styles.tmSummaryLabel}>{t('triggerMap.topTrigger')}</Text>
                  <Text style={styles.tmSummaryValue}>
                    {triggerMap.primary ? triggerLabel(triggerMap.primary.key, locale) : '—'}
                  </Text>
                </View>
                <View style={styles.tmSummaryBox}>
                  <Text style={styles.tmSummaryLabel}>{t('triggerMap.peakHours')}</Text>
                  <Text style={styles.tmSummaryValue}>
                    {triggerMap.peakRange ? formatHourRange(triggerMap.peakRange.start, triggerMap.peakRange.end) : '—'}
                  </Text>
                </View>
              </View>

              <Text style={styles.analysisHead}>{t('triggerMap.triggerCounts')}</Text>
              {(triggerMap.triggerEntries.length ? triggerMap.triggerEntries : []).map((e) => (
                <View key={e.key} style={styles.riskRow}>
                  <Text style={styles.riskHour}>{triggerLabel(e.key, locale)}</Text>
                  <View style={styles.riskBarWrap}>
                    <View
                      style={[
                        styles.riskBar,
                        { width: `${Math.max(8, (e.count / triggerMap.maxTrigger) * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.riskCount}>{e.count}×</Text>
                </View>
              ))}
              {triggerMap.triggerEntries.length === 0 ? (
                <Text style={styles.cardHint}>{t('triggerMap.noData')}</Text>
              ) : null}

              <Text style={styles.analysisHead}>{t('triggerMap.hourCounts')}</Text>
              {(triggerMap.hourEntries.length ? triggerMap.hourEntries : []).map((e) => (
                <View key={e.hour} style={styles.riskRow}>
                  <Text style={styles.riskHour}>
                    {String(e.hour).padStart(2, '0')}:00–{String((e.hour + 1) % 24).padStart(2, '0')}:00
                  </Text>
                  <View style={styles.riskBarWrap}>
                    <View
                      style={[
                        styles.riskBar,
                        { width: `${Math.max(8, (e.count / triggerMap.maxHour) * 100)}%`, backgroundColor: colors.danger },
                      ]}
                    />
                  </View>
                  <Text style={styles.riskCount}>{e.count}×</Text>
                </View>
              ))}
              {triggerMap.hourEntries.length === 0 ? (
                <Text style={styles.cardHint}>{t('triggerMap.slips')}: {triggerMap.slipCount} · {t('triggerMap.events', { count: triggerMap.totalEvents })}</Text>
              ) : null}

              <View style={styles.tmAdviceCard}>
                <Text style={styles.tmAdviceTitle}>{t('triggerMap.adviceTitle')}</Text>
                <Text style={styles.tmAdviceText}>
                  {adviceForTrigger(triggerMap.primary ? triggerMap.primary.key : 'other', locale)}
                </Text>
                <Text style={styles.tmAdviceMeta}>
                  {t('triggerMap.slips')}: {triggerMap.slipCount} · {t('triggerMap.events', { count: triggerMap.totalEvents })}
                </Text>
              </View>
            </>
          )}
        </Card>

        {todayRecord.smoked > 0 ? (
          <Text style={styles.tip}>
            Bugün {todayRecord.smoked} sigara içtin. Hedefin{' '}
            {dailyGoal(plan, todayKey(), data.logs)}.
            İstersen ana sayfadan gün içi kayıtlarını güncelleyebilirsin.
          </Text>
        ) : null}
      </ScrollView>
      <SuccessShareCard
        ref={shareCardRef}
        days={Math.max(0, Math.floor(elapsedDays(plan)))}
        avoided={Math.max(0, Math.round(avoided))}
        savedText={formatMoney(saved, plan.currency)}
      />
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.text,
  },
  shareSuccessBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.round,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  shareSuccessBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  grid: { flexDirection: 'row', gap: spacing.md },
  gridCard: { flex: 1 },
  coachCard: { borderWidth: 1, borderColor: colors.primarySoft },
  coachHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  coachHeadText: { flex: 1 },
  coachHeadline: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: 2,
  },
  coachBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachBadgeValue: { fontSize: fontSizes.md, fontWeight: '800', color: colors.primaryDark },
  coachBadgeLabel: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 1 },
  coachMetrics: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  coachMetric: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
  },
  coachMetricValue: {
    fontSize: fontSizes.md,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  coachMetricLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  coachSuggestion: {
    fontSize: fontSizes.sm,
    color: colors.text,
    lineHeight: 20,
    marginTop: spacing.md,
  },
  coachMeta: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  shareRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  shareBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  shareBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  shareBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textMuted },
  shareBtnTextPrimary: { color: colors.white },
  cardLabel: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontWeight: '600',
  },
  bigMoney: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.xs,
  },
  bigNumber: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: spacing.xs,
  },
  cardHint: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  avgText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  monthHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  monthNav: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavText: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
  monthNavDisabled: { opacity: 0.3 },
  monthTitle: {
    fontSize: fontSizes.md,
    fontWeight: '800',
    color: colors.text,
  },
  calendarLegend: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  calendarWrap: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  calendarHint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  badge: {
    width: 74,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 2,
    opacity: 0.55,
  },
  badgeWon: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    opacity: 1,
  },
  badgeEmoji: { fontSize: fontSizes.lg },
  badgeTitle: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  badgeTitleLocked: { color: colors.textMuted },
  healthNext: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: spacing.sm,
  },
  healthBar: { marginTop: spacing.sm },
  milestones: { marginTop: spacing.md, gap: spacing.md },
  milestoneRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  milestoneDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneDotDone: { backgroundColor: colors.success },
  milestoneCheck: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.white },
  milestoneEmoji: { fontSize: fontSizes.sm },
  analysisHead: {
    fontSize: fontSizes.sm,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  riskHour: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.text,
    width: 110,
  },
  riskBarWrap: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  riskBar: { height: '100%', backgroundColor: colors.accent, borderRadius: 6 },
  riskCount: {
    fontSize: fontSizes.sm,
    fontWeight: '800',
    color: colors.primaryDark,
    width: 34,
    textAlign: 'right',
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  triggerChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.round,
    backgroundColor: colors.primarySoft,
  },
  triggerChipText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.primaryDark },
  milestoneBody: { flex: 1 },
  milestoneLabel: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.text,
  },
  milestoneLabelDone: { color: colors.textMuted },
  milestoneDetail: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  milestoneFlag: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.textMuted,
  },
  milestoneFlagDone: { color: colors.success },
  tip: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  tmSummaryRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  tmSummaryBox: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tmSummaryLabel: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: '700' },
  tmSummaryValue: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.primaryDark, marginTop: 4 },
  tmAdviceCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft || colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tmAdviceTitle: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.text },
  tmAdviceText: { fontSize: fontSizes.sm, color: colors.text, lineHeight: 20, marginTop: spacing.xs },
  tmAdviceMeta: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: spacing.sm },
  medalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  medalCard: {
    width: '48%',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    gap: 4,
  },
  medalCardEarned: { backgroundColor: colors.primarySoft, borderColor: colors.primary, opacity: 1 },
  medalCardLocked: { opacity: 0.6 },
  medalIcon: { fontSize: 22 },
  medalIconLocked: { opacity: 0.7 },
  medalTitle: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.text },
  medalTitleLocked: { color: colors.textMuted },
  medalDesc: { fontSize: fontSizes.xs, color: colors.textMuted, lineHeight: 16 },
  medalProgressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden', marginTop: 4 },
  medalProgressFill: { height: '100%', borderRadius: 3 },
  medalStatus: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.textMuted, marginTop: 2 },
  medalStatusEarned: { color: colors.success },
  challengeBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  challengeBtnText: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.white },
});