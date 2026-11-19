import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useAnimatedValue,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { formatCountdown } from '../lib/calculations';
import { fontSizes, radius, shadows, spacing } from '../theme';
import { BubblePopGame } from './BubblePopGame';

const TRIGGERS = ['Kahve', 'Stres', 'Yemek', 'Sosyal'];
const DURATION = 60;
const INHALE_MS = 4000;
const EXHALE_MS = 6000;

type BreathPhase = 'idle' | 'running' | 'done';
type SosMode = 'breath' | 'game';

type SosBreathingModalProps = {
  visible: boolean;
  onClose: () => void;
};

/** Kriz anında açılan SOS ekranı: nefes egzersizi veya 60 sn baloncuk patlatma oyunu. */
export function SosBreathingModal({ visible, onClose }: SosBreathingModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { logCraving } = useApp();

  const breath = useAnimatedValue(0);
  const scale = useMemo(
    () =>
      breath.interpolate({
        inputRange: [0, 1],
        outputRange: [0.72, 1.14],
        extrapolate: 'clamp',
      }),
    [breath],
  );
  const haloOpacity = useMemo(
    () =>
      breath.interpolate({
        inputRange: [0, 1],
        outputRange: [0.22, 0.65],
        extrapolate: 'clamp',
      }),
    [breath],
  );

  const [mode, setMode] = useState<SosMode>('breath');
  const [trigger, setTrigger] = useState<string | null>(null);
  const [phase, setPhase] = useState<BreathPhase>('idle');
  const [remaining, setRemaining] = useState(DURATION);
  const [breathLabel, setBreathLabel] = useState('Nefes al');
  const [gameDone, setGameDone] = useState(false);
  const [gameScore, setGameScore] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const runningRef = useRef(false);
  const triggerRef = useRef<string | null>(null);
  const endAtRef = useRef(0);
  const loggedRef = useRef(false);

  useEffect(() => {
    triggerRef.current = trigger;
  }, [trigger]);

  const stopFx = useCallback(() => {
    runningRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    animRef.current?.stop();
    animRef.current = null;
  }, []);

  useEffect(() => () => stopFx(), [stopFx]);

  useEffect(() => {
    if (!visible) stopFx();
  }, [visible, stopFx]);

  const resetAll = useCallback(() => {
    stopFx();
    setMode('breath');
    setPhase('idle');
    setRemaining(DURATION);
    setBreathLabel('Nefes al');
    setTrigger(null);
    setGameDone(false);
    setGameScore(0);
    loggedRef.current = false;
    breath.setValue(0);
  }, [breath, stopFx]);

  const handleClose = useCallback(() => {
    resetAll();
    onClose();
  }, [onClose, resetAll]);

  const logResistedOnce = useCallback(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    logCraving(true, { trigger: triggerRef.current ?? undefined });
  }, [logCraving]);

  const finishBreath = useCallback(() => {
    stopFx();
    breath.setValue(0);
    setRemaining(0);
    setPhase('done');
    logResistedOnce();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [breath, logResistedOnce, stopFx]);

  const startBreath = useCallback(() => {
    if (runningRef.current) return;
    loggedRef.current = false;
    setPhase('running');
    setRemaining(DURATION);
    setBreathLabel('Nefes al');
    breath.setValue(0);
    runningRef.current = true;
    endAtRef.current = Date.now() + DURATION * 1000;

    const inhale = Animated.timing(breath, {
      toValue: 1,
      duration: INHALE_MS,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    });
    const exhale = Animated.timing(breath, {
      toValue: 0,
      duration: EXHALE_MS,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    });
    animRef.current = Animated.loop(Animated.sequence([inhale, exhale]));
    animRef.current.start();

    intervalRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      const elapsedMs = DURATION * 1000 - left * 1000;
      const nextLabel = elapsedMs % (INHALE_MS + EXHALE_MS) >= INHALE_MS ? 'Nefes ver' : 'Nefes al';
      setBreathLabel((prev) => (prev === nextLabel ? prev : nextLabel));
      if (left <= 0) finishBreath();
    }, 250);
  }, [breath, finishBreath]);

  const onGameComplete = useCallback(
    (score: number) => {
      setGameDone(true);
      setGameScore(score);
      logResistedOnce();
    },
    [logResistedOnce],
  );

  const switchMode = (next: SosMode) => {
    if (next === mode) return;
    stopFx();
    setPhase('idle');
    setRemaining(DURATION);
    setBreathLabel('Nefes al');
    breath.setValue(0);
    setGameDone(false);
    setGameScore(0);
    setMode(next);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.eyebrow}>KRİZ GELDİ</Text>
            <Text style={styles.title}>Dur, nefes al, devam et</Text>
            <Text style={styles.subtitle}>
              Tetikleyicini seç ve 60 saniyelik nefes egzersizi ya da dikkat dağıtıcı mini oyunla bu
              anı atlat.
            </Text>

            <View style={styles.modeRow}>
              <Pressable
                accessibilityRole="button"
                style={[styles.modeBtn, mode === 'breath' && styles.modeBtnActive]}
                onPress={() => switchMode('breath')}
                disabled={phase === 'running'}
              >
                <Text style={[styles.modeText, mode === 'breath' && styles.modeTextActive]}>
                  Nefes Egzersizi
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={[styles.modeBtn, mode === 'game' && styles.modeBtnActive]}
                onPress={() => switchMode('game')}
                disabled={phase === 'running'}
              >
                <Text style={[styles.modeText, mode === 'game' && styles.modeTextActive]}>
                  Baloncuk Patlatma (60 sn)
                </Text>
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>Tetikleyici (isteğe bağlı)</Text>
            <View style={styles.chipWrap}>
              {TRIGGERS.map((item) => {
                const active = trigger === item;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    disabled={phase === 'running'}
                    style={({ pressed }) => [
                      styles.chip,
                      active && styles.chipActive,
                      pressed && phase !== 'running' && styles.pressed,
                    ]}
                    onPress={() => setTrigger(active ? null : item)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>

            {mode === 'breath' ? (
              <>
                {phase === 'idle' ? (
                  <View style={styles.idleBox}>
                    <Text style={styles.idleEmoji}>🫁</Text>
                    <Text style={styles.idleText}>
                      4 saniye nefes al, 6 saniye nefes ver. Toplam 60 saniye.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                      onPress={startBreath}
                    >
                      <Text style={styles.primaryBtnText}>60 Saniyeyi Başlat</Text>
                    </Pressable>
                  </View>
                ) : null}

                {phase === 'running' ? (
                  <View style={styles.breathArea}>
                    <Animated.View
                      pointerEvents="none"
                      style={[styles.halo, { opacity: haloOpacity, transform: [{ scale }] }]}
                    />
                    <Animated.View style={[styles.circle, { transform: [{ scale }] }]}>
                      <Text style={styles.breathLabel}>{breathLabel}</Text>
                      <Text style={styles.breathCount}>{formatCountdown(remaining)}</Text>
                    </Animated.View>
                    <Text style={styles.breathHint}>
                      Dairenin büyümesiyle nefes al, küçülmesiyle ver.
                    </Text>
                    <View style={styles.runningActions}>
                      <Pressable
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
                        onPress={handleClose}
                      >
                        <Text style={styles.ghostBtnText}>Vazgeç</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                        onPress={finishBreath}
                      >
                        <Text style={styles.primaryBtnText}>Dayandım</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}

                {phase === 'done' ? (
                  <View style={styles.doneBox}>
                    <Text style={styles.doneEmoji}>🎉</Text>
                    <Text style={styles.doneTitle}>Krizi atlattın!</Text>
                    <Text style={styles.doneText}>
                      Bu istek dayanma olarak kaydedildi. İstersen tetikleyiciyi değiştirip tekrar
                      deneyebilirsin.
                    </Text>
                    {trigger ? <Text style={styles.doneTrigger}>Tetikleyici: {trigger}</Text> : null}
                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                      onPress={handleClose}
                    >
                      <Text style={styles.primaryBtnText}>Kapat</Text>
                    </Pressable>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.gameWrap}>
                <BubblePopGame
                  durationSec={60}
                  active={visible && mode === 'game'}
                  onComplete={onGameComplete}
                />
                {gameDone ? (
                  <View style={styles.gameDoneNote}>
                    <Text style={styles.gameDoneText}>
                      Krizi atlattığın kaydedildi. Puanın: {gameScore}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
                      onPress={handleClose}
                    >
                      <Text style={styles.ghostBtnText}>Kapat</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(3,8,20,0.72)',
      justifyContent: 'center',
      padding: spacing.md,
    },
    sheet: {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      maxHeight: '92%',
      ...shadows.card,
    },
    content: { padding: spacing.lg, gap: spacing.sm },
    eyebrow: {
      fontSize: fontSizes.xs,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: colors.danger,
    },
    title: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
    subtitle: {
      fontSize: fontSizes.sm,
      color: colors.textMuted,
      lineHeight: 20,
    },
    modeRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    modeBtn: {
      flex: 1,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
      alignItems: 'center',
    },
    modeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    modeText: {
      fontSize: fontSizes.xs,
      fontWeight: '800',
      color: colors.textMuted,
      textAlign: 'center',
    },
    modeTextActive: { color: colors.white },
    sectionLabel: {
      fontSize: fontSizes.sm,
      color: colors.textMuted,
      fontWeight: '700',
      marginTop: spacing.sm,
    },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
    idleBox: {
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.primarySoft,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginTop: spacing.sm,
    },
    idleEmoji: { fontSize: 42 },
    idleText: {
      fontSize: fontSizes.sm,
      color: colors.text,
      textAlign: 'center',
      lineHeight: 20,
    },
    primaryBtn: {
      backgroundColor: colors.danger,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
      minWidth: 190,
    },
    primaryBtnText: { color: colors.white, fontSize: fontSizes.md, fontWeight: '800' },
    ghostBtn: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    ghostBtnText: { color: colors.textMuted, fontSize: fontSizes.md, fontWeight: '700' },
    breathArea: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
      marginTop: spacing.md,
    },
    halo: {
      position: 'absolute',
      width: 230,
      height: 230,
      borderRadius: 115,
      backgroundColor: colors.primary,
    },
    circle: {
      width: 210,
      height: 210,
      borderRadius: 105,
      backgroundColor: colors.primaryDark,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.white,
    },
    breathLabel: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.white },
    breathCount: {
      fontSize: fontSizes.xxl,
      fontWeight: '800',
      color: colors.white,
      fontVariant: ['tabular-nums'],
      marginTop: spacing.xs,
    },
    breathHint: {
      fontSize: fontSizes.xs,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
    runningActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    doneBox: {
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.primarySoft,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginTop: spacing.sm,
    },
    doneEmoji: { fontSize: 44 },
    doneTitle: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
    doneText: {
      fontSize: fontSizes.sm,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    doneTrigger: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.primaryDark },
    gameWrap: { marginTop: spacing.sm },
    gameDoneNote: {
      marginTop: spacing.sm,
      alignItems: 'center',
      gap: spacing.sm,
    },
    gameDoneText: {
      fontSize: fontSizes.sm,
      fontWeight: '700',
      color: colors.success,
      textAlign: 'center',
    },
    pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  });
