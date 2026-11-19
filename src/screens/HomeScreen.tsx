import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { CigaretteIcon } from '../components/CigaretteIcon';
import { MapBadge } from '../components/MapBadge';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenMapModal } from '../components/ScreenMapModal';
import { SosBreathingModal } from '../components/SosBreathingModal';
import { SuccessShareCard, SuccessShareCardHandle } from '../components/SuccessShareCard';
import { StatusPopup } from '../components/StatusPopup';
import { useApp } from '../context/AppContext';
import { updateWidgetData } from '../lib/widgetData';
import {
  avoidedOnDay,
  cigarettesAvoided,
  currentWindowIndex,
  dailyGoal,
  formatCountdown,
  fromMin,
  goalStreak,
  moneySavedOnDay,
  nextWindowInfo,
  nowMin,
  totalMoneySaved,
  todayKey,
  daysSinceStart,
  elapsedDays,
  formatMoney,
  formatMoneyShort,
  formatDuration,
  formatUntil,
  milestones,
  getLog,
  cravingHours,
  windowAllowances,
  windowSmokedOn,
} from '../lib/calculations';
import { fontSizes, radius, shadows, spacing } from '../theme';
import { reloadApp } from '../lib/reload';
import { downloadAndInstallUpdate } from '../lib/updater';

type HomeScreenProps = {
  onOpenCraving: () => void;
};

