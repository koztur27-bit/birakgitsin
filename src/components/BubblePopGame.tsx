import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { fontSizes, radius, spacing } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Bubble = {
  id: number;
  x: number;
  y: number;
  size: number;
  hue: number;
};

type BubblePopGameProps = {
  durationSec?: number;
  active?: boolean;
  onComplete?: (score: number) => void;
};

export function BubblePopGame({ durationSec = 60, active = true, onComplete }: BubblePopGameProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [left, setLeft] = useState(durationSec);
  const [score, setScore] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [, setArea] = useState({ w: 0, h: 0 });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endAtRef = useRef(0);
  const idRef = useRef(1);
  const doneRef = useRef(false);
  const scoreRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
    timerRef.current = null;
    spawnRef.current = null;
  }, []);

  const spawnBubble = useCallback(() => {
    setArea((a) => {
      if (a.w <= 0 || a.h <= 0) return a;
      const size = 34 + Math.floor(Math.random() * 28);
      const x = Math.max(0, Math.floor(Math.random() * Math.max(1, a.w - size)));
      const y = Math.max(0, Math.floor(Math.random() * Math.max(1, a.h - size)));
      const hue = Math.floor(Math.random() * 360);
      const bubble: Bubble = { id: idRef.current++, x, y, size, hue };
      setBubbles((prev) => [...prev.slice(-10), bubble]);
      return a;
    });
  }, []);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearTimers();
    setRunning(false);
    setDone(true);
    setLeft(0);
    onComplete?.(scoreRef.current);
  }, [clearTimers, onComplete]);

  const start = useCallback(() => {
    clearTimers();
    doneRef.current = false;
    scoreRef.current = 0;
    setScore(0);
    setBubbles([]);
    setDone(false);
    setLeft(durationSec);
    setRunning(true);
    endAtRef.current = Date.now() + durationSec * 1000;

    timerRef.current = setInterval(() => {
      const remain = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setLeft(remain);
      if (remain <= 0) finish();
    }, 250);

    spawnRef.current = setInterval(spawnBubble, 700);
    spawnBubble();
  }, [clearTimers, durationSec, finish, spawnBubble]);

  useEffect(() => {
    if (!active && running) {
      clearTimers();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRunning(false);
    }
  }, [active, running, clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const pop = (id: number) => {
    if (!running) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setBubbles((prev) => prev.filter((b) => b.id !== id));
    scoreRef.current += 1;
    setScore(scoreRef.current);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('craving.gameTitle')}</Text>
        <Text style={styles.timer}>{left}s</Text>
      </View>
      <Text style={styles.sub}>{t('craving.gameSub')}</Text>

      <View
        style={styles.area}
        onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        {!running && !done ? (
          <Pressable style={styles.centerBtn} onPress={start}>
            <Text style={styles.centerBtnText}>{t('craving.gameStart')}</Text>
          </Pressable>
        ) : null}
        {done ? (
          <View style={styles.doneBox}>
            <Text style={styles.doneTitle}>{t('craving.actionDone')}</Text>
            <Text style={styles.doneScore}>{score}</Text>
            <Pressable style={styles.centerBtn} onPress={start}>
              <Text style={styles.centerBtnText}>{t('common.start')}</Text>
            </Pressable>
          </View>
        ) : null}
        {running
          ? bubbles.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => pop(b.id)}
                style={[
                  styles.bubble,
                  {
                    left: b.x,
                    top: b.y,
                    width: b.size,
                    height: b.size,
                    borderRadius: b.size / 2,
                    backgroundColor: `hsla(${b.hue}, 80%, 60%, 0.35)`,
                    borderColor: `hsla(${b.hue}, 80%, 55%, 0.8)`,
                  },
                ]}
              />
            ))
          : null}
      </View>

      <View style={styles.footer}>
        <Text style={styles.scoreLabel}>{t('stats.goal')}: 60s</Text>
        <Text style={styles.scoreValue}>{score}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    wrap: { gap: spacing.sm },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
    timer: { fontSize: fontSizes.lg, fontWeight: '900', color: colors.primary },
    sub: { fontSize: fontSizes.sm, color: colors.textMuted },
    area: {
      height: 260,
      borderRadius: radius.lg,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bubble: { position: 'absolute', borderWidth: 2 },
    centerBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.round,
    },
    centerBtnText: { color: '#fff', fontWeight: '800' },
    doneBox: { alignItems: 'center', gap: 8 },
    doneTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
    doneScore: { fontSize: 40, fontWeight: '900', color: colors.primary },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    scoreLabel: { fontSize: fontSizes.sm, color: colors.textMuted },
    scoreValue: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
  });
