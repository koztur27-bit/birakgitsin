import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CigaretteIcon } from '../components/CigaretteIcon';
import { CoachChatModal } from '../components/CoachChatModal';
import { HappinessPromptModal } from '../components/HappinessPromptModal';
import { MapBadge } from '../components/MapBadge';
import { ProgressBar } from '../components/ProgressBar';
import { ProScreen } from './ProScreen';
import { SosBreathingModal } from '../components/SosBreathingModal';
import { TimerScreen } from './TimerScreen';
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
  goalStreak,
  nextWindowInfo,
  nowMin,
  pledgeStreak,
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
  const { data, logCigarette, undoCigarette, logSlip, grantProUnlock24h, markHappinessPrompt, pledgeToday, sosRequest } = useApp();
  const plan = data.plan;
  const lang = data.language || 'tr';

  const [sosOpenLocal, setSosOpenLocal] = useState(false);
  const [sosDismissedFor, setSosDismissedFor] = useState(0);
  // Bildirim kısayolu sosRequest'i artırır; yerel buton ise sosOpenLocal'ı açar.
  const sosOpen = sosOpenLocal || sosRequest > sosDismissedFor;
  const openSos = () => setSosOpenLocal(true);
  const closeSos = () => {
    setSosOpenLocal(false);
    setSosDismissedFor(sosRequest);
  };
  const [timerOpen, setTimerOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [proOpen, setProOpen] = useState(false);
  const [showHappiness, setShowHappiness] = useState(false);

  const [smokeNote, setSmokeNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shareCardRef = useRef<SuccessShareCardHandle>(null);
  const isPro = hasProAccess(data);
  const localizedShareThemes = useLocalizedShareThemes();
  const [shareTheme, setShareTheme] = useState<ShareThemeId>('classic');
  const [sharePickerOpen, setSharePickerOpen] = useState(false);
  const [shareUnlocking, setShareUnlocking] = useState(false);
  const showSmokeNote = (text: string) => {
    setSmokeNote(text);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setSmokeNote(null), 2600);
  };

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

  // Mutluluk penceresi: kurulumdan 72 saat sonra, rozet/3 gün seri koşulu ve 30 gün soğuma ile
  useEffect(() => {
    if (!plan || showHappiness) return;
    const hp = data.happinessPrompts || {};
    if (hp.positiveResponse) return;
    const hoursSinceStart = (Date.now() - new Date(plan.startDate).getTime()) / (1000 * 60 * 60);
    if (hoursSinceStart < 72) return;
    const hasBadge = (data.badges || []).length >= 1;
    const hasStreak = goalStreak(plan, data.logs) >= 3;
    if (!hasBadge && !hasStreak) return;
    if (hp.lastPromptAt && Date.now() - hp.lastPromptAt < 30 * 24 * 60 * 60 * 1000) return;
    const t = setTimeout(() => setShowHappiness(true), 0);
    return () => clearTimeout(t);
  }, [plan, data.badges, data.logs, data.happinessPrompts, showHappiness]);

  const closeHappiness = (action: 'positive' | 'negative' | 'dismiss') => {
    markHappinessPrompt(action);
    setShowHappiness(false);
  };

  const onSosGamePassed = () => {};

  const todayPledged = (data.dailyPledges || []).includes(todayKey());
  const currentPledgeStreak = typeof pledgeStreak === 'function' ? pledgeStreak(data.dailyPledges || []) : 0;
  const onPledgePress = () => {
    if (todayPledged) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    pledgeToday();
  };

  const shareInvite = async () => {
    const days = plan ? Math.max(0, Math.floor(elapsedDays(plan))) : 0;
    const savedText = plan ? formatMoney(totalMoneySaved(plan, data.logs), plan.currency) : (lang === 'en' ? '$0' : '0 ₺');
    const code = data.inviteCode || 'BG';
    const msg = t('invite.shareMessage', { days, saved: savedText, code });
    const waUrl = `whatsapp://send?text=${encodeURIComponent(msg)}`;
    try {
      const canWa = await Linking.canOpenURL(waUrl);
      if (canWa) {
        await Linking.openURL(waUrl);
        return;
      }
    } catch {}
    try {
      await Share.share({ message: msg });
    } catch {}
  };

  const today = todayKey();
  const record = plan ? getLog(data.logs, today) : null;
  const savedTotal = plan ? totalMoneySaved(plan, data.logs) : 0;
  const avoided = plan ? cigarettesAvoided(plan, data.logs) : 0;

  if (!plan || !record) return null;

  const goal = dailyGoal(plan, today, data.logs);
  const smokedCount = record.smoked;
  const remaining = Math.max(0, goal - smokedCount);
  const underGoal = smokedCount <= goal;
  const progress = goal > 0 ? smokedCount / goal : smokedCount > 0 ? 1 : 0;
  const todayTimes = record.times ?? [];

  const activeWindow = currentWindowIndex(plan);
  const windowIndex = activeWindow >= 0 ? activeWindow : null;
  const allowances = windowAllowances(goal, plan.windows);
  const nextWindow = nextWindowInfo(plan);
  const nextWindowStr = nextWindow ? fromMin((nowMin() + nextWindow.minutes) % 1440) : '--:--';
  const heavyMode = !!plan.heavySmokerMode && plan.baselinePerDay >= 20;

  const heroStatus =
    plan.windows.length > 0 && activeWindow >= 0
      ? t('home.inWindow', {
          start: plan.windows[activeWindow].start,
          end: plan.windows[activeWindow].end,
          count: Math.max(0, (allowances[activeWindow] ?? 0) - windowSmokedOn(record, activeWindow)),
        })
      : plan.windows.length > 0
        ? t('home.outOfWindow', { time: nextWindowStr })
        : underGoal
          ? heavyMode
            ? t('home.underGoalHeavy', { count: remaining })
            : t('home.underGoal', { count: remaining })
          : heavyMode
            ? t('home.overGoalHeavy')
            : t('home.overGoal');

  const onHadOne = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    logCigarette({ windowIndex });
    showSmokeNote(lang === 'en' ? 'Logged. Keep going gently.' : 'Kaydedildi. Nazikçe devam et.');
  };

  const onSlipPress = () => {
    const { avoided: slipAvoided } = logSlip({ windowIndex });
    Alert.alert(t('home.slipTitle'), t('home.slipMsg', { count: Math.max(0, Math.floor(slipAvoided)) }));
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header: Bırak Gitsin + maskot + Paylaş */}
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

        {data.quitMotivation && (data.quitMotivation.text || data.quitMotivation.photoUri) ? (
          <View style={styles.motivationRibbon}>
            {data.quitMotivation.photoUri ? (
              <Image source={{ uri: data.quitMotivation.photoUri }} style={styles.motivationPhoto} />
            ) : (
              <View style={styles.motivationIconWrap}><Text style={styles.motivationIcon}>💙</Text></View>
            )}
            <View style={styles.motivationTextWrap}>
              <Text style={styles.motivationLabel}>{t('motivation.ribbonLabel')}</Text>
              {data.quitMotivation.text ? (
                <Text style={styles.motivationText} numberOfLines={2}>{data.quitMotivation.text}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Original Big Blue "Bugün İçtiklerin" Card */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDarker]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <MapBadge code="2" style={styles.heroMapBadge} />

          <View style={styles.cigLogBox}>
            <View style={styles.cigLogHead}>
              <Text style={styles.cigLogTitle}>
                {lang === 'en' ? "Today's cigarettes" : 'Bugün içtiklerin'}
              </Text>
              <Text style={styles.cigLogCount}>{smokedCount}</Text>
            </View>
            {todayTimes.length === 0 ? (
              <Text style={styles.cigLogEmpty}>
                {smokedCount === 0
                  ? (lang === 'en' ? "You haven't smoked today 🎉" : 'Bugün henüz sigara içmedin 🎉')
                  : (lang === 'en' ? `${smokedCount} cigarettes · (no time log)` : `${smokedCount} sigara · (saat kaydı yok)`)}
              </Text>
            ) : (
              <View style={styles.cigLogList}>
                {todayTimes.map((time, i) => (
                  <View key={`${time}-${i}`} style={styles.cigLogItem}>
                    <CigaretteIcon size={20} />
                    <Text style={styles.cigLogTime}>
                      {new Date(time).toLocaleTimeString(lang === 'en' ? 'en-US' : 'tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <Text style={styles.heroTitle}>
            {lang === 'en' ? "Today's goal" : 'Bugünkü hedefin'}
          </Text>
          <View style={styles.heroGoalRow}>
            <Text style={styles.heroGoal}>{goal}</Text>
            <CigaretteIcon size={22} style={styles.heroGoalIcon} />
            <Text style={styles.heroGoalUnit}>{lang === 'en' ? 'cigarettes' : 'sigara'}</Text>
          </View>

          <Text style={[styles.heroLabel, styles.heroSpacer]}>
            {lang === 'en' ? "You've smoked today" : 'Bugün içtiğin'}
          </Text>
          <View style={styles.smokedRow}>
            <Text style={styles.heroCount}>{smokedCount}</Text>
            <CigaretteIcon size={30} style={styles.smokedIcon} />
          </View>

          <View style={styles.heroProgress}>
            <ProgressBar progress={progress} color={colors.accent} height={8} />
          </View>

          <Text style={styles.heroStatus}>{heroStatus}</Text>

          {smokeNote ? <Text style={styles.smokeNote}>{smokeNote}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={lang === 'en' ? 'Log one cigarette' : 'Bir sigara içtim olarak kaydet'}
              style={({ pressed }) => [styles.logBtn, pressed && styles.pressed]}
              onPress={onHadOne}
            >
              <Text style={styles.logBtnText}>{lang === 'en' ? '+1 Smoked' : '+1 Sigara içtim'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={lang === 'en' ? 'Undo last cigarette' : 'Son sigara kaydını geri al'}
              style={({ pressed }) => [
                styles.undoBtn,
                smokedCount === 0 && styles.undoDisabled,
                pressed && styles.pressed,
              ]}
              disabled={smokedCount === 0}
              onPress={() => undoCigarette({ windowIndex })}
            >
              <Text style={styles.undoText}>{lang === 'en' ? 'Undo' : 'Geri al'}</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* Daily Quit Pledge */}
        <View style={[styles.pledgeCard, todayPledged && styles.pledgeCardDone]}>
          <View style={styles.pledgeHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pledgeTitle}>{t('home.pledgeTitle')}</Text>
              <Text style={styles.pledgeHint}>{t('home.pledgeHint')}</Text>
            </View>
            <View style={styles.pledgeStreakBox}>
              <Text style={styles.pledgeStreakLabel}>{t('home.pledgeStreakLabel')}</Text>
              <Text style={styles.pledgeStreakValue}>{t('home.pledgeStreakValue', { count: currentPledgeStreak })}</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.pledgeBtn,
              todayPledged ? styles.pledgeBtnDone : styles.pledgeBtnActive,
              pressed && !todayPledged && styles.pressed,
            ]}
            onPress={onPledgePress}
            disabled={todayPledged}
          >
            <Text style={[styles.pledgeBtnText, todayPledged && styles.pledgeBtnTextDone]}>
              {todayPledged ? t('home.pledgeDone') : t('home.pledgeCta')}
            </Text>
          </Pressable>
        </View>

        {/* Quick Access Buttons */}
        <View style={styles.quickSection}>
          <MapBadge code="3" style={styles.mapBadgeInline} />
          <View style={styles.supportRow}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.supportBtn, styles.supportBtnSOS, pressed && styles.pressed]}
              onPress={openSos}
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

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.slipBtn, pressed && styles.pressed]}
            onPress={onSlipPress}
          >
            <Text style={styles.slipBtnText}>
              {lang === 'en' ? 'Smoked 1 (slip)' : '1 Dal İçtim (kaçamak)'}
            </Text>
          </Pressable>
        </View>

        <Pressable style={[styles.timerCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setTimerOpen(true)} accessibilityRole="button" accessibilityLabel={lang === 'en' ? 'Open craving timer' : 'Dayanma sayacini ac'}>
          <Text style={[styles.timerCardTitle, { color: colors.text }]}>{lang === 'en' ? 'Craving Timer' : 'Dayanma Sayaci'}</Text>
          <Text style={[styles.timerCardSub, { color: colors.textMuted }]}>{lang === 'en' ? 'Start a timer to get through a craving.' : 'Bir istek anini atlatmak icin sayac baslat.'}</Text>
        </Pressable>
      </ScrollView>

      <SosBreathingModal
        visible={sosOpen}
        onClose={closeSos}
        onGamePassed={onSosGamePassed}
      />
      <HappinessPromptModal visible={showHappiness} onClose={closeHappiness} />
      <CoachChatModal visible={coachOpen} onClose={() => setCoachOpen(false)} />
      <Modal visible={timerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setTimerOpen(false)}>
        <TimerScreen />
        <Pressable style={{position:'absolute',top:8,right:8,padding:8}} onPress={() => setTimerOpen(false)}><Text style={{color:'#fff',fontWeight:'700'}}>✕</Text></Pressable>
      </Modal>
      <ProScreen visible={proOpen} onClose={() => setProOpen(false)} />

      <Modal visible={sharePickerOpen} transparent animationType="fade" onRequestClose={() => setSharePickerOpen(false)}>
        <View style={styles.sharePickerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSharePickerOpen(false)} />
          <View style={styles.sharePickerCard}>
            <Text style={styles.sharePickerTitle}>{t('home.shareThemeTitle')}</Text>
            <Text style={styles.sharePickerSub}>{t('home.shareThemeSub')}</Text>
            <Pressable
              style={styles.inviteShareBtn}
              onPress={() => {
                setSharePickerOpen(false);
                shareInvite();
              }}
            >
              <Text style={styles.inviteShareBtnTitle}>{t('invite.title')}</Text>
              <Text style={styles.inviteShareBtnSub}>{t('invite.shareWhatsApp')}</Text>
            </Pressable>
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
    scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },

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

    motivationRibbon: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: colors.primarySoft,
      ...shadows.card,
    },
    motivationPhoto: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.bg,
    },
    motivationIconWrap: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    motivationIcon: { fontSize: 22 },
    motivationTextWrap: { flex: 1, gap: 2 },
    motivationLabel: { fontSize: fontSizes.xs, fontWeight: '800', color: colors.primaryDark, letterSpacing: 0.3 },
    motivationText: { fontSize: fontSizes.sm, color: colors.text, fontWeight: '600', lineHeight: 18 },

    hero: {
      borderRadius: radius.xl,
      padding: spacing.lg,
      gap: 2,
      ...shadows.card,
    },
    heroMapBadge: { alignSelf: 'flex-start', marginBottom: spacing.xs },
    cigLogBox: {
      marginBottom: spacing.md,
      minHeight: 132,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.4)',
      borderStyle: 'dashed',
      backgroundColor: 'rgba(255,255,255,0.12)',
      padding: spacing.lg,
      justifyContent: 'center',
    },
    cigLogHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cigLogTitle: { color: 'rgba(255,255,255,0.9)', fontSize: fontSizes.md, fontWeight: '700' },
    cigLogCount: { color: colors.white, fontSize: fontSizes.xl, fontWeight: '800' },
    cigLogEmpty: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: fontSizes.sm,
      marginTop: spacing.sm,
    },
    cigLogList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    cigLogItem: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      minWidth: 56,
    },
    cigLogTime: { color: colors.white, fontSize: fontSizes.md, fontWeight: '700' },

    heroTitle: { fontSize: fontSizes.sm, color: 'rgba(255,255,255,0.85)' },
    heroGoal: {
      fontSize: fontSizes.xxl,
      fontWeight: '800',
      color: colors.white,
    },
    heroGoalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    heroGoalIcon: { marginTop: 4 },
    heroGoalUnit: { fontSize: fontSizes.md, fontWeight: '600', color: colors.white },
    heroLabel: {
      fontSize: fontSizes.sm,
      color: 'rgba(255,255,255,0.85)',
    },
    heroSpacer: { marginTop: spacing.sm },
    smokedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    smokedIcon: { marginBottom: spacing.xs },
    heroCount: {
      fontSize: fontSizes.huge,
      fontWeight: '800',
      color: colors.accent,
    },
    heroProgress: { marginTop: spacing.xs, marginBottom: spacing.sm },
    heroStatus: {
      fontSize: fontSizes.sm,
      color: 'rgba(255,255,255,0.95)',
      fontWeight: '600',
      lineHeight: fontSizes.md + 4,
    },
    smokeNote: {
      marginTop: spacing.sm,
      fontSize: fontSizes.sm,
      fontWeight: '800',
      color: colors.accent,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    logBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.white,
      alignItems: 'center',
    },
    logBtnText: {
      fontSize: fontSizes.md,
      fontWeight: '800',
      color: colors.primaryDark,
    },
    undoBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    undoDisabled: { opacity: 0.4 },
    undoText: { fontSize: fontSizes.md, fontWeight: '700', color: colors.white },

    quickSection: { gap: spacing.sm },
    mapBadgeInline: { alignSelf: 'flex-start' },
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

    slipBtn: {
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    slipBtnText: { fontSize: fontSizes.md, fontWeight: '800', color: colors.primaryDark },

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
    pledgeCard: {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      padding: spacing.md,
      gap: spacing.sm,
      borderWidth: 1.5,
      borderColor: colors.primarySoft,
      ...shadows.card,
    },
    pledgeCardDone: {
      borderColor: '#34D399',
      backgroundColor: '#ECFDF5',
    },
    pledgeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    pledgeTitle: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text },
    pledgeHint: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
    pledgeStreakBox: {
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.md,
      backgroundColor: colors.primarySoft,
      minWidth: 84,
    },
    pledgeStreakLabel: { fontSize: fontSizes.xs, color: colors.primaryDark, fontWeight: '700' },
    pledgeStreakValue: { fontSize: fontSizes.md, fontWeight: '900', color: colors.primaryDark, marginTop: 2 },
    pledgeBtn: {
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pledgeBtnActive: { backgroundColor: colors.primary },
    pledgeBtnDone: { backgroundColor: '#10B981' },
    pledgeBtnText: { fontSize: fontSizes.md, fontWeight: '800', color: colors.white, textAlign: 'center' },
    pledgeBtnTextDone: { color: colors.white },
    inviteShareBtn: {
      borderRadius: radius.md,
      padding: spacing.md,
      backgroundColor: colors.primarySoft,
      borderWidth: 1.5,
      borderColor: colors.primary,
      gap: 2,
    },
    inviteShareBtnTitle: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.primaryDark },
    inviteShareBtnSub: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.primary },
    timerCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 4, marginTop: 12 },
    timerCardTitle: { fontSize: 18, fontWeight: '800' },
    timerCardSub: { fontSize: 13 },
  });