export function HomeScreen({ onOpenCraving }: HomeScreenProps) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const {
    data,
    logCigarette,
    logSlip,
    undoCigarette,
    timer,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    dismissTimer,
    setSavingsGoal,
  } = useApp();
  const plan = data.plan;
  const [smokeNote, setSmokeNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapNumbers, setMapNumbers] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [goalEditing, setGoalEditing] = useState(false);
  const [goalTitle, setGoalTitle] = useState(data.savingsGoal?.title ?? '');
  const [goalTarget, setGoalTarget] = useState(
    data.savingsGoal ? String(data.savingsGoal.target) : '',
  );

  const saveGoal = () => {
    const title = goalTitle.trim();
    const target = Number(goalTarget.replace(',', '.'));
    if (!title || !Number.isFinite(target) || target <= 0) {
      Alert.alert('Tasarruf hedefi', 'Ürün adı ve geçerli bir hedef tutarı gir.');
      return;
    }
    setSavingsGoal({ title, target });
    setGoalEditing(false);
  };

  const shareCardRef = useRef<SuccessShareCardHandle>(null);
  const shareSuccess = async () => {
    await shareCardRef.current?.share();
  };

  const doUpdate = async () => {
    if (Platform.OS === 'web') {
      reloadApp();
      return;
    }
    if (updating) return;
    setUpdating(true);
    const result = await downloadAndInstallUpdate();
    setUpdating(false);
    Alert.alert('Güncelleme', result.message);
  };

  const showSmokeNote = (text: string) => {
    setSmokeNote(text);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setSmokeNote(null), 2600);
  };

  const handleSlip = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    const { avoided } = logSlip({ windowIndex });
    const msg = `Sorun değil, şu ana kadar içmediğin ${avoided} sigara hâlâ senin büyük başarın. Kaldığımız yerden devam ediyoruz!`;
    if (Platform.OS === 'web') {
      (globalThis as any).alert?.(msg);
    } else {
      Alert.alert('1 Dal İçtim', msg);
    }
  };

  useEffect(() => {
    if (!plan) return;
    const key = todayKey();
    const todayRecord = getLog(data.logs, key);
    const todayGoal = dailyGoal(plan, key, data.logs);
    const savedTotal = totalMoneySaved(plan, data.logs);
    const currentStreak = goalStreak(plan, data.logs);
    const upcoming = nextWindowInfo(plan);
    const upcomingStr = upcoming ? fromMin((nowMin() + upcoming.minutes) % 1440) : '--:--';
    const elapsedMs = elapsedDays(plan) * 24 * 60 * 60 * 1000;
    const quitDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
    const quitHours = Math.floor((elapsedMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const quitText = `${quitDays} gün ${String(quitHours).padStart(2, '0')} saat`;
    const savingsText = formatMoneyShort(savedTotal, plan.currency);
    updateWidgetData(
      todayRecord.smoked,
      todayGoal,
      savedTotal,
      currentStreak,
      upcomingStr,
      quitText,
      savingsText,
    );
  }, [data, plan]);

  if (!plan) return null;

  const today = todayKey();
  const record = getLog(data.logs, today);
  const todayTimes = record.times ?? [];
  const goal = dailyGoal(plan, today, data.logs);
  const linearGoal = Math.max(
    0,
    plan.baselinePerDay - Math.floor(daysSinceStart(plan, today) / 7) * plan.weeklyReduction,
  );
  const adaptiveActive = plan.adaptive !== false && goal !== linearGoal;
  const remaining = Math.max(0, goal - record.smoked);
  const underGoal = record.smoked <= goal;
  const progress = goal > 0 ? record.smoked / goal : record.smoked > 0 ? 1 : 0;

  const activeWindow = currentWindowIndex(plan);
  const windowIndex = activeWindow >= 0 ? activeWindow : null;
  const allowances = windowAllowances(goal, plan.windows);
  const nextWindow = nextWindowInfo(plan);
  const nextWindowStr = nextWindow
    ? fromMin((nowMin() + nextWindow.minutes) % 1440)
    : '--:--';

  const savedToday = moneySavedOnDay(plan, record);
  const savedTotal = totalMoneySaved(plan, data.logs);
  const avoided = cigarettesAvoided(plan, data.logs);
  const streak = goalStreak(plan, data.logs);
  const savingsGoal = data.savingsGoal;
  const goalProgress =
    savingsGoal && savingsGoal.target > 0
      ? Math.min(1, Math.max(0, savedTotal / savingsGoal.target))
      : 0;
  const goalRemaining = savingsGoal
    ? Math.max(0, savingsGoal.target - savedTotal)
    : 0;

  const days = daysSinceStart(plan, today);

  const elapsed = elapsedDays(plan);
  const [nextMilestone] = milestones().filter((m) => m.days > elapsed);
  const untilText = nextMilestone ? formatUntil(nextMilestone.days - elapsed) : '';
  const hourRisk = cravingHours(data.cravings)[new Date().getHours()] ?? 0;

  const dateText = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const heroStatus =
    plan.windows.length > 0 && activeWindow >= 0
      ? `${plan.windows[activeWindow].start}–${plan.windows[activeWindow].end} penceresindesin · Kalan hak: ${
          Math.max(0, (allowances[activeWindow] ?? 0) - windowSmokedOn(record, activeWindow))
        } sigara`
      : plan.windows.length > 0
        ? `Pencere dışındasın · Sıradaki penceren: ${nextWindowStr}`
        : underGoal
          ? `Kalan hakkın: ${remaining} sigara. Hedefinin altındasın, devam!`
          : 'Bugün hedefi aştın. Sorun değil, yarın yeniden başla.';

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {mapNumbers ? (
          <Pressable style={styles.mapHint} onPress={() => setMapOpen(true)}>
            <MapBadge code="Harita" />
            <Text style={styles.mapHintText}>
              Numaralar açık. Bir bölgeyi söylemek için numarasını yaz. Listeyi görmek için dokun.
            </Text>
          </Pressable>
        ) : null}
        <View style={styles.header}>
          <View>
            <View style={styles.mapRow}>
              <Text style={styles.brand}>Bırak Gitsin</Text>
              {mapNumbers ? <MapBadge code="1" /> : null}
            </View>
            <Text style={styles.date}>{dateText}</Text>
          </View>
          <View style={styles.daysChip}>
            <Text style={styles.daysChipText}>{formatDuration(days)}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={[styles.reloadChip, mapNumbers && styles.reloadChipActive]}
            onPress={() => setMapOpen(true)}
            hitSlop={8}
          >
            <Text style={[styles.reloadChipText, mapNumbers && styles.reloadChipTextActive]}>
              {mapNumbers ? 'Harita ✓' : 'Harita'}
            </Text>
          </Pressable>
          <Pressable style={styles.reloadChip} onPress={() => setStatusOpen(true)} hitSlop={8}>
            <Text style={styles.reloadChipText}>Durum</Text>
          </Pressable>
          <Pressable
            style={[styles.reloadChip, updating && styles.reloadChipDisabled]}
            onPress={doUpdate}
            disabled={updating}
            hitSlop={8}
          >
            <Text style={styles.reloadChipText}>{updating ? 'İndiriliyor…' : 'Güncelle'}</Text>
          </Pressable>
          <Pressable style={styles.reloadChip} onPress={shareSuccess} hitSlop={8}>
            <Text style={styles.reloadChipText}>Paylaş</Text>
          </Pressable>
        </View>

        <Pressable style={styles.refreshBar} onPress={reloadApp}>
          {mapNumbers ? <MapBadge code="2" /> : null}
          <Text style={styles.refreshBarText}>↻  Sayfayı yenile</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kriz Geldi, nefes egzersizini başlat"
          style={({ pressed }) => [styles.sosBtn, pressed && styles.pressed]}
          onPress={() => setSosOpen(true)}
        >
          {mapNumbers ? <MapBadge code="10" style={styles.sosBadge} /> : null}
          <Text style={styles.sosEmoji}>🆘</Text>
          <View style={styles.sosText}>
            <Text style={styles.sosTitle}>Kriz Geldi (SOS)</Text>
            <Text style={styles.sosSub}>60 sn nefes egzersizi veya baloncuk oyunu</Text>
          </View>
          <Text style={styles.sosArrow}>›</Text>
        </Pressable>

        <LinearGradient
          colors={[colors.primary, colors.primaryDarker]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {mapNumbers ? <MapBadge code="3" style={styles.heroMapBadge} /> : null}
          <View style={styles.cigLogBox}>
            <View style={styles.cigLogHead}>
              <View style={styles.mapRow}>
                {mapNumbers ? <MapBadge code="3a" /> : null}
                <Text style={styles.cigLogTitle}>Bugün içtiklerin</Text>
              </View>
              <Text style={styles.cigLogCount}>{record.smoked}</Text>
            </View>
            {todayTimes.length === 0 ? (
              <Text style={styles.cigLogEmpty}>
                {record.smoked === 0
                  ? 'Bugün henüz sigara içmedin 🎉'
                  : `${record.smoked} sigara · (saat kaydı yok)`}
              </Text>
            ) : (
              <View style={styles.cigLogList}>
                {todayTimes.map((t, i) => (
                  <View key={`${t}-${i}`} style={styles.cigLogItem}>
                    <CigaretteIcon size={20} />
                    <Text style={styles.cigLogTime}>
                      {new Date(t).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.mapRow}>
            {mapNumbers ? <MapBadge code="3b" /> : null}
            <Text style={styles.heroTitle}>Bugünkü hedefin</Text>
          </View>
          <View style={styles.heroGoalRow}>
            <Text style={styles.heroGoal}>{goal}</Text>
            <CigaretteIcon size={22} style={styles.heroGoalIcon} />
            <Text style={styles.heroGoalUnit}>sigara</Text>
          </View>
          {adaptiveActive ? (
            <Text style={styles.adaptiveNote}>
              Sana göre plan: bu hafta hedefin {goal} sigara.
            </Text>
          ) : null}

          <View style={[styles.mapRow, styles.heroSpacer]}>
            {mapNumbers ? <MapBadge code="3c" /> : null}
            <Text style={styles.heroLabel}>Bugün içtiğin</Text>
          </View>
          <View style={styles.smokedRow}>
            <Text style={styles.heroCount}>{record.smoked}</Text>
            <CigaretteIcon size={30} style={styles.smokedIcon} />
          </View>

          {mapNumbers ? (
            <View style={styles.mapRow}>
              <MapBadge code="3d" />
            </View>
          ) : null}
          <View style={styles.heroProgress}>
            <ProgressBar progress={progress} color={colors.accent} height={8} />
          </View>

          <View style={styles.mapRow}>
            {mapNumbers ? <MapBadge code="3e" /> : null}
            <Text style={[styles.heroStatus, styles.mapTextFlex]}>{heroStatus}</Text>
          </View>

          {smokeNote ? <Text style={styles.smokeNote}>{smokeNote}</Text> : null}

          <View style={styles.actions}>
            {mapNumbers ? <MapBadge code="3f" style={styles.actionsBadge} /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Bir sigara içtim olarak kaydet"
              style={({ pressed }) => [styles.logBtn, pressed && styles.pressed]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                logCigarette({ windowIndex });
                showSmokeNote(`Dayanma sayacı ${timer.minutes} dk ile yeniden başladı`);
              }}
            >
              <Text style={styles.logBtnText}>+1 Sigara içtim</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Son sigara kaydını geri al"
              style={({ pressed }) => [
                styles.undoBtn,
                record.smoked === 0 && styles.undoDisabled,
                pressed && styles.pressed,
              ]}
              disabled={record.smoked === 0}
              onPress={() => undoCigarette({ windowIndex })}
            >
              <Text style={styles.undoText}>Geri al</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="1 dal içtim, kaçamak oldu"
            style={({ pressed }) => [styles.slipBtn, pressed && styles.pressed]}
            onPress={handleSlip}
          >
            <Text style={styles.slipBtnText}>1 Dal İçtim (Kaçamak Oldu)</Text>
            <Text style={styles.slipBtnSub}>Serini sıfırlamaz, şefkatle devam et</Text>
          </Pressable>
        </LinearGradient>

        <Card style={styles.timerCard}>
          <View style={styles.timerHead}>
            <View style={styles.timerInfo}>
              <View style={styles.mapRow}>
                {mapNumbers ? <MapBadge code="4" /> : null}
                <Text style={styles.cardLabel}>Dayanma sayacı</Text>
              </View>
              <Text style={styles.timerStatusText}>
                {timer.status === 'running'
                  ? 'sayıyor...'
                  : timer.status === 'paused'
                    ? 'duraklatıldı'
                    : timer.status === 'done'
                      ? 'süre doldu!'
                      : `hedef ${timer.minutes} dk`}
              </Text>
            </View>
            <Text
              style={[
                styles.timerTime,
                timer.status === 'done' && styles.timerTimeDone,
              ]}
            >
              {formatCountdown(timer.remaining)}
            </Text>
          </View>

          <View style={styles.timerProgress}>
            <ProgressBar
              progress={timer.minutes > 0 ? timer.remaining / (timer.minutes * 60) : 1}
              color={timer.status === 'done' ? colors.accent : colors.primary}
              height={6}
            />
          </View>

          <View style={styles.timerControls}>
            {timer.status === 'idle' ? (
              <Pressable style={styles.timerPrimaryBtn} onPress={() => startTimer()}>
                <Text style={styles.timerPrimaryText}>Sayacı Başlat</Text>
              </Pressable>
            ) : timer.status === 'running' ? (
              <Pressable style={styles.timerPrimaryBtn} onPress={pauseTimer}>
                <Text style={styles.timerPrimaryText}>Duraklat</Text>
              </Pressable>
            ) : timer.status === 'paused' ? (
              <Pressable style={styles.timerPrimaryBtn} onPress={resumeTimer}>
                <Text style={styles.timerPrimaryText}>Devam Et</Text>
              </Pressable>
            ) : null}

            {timer.status === 'done' ? (
              <Pressable style={styles.timerDoneBtn} onPress={dismissTimer}>
                <Text style={styles.timerDoneText}>Dayandım, Tamam</Text>
              </Pressable>
            ) : timer.status !== 'idle' ? (
              <Pressable style={styles.timerGhostBtn} onPress={resetTimer}>
                <Text style={styles.timerGhostText}>Sıfırla</Text>
              </Pressable>
            ) : null}
          </View>
        </Card>

        {mapNumbers ? (
          <View style={styles.mapRow}>
            <MapBadge code="5" />
          </View>
        ) : null}
        <View style={styles.cardsRow}>
          <Card style={styles.halfCard}>
            <Text style={styles.cardLabel}>Bugün kazandın</Text>
            <Text style={styles.moneyBig}>{formatMoney(savedToday, plan.currency)}</Text>
            <Text style={styles.moneySmall}>
              {avoidedOnDay(plan, record)} sigara içmedin
            </Text>
          </Card>
          <Card style={styles.halfCard}>
            <Text style={styles.cardLabel}>Toplam kazandın</Text>
            <Text style={styles.moneyBig}>{formatMoney(savedTotal, plan.currency)}</Text>
            <Text style={styles.moneySmall}>{avoided} sigara içmedin</Text>
          </Card>
        </View>

        <Card style={styles.goalCard}>
          <View style={styles.cardTitleRow}>
            {mapNumbers ? <MapBadge code="11" /> : null}
            <Text style={styles.cardLabel}>Tasarruf Hedefi</Text>
          </View>

          {!savingsGoal || goalEditing ? (
            <View style={styles.goalForm}>
              <Text style={styles.goalHint}>
                Biriken paranla almak istediğin şeyi yaz; ilerlemeni buradan takip et.
              </Text>
              <TextInput
                style={styles.goalInput}
                placeholder="Örn. Yeni kulaklık"
                placeholderTextColor={colors.textMuted}
                value={goalTitle}
                onChangeText={setGoalTitle}
                maxLength={60}
              />
              <TextInput
                style={styles.goalInput}
                placeholder={`Hedef tutar (${plan.currency})`}
                placeholderTextColor={colors.textMuted}
                value={goalTarget}
                onChangeText={setGoalTarget}
                keyboardType="decimal-pad"
                maxLength={12}
              />
              <View style={styles.goalFormActions}>
                {savingsGoal ? (
                  <Pressable style={styles.goalGhostBtn} onPress={() => setGoalEditing(false)}>
                    <Text style={styles.goalGhostText}>Vazgeç</Text>
                  </Pressable>
                ) : null}
                <Pressable style={styles.goalSaveBtn} onPress={saveGoal}>
                  <Text style={styles.goalSaveText}>Hedefi Kaydet</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.goalBody}>
              <View style={styles.goalHead}>
                <View style={styles.goalHeadText}>
                  <Text style={styles.goalTitle}>{savingsGoal.title}</Text>
                  <Text style={styles.goalTargetText}>
                    Hedef: {formatMoney(savingsGoal.target, plan.currency)}
                  </Text>
                </View>
                <Text style={styles.goalPercent}>%{Math.round(goalProgress * 100)}</Text>
              </View>
              <ProgressBar
                progress={goalProgress}
                color={goalProgress >= 1 ? colors.success : colors.accent}
                height={10}
              />
              <Text style={styles.goalStatus}>
                {goalProgress >= 1
                  ? `Hedefe ulaştın! ${formatMoney(savingsGoal.target, plan.currency)} biriktirdin. 🎉`
                  : `Kalan: ${formatMoney(goalRemaining, plan.currency)} · Biriktirdin: ${formatMoney(
                      savedTotal,
                      plan.currency,
                    )}`}
              </Text>
              <View style={styles.goalFormActions}>
                <Pressable
                  style={styles.goalGhostBtn}
                  onPress={() => {
                    setSavingsGoal(null);
                    setGoalTitle('');
                    setGoalTarget('');
                  }}
                >
                  <Text style={styles.goalGhostText}>Hedefi kaldır</Text>
                </Pressable>
                <Pressable
                  style={styles.goalGhostBtn}
                  onPress={() => {
                    setGoalTitle(savingsGoal.title);
                    setGoalTarget(String(savingsGoal.target));
                    setGoalEditing(true);
                  }}
                >
                  <Text style={styles.goalGhostText}>Düzenle</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Card>

        {plan.windows.length > 0 ? (
          <Card>
            <View style={styles.mapRow}>
              {mapNumbers ? <MapBadge code="6" /> : null}
              <Text style={styles.cardLabel}>İzinli pencereler</Text>
            </View>
            {plan.windows.map((window, i) => {
              const allowance = allowances[i] ?? 0;
              const smokedInWindow = windowSmokedOn(record, i);
              const winRemaining = Math.max(0, allowance - smokedInWindow);
              const isActive = i === activeWindow;
              const winProgress = allowance > 0 ? smokedInWindow / allowance : 1;
              return (
                <View key={i} style={styles.windowRow}>
                  <View
                    style={[
                      styles.windowDot,
                      isActive && styles.windowDotActive,
                      winRemaining === 0 && allowance > 0 && styles.windowDotDone,
                    ]}
                  />
                  <View style={styles.windowInfo}>
                    <Text style={styles.windowTime}>
                      {window.start}–{window.end}
                      {isActive ? '  ·  aktif' : ''}
                    </Text>
                    <ProgressBar
                      progress={winProgress}
                      color={winRemaining === 0 ? colors.success : colors.accent}
                      height={6}
                      label={`Hak ${allowance} · İçilen ${smokedInWindow}`}
                    />
                  </View>
                  <Text style={styles.windowRemaining}>{winRemaining}</Text>
                </View>
              );
            })}
            {activeWindow < 0 ? (
              <Text style={styles.cardHint}>
                Şu an pencere dışı. İzin penceresi gelene kadar içmeden durmaya çalış.
              </Text>
            ) : null}
          </Card>
        ) : null}

        <Card>
          <View style={styles.mapRow}>
            {mapNumbers ? <MapBadge code="7" /> : null}
            <Text style={styles.cardLabel}>Hedefe sadık kaldığın gün</Text>
          </View>
          <Text style={styles.bigNumber}>{streak}</Text>
          <ProgressBar progress={Math.min(1, streak / 7)} />
          <Text style={styles.cardHint}>7 gün üst üste hedefini tuttur, yeni bir rozet!</Text>
        </Card>

        <Card>
          <View style={styles.mapRow}>
            {mapNumbers ? <MapBadge code="8" /> : null}
            <Text style={styles.cardLabel}>Sıradaki sağlık kazancı</Text>
          </View>
          {nextMilestone ? (
            <>
              <Text style={styles.milestoneLabel}>
                {nextMilestone.emoji} {nextMilestone.label}
              </Text>
              <Text style={styles.milestoneDetail}>{nextMilestone.detail}</Text>
              <Text style={styles.milestoneDays}>{untilText} sonra</Text>
            </>
          ) : (
            <Text style={styles.milestoneDetail}>
              🎉 Bugüne kadar tüm büyük sağlık kilometre taşlarını geçtin.
            </Text>
          )}
        </Card>

        {hourRisk >= 2 ? (
          <View style={styles.riskWarn}>
            <Text style={styles.riskWarnTitle}>⚠️ Dikkatli ol</Text>
            <Text style={styles.riskWarnText}>
              Geçmişte bu saatlerde canın {hourRisk} kez sigara çekmiş. Şimdi bir kriz aracı
              (nefes, topraklama) hazır tut.
            </Text>
          </View>
        ) : null}

        <Pressable style={styles.cravingCta} onPress={onOpenCraving}>
          <Text style={styles.cravingCtaText}>Canın mı çekti? Kriz modunu başlat</Text>
        </Pressable>
      </ScrollView>

      {mapNumbers ? (
        <View style={styles.mapTabBadge} pointerEvents="none">
          <MapBadge code="9" />
        </View>
      ) : null}

      <ScreenMapModal
        visible={mapOpen}
        onClose={() => setMapOpen(false)}
        showNumbers={mapNumbers}
        onToggleNumbers={setMapNumbers}
      />

      <StatusPopup visible={statusOpen} onClose={() => setStatusOpen(false)} />
      <SosBreathingModal visible={sosOpen} onClose={() => setSosOpen(false)} />
      <SuccessShareCard
        ref={shareCardRef}
        durationText={`${Math.floor(elapsedDays(plan) * 24 / 24)} gün ${Math.floor(elapsedDays(plan) * 24) % 24} saat`}
        avoidedTotal={avoided}
        savedText={formatMoney(savedTotal, plan.currency)}
      />
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  mapRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mapTextFlex: { flex: 1 },
  heroSpacer: { marginTop: spacing.sm },
  heroMapBadge: { alignSelf: 'flex-start', marginBottom: spacing.xs },
  actionsBadge: { alignSelf: 'center' },
  mapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  mapHintText: { flex: 1, fontSize: fontSizes.xs, color: '#8a5a00', fontWeight: '700' },
  mapTabBadge: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  brand: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.text,
  },
  date: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  daysChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.round,
    backgroundColor: colors.primarySoft,
  },
  daysChipText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.primaryDark },
  reloadChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  reloadChipText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textMuted },
  reloadChipDisabled: { opacity: 0.6 },
  reloadChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  reloadChipTextActive: { color: colors.white },
  refreshBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
  },
  refreshBarText: { fontSize: fontSizes.md, fontWeight: '800', color: colors.primaryDark },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: 2,
    ...shadows.card,
  },
  heroTitle: { fontSize: fontSizes.sm, color: 'rgba(255,255,255,0.85)' },
  heroGoal: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: colors.white,
  },
  heroGoalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroGoalIcon: { marginTop: 4 },
  heroGoalUnit: { fontSize: fontSizes.md, fontWeight: '600', color: colors.white },
  adaptiveNote: {
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
  },
  heroLabel: {
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  smokedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  smokedIcon: { marginBottom: spacing.xs },
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
  timerCard: { gap: spacing.md },
  timerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timerInfo: { gap: 2 },
  timerStatusText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  timerTime: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: colors.primaryDark,
    fontVariant: ['tabular-nums'],
  },
  timerTimeDone: { color: colors.danger },
  timerProgress: { marginTop: spacing.xs },
  timerControls: { flexDirection: 'row', gap: spacing.sm },
  timerPrimaryBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  timerPrimaryText: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.white },
  timerDoneBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
    alignItems: 'center',
  },
  timerDoneText: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.white },
  timerGhostBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerGhostText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textMuted },
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
  slipBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  slipBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '800',
    color: colors.white,
  },
  slipBtnSub: {
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfCard: { flex: 1 },
  cardLabel: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontWeight: '600',
  },
  moneyBig: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.xs,
  },
  moneySmall: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  bigNumber: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: colors.primaryDark,
    marginVertical: spacing.xs,
  },
  cardHint: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: spacing.sm },
  windowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  windowDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  windowDotActive: { backgroundColor: colors.primary },
  windowDotDone: { backgroundColor: colors.success },
  windowInfo: { flex: 1, gap: spacing.xs },
  windowTime: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.text,
  },
  windowRemaining: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  milestoneLabel: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  milestoneDetail: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    lineHeight: fontSizes.md + 4,
    marginTop: 2,
  },
  milestoneDays: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: spacing.sm,
  },
  riskWarn: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.md,
    gap: 2,
  },
  riskWarnTitle: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.danger },
  riskWarnText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    lineHeight: fontSizes.md + 4,
  },
  cravingCta: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  cravingCtaText: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: '#8a5a00',
  },
  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  sosBadge: { alignSelf: 'flex-start' },
  sosEmoji: { fontSize: 26 },
  sosText: { flex: 1, gap: 2 },
  sosTitle: { fontSize: fontSizes.md, fontWeight: '800', color: colors.danger },
  sosSub: { fontSize: fontSizes.xs, color: colors.textMuted },
  sosArrow: { fontSize: fontSizes.xl, color: colors.danger },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  goalCard: { gap: spacing.sm },
  goalForm: { gap: spacing.sm, marginTop: spacing.xs },
  goalHint: { fontSize: fontSizes.xs, color: colors.textMuted, lineHeight: 18 },
  goalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: fontSizes.sm,
  },
  goalFormActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  goalGhostBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalGhostText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textMuted },
  goalSaveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  goalSaveText: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.white },
  goalBody: { gap: spacing.sm, marginTop: spacing.xs },
  goalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalHeadText: { flex: 1, gap: 2 },
  goalTitle: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
  goalTargetText: { fontSize: fontSizes.sm, color: colors.textMuted },
  goalPercent: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.primaryDark },
  goalStatus: { fontSize: fontSizes.sm, color: colors.textMuted, lineHeight: 20 },
});