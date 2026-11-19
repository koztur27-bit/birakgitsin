import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [left, setLeft] = useState(durationSec);
  const [score, setScore] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [area, setArea] = useState({ w: 0, h: 0 });

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

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (!active) {
      clearTimers();
      const t = setTimeout(() => setRunning(false), 0);
      return () => clearTimeout(t);
    }
  }, [active, clearTimers]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearTimers();
    setRunning(false);
    setDone(true);
    setLeft(0);
    setBubbles([]);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onComplete?.(scoreRef.current);
  }, [clearTimers, onComplete]);

  const spawnBubble = useCallback(() => {
    setBubbles((prev) => {
      if (prev.length >= 7) return prev;
      const w = area.w || 280;
      const h = area.h || 260;
      const size = 46 + Math.floor(Math.random() * 28);
      const pad = 6;
      const maxX = Math.max(pad, w - size - pad);
      const maxY = Math.max(pad, h - size - pad);
      const b: Bubble = {
        id: idRef.current++,
        x: pad + Math.floor(Math.random() * maxX),
        y: pad + Math.floor(Math.random() * maxY),
        size,
        hue: Math.floor(Math.random() * 4),
      };
      // keep short lifetime feel by replacing oldest if many
      const next = [...prev, b];
      return next.length > 8 ? next.slice(next.length - 8) : next;
    });
  }, [area.h, area.w]);

  const start = useCallback(() => {
    clearTimers();
    doneRef.current = false;
    scoreRef.current = 0;
    setScore(0);
    setLeft(durationSec);
    setBubbles([]);
    setDone(false);
    setRunning(true);
    endAtRef.current = Date.now() + durationSec * 1000;

    timerRef.current = setInterval(() => {
      const remain = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setLeft(remain);
      if (remain <= 0) finish();
    }, 250);

    // initial burst + periodic spawn
    setTimeout(spawnBubble, 0);
    setTimeout(spawnBubble, 120);
    setTimeout(spawnBubble, 240);
    spawnRef.current = setInterval(() => {
      spawnBubble();
      // occasionally spawn extra
      if (Math.random() > 0.55) setTimeout(spawnBubble, 180);
    }, 700);
  }, [clearTimers, durationSec, finish, spawnBubble]);

  const pop = useCallback((id: number) => {
    setBubbles((prev) => prev.filter((b) => b.id !== id));
    scoreRef.current += 1;
    setScore(scoreRef.current);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const bubbleColors = [
    ['rgba(124,255,178,0.35)', '#7CFFB2'],
    ['rgba(120,200,255,0.35)', '#78C8FF'],
    ['rgba(255,214,130,0.35)', '#FFD682'],
    ['rgba(255,160,160,0.32)', '#FFA0A0'],
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Baloncuk Patlatma · Dikkat Dağıt</Text>
      <Text style={styles.hint}>
        60 saniye boyunca ekrandaki stres baloncuklarına dokunup patlat. Her dokunuşta hafif
        titreşim hissedersin.
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>Süre</Text>
          <Text style={styles.statValue}>{left} sn</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>Puan</Text>
          <Text style={styles.statValue}>{score}</Text>
        </View>
      </View>

      <View
        style={styles.arena}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setArea({ w: width, h: height });
        }}
      >
        {!running && !done ? (
          <View style={styles.centerBox}>
            <Text style={styles.bigEmoji}>🫧</Text>
            <Text style={styles.centerText}>Nikotin dalgası gelince baloncukları patlat, 60 saniyede krizi atlat.</Text>
            <Pressable style={styles.primaryBtn} onPress={start}>
              <Text style={styles.primaryBtnText}>60 Saniyeyi Başlat</Text>
            </Pressable>
          </View>
        ) : null}

        {running ? (
          <>
            {bubbles.map((b) => {
              const c = bubbleColors[b.hue % bubbleColors.length];
              return (
                <Pressable
                  key={b.id}
                  onPress={() => pop(b.id)}
                  hitSlop={6}
                  style={[
                    styles.bubble,
                    {
                      left: b.x,
                      top: b.y,
                      width: b.size,
                      height: b.size,
                      borderRadius: b.size / 2,
                      backgroundColor: c[0],
                      borderColor: c[1],
                    },
                  ]}
                >
                  <Text style={styles.bubbleText}>•</Text>
                </Pressable>
              );
            })}
          </>
        ) : null}

        {done ? (
          <View style={styles.centerBox}>
            <Text style={styles.bigEmoji}>🏅</Text>
            <Text style={styles.doneTitle}>Krizi Başarıyla Atlattın!</Text>
            <Text style={styles.centerText}>
              60 saniyeyi tamamladın ve {score} baloncuk patlattın. Bu dalga geçti — sen daha güçlüsün.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={start}>
              <Text style={styles.primaryBtnText}>Tekrar Oyna</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    wrap: {
      gap: spacing.sm,
      alignSelf: 'stretch',
    },
    title: {
      fontSize: fontSizes.md,
      fontWeight: '800',
      color: colors.text,
    },
    hint: {
      fontSize: fontSizes.xs,
      color: colors.textMuted,
      lineHeight: fontSizes.sm + 4,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    statPill: {
      flex: 1,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    statLabel: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: '700' },
    statValue: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.primaryDark },
    arena: {
      marginTop: spacing.sm,
      height: 280,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    centerBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.md,
      gap: spacing.sm,
    },
    bigEmoji: { fontSize: 44 },
    centerText: {
      fontSize: fontSizes.sm,
      color: colors.text,
      textAlign: 'center',
      lineHeight: fontSizes.md + 4,
    },
    doneTitle: {
      fontSize: fontSizes.lg,
      fontWeight: '800',
      color: colors.success,
      textAlign: 'center',
    },
    primaryBtn: {
      marginTop: spacing.xs,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
      minWidth: 200,
    },
    primaryBtnText: { fontSize: fontSizes.md, fontWeight: '800', color: colors.white },
    bubble: {
      position: 'absolute',
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bubbleText: {
      color: 'rgba(255,255,255,0.9)',
      fontSize: 18,
      fontWeight: '800',
    },
  });
