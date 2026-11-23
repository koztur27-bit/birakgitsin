import { useTheme } from '../context/ThemeContext';
import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { MapBadge } from '../components/MapBadge';
import { Stepper } from '../components/Stepper';
import { useApp } from '../context/AppContext';
import { stopAlarm } from '../lib/alarm';
import { formatCountdown, nextWindowInfo } from '../lib/calculations';
import { fontSizes, radius, shadows, spacing } from '../theme';

const PRESETS_MIN = [5, 10, 30, 60];
const RING_SIZE = 240;
const INNER_SIZE = RING_SIZE - 14;

export function TimerScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { data, timer, setTimerDuration, startTimer, pauseTimer, resumeTimer, resetTimer, dismissTimer, extendTimer } =
    useApp();
  const plan = data.plan;

  useEffect(() => {
    return () => {
      stopAlarm();
    };
  }, []);

  if (!plan) return null;

  const setDuration = (m: number) => {
    setTimerDuration(m);
  };

  const setToNextWindow = () => {
    const next = nextWindowInfo(plan);
    if (!next) return;
    setTimerDuration(Math.max(1, Math.ceil(next.minutes / 60)));
  };

  const { minutes, remaining, status } = timer;

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}><MapBadge code="4" /><Text style={styles.title}>Dayanma Sayacı</Text></View>
        <Text style={styles.subtitle}>
          Sigarasız geçirilecek bir süre belirle. Bir sigara içersen sayaç seçtiğin süreyle
          otomatik yeniden başlar. Süre dolunca uygulama 5 kez titretip sesli haber verir.
        </Text>

        <Card>
          <View style={styles.presetRow}>
            {PRESETS_MIN.map((m) => (
              <Pressable
                key={m}
                onPress={() => setDuration(m)}
                style={[styles.preset, minutes === m && status === 'idle' && styles.presetActive]}
              >
                <Text
                  style={[
                    styles.presetText,
                    minutes === m && status === 'idle' && styles.presetTextActive,
                  ]}
                >
                  {m < 60 ? `${m} dk` : `${m / 60} sa`}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.stepperWrap}>
            <Stepper
              label="Özel süre"
              value={minutes}
              onChange={setDuration}
              min={1}
              max={180}
              suffix="dk"
            />
          </View>

          {plan.windows.length > 0 ? (
            <Pressable style={styles.windowShortcut} onPress={setToNextWindow}>
              <Text style={styles.windowShortcutText}>
                Sonraki izin penceresine kadar kur
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.clockWrap}>
            <View style={styles.clockRing}>
              <View style={styles.clockInner}>
                <View style={styles.clockContent}>
                  <Text style={[styles.clockTime, status === 'done' && styles.clockTimeDone]}>
                    {formatCountdown(remaining)}
                  </Text>
                  <Text style={styles.clockLabel}>
                    {status === 'running'
                      ? 'sayıyor...'
                      : status === 'paused'
                        ? 'duraklatıldı'
                        : status === 'done'
                          ? 'süre doldu!'
                          : `hedef ${minutes} dk`}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.controls}>
            {status === 'idle' ? (
              <Pressable style={styles.startBtn} onPress={() => startTimer()}>
                <Text style={styles.startText}>Sayacı Başlat</Text>
              </Pressable>
            ) : status === 'running' ? (
              <Pressable style={styles.pauseBtn} onPress={pauseTimer}>
                <Text style={styles.pauseText}>Duraklat</Text>
              </Pressable>
            ) : status === 'paused' ? (
              <Pressable style={styles.startBtn} onPress={resumeTimer}>
                <Text style={styles.startText}>Devam Et</Text>
              </Pressable>
            ) : null}
            {status !== 'done' ? (
              <Pressable style={styles.resetBtn} onPress={resetTimer}>
                <Text style={styles.resetText}>Sıfırla</Text>
              </Pressable>
            ) : null}
          </View>

        </Card>

        {status === 'done' ? (
          <View style={styles.alarmCard}>
            <Text style={styles.alarmTitle}>SÜRE DOLDU!</Text>
            <Text style={styles.alarmBody}>
              İstediğin süre boyunca içmeden durabildin. Bu bir ilerleme. Şimdi ödüllendir
              kendini.
            </Text>
            <Pressable style={styles.dismissBtn} onPress={dismissTimer}>
              <Text style={styles.dismissText}>Dayandım, Tamam</Text>
            </Pressable>
            <Pressable style={styles.extendBtn} onPress={() => extendTimer(5)}>
              <Text style={styles.extendText}>5 dk ertele</Text>
            </Pressable>
            <Pressable style={styles.extendBtn} onPress={() => extendTimer(minutes)}>
              <Text style={styles.extendText}>+{minutes} dk uzat</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
  presetRow: { flexDirection: 'row', gap: spacing.sm },
  preset: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  presetActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textMuted },
  presetTextActive: { color: colors.white },
  stepperWrap: { marginTop: spacing.sm },
  windowShortcut: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
  },
  windowShortcutText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: '#8a5a00',
  },
  clockWrap: { alignItems: 'center', marginVertical: spacing.lg },
  clockRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  clockInner: {
    width: INNER_SIZE,
    height: INNER_SIZE,
    borderRadius: INNER_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockContent: { alignItems: 'center', gap: spacing.xs },
  clockTime: {
    fontSize: 54,
    fontWeight: '800',
    color: colors.white,
    fontVariant: ['tabular-nums'],
  },
  clockTimeDone: { color: colors.accent },
  clockLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  controls: { flexDirection: 'row', gap: spacing.sm },
  startBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  startText: { fontSize: fontSizes.md, fontWeight: '800', color: colors.white },
  pauseBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  pauseText: { fontSize: fontSizes.md, fontWeight: '800', color: '#8a5a00' },
  resetBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: { fontSize: fontSizes.md, fontWeight: '700', color: colors.textMuted },
  alarmCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  alarmTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '900',
    color: colors.danger,
    textAlign: 'center',
  },
  alarmBody: {
    fontSize: fontSizes.sm,
    color: colors.text,
    textAlign: 'center',
    lineHeight: fontSizes.md + 4,
  },
  dismissBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
    alignItems: 'center',
  },
  dismissText: { fontSize: fontSizes.md, fontWeight: '800', color: colors.white },
  extendBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
  },
  extendText: { fontSize: fontSizes.md, fontWeight: '700', color: colors.danger },
});