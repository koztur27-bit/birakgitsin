import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { BubblePopGame } from '../components/BubblePopGame';
import { useApp } from '../context/AppContext';
import { triggerAction } from '../lib/coach';
import { fontSizes, radius, spacing } from '../theme';

type Phase = 'inhale' | 'hold' | 'exhale';

const PHASES: { key: Phase; label: string; seconds: number; scale: number }[] = [
  { key: 'inhale', label: '4 – Nefes Al', seconds: 4, scale: 1.35 },
  { key: 'hold', label: '7 – Tut', seconds: 7, scale: 1.35 },
  { key: 'exhale', label: '8 – Yavaşça Ver', seconds: 8, scale: 0.92 },
];

const TOOLS: { key: Tool; label: string }[] = [
  { key: 'breath', label: 'Nefes' },
  { key: 'urge', label: 'Sayaç' },
  { key: 'ground', label: 'Toprak' },
  { key: 'game', label: 'Baloncuk' },
];

type Tool = 'breath' | 'urge' | 'ground' | 'game';

const TRIGGERS = [
  'Kahve/çay',
  'Yemek sonrası',
  'Stres',
  'Sıkıntı',
  'Alkol',
  'Araba',
  'Sosyal ortam',
  'Telefon',
  'Diğer',
];

const GROUND = [
  { n: 5, prompt: 'Etrafında GÖREBİLDİĞİN 5 şeyi zihninde say.' },
  { n: 4, prompt: 'DOKUNABİLDİĞİN 4 şeyi yavaşça fark et.' },
  { n: 3, prompt: 'DUYABİLDİĞİN 3 sesi dinle.' },
  { n: 2, prompt: 'Alabildiğin 2 KOKUYU fark et.' },
  { n: 1, prompt: 'Ağzında hissettiğin 1 TADI fark et.' },
];

const URGES_SECONDS = 180;

