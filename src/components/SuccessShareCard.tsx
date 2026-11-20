import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';

export type ShareThemeId = 'classic' | 'gold' | 'sunset';

export type ShareTheme = {
  id: ShareThemeId;
  name: string;
  proOnly: boolean;
  colors: [string, string, string];
  glowTop: string;
  glowBottom: string;
  badgeBg: string;
  badgeText: string;
  accent: string;
  border: string;
  subtitle: string;
  quote: string;
};

export const SHARE_THEMES: ShareTheme[] = [
  {
    id: 'classic',
    name: 'Klasik',
    proOnly: false,
    colors: ['#071B2F', '#0B3D2E', '#0A2740'],
    glowTop: 'rgba(46, 204, 113, 0.18)',
    glowBottom: 'rgba(52, 152, 219, 0.16)',
    badgeBg: '#7CFFB2',
    badgeText: '#0B3D2E',
    accent: '#7CFFB2',
    border: 'rgba(124,255,178,0.28)',
    subtitle: 'Her nefes, daha güçlü bir ben.',
    quote: '“Küçük adımlar, büyük zaferler.”',
  },
  {
    id: 'gold',
    name: 'Altın Zafer',
    proOnly: true,
    colors: ['#2A1A00', '#5A3B00', '#1A1206'],
    glowTop: 'rgba(255, 215, 120, 0.22)',
    glowBottom: 'rgba(255, 170, 40, 0.14)',
    badgeBg: '#FFD36A',
    badgeText: '#3A2600',
    accent: '#FFD36A',
    border: 'rgba(255, 211, 106, 0.35)',
    subtitle: 'Azmin, en parlak zaferin.',
    quote: '“Değerini bilen, geleceğini kazanır.”',
  },
  {
    id: 'sunset',
    name: 'Gün Batımı',
    proOnly: true,
    colors: ['#2B0A1F', '#5B1B3A', '#102A43'],
    glowTop: 'rgba(255, 140, 105, 0.20)',
    glowBottom: 'rgba(255, 94, 98, 0.16)',
    badgeBg: '#FFB199',
    badgeText: '#3A1020',
    accent: '#FFB199',
    border: 'rgba(255, 177, 153, 0.32)',
    subtitle: 'Her gün, yeni bir başlangıç.',
    quote: '“Bıraktığın her sigara, sana dönen bir hediye.”',
  },
];

export function getShareTheme(id: ShareThemeId): ShareTheme {
  return SHARE_THEMES.find((t) => t.id === id) ?? SHARE_THEMES[0];
}

export type SuccessShareCardProps = {
  durationText: string;
  avoidedTotal: number;
  savedText: string;
  theme?: ShareThemeId;
};

export type SuccessShareCardHandle = {
  share: () => Promise<void>;
};

const CARD_W = 1080;
const CARD_H = 1920;

export const SuccessShareCard = forwardRef<SuccessShareCardHandle, SuccessShareCardProps>(
  function SuccessShareCard({ durationText, avoidedTotal, savedText, theme = 'classic' }, ref) {
    const shotRef = useRef<ViewShot>(null);
    const t = useMemo(() => getShareTheme(theme), [theme]);

    useImperativeHandle(ref, () => ({
      async share() {
        if (Platform.OS === 'web') {
          Alert.alert('Paylaşım', 'Başarı kartı paylaşımı mobil uygulamada kullanılabilir.');
          return;
        }
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          const uri = await captureRef(shotRef, {
            format: 'png',
            quality: 1,
            result: 'tmpfile',
            width: CARD_W,
            height: CARD_H,
          });
          const available = await Sharing.isAvailableAsync();
          if (!available) {
            Alert.alert('Paylaşım', 'Bu cihazda paylaşım menüsü kullanılamıyor.');
            return;
          }
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Bırak Gitsin Başarı Kartı',
            UTI: 'public.png',
          });
        } catch (e: any) {
          Alert.alert('Paylaşım', e?.message || 'Başarı kartı oluşturulamadı.');
        }
      },
    }));

    return (
      <View pointerEvents="none" style={styles.offscreen} collapsable={false}>
        <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }}>
          <LinearGradient
            colors={t.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={[styles.glowTop, { backgroundColor: t.glowTop }]} />
            <View style={[styles.glowBottom, { backgroundColor: t.glowBottom }]} />

            <View style={styles.header}>
              <Text style={[styles.brand, { color: '#F8FFF9' }]}>Bırak Gitsin</Text>
              <Text style={[styles.badge, { color: t.badgeText, backgroundColor: t.badgeBg }]}>
                BAŞARI KARTI
              </Text>
            </View>

            <Text style={styles.heroTitle}>İlerlemem</Text>
            <Text style={[styles.heroSub, { color: 'rgba(248,255,249,0.88)' }]}>{t.subtitle}</Text>

            <View style={[styles.statsBox, { borderColor: t.border }]}>
              <View style={styles.statBlock}>
                <Text style={styles.statLabel}>Bırakma serisi</Text>
                <Text style={styles.statValue}>{durationText}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statBlock}>
                <Text style={styles.statLabel}>İçmediğim sigara</Text>
                <Text style={styles.statValue}>{avoidedTotal} adet</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statBlock}>
                <Text style={styles.statLabel}>Biriktirdiğim para</Text>
                <Text style={[styles.statValueMoney, { color: t.accent }]}>{savedText}</Text>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerQuote}>{t.quote}</Text>
              <Text style={[styles.footerApp, { color: t.accent }]}>#BirakGitsin</Text>
            </View>
          </LinearGradient>
        </ViewShot>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: 0,
    width: CARD_W,
    height: CARD_H,
    opacity: 0,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    paddingHorizontal: 96,
    paddingVertical: 120,
    justifyContent: 'space-between',
  },
  glowTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 520,
    height: 520,
    borderRadius: 260,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -140,
    left: -100,
    width: 560,
    height: 560,
    borderRadius: 280,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badge: {
    fontSize: 34,
    fontWeight: '800',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
    overflow: 'hidden',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 118,
    fontWeight: '900',
    marginTop: 40,
  },
  heroSub: {
    fontSize: 46,
    fontWeight: '600',
    marginTop: 8,
  },
  statsBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderRadius: 48,
    paddingHorizontal: 56,
    paddingVertical: 44,
    gap: 28,
  },
  statBlock: { gap: 10 },
  statLabel: {
    color: 'rgba(234,251,243,0.78)',
    fontSize: 40,
    fontWeight: '700',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 72,
    fontWeight: '900',
  },
  statValueMoney: {
    fontSize: 80,
    fontWeight: '900',
  },
  divider: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  footer: { alignItems: 'center', gap: 16 },
  footerQuote: {
    color: '#EAFBF3',
    fontSize: 44,
    fontWeight: '700',
    textAlign: 'center',
  },
  footerApp: {
    fontSize: 40,
    fontWeight: '800',
  },
});
