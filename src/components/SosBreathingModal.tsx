import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
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

const DURATION = 60;
const INHALE_MS = 4000;
const EXHALE_MS = 6000;

type BreathPhase = 'idle' | 'running' | 'done';
type SosMode = 'breath' | 'game';

type SosBreathingModalProps = {
  visible: boolean;
  onClose: () => void;
  onGamePassed?: () => void;
};

export function SosBreathingModal({ visible, onClose, onGamePassed }: SosBreathingModalProps) {
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data, logCraving } = useApp();

  const triggers = locale === 'en' ? ['Coffee', 'Stress', 'Meal', 'Social'] : ['Kahve', 'Stres', 'Yemek', 'Sosyal'];
  const inhaleLabel = locale === 'en' ? 'Breathe in' : 'Nefes al';
  const exhaleLabel = locale === 'en' ? 'Breathe out' : 'Nefes ver';

  const breath = useAnimatedValue(0);
  const scale = useMemo(() => breath.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.14], extrapolate: 'clamp' }), [breath]);
  const haloOpacity = useMemo(() => breath.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.65], extrapolate: 'clamp' }), [breath]);

  const [mode, setMode] = useState<SosMode>('breath');
  const [trigger, setTrigger] = useState<string | null>(null);
  const [phase, setPhase] = useState<BreathPhase>('idle');
  const [remaining, setRemaining] = useState(DURATION);
  const [breathLabel, setBreathLabel] = useState(inhaleLabel);
  const [gameDone, setGameDone] = useState(false);
  const [gameScore, setGameScore] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const runningRef = useRef(false);
  const triggerRef = useRef<string | null>(null);
  const endAtRef = useRef(0);
  const loggedRef = useRef(false);

  useEffect(() => { triggerRef.current = trigger; }, [trigger]);
  // breath label for idle/reset is handled by inhaleLabel at start/reset time

  const stopFx = useCallback(() => {
    runningRef.current = false;
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    animRef.current?.stop();
    animRef.current = null;
  }, []);

  useEffect(() => () => stopFx(), [stopFx]);
  useEffect(() => { if (!visible) stopFx(); }, [visible, stopFx]);

  const resetAll = useCallback(() => {
    stopFx();
    setMode('breath');
    setPhase('idle');
    setRemaining(DURATION);
    setBreathLabel(inhaleLabel);
    setTrigger(null);
    setGameDone(false);
    setGameScore(0);
    loggedRef.current = false;
    breath.setValue(0);
  }, [breath, inhaleLabel, stopFx]);

  const handleClose = useCallback(() => { resetAll(); onClose(); }, [onClose, resetAll]);

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
    setBreathLabel(inhaleLabel);
    breath.setValue(0);
    runningRef.current = true;
    endAtRef.current = Date.now() + DURATION * 1000;

    const inhale = Animated.timing(breath, { toValue: 1, duration: INHALE_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true });
    const exhale = Animated.timing(breath, { toValue: 0, duration: EXHALE_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true });
    animRef.current = Animated.loop(Animated.sequence([inhale, exhale]));
    animRef.current.start();

    intervalRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      const elapsedMs = DURATION * 1000 - left * 1000;
      const nextLabel = elapsedMs % (INHALE_MS + EXHALE_MS) >= INHALE_MS ? exhaleLabel : inhaleLabel;
      setBreathLabel((prev) => (prev === nextLabel ? prev : nextLabel));
      if (left <= 0) finishBreath();
    }, 250);
  }, [breath, exhaleLabel, finishBreath, inhaleLabel]);

  const onGameComplete = useCallback((score: number) => {
    setGameDone(true);
    setGameScore(score);
    logResistedOnce();
    onGamePassed?.();
  }, [logResistedOnce, onGamePassed]);

  const switchMode = (next: SosMode) => {
    if (next === mode) return;
    stopFx();
    setPhase('idle');
    setRemaining(DURATION);
    setBreathLabel(inhaleLabel);
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
            {data.quitMotivation && (data.quitMotivation.text || data.quitMotivation.photoUri) ? (
              <View style={styles.motivationBox}>
                <View style={styles.motivationHead}>
                  {data.quitMotivation.photoUri ? (
                    <Image source={{ uri: data.quitMotivation.photoUri }} style={styles.motivationPhoto} />
                  ) : (
                    <View style={styles.motivationIconWrap}><Text style={styles.motivationIcon}>💙</Text></View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.motivationTitle}>{t('motivation.sosTitle')}</Text>
                    {data.quitMotivation.text ? (
                      <Text style={styles.motivationBody}>{data.quitMotivation.text}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ) : null}
            <Text style={styles.eyebrow}>{locale === 'en' ? 'CRAVING ALERT' : 'KRİZ GELDİ'}</Text>
            <Text style={styles.title}>{locale === 'en' ? 'Pause, breathe, carry on' : 'Dur, nefes al, devam et'}</Text>
            <Text style={styles.subtitle}>
              {locale === 'en'
                ? 'Pick your trigger and get through this moment with a 60-second breathing exercise or a mini game.'
                : 'Tetikleyicini seç ve 60 saniyelik nefes egzersizi ya da dikkat dağıtıcı mini oyunla bu anı atlat.'}
            </Text>

            <View style={styles.modeRow}>
              <Pressable style={[styles.modeBtn, mode === 'breath' && styles.modeBtnActive]} onPress={() => switchMode('breath')} disabled={phase === 'running'}>
                <Text style={[styles.modeText, mode === 'breath' && styles.modeTextActive]}>
                  {locale === 'en' ? 'Breathing' : 'Nefes Egzersizi'}
                </Text>
              </Pressable>
              <Pressable style={[styles.modeBtn, mode === 'game' && styles.modeBtnActive]} onPress={() => switchMode('game')} disabled={phase === 'running'}>
                <Text style={[styles.modeText, mode === 'game' && styles.modeTextActive]}>
                  {locale === 'en' ? 'Bubble Pop (60s)' : 'Baloncuk Patlatma (60 sn)'}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>{locale === 'en' ? 'Trigger (optional)' : 'Tetikleyici (isteğe bağlı)'}</Text>
            <View style={styles.chipWrap}>
              {triggers.map((item) => {
                const active = trigger === item;
                return (
                  <Pressable
                    key={item}
                    disabled={phase === 'running'}
                    style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && phase !== 'running' && styles.pressed]}
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
                      {locale === 'en'
                        ? 'Breathe in for 4 seconds, out for 6 seconds. 60 seconds total.'
                        : '4 saniye nefes al, 6 saniye nefes ver. Toplam 60 saniye.'}
                    </Text>
                    <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]} onPress={startBreath}>
                      <Text style={styles.primaryBtnText}>{locale === 'en' ? 'Start 60 Seconds' : '60 Saniyeyi Başlat'}</Text>
                    </Pressable>
                  </View>
                ) : null}

                {phase === 'running' ? (
                  <View style={styles.breathArea}>
                    <Animated.View pointerEvents="none" style={[styles.halo, { opacity: haloOpacity, transform: [{ scale }] }]} />
                    <Animated.View style={[styles.circle, { transform: [{ scale }] }]}>
                      <Text style={styles.breathLabel}>{breathLabel}</Text>
                      <Text style={styles.breathCount}>{formatCountdown(remaining)}</Text>
                    </Animated.View>
                    <Text style={styles.breathHint}>
                      {locale === 'en' ? 'Inhale as the circle grows, exhale as it shrinks.' : 'Dairenin büyümesiyle nefes al, küçülmesiyle ver.'}
                    </Text>
                    <View style={styles.runningActions}>
                      <Pressable style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]} onPress={handleClose}>
                        <Text style={styles.ghostBtnText}>{locale === 'en' ? 'Cancel' : 'Vazgeç'}</Text>
                      </Pressable>
                      <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]} onPress={finishBreath}>
                        <Text style={styles.primaryBtnText}>{locale === 'en' ? 'I resisted' : 'Dayandım'}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}

                {phase === 'done' ? (
                  <View style={styles.doneBox}>
                    <Text style={styles.doneEmoji}>🎉</Text>
                    <Text style={styles.doneTitle}>{locale === 'en' ? 'You got through it!' : 'Krizi atlattın!'}</Text>
                    <Text style={styles.doneText}>
                      {locale === 'en'
                        ? 'This urge was logged as resisted. You can change the trigger and try again if you like.'
                        : 'Bu istek dayanma olarak kaydedildi. İstersen tetikleyiciyi değiştirip tekrar deneyebilirsin.'}
                    </Text>
                    {trigger ? <Text style={styles.doneTrigger}>{locale === 'en' ? 'Trigger' : 'Tetikleyici'}: {trigger}</Text> : null}
                    <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]} onPress={handleClose}>
                      <Text style={styles.primaryBtnText}>{t('common.close')}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.gameWrap}>
                <BubblePopGame durationSec={60} active={visible && mode === 'game'} onComplete={onGameComplete} />
                {gameDone ? (
                  <View style={styles.gameDoneNote}>
                    <Text style={styles.gameDoneText}>
                      {locale === 'en' ? `Logged as resisted. Your score: ${gameScore}` : `Krizi atlattığın kaydedildi. Puanın: ${gameScore}`}
                    </Text>
                    <Pressable style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]} onPress={handleClose}>
                      <Text style={styles.ghostBtnText}>{t('common.close')}</Text>
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
    backdrop: { flex: 1, backgroundColor: 'rgba(3,8,20,0.72)', justifyContent: 'center', padding: spacing.md },
    sheet: { backgroundColor: colors.card, borderRadius: radius.xl, maxHeight: '92%', ...shadows.card },
    content: { padding: spacing.lg, gap: spacing.sm },
    motivationBox: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.primary },
    motivationHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    motivationPhoto: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.bg },
    motivationIconWrap: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
    motivationIcon: { fontSize: 26 },
    motivationTitle: { fontSize: fontSizes.xs, fontWeight: '800', color: colors.primaryDark, letterSpacing: 0.4, marginBottom: 2 },
    motivationBody: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text, lineHeight: 22 },
    eyebrow: { fontSize: fontSizes.xs, fontWeight: '800', letterSpacing: 1.2, color: colors.danger },
    title: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: fontSizes.sm, color: colors.textMuted, lineHeight: 20 },
    modeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    modeBtn: { flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, alignItems: 'center' },
    modeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    modeText: { fontSize: fontSizes.xs, fontWeight: '800', color: colors.textMuted, textAlign: 'center' },
    modeTextActive: { color: colors.white },
    sectionLabel: { fontSize: fontSizes.sm, color: colors.textMuted, fontWeight: '700', marginTop: spacing.sm },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.round, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textMuted },
    chipTextActive: { color: colors.white },
    idleBox: { alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.sm },
    idleEmoji: { fontSize: 42 },
    idleText: { fontSize: fontSizes.sm, color: colors.text, textAlign: 'center', lineHeight: 20 },
    primaryBtn: { backgroundColor: colors.danger, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignItems: 'center', minWidth: 190 },
    primaryBtnText: { color: colors.white, fontSize: fontSizes.md, fontWeight: '800' },
    ghostBtn: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignItems: 'center' },
    ghostBtnText: { color: colors.textMuted, fontSize: fontSizes.md, fontWeight: '700' },
    breathArea: { alignItems: 'center', justifyContent: 'center', minHeight: 300, marginTop: spacing.md },
    halo: { position: 'absolute', width: 230, height: 230, borderRadius: 115, backgroundColor: colors.primary },
    circle: { width: 210, height: 210, borderRadius: 105, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.white },
    breathLabel: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.white },
    breathCount: { fontSize: fontSizes.xxl, fontWeight: '800', color: colors.white, fontVariant: ['tabular-nums'], marginTop: spacing.xs },
    breathHint: { fontSize: fontSizes.xs, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
    runningActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    doneBox: { alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.sm },
    doneEmoji: { fontSize: 44 },
    doneTitle: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
    doneText: { fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
    doneTrigger: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.primaryDark },
    gameWrap: { marginTop: spacing.sm },
    gameDoneNote: { marginTop: spacing.sm, alignItems: 'center', gap: spacing.sm },
    gameDoneText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.success, textAlign: 'center' },
    pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  });
