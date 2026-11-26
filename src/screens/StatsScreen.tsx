import { useTheme } from '../context/ThemeContext';
import React, { useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarGrid } from '../components/CalendarGrid';
import { StreakCalendar } from '../components/StreakCalendar';
import { Card } from '../components/Card';
import { MapBadge } from '../components/MapBadge';
import { SavingsSimulator } from '../components/SavingsSimulator';
import {
  SuccessShareCard,
  SuccessShareCardHandle,
  ShareThemeId,
  useLocalizedShareThemes,
} from '../components/SuccessShareCard';
import { ProgressBar } from '../components/ProgressBar';
import { WeekChart } from '../components/WeekChart';
import { useApp } from '../context/AppContext';
import { AppLanguage, useI18n } from '../i18n';
import { badgeDefs } from '../lib/badges';
import { analyzeTriggers, adviceForTrigger, triggerLabel, formatHourRange } from '../lib/triggerAnalysis';
import { computeMedals } from '../lib/medals';
import { hasProAccess } from '../lib/proAccess';
import { ProScreen } from './ProScreen';
import {
  averageIntensity,
  buildDaysStat,
  cigarettesAvoided,
  cravingHours,
  dailyGoal,
  daysSinceStart,
  elapsedDays,
  healthElapsedDays,
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

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];
const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function StatsScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { data } = useApp();
  const { t, ta, locale } = useI18n();
  const plan = data.plan;
  const isEn = (data.language || locale || 'tr') === 'en';
  const lang = (data.language || locale || 'tr') as AppLanguage;

  const logs = Array.isArray(data.logs) ? data.logs : [];
  const cravings = Array.isArray(data.cravings) ? data.cravings : [];
  const slipLogs = Array.isArray(data.slipLogs) ? data.slipLogs : [];
  const badges = Array.isArray(data.badges) ? data.badges : [];

  const shareCardRef = useRef<SuccessShareCardHandle>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const openShareModal = () => setShareModalOpen(true);
  const doShareFromModal = async () => {
    await shareCardRef.current?.share();
  };

  const isPro = hasProAccess(data);
  const [proOpen, setProOpen] = useState(false);
  const openPro = () => {
    setShareModalOpen(false);
    setProOpen(true);
  };
  const localizedShareThemes = useLocalizedShareThemes();
  const [shareTheme, setShareTheme] = useState<ShareThemeId>('classic');
  const selectShareTheme = (themeId: ShareThemeId, proOnly: boolean) => {
    if (proOnly && !isPro) {
      openPro();
      return;
    }
    setShareTheme(themeId);
  };

  const now = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const cursor = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);

  if (!plan) return null;

  const week = buildDaysStat(plan, logs, 7);
  const avg = week.length ? week.reduce((s, d) => s + (d.smoked || 0), 0) / week.length : 0;
  const days = daysSinceStart(plan);
  const saved = totalMoneySaved(plan, logs);
  const avoided = cigarettesAvoided(plan, logs);
  const triggerMap = analyzeTriggers(cravings, slipLogs);
  const medals = computeMedals({ ...data, logs, cravings, slipLogs, badges } as any);
  const medalDefs = (ta('medals.list') as Record<string, { title: string; desc: string }>) || {};

  const shareChallenge = async () => {
    try {
      const msg = t('medals.challengeMsg', {
        days: Math.max(0, days),
        saved: formatMoney(saved, plan.currency),
      });
      await Share.share({ title: t('medals.challengeTitle'), message: msg });
    } catch {
      Alert.alert(t('alerts.error') || (isEn ? 'Error' : 'Hata'), isEn ? 'Could not share right now.' : 'Şu anda paylaşım açılamadı.');
    }
  };

  const smoked = totalSmoked(logs);
  const list = milestones(lang);
  const todayRecord = getLog(logs, todayKey());

  const monthPrefix = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
  const monthLogs = logs.filter((l) => l?.date?.startsWith(monthPrefix));
  const monthSmoked = monthLogs.reduce((s, l) => s + (l.smoked || 0), 0);
  const monthOK = monthLogs.filter((l) => (l.smoked || 0) <= dailyGoal(plan, l.date, logs)).length;
  const monthOver = monthLogs.filter((l) => (l.smoked || 0) > dailyGoal(plan, l.date, logs)).length;
  const officialDaysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const badgesWon = badges.length;
  const elapsed = healthElapsedDays(plan);
  const reachedCount = list.filter((m) => elapsed >= m.days).length;
  const nextHealth = list[reachedCount];
  const prevHealthDays = reachedCount > 0 ? list[reachedCount - 1].days : 0;
  const healthProgress = nextHealth
    ? Math.min(1, Math.max(0, (elapsed - prevHealthDays) / (nextHealth.days - prevHealthDays)))
    : 1;
  const riskHours = riskiestHours(cravings, 3);
  const riskMax = riskHours.length ? riskHours[0].count : 1;
  const triggers = topTriggerCounts(cravings, 4);
  const hourHist = cravingHours(cravings);
  const avgIntensity = averageIntensity(cravings);
  const report = weeklyReport(plan, logs, cravings, todayKey(), lang);
  const months = isEn ? MONTHS_EN : MONTHS_TR;

  const lockedCard = (title: string, description: string) => (
    <Card>
      <View style={styles.lockHead}>
        <Text style={styles.cardLabel}>{title}</Text>
        <View style={styles.proPill}>
          <Text style={styles.proPillText}>PRO</Text>
        </View>
      </View>
      <Text style={styles.cardHint}>{description}</Text>
      <View style={styles.lockedPreview} pointerEvents="none">
        <View style={[styles.lockedBar, { width: '92%' }]} />
        <View style={[styles.lockedBar, { width: '74%' }]} />
        <View style={[styles.lockedBar, { width: '85%' }]} />
        <View style={[styles.lockedBar, { width: '58%' }]} />
        <View style={[styles.lockedBar, { width: '80%' }]} />
      </View>
      <Pressable style={styles.lockedCta} onPress={openPro}>
        <Text style={styles.lockedCtaText}>
          {isEn ? 'Unlock with PRO' : 'PRO ile aç'}
        </Text>
      </Pressable>
    </Card>
  );

  const shareWeekly = async () => {
    try {
      await Share.share({
        title: isEn ? 'Quit & Let Go — Weekly report' : 'Bırak Gitsin — haftalık rapor',
        message: [
          `${isEn ? 'Quit & Let Go' : 'Bırak Gitsin'} · ${report.startKey} – ${report.endKey}`,
          `${report.headline}: ${report.metDays}/${report.loggedDays} ${isEn ? 'days on target' : 'gün hedefi tuttun'}.`,
          isEn
            ? `Average ${report.averageSmoked.toFixed(1)} cigarettes/day (goal ${report.averageGoal.toFixed(1)}).`
            : `Ortalama ${report.averageSmoked.toFixed(1)} sigara/gün (hedef ${report.averageGoal.toFixed(1)}).`,
          report.change !== null
            ? isEn
              ? `${Math.abs(report.change).toFixed(1)} ${report.change <= 0 ? 'fewer' : 'more'} cigarettes/day than last week.`
              : `Geçen haftaya göre günde ${Math.abs(report.change).toFixed(1)} sigara ${report.change <= 0 ? 'daha az' : 'daha fazla'}.`
            : null,
          `${isEn ? 'Saved' : 'Tasarruf'}: ${formatMoney(report.saved, plan.currency)}.`,
          report.cravings
            ? isEn
              ? `Resisted ${report.resisted}/${report.cravings} cravings (${report.resistedRate}%).`
              : `Krizlerde ${report.resisted}/${report.cravings} kez dayandın (%${report.resistedRate}).`
            : null,
          report.topTrigger ? `${isEn ? 'Top trigger' : 'En sık tetikleyici'}: ${report.topTrigger}.` : null,
          '',
          isEn ? 'I am cutting down with Quit & Let Go.' : 'Bırak Gitsin ile sigarayı azaltıyorum.',
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } catch {
      Alert.alert(isEn ? 'Could not share' : 'Paylaşılamadı', isEn ? 'Sharing is unavailable right now.' : 'Şu anda paylaşım ekranı açılamadı.');
    }
  };


  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SavingsSimulator plan={plan} logs={logs} />

        <View style={styles.titleRow}>
          <Text style={styles.title}>{isEn ? 'Statistics' : 'İstatistikler'}</Text>
          <Pressable style={styles.shareSuccessBtn} onPress={openShareModal}>
            <Text style={styles.shareSuccessBtnText}>{isEn ? 'Share Success' : 'Başarımı Paylaş'}</Text>
          </Pressable>
        </View>

        <Card style={styles.coachCard}>
          <View style={styles.coachHead}>
            <View style={styles.coachHeadText}>
              <View style={styles.mapTitleRow}><MapBadge code="8" /><Text style={styles.cardLabel}>{isEn ? 'Weekly coach report' : 'Haftalık koç raporu'}</Text></View>
              <Text style={styles.coachHeadline}>{report.headline}</Text>
            </View>
            <View style={styles.coachBadge}>
              <Text style={styles.coachBadgeValue}>
                {report.loggedDays ? `${report.metDays}/${report.loggedDays}` : '—'}
              </Text>
              <Text style={styles.coachBadgeLabel}>{isEn ? 'on target' : 'hedef'}</Text>
            </View>
          </View>

          <View style={styles.coachMetrics}>
            <View style={styles.coachMetric}>
              <Text style={styles.coachMetricValue} numberOfLines={1} adjustsFontSizeToFit>
                {report.loggedDays ? report.averageSmoked.toFixed(1) : '—'}
              </Text>
              <Text style={styles.coachMetricLabel} numberOfLines={2}>{isEn ? 'cigs/day' : 'sigara/gün'}</Text>
            </View>
            <View style={styles.coachMetric}>
              <Text style={styles.coachMetricValue} numberOfLines={1} adjustsFontSizeToFit>
                {report.cravings ? `${report.resisted}/${report.cravings}` : '—'}
              </Text>
              <Text style={styles.coachMetricLabel} numberOfLines={2}>{isEn ? 'resisted' : 'direnilen'}</Text>
            </View>
            <View style={styles.coachMetric}>
              <Text style={styles.coachMetricValue} numberOfLines={1} adjustsFontSizeToFit>
                {formatMoneyShort(report.saved, plan.currency)}
              </Text>
              <Text style={styles.coachMetricLabel} numberOfLines={2}>{isEn ? 'saved/week' : 'haftalık tasarruf'}</Text>
            </View>
          </View>

          <Text style={styles.coachSuggestion}>{report.suggestion}</Text>

          {report.bestDay && report.hardestDay ? (
            <Text style={styles.coachMeta}>
              {isEn ? 'Best day' : 'En iyi gün'} {formatDayShort(report.bestDay.date)} ({report.bestDay.smoked}) ·{' '}
              {isEn ? 'hardest day' : 'en zor gün'} {formatDayShort(report.hardestDay.date)} ({report.hardestDay.smoked})
            </Text>
          ) : null}

          <View style={styles.shareRow}>
            <Pressable
              accessibilityRole="button"
              onPress={shareWeekly}
              style={[styles.shareBtn, styles.shareBtnPrimary]}
            >
              <Text style={[styles.shareBtnText, styles.shareBtnTextPrimary]}>
                {isEn ? 'Share report' : 'Raporu paylaş'}
              </Text>
            </Pressable>
          </View>
        </Card>

        <View style={styles.grid}>
          <Card style={styles.gridCard}>
            <Text style={styles.cardLabel}>{isEn ? 'Total saved' : 'Toplam tasarruf'}</Text>
            <Text style={styles.bigMoney}>{formatMoney(saved, plan.currency)}</Text>
            <Text style={styles.cardHint}>{isEn ? 'value of cigarettes avoided' : `${plan.currency} karşılığı içilmeyen sigara`}</Text>
          </Card>
          <Card style={styles.gridCard}>
            <Text style={styles.cardLabel}>{isEn ? 'Cigarettes avoided' : 'İçmediğin sigara'}</Text>
            <Text style={styles.bigNumber}>{Math.max(0, Math.floor(avoided))}</Text>
            <Text style={styles.cardHint}>
              {isEn
                ? `${formatDuration(days)} · ${smoked} smoked`
                : `${formatDuration(days)} boyunca ${smoked} adet içtin`}
            </Text>
          </Card>
        </View>

        <Card>
          <Text style={styles.cardLabel}>{isEn ? 'Last 7 days' : 'Son 7 gün'}</Text>
          <WeekChart stats={week} />
          <Text style={styles.avgText}>
            {isEn
              ? `7-day average: ${avg.toFixed(1)} cigarettes/day`
              : `Son 7 günün ortalaması: ${avg.toFixed(1)} sigara / gün`}
          </Text>
        </Card>

        {isPro ? (
          <Card>
            <View style={styles.monthHead}>
              <Pressable
                onPress={() => setMonthOffset(monthOffset - 1)}
                style={styles.monthNav}
                hitSlop={8}
              >
                <Text style={styles.monthNavText}>‹</Text>
              </Pressable>
              <Text style={styles.monthTitle} numberOfLines={1} adjustsFontSizeToFit>
                {months[cursor.getMonth()]} {cursor.getFullYear()}
              </Text>
              <Pressable
                onPress={() => setMonthOffset(monthOffset + 1)}
                style={styles.monthNav}
                hitSlop={8}
                disabled={monthOffset >= 0}
              >
                <Text style={[styles.monthNavText, monthOffset >= 0 && styles.monthNavDisabled]}>›</Text>
              </Pressable>
            </View>
            <Text style={styles.calendarLegend}>
              {isEn ? (
                <Text><Text style={{ color: colors.success, fontWeight: '800' }}>green</Text> under goal · <Text style={{ color: colors.danger, fontWeight: '800' }}>red</Text> over goal · border = today</Text>
              ) : (
                <Text><Text style={{ color: colors.success, fontWeight: '800' }}>yeşil</Text> hedef altı · <Text style={{ color: colors.danger, fontWeight: '800' }}>kırmızı</Text> hedef üstü · çerçeve bugün</Text>
              )}
            </Text>
            <View style={styles.calendarWrap}>
              <CalendarGrid
                plan={plan}
                logs={logs}
                year={cursor.getFullYear()}
                month={cursor.getMonth()}
              />
            </View>
            {monthSmoked > 0 ? (
              <Text style={styles.avgText}>
                {isEn
                  ? `${months[cursor.getMonth()]}: ${monthSmoked} smoked · ${monthOK} days under · ${monthOver} over${monthLogs.length > 0 ? ` · avg ${(monthSmoked / monthLogs.length).toFixed(1)}/day` : ''}`
                  : `${months[cursor.getMonth()]} özeti: ${monthSmoked} sigara içildi · ${monthOK} gün hedefin altında · ${monthOver} gün üstünde${monthLogs.length > 0 ? ` · ortalama ${(monthSmoked / monthLogs.length).toFixed(1)} /gün` : ''}`}
              </Text>
            ) : (
              <Text style={styles.avgText}>{isEn ? 'No records for this month yet.' : 'Bu ay şimdilik kayıt yok.'}</Text>
            )}
            <Text style={styles.calendarHint}>
              {isEn
                ? `${Math.round((monthOK / Math.max(1, officialDaysInMonth)) * 100)}% on-target rate (month)`
                : `${Math.round((monthOK / Math.max(1, officialDaysInMonth)) * 100)}% hedefi tutturma oranı (ay başına göre)`}
            </Text>
          </Card>
        ) : lockedCard(
          isEn ? 'Monthly Calendar' : 'Aylık Takvim',
          isEn
            ? 'See your daily goals, target rate and monthly overview with PRO. Watch an ad for 1 day of PRO or subscribe to unlock it.'
            : 'Günlük hedeflerini, hedefi tutturma oranını ve aylık özetini PRO ile gör. Reklam izleyerek 1 gün PRO açabilir veya abone olabilirsin.',
        )}

        <Card>
          <Text style={styles.cardLabel}>{t('stats.streakCalendarTitle')}</Text>
          <Text style={styles.cardHint}>{t('stats.streakCalendarSub')}</Text>
          <View style={{ marginTop: spacing.sm }}>
            <StreakCalendar
              plan={plan}
              logs={logs}
              slipLogs={slipLogs}
              year={cursor.getFullYear()}
              month={cursor.getMonth()}
            />
          </View>
        </Card>

        <Card>
          <Text style={styles.cardLabel}>{isEn ? 'My Badges' : 'Rozetlerim'}</Text>
          <Text style={styles.cardHint}>
            {isEn
              ? `${badgesWon} / ${badgeDefs().length} badges earned. You'll get a celebration when you earn one.`
              : `${badgesWon} / ${badgeDefs().length} rozet kazandın. Rozet kazanınca kutlama bildirimi alırsın.`}
          </Text>
          <View style={styles.badgeGrid}>
            {badgeDefs().map((b) => {
              const won = badges.includes(b.id);
              return (
                <View key={b.id} style={[styles.badge, won && styles.badgeWon]}>
                  <Text style={styles.badgeEmoji}>{won ? b.emoji : '🔒'}</Text>
                  <Text style={[styles.badgeTitle, !won && styles.badgeTitleLocked]} numberOfLines={2}>
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
              const def = medalDefs[m.id] || { title: m.id, desc: '' };
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
          <Text style={styles.cardLabel}>{isEn ? 'Health milestones' : 'Sağlık kilometre taşları'}</Text>
          <Text style={styles.cardHint}>
            {isEn
              ? 'General informational trends, not medical predictions. This app is not a medical device; consult a healthcare professional.'
              : 'Bilgilendirme amaçlı genel eğilimlerdir, tıbbi tahmin değildir. Bu uygulama bir tıbbi cihaz değildir; bir sağlık uzmanına danışın.'}
          </Text>
          {nextHealth ? (
            <>
              <Text style={styles.healthNext}>
                {isEn ? 'Next: ' : 'Sıradaki: '}{nextHealth.emoji} {nextHealth.label} ·{' '}
                {isEn ? `${formatUntil(nextHealth.days - elapsed)} left` : `${formatUntil(nextHealth.days - elapsed)} kaldı`}
              </Text>
              <View style={styles.healthBar}>
                <ProgressBar progress={healthProgress} color={colors.primary} height={8} />
              </View>
            </>
          ) : (
            <Text style={styles.healthNext}>
              {isEn ? '🎉 You have passed all major health milestones!' : '🎉 Tüm büyük sağlık kilometre taşlarını geçtin!'}
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
                    <Text style={[styles.milestoneLabel, reached && styles.milestoneLabelDone]}>
                      {m.label}
                    </Text>
                    <Text style={styles.milestoneDetail}>{m.detail}</Text>
                  </View>
                  <Text style={[styles.milestoneFlag, reached && styles.milestoneFlagDone]}>
                    {reached ? (isEn ? 'earned' : 'kazanıldı') : (isEn ? 'pending' : 'bekliyor')}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {isPro ? (
          <>
          <Card>
          <Text style={styles.cardLabel}>{isEn ? 'Craving & trigger analysis' : 'İstek & tetik analizi'}</Text>
          {cravings.length === 0 ? (
            <Text style={styles.cardHint}>
              {isEn
                ? 'As you log cravings in the SOS tab, you will see when and why you crave cigarettes most.'
                : 'Kriz sekmesinde isteklerini kaydettikçe burada canının hangi saatlerde ve hangi durumlarda çektiğini göstereceğiz.'}
            </Text>
          ) : (
            <>
              <Text style={styles.analysisHead}>{isEn ? 'Riskiest hours' : 'En riskli saatler'}</Text>
              {riskHours.map((r) => (
                <View key={r.hour} style={styles.riskRow}>
                  <Text style={styles.riskHour}>
                    {String(r.hour).padStart(2, '0')}:00–{String((r.hour + 1) % 24).padStart(2, '0')}:00
                  </Text>
                  <View style={styles.riskBarWrap}>
                    <View style={[styles.riskBar, { width: `${Math.max(8, (r.count / riskMax) * 100)}%` }]} />
                  </View>
                  <Text style={styles.riskCount}>{r.count}×</Text>
                </View>
              ))}
              <Text style={styles.analysisHead}>{isEn ? 'Most common triggers' : 'En sık tetikleyiciler'}</Text>
              {triggers.length > 0 ? (
                <View style={styles.chipWrap}>
                  {triggers.map((tr) => (
                    <View key={tr.trigger} style={styles.triggerChip}>
                      <Text style={styles.triggerChipText}>{tr.trigger} · {tr.count}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.cardHint}>{isEn ? 'No triggers marked yet.' : 'Henüz tetikleyici işaretlenmedi.'}</Text>
              )}
              {avgIntensity != null ? (
                <Text style={styles.cardHint}>
                  {isEn ? `Average craving intensity: ${avgIntensity.toFixed(1)} / 5` : `Ortalama istek şiddeti: ${avgIntensity.toFixed(1)} / 5`}
                </Text>
              ) : null}
              <Text style={styles.cardHint}>
                {isEn ? `${hourHist.reduce((a, b) => a + b, 0)} craving records in total.` : `Toplam ${hourHist.reduce((a, b) => a + b, 0)} istek kaydın var.`}
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
                    <View style={[styles.riskBar, { width: `${Math.max(8, (e.count / triggerMap.maxTrigger) * 100)}%` }]} />
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
                    <View style={[styles.riskBar, { width: `${Math.max(8, (e.count / triggerMap.maxHour) * 100)}%`, backgroundColor: colors.danger }]} />
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
          </>
        ) : lockedCard(
          isEn ? 'Craving & Trigger Analysis' : 'İstek & Tetikleyici Analizi',
          isEn
            ? 'See riskiest hours, common triggers and your personalized trigger map with PRO. Watch an ad for 1 day of PRO or subscribe to unlock it.'
            : 'En riskli saatlerini, sık tetikleyicilerini ve kişisel tetikleyici haritanı PRO ile gör. Reklam izleyerek 1 gün PRO açabilir veya abone olabilirsin.',
        )}

        {todayRecord.smoked > 0 ? (
          <Text style={styles.tip}>
            {isEn
              ? `You smoked ${todayRecord.smoked} today. Your goal is ${dailyGoal(plan, todayKey(), logs)}. You can update today's records from Home.`
              : `Bugün ${todayRecord.smoked} sigara içtin. Hedefin ${dailyGoal(plan, todayKey(), logs)}. İstersen ana sayfadan gün içi kayıtlarını güncelleyebilirsin.`}
          </Text>
        ) : null}
      </ScrollView>

      {/* Success card only in modal (no layout space taken when closed) */}
      <Modal
        visible={shareModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setShareModalOpen(false)}
      >
        <View style={styles.shareModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShareModalOpen(false)} />
          <View style={styles.shareModalCard}>
            <ScrollView contentContainerStyle={styles.shareModalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.shareThemeTitle}>
                {isEn ? 'Card theme' : 'Kart teması'}
              </Text>
              <View style={styles.shareThemeRow}>
                {localizedShareThemes.map((th) => {
                  const locked = th.proOnly && !isPro;
                  return (
                    <Pressable
                      key={th.id}
                      style={[styles.shareThemeChip, locked && styles.shareThemeChipLocked]}
                      onPress={() => selectShareTheme(th.id, th.proOnly)}
                    >
                      <View style={[styles.shareThemeSwatch, { backgroundColor: th.colors[1], borderColor: th.accent }]} />
                      <Text style={styles.shareThemeName}>
                        {th.name}{locked ? ' 🔒' : ''}
                      </Text>
                      <Text style={styles.shareThemeMeta}>
                        {th.proOnly ? (locked ? 'PRO' : (isEn ? 'PRO' : 'PRO ✓')) : (isEn ? 'Free' : 'Ücretsiz')}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <SuccessShareCard
                ref={shareCardRef}
                themeId={shareTheme}
                days={Math.max(0, Math.floor(elapsedDays(plan)))}
                avoided={Math.max(0, Math.round(avoided))}
                savedText={formatMoney(saved, plan.currency)}
              />
              <View style={styles.shareModalActions}>
                <Pressable style={styles.shareModalPrimaryBtn} onPress={doShareFromModal}>
                  <Text style={styles.shareModalPrimaryText}>{t('successCard.share')}</Text>
                </Pressable>
                <Pressable style={styles.shareModalGhostBtn} onPress={() => setShareModalOpen(false)}>
                  <Text style={styles.shareModalGhostText}>{t('common.close')}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <ProScreen visible={proOpen} onClose={() => setProOpen(false)} />
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  mapTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
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
    minWidth: 64,
    paddingHorizontal: spacing.sm,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachBadgeValue: { fontSize: fontSizes.md, fontWeight: '800', color: colors.primaryDark, textAlign: 'center' },
  coachBadgeLabel: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 1, textAlign: 'center' },
  coachMetrics: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  coachMetric: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    minWidth: 0,
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
    lineHeight: 16,
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
    flex: 1,
    textAlign: 'center',
    fontSize: fontSizes.md,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: spacing.sm,
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
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  shareModalCard: {
    maxHeight: '90%',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  shareModalContent: {
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  shareModalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  shareModalPrimaryBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  shareModalPrimaryText: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.white },
  shareModalGhostBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareModalGhostText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textMuted },
  lockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  proPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.round,
    backgroundColor: '#5A3B00',
  },
  proPillText: { fontSize: 10, fontWeight: '900', color: '#FFE082' },
  lockedPreview: {
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    opacity: 0.55,
  },
  lockedBar: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  lockedCta: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  lockedCtaText: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.white },
  shareThemeTitle: {
    alignSelf: 'flex-start',
    fontSize: fontSizes.sm,
    fontWeight: '800',
    color: colors.text,
  },
  shareThemeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    width: '100%',
  },
  shareThemeChip: {
    flex: 1,
    minWidth: 90,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  shareThemeChipLocked: { opacity: 0.6 },
  shareThemeSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    marginBottom: 6,
  },
  shareThemeName: { fontSize: fontSizes.xs, fontWeight: '800', color: colors.text, textAlign: 'center' },
  shareThemeMeta: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
});