export function CravingScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { data, logCraving } = useApp();

  const [tool, setTool] = useState<Tool>('breath');

  const [running, setRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(PHASES[0].seconds);
  const [rounds, setRounds] = useState(0);

  const [urgeLeft, setUrgeLeft] = useState(URGES_SECONDS);
  const [urgeRunning, setUrgeRunning] = useState(false);

  const [groundStep, setGroundStep] = useState(0);

  const [trigger, setTrigger] = useState<string | null>(null);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [logged, setLogged] = useState<string | null>(null);
  const action = triggerAction(trigger);

  const [scale] = useState(() => new Animated.Value(1));
  const breathTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const secondsRef = useRef(PHASES[0].seconds);

  const stopBreath = () => {
    if (breathTimer.current) clearInterval(breathTimer.current);
    breathTimer.current = null;
    secondsRef.current = PHASES[0].seconds;
    setRunning(false);
    setPhaseIndex(0);
    setSecondsLeft(PHASES[0].seconds);
    scale.setValue(1);
  };

  useEffect(
    () => () => {
      if (breathTimer.current) clearInterval(breathTimer.current);
      breathTimer.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!running) return;
    const phase = PHASES[phaseIndex];
    Animated.timing(scale, {
      toValue: phase.scale,
      duration: phase.seconds * 1000,
      useNativeDriver: true,
    }).start();

    const tick = setInterval(() => {
      const left = secondsRef.current - 1;
      if (left > 0) {
        secondsRef.current = left;
        setSecondsLeft(left);
        return;
      }
      // Faz bitti: sonraki nefes fazına geç. Tüm güncellemeler interval
      // içinde (dış olay) yapılır; effect gövdesinde setState çağrılmaz.
      const next = (phaseIndex + 1) % PHASES.length;
      if (next === 0) setRounds((r) => r + 1);
      secondsRef.current = PHASES[next].seconds;
      setPhaseIndex(next);
      setSecondsLeft(PHASES[next].seconds);
    }, 1000);
    breathTimer.current = tick;
    return () => clearInterval(tick);
  }, [running, phaseIndex, scale]);

  useEffect(() => {
    if (!urgeRunning) return;
    const t = setInterval(() => {
      setUrgeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          setUrgeRunning(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [urgeRunning]);



  const startUrge = () => {
    setUrgeLeft(URGES_SECONDS);
    setUrgeRunning(true);
  };



  const record = (resisted: boolean) => {
    logCraving(resisted, {
      intensity: intensity ?? undefined,
      trigger: trigger ?? undefined,
    });
    setLogged(
      resisted ? 'Harika! İçmeden atlattın. 💪' : 'Kaydettin. Önemli olan pes etmemek.',
    );
    setTrigger(null);
    setIntensity(null);
  };

  const totalCravings = data.cravings.length;
  const resistedCount = data.cravings.filter((c) => c.resisted).length;
  const resistedRate = totalCravings > 0 ? Math.round((resistedCount / totalCravings) * 100) : 0;

  const phase = PHASES[phaseIndex];
  const urgeProgress = (URGES_SECONDS - urgeLeft) / URGES_SECONDS;

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Kriz Anı</Text>
        <Text style={styles.subtitle}>
          Canın sigara çektiğinde buraya gel. İstek ortalama 3–5 dakika sürer; bu araçlarla
          tepe noktasını geç.
        </Text>

        <View style={styles.toolRow}>
          {TOOLS.map((t) => {
            const active = t.key === tool;
            return (
              <Pressable
                key={t.key}
                style={[styles.toolBtn, active && styles.toolBtnActive]}
                onPress={() => setTool(t.key)}
              >
                <Text style={[styles.toolText, active && styles.toolTextActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {tool === 'breath' ? (
          <Card style={styles.breathCard}>
            <Text style={styles.toolTitle}>4-7-8 Nefes</Text>
            <View style={styles.circleWrap}>
              <Animated.View style={[styles.circle, { transform: [{ scale }] }]}>
                <Text style={styles.circlePhase}>{phase.label}</Text>
                <Text style={styles.circleSeconds}>
                  {running && secondsLeft > 0 ? secondsLeft : ''}
                </Text>
              </Animated.View>
            </View>

            {!running ? (
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                onPress={() => {
                  setRounds(0);
                  secondsRef.current = PHASES[0].seconds;
                  setPhaseIndex(0);
                  setSecondsLeft(PHASES[0].seconds);
                  setRunning(true);
                }}
              >
                <Text style={styles.primaryBtnText}>Nefes Egzersizini Başlat</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.ghostBtn} onPress={stopBreath}>
                <Text style={styles.ghostBtnText}>Egzersizi Durdur</Text>
              </Pressable>
            )}

            <View style={styles.roundDots}>
              {Array.from({ length: 3 }).map((_, i) => (
                <View key={i} style={[styles.roundDot, i < rounds && styles.roundDotDone]} />
              ))}
            </View>
            <Text style={styles.toolHint}>4 saniye al · 7 saniye tut · 8 saniyede ver.</Text>
          </Card>
        ) : null}

        {tool === 'urge' ? (
          <Card style={styles.breathCard}>
            <Text style={styles.toolTitle}>İstek Sayacı</Text>
            <Text style={styles.toolHint}>
              İstek dalga gibidir: yükselir, zirve yapar ve kendiliğinden geçer. Sadece bekle.
            </Text>
            <Text style={[styles.urgeTime, urgeLeft === 0 && styles.urgeTimeDone]}>
              {String(Math.floor(urgeLeft / 60)).padStart(2, '0')}:
              {String(urgeLeft % 60).padStart(2, '0')}
            </Text>
            <View style={styles.urgeBar}>
              <ProgressBar progress={urgeProgress} color={colors.primary} height={8} />
            </View>
            {urgeLeft === 0 ? (
              <Text style={styles.urgeDone}>Dalga geçti! Şimdi ne kadar güçlü olduğunu gör. 🌊</Text>
            ) : urgeRunning ? (
              <Pressable style={styles.ghostBtn} onPress={() => setUrgeRunning(false)}>
                <Text style={styles.ghostBtnText}>Duraklat</Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                onPress={startUrge}
              >
                <Text style={styles.primaryBtnText}>
                  {urgeLeft < URGES_SECONDS ? 'Devam Et' : '3 Dakika Dayan'}
                </Text>
              </Pressable>
            )}
            {urgeLeft === 0 ? (
              <Pressable style={styles.ghostBtn} onPress={() => setUrgeLeft(URGES_SECONDS)}>
                <Text style={styles.ghostBtnText}>Baştan Başlat</Text>
              </Pressable>
            ) : null}
          </Card>
        ) : null}

        {tool === 'ground' ? (
          <Card style={styles.breathCard}>
            <Text style={styles.toolTitle}>5-4-3-2-1 Topraklama</Text>
            <Text style={styles.groundCount}>{GROUND[groundStep].n}</Text>
            <Text style={styles.groundPrompt}>{GROUND[groundStep].prompt}</Text>
            <View style={styles.roundDots}>
              {GROUND.map((_, i) => (
                <View key={i} style={[styles.roundDot, i <= groundStep && styles.roundDotDone]} />
              ))}
            </View>
            <View style={styles.twoBtns}>
              <Pressable
                style={styles.ghostBtnHalf}
                onPress={() => setGroundStep(Math.max(0, groundStep - 1))}
              >
                <Text style={styles.ghostBtnText}>Geri</Text>
              </Pressable>
              <Pressable
                style={styles.primaryBtnHalf}
                onPress={() =>
                  setGroundStep((s) => {
                    if (s >= GROUND.length - 1) {
                      Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Success,
                      ).catch(() => {});
                      return 0;
                    }
                    return s + 1;
                  })
                }
              >
                <Text style={styles.primaryBtnText}>
                  {groundStep >= GROUND.length - 1 ? 'Baştan' : 'Sonraki'}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.toolHint}>Dikkatini şimdiye ve bedenine getir.</Text>
          </Card>
        ) : null}

        {tool === 'game' ? (
          <Card style={styles.breathCard}>
            <BubblePopGame durationSec={60} />
          </Card>
        ) : null}

        <Card>
          <Text style={styles.toolTitle}>İsteği kaydet</Text>
          <Text style={styles.toolHint}>
            Neyin tetiklediğini ve şiddetini not et; uygulama riskli saatlerini öğrensin.
          </Text>

          <Text style={styles.formLabel}>Tetikleyici (isteğe bağlı)</Text>
          <View style={styles.chipWrap}>
            {TRIGGERS.map((tg) => {
              const active = trigger === tg;
              return (
                <Pressable
                  key={tg}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setTrigger(active ? null : tg)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{tg}</Text>
                </Pressable>
              );
            })}
          </View>

          {trigger ? (
            <View style={styles.actionCard}>
              <Text style={styles.actionTag}>
                Tetikleyiciye özel eylem · {action.seconds} sn
              </Text>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionBody}>{action.body}</Text>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                onPress={() => {
                  setTool(action.tool);
                  scrollRef.current?.scrollTo({ y: 0, animated: true });
                }}
              >
                <Text style={styles.actionBtnText}>{action.toolLabel}</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.formLabel}>Şiddet (1–5)</Text>
          <View style={styles.intensityRow}>
            {[1, 2, 3, 4, 5].map((n) => {
              const active = intensity === n;
              return (
                <Pressable
                  key={n}
                  style={[styles.intensityDot, active && styles.intensityDotActive]}
                  onPress={() => setIntensity(active ? null : n)}
                >
                  <Text style={[styles.intensityText, active && styles.intensityTextActive]}>
                    {n}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {logged ? <Text style={styles.loggedText}>{logged}</Text> : null}

          <View style={styles.twoBtns}>
            <Pressable
              style={({ pressed }) => [styles.resistBtnHalf, pressed && styles.pressed]}
              onPress={() => record(true)}
            >
              <Text style={styles.resistBtnText}>Dayandım, içmedim</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.smokeBtnHalf, pressed && styles.pressed]}
              onPress={() => record(false)}
            >
              <Text style={styles.smokeBtnText}>İçtim</Text>
            </Pressable>
          </View>
        </Card>

        <Card>
          <Text style={styles.statsTitle}>Kriz Karnen</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{totalCravings}</Text>
              <Text style={styles.statLabel}>Toplam kriz</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{resistedCount}</Text>
              <Text style={styles.statLabel}>Dayandığın</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>%{resistedRate}</Text>
              <Text style={styles.statLabel}>Başarı oranı</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    lineHeight: fontSizes.md + 4,
  },
  toolRow: { flexDirection: 'row', gap: spacing.sm },
  toolBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  toolBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toolText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textMuted },
  toolTextActive: { color: colors.white },
  breathCard: { alignItems: 'center' },
  toolTitle: {
    fontSize: fontSizes.md,
    fontWeight: '800',
    color: colors.text,
    alignSelf: 'flex-start',
  },
  toolHint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    lineHeight: fontSizes.sm + 4,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  actionCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: '#F0D19A',
  },
  actionTag: {
    fontSize: fontSizes.xs,
    fontWeight: '800',
    color: '#8A5A00',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  actionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.xs,
  },
  actionBody: {
    fontSize: fontSizes.sm,
    color: colors.text,
    lineHeight: fontSizes.md + 4,
    marginTop: spacing.xs,
  },
  actionBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  actionBtnText: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.text },
  circleWrap: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  circlePhase: {
    fontSize: fontSizes.md,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
  },
  circleSeconds: { fontSize: fontSizes.huge, fontWeight: '800', color: colors.accent },
  primaryBtn: {
    marginTop: spacing.sm,
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  primaryBtnHalf: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: fontSizes.md, fontWeight: '800', color: colors.white },
  ghostBtn: {
    marginTop: spacing.sm,
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  ghostBtnHalf: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  ghostBtnText: { fontSize: fontSizes.md, fontWeight: '700', color: colors.textMuted },
  roundDots: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  roundDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  roundDotDone: { backgroundColor: colors.primary },
  urgeTime: {
    fontSize: fontSizes.huge,
    fontWeight: '800',
    color: colors.primaryDark,
    fontVariant: ['tabular-nums'],
    marginTop: spacing.md,
  },
  urgeTimeDone: { color: colors.success },
  urgeBar: { width: '100%', marginTop: spacing.sm },
  urgeDone: {
    fontSize: fontSizes.md,
    fontWeight: '800',
    color: colors.success,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  groundCount: {
    fontSize: fontSizes.huge,
    fontWeight: '800',
    color: colors.primary,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  groundPrompt: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.text,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    lineHeight: fontSizes.xl + 2,
  },
  twoBtns: { flexDirection: 'row', gap: spacing.sm, width: '100%', marginTop: spacing.md },
  formLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.text,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textMuted },
  chipTextActive: { color: colors.white },
  intensityRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  intensityDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intensityDotActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  intensityText: { fontSize: fontSizes.md, fontWeight: '800', color: colors.textMuted },
  intensityTextActive: { color: '#5A3D00' },
  loggedText: {
    fontSize: fontSizes.sm,
    fontWeight: '800',
    color: colors.success,
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  resistBtnHalf: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resistBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: '800',
    color: '#8a5a00',
    textAlign: 'center',
  },
  smokeBtnHalf: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smokeBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textMuted },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  statsTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  statLabel: { fontSize: fontSizes.xs, color: colors.textMuted },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
});
