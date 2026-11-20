import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CoachChatModal } from '../components/CoachChatModal';
import { MapBadge } from '../components/MapBadge';
import { ProScreen } from './ProScreen';
import { SosBreathingModal } from '../components/SosBreathingModal';
import {
  ShareThemeId,
  SuccessShareCard,
  SuccessShareCardHandle,
  useLocalizedShareThemes,
} from '../components/SuccessShareCard';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { showRewardedUnlockAd } from '../lib/ads';
import {
  cigarettesAvoided,
  currentWindowIndex,
  dailyGoal,
  elapsedDays,
  formatMoney,
  formatMoneyShort,
  fromMin,
  getLog,
  nextWindowInfo,
  nowMin,
  todayKey,
  totalMoneySaved,
  windowAllowances,
  windowSmokedOn,
} from '../lib/calculations';
import { hasProAccess } from '../lib/proAccess';
import { updateWidgetData } from '../lib/widgetData';
import { fontSizes, radius, shadows, spacing } from '../theme';

type HomeScreenProps = {
  onOpenCraving: () => void;
};

export function HomeScreen(_props: HomeScreenProps) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { data, logCigarette, logSlip, grantProUnlock24h } = useApp();
  const plan = data.plan;
  const lang = data.language || 'tr';

  const [sosOpen, setSosOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [proOpen, setProOpen] = useState(false);

  const shareCardRef = useRef<SuccessShareCardHandle>(null);
  const isPro = hasProAccess(data);
  const localizedShareThemes = useLocalizedShareThemes();
  const [shareTheme, setShareTheme] = useState<ShareThemeId>('classic');
  const [sharePickerOpen, setSharePickerOpen] = useState(false);
  const [shareUnlocking, setShareUnlocking] = useState(false);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const triggerShareWithTheme = (theme: ShareThemeId) => {
    setShareTheme(theme);
    setSharePickerOpen(false);
    setTimeout(() => {
      shareCardRef.current?.share();
    }, 120);
  };

  const onSelectShareTheme = async (themeId: ShareThemeId, proOnly: boolean) => {
    if (!proOnly || isPro) {
      triggerShareWithTheme(themeId);
      return;
    }
    Alert.alert(t('home.proFeatureTitle'), t('home.proFeatureMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('home.watchAdUnlock'),
        onPress: async () => {
          if (shareUnlocking) return;
          setShareUnlocking(true);
          try {
            const res = await showRewardedUnlockAd();
            if (res.rewarded) {
              grantProUnlock24h();
              Alert.alert(t('home.unlockedTitle'), t('home.unlockedMsg'));
              triggerShareWithTheme(themeId);
            } else if (res.message) {
              Alert.alert(t('home.adTitle'), res.message);
            }
          } finally {
            setShareUnlocking(false);
          }
        },
      },
    ]);
  };

  // Widget sync (preserve existing behavior)
  useEffect(() => {
    if (!plan) return;
    const key = todayKey();
    const todayRecord = getLog(data.logs, key);
    const todayGoal = dailyGoal(plan, key, data.logs);
    const savedTotal = totalMoneySaved(plan, data.logs);
    const upcoming = nextWindowInfo(plan);
    const upcomingStr = upcoming ? fromMin((nowMin() + upcoming.minutes) % 1440) : '--:--';
    const elapsedMs = Math.max(0, Date.now() - new Date(plan.startDate).getTime());
    const quitDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
    const quitHours = Math.floor((elapsedMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const hh = String(quitHours).padStart(2, '0');
    const quitText = lang === 'en' ? `${quitDays} days ${hh} hrs` : `${quitDays} gün ${hh} saat`;
    const savingsText = formatMoneyShort(savedTotal, plan.currency);
    updateWidgetData(
      todayRecord.smoked,
      todayGoal,
      savedTotal,
      0,
      upcomingStr,
      quitText,
      savingsText,
      lang,
    );
  }, [data, plan, lang]);

  const today = todayKey();
  const record = plan ? getLog(data.logs, today) : null;
  const savedTotal = plan ? totalMoneySaved(plan, data.logs) : 0;
  const avoided = plan ? cigarettesAvoided(plan, data.logs) : 0;
  const avoidedTotalCount = Math.max(0, Math.floor(avoided));
  const elapsedMs = plan ? Math.max(0, now - new Date(plan.startDate).getTime()) : 0;
  const smokeFreeDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  const smokeFreeHours = Math.floor((elapsedMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const smokeFreeText = lang === 'en'
    ? `${smokeFreeDays} ${smokeFreeDays === 1 ? 'Day' : 'Days'} ${smokeFreeHours} ${smokeFreeHours === 1 ? 'Hour' : 'Hours'}`
    : `${smokeFreeDays} Gün ${smokeFreeHours} Saat`;

  const activeWindow = plan ? currentWindowIndex(plan) : -1;
  const windowIndex = activeWindow >= 0 ? activeWindow : null;
  const allowances = plan ? windowAllowances(dailyGoal(plan, today, data.logs), plan.windows) : [];
  const nextWindow = plan ? nextWindowInfo(plan) : null;
  const nextWindowStr = nextWindow ? fromMin((nowMin() + nextWindow.minutes) % 1440) : '--:--';
  const heavyMode = !!plan && !!plan.heavySmokerMode && plan.baselinePerDay >= 20;

  if (!plan || !record) return null;

  const smokedCount = record.smoked;
  const todayGoalCount = dailyGoal(plan, today, data.logs);
  const todayStatusText =
    smokedCount === 0
      ? (lang === 'en' ? 'No cigarettes today yet 🎉' : 'Bugün henüz sigara içmedin 🎉')
      : lang === 'en'
        ? `You've smoked ${smokedCount} today`
        : `Bugün ${smokedCount} sigara içtin`;

  let windowCompact: string | null = null;
  if (heavyMode) {
    if (plan.windows.length > 0) {
      if (activeWindow >= 0) {
        const left = Math.max(0, (allowances[activeWindow] ?? 0) - windowSmokedOn(record, activeWindow));
        windowCompact = t('home.inWindow', {
          start: plan.windows[activeWindow].start,
          end: plan.windows[activeWindow].end,
          count: left,
        });
      } else {
        windowCompact = t('home.outOfWindow', { time: nextWindowStr });
      }
    } else {
      const left = Math.max(0, todayGoalCount - smokedCount);
      windowCompact = lang === 'en' ? `Allowed today: ${left} left` : `Bugün kalan hak: ${left}`;
    }
  }

  const onHadOne = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    logCigarette({ windowIndex });
  };

  const onSlipPress = () => {
    const { avoided: slipAvoided } = logSlip({ windowIndex });
    Alert.alert(t('home.slipTitle'), t('home.slipMsg', { count: Math.max(0, Math.floor(slipAvoided)) }));
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header: left brand+pro, right share only */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MapBadge code="1" />
            <Image source={require('../../assets/widget_mascot.png')} style={styles.brandMascot} />
            <Text style={styles.brand}>{t('common.appName')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('common.appName')} PRO`}
              style={[styles.proBadge, isPro && styles.proBadgeActive]}
              onPress={() => setProOpen(true)}
              hitSlop={6}
            >
              <Text style={[styles.proBadgeText, isPro && styles.proBadgeTextActive]}>{t('home.pro')}</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.share')}
            style={styles.shareIconBtn}
            onPress={() => setSharePickerOpen(true)}
            hitSlop={8}
          >
            <Text style={styles.shareIcon}>⤴</Text>
          </Pressable>
        </View>

        {/* Center Focus Card */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDarker]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.focusCard}
        >
          <View style={styles.mapTitleRow}>
            <MapBadge code="2" />
            <Text style={styles.focusLabel}>
              {lang === 'en' ? 'Smoke-Free Time' : 'Sigarasız Süre'}
            </Text>
          </View>
          <Text style={styles.focusTime}>{smokeFreeText}</Text>

          <View style={styles.focusStatsRow}>
            <View style={styles.focusStatBox}>
              <Text style={styles.focusStatLabel}>
                {lang === 'en' ? 'Cigarettes Avoided' : 'Kurtarılan Sigara'}
              </Text>
              <Text style={styles.focusStatValue}>{avoidedTotalCount}</Text>
              <Text style={styles.focusStatUnit}>{lang === 'en' ? 'cigarettes' : 'adet'}</Text>
            </View>
            <View style={styles.focusStatBox}>
              <Text style={styles.focusStatLabel}>
                {lang === 'en' ? 'Money Saved' : 'Biriken Para'}
              </Text>
              <Text style={styles.focusStatValue} numberOfLines={1} adjustsFontSizeToFit>
                {formatMoney(savedTotal, plan.currency)}
              </Text>
              <Text style={styles.focusStatUnit}>
                {lang === 'en' ? 'total' : 'toplam'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Support Row */}
        <View style={styles.supportSection}>
          <MapBadge code="3" style={styles.mapBadgeInline} />
          <View style={styles.supportRow}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.supportBtn, styles.supportBtnSOS, pressed && styles.pressed]}
            onPress={() => setSosOpen(true)}
          >
            <Text style={styles.supportEmoji}>🆘</Text>
            <Text style={[styles.supportTitle, { color: colors.danger }]}>
              {lang === 'en' ? 'SOS – Craving' : 'Kriz Geldi (SOS)'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.supportBtn, styles.supportBtnCoach, pressed && styles.pressed]}
            onPress={() => setCoachOpen(true)}
          >
            <Text style={styles.supportEmoji}>💬</Text>
            <Text style={[styles.supportTitle, { color: colors.white }]}>
              {lang === 'en' ? 'Quit Coach' : 'Bırakma Koçu'}
            </Text>
          </Pressable>
          </View>
        </View>

        {/* Big Blue Today & Goal Card */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDarker]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.todayCard}
        >
          <View style={styles.todayDashedBox}>
            <View style={styles.todayDashedLeft}>
              <View style={styles.mapTitleRow}>
                <MapBadge code="4" />
                <Text style={styles.todayCardTitle}>
                  {lang === 'en' ? 'Cigarettes today' : 'Bugün içtiklerin'}
                </Text>
              </View>
              <Text style={styles.todayCardStatus}>{todayStatusText}</Text>
              {windowCompact ? <Text style={styles.todayCardWindow}>{windowCompact}</Text> : null}
            </View>
            <Text style={styles.todayCardCount}>{smokedCount}</Text>
          </View>

          <View style={styles.todayGoalBlock}>
            <Text style={styles.todayGoalWhite}>
              {lang === 'en'
                ? `Today's goal: ${todayGoalCount} 🚬 cigarettes`
                : `Bugünkü hedefin: ${todayGoalCount} 🚬 sigara`}
            </Text>
            <Text style={styles.todayGoalYellow}>
              {lang === 'en'
                ? `Smoked today: ${smokedCount} 🚬`
                : `Bugün içtiğin: ${smokedCount} 🚬`}
            </Text>
          </View>

          <View style={styles.todayActionsRow}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.hadOneBtn, pressed && styles.pressed]}
              onPress={onHadOne}
            >
              <Text style={styles.hadOneBtnText}>
                {lang === 'en' ? 'Smoked 1' : '1 Dal İçtim'}
              </Text>
            </Pressable>
            <Pressable onPress={onSlipPress} hitSlop={8} style={styles.slipLinkWrap}>
              <Text style={styles.slipLinkOnBlue}>
                {lang === 'en' ? 'Had a slip-up? Log gently' : 'Kaçamak oldu mu? Nazikçe kaydet'}
              </Text>
            </Pressable>
          </View>
        </LinearGradient>
      </ScrollView>

      <SosBreathingModal visible={sosOpen} onClose={() => setSosOpen(false)} />
      <CoachChatModal visible={coachOpen} onClose={() => setCoachOpen(false)} />
      <ProScreen visible={proOpen} onClose={() => setProOpen(false)} />

      <Modal visible={sharePickerOpen} transparent animationType="fade" onRequestClose={() => setSharePickerOpen(false)}>
        <View style={styles.sharePickerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSharePickerOpen(false)} />
          <View style={styles.sharePickerCard}>
            <Text style={styles.sharePickerTitle}>{t('home.shareThemeTitle')}</Text>
            <Text style={styles.sharePickerSub}>{t('home.shareThemeSub')}</Text>
            {localizedShareThemes.map((th) => {
              const locked = th.proOnly && !isPro;
              return (
                <Pressable
                  key={th.id}
                  style={[styles.shareThemeRow, locked && styles.shareThemeRowLocked]}
                  onPress={() => onSelectShareTheme(th.id, th.proOnly)}
                >
                  <View style={styles.shareThemeInfo}>
                    <Text style={styles.shareThemeName}>{th.name}{locked ? ' 🔒' : ''}</Text>
                    <Text style={styles.shareThemeMeta}>
                      {th.proOnly ? (locked ? t('home.shareThemeProLocked') : t('home.shareThemePro')) : t('home.shareThemeFree')}
                    </Text>
                  </View>
                  <View style={[styles.shareThemeSwatch, { backgroundColor: th.colors[1], borderColor: th.accent }]}>
                    <View style={[styles.shareThemeSwatchDot, { backgroundColor: th.accent }]} />
                  </View>
                </Pressable>
              );
            })}
            <Pressable style={styles.sharePickerClose} onPress={() => setSharePickerOpen(false)}>
              <Text style={styles.sharePickerCloseText}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={styles.hiddenShareCard} pointerEvents="none">
        <SuccessShareCard
          ref={shareCardRef}
          themeId={shareTheme}
          days={Math.max(0, Math.floor(elapsedDays(plan)))}
          avoided={Math.max(0, Math.round(avoided))}
          savedText={formatMoney(savedTotal, plan.currency)}
        />
      </View>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
    mapTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    supportSection: { gap: spacing.xs },
    mapBadgeInline: { alignSelf: 'flex-start' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
    brandMascot: { width: 36, height: 36, borderRadius: 18 },
    brand: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.text },
    proBadge: {
      marginLeft: 2,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    proBadgeActive: { backgroundColor: '#7CFFB2', borderColor: '#7CFFB2' },
    proBadgeText: { fontSize: fontSizes.xs, fontWeight: '900', color: colors.primaryDark, letterSpacing: 0.4 },
    proBadgeTextActive: { color: '#0B3D2E' },
    shareIconBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    shareIcon: { fontSize: 20, color: colors.primaryDark, fontWeight: '700' },

    focusCard: {
      borderRadius: radius.xl,
      padding: spacing.xl,
      gap: spacing.md,
      ...shadows.card,
    },
    focusLabel: {
      fontSize: fontSizes.sm,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.85)',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    focusTime: {
      fontSize: fontSizes.xxl,
      fontWeight: '800',
      color: colors.white,
      lineHeight: 46,
    },
    focusStatsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
    focusStatBox: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: 4,
    },
    focusStatLabel: { fontSize: fontSizes.xs, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
    focusStatValue: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.white },
    focusStatUnit: { fontSize: fontSizes.xs, color: 'rgba(255,255,255,0.75)' },

    supportRow: { flexDirection: 'row', gap: spacing.md },
    supportBtn: {
      flex: 1,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      minHeight: 96,
    },
    supportBtnSOS: {
      backgroundColor: colors.dangerSoft,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    supportBtnCoach: {
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.primaryDark || colors.primary,
    },
    supportEmoji: { fontSize: 28 },
    supportTitle: { fontSize: fontSizes.md, fontWeight: '800', textAlign: 'center' },

    todayCard: {
      borderRadius: radius.xl,
      padding: spacing.lg,
      gap: spacing.md,
      ...shadows.card,
    },
    todayDashedBox: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: 'rgba(255,255,255,0.55)',
      borderRadius: radius.lg,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    todayDashedLeft: { flex: 1, gap: 4 },
    todayCardTitle: {
      fontSize: fontSizes.md,
      fontWeight: '800',
      color: colors.white,
    },
    todayCardStatus: {
      fontSize: fontSizes.sm,
      color: 'rgba(255,255,255,0.92)',
      lineHeight: 20,
    },
    todayCardWindow: {
      fontSize: fontSizes.xs,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 2,
    },
    todayCardCount: {
      fontSize: 48,
      fontWeight: '800',
      color: colors.white,
      lineHeight: 52,
      minWidth: 56,
      textAlign: 'right',
    },
    todayGoalBlock: { gap: 6, marginTop: 2 },
    todayGoalWhite: {
      fontSize: fontSizes.xl,
      fontWeight: '800',
      color: colors.white,
      lineHeight: 30,
    },
    todayGoalYellow: {
      fontSize: fontSizes.xl,
      fontWeight: '800',
      color: colors.accent,
      lineHeight: 30,
    },
    todayActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginTop: 4,
    },
    hadOneBtn: {
      backgroundColor: colors.white,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hadOneBtnText: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.primaryDark },
    slipLinkWrap: { flex: 1, alignItems: 'flex-end' },
    slipLinkOnBlue: {
      fontSize: fontSizes.xs,
      color: 'rgba(255,255,255,0.9)',
      textDecorationLine: 'underline',
      textAlign: 'right',
    },

    pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
    hiddenShareCard: { position: 'absolute', left: -9999, top: 0, opacity: 0 },

    sharePickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
      padding: spacing.md,
    },
    sharePickerCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sharePickerTitle: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
    sharePickerSub: { fontSize: fontSizes.sm, color: colors.textMuted, lineHeight: 20 },
    shareThemeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    shareThemeRowLocked: { opacity: 0.95 },
    shareThemeInfo: { flex: 1, gap: 2 },
    shareThemeName: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text },
    shareThemeMeta: { fontSize: fontSizes.xs, color: colors.textMuted },
    shareThemeSwatch: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    shareThemeSwatchDot: { width: 14, height: 14, borderRadius: 7 },
    sharePickerClose: { marginTop: 4, paddingVertical: spacing.sm, alignItems: 'center' },
    sharePickerCloseText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textMuted },
  });
