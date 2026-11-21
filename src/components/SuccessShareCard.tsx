import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { useI18n } from '../i18n';

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
    glowTop: 'rgba(255, 215, 0, 0.22)',
    glowBottom: 'rgba(255, 140, 0, 0.18)',
    badgeBg: '#FFD700',
    badgeText: '#3A2600',
    accent: '#FFE082',
    border: 'rgba(255,215,0,0.32)',
    subtitle: 'Her an daha güçlü bir irade.',
    quote: '“Zafer, vazgeçmeyenindir.”',
  },
  {
    id: 'sunset',
    name: 'Gün Batımı',
    proOnly: true,
    colors: ['#2B1035', '#7A1F3D', '#B23A48'],
    glowTop: 'rgba(255, 166, 158, 0.22)',
    glowBottom: 'rgba(255, 214, 165, 0.16)',
    badgeBg: '#FFD6A5',
    badgeText: '#5A1E2B',
    accent: '#FFE0C2',
    border: 'rgba(255,214,165,0.32)',
    subtitle: 'Yeni bir gün, yeni bir sen.',
    quote: '“Her gün yeniden başlayabilirsin.”',
  },
];

export function useLocalizedShareThemes(): ShareTheme[] {
  const { t } = useI18n();
  return useMemo(
    () =>
      SHARE_THEMES.map((theme) => ({
        ...theme,
        name: t(`successCard.themes.${theme.id}`),
        subtitle: t('successCard.subtitle'),
        quote: t('successCard.quote'),
      })),
    [t],
  );
}

type SuccessShareCardProps = {
  days: number;
  avoided: number;
  savedText: string;
  themeId?: ShareThemeId;
  forCapture?: boolean;
};

export type SuccessShareCardHandle = {
  share: () => Promise<boolean>;
  capture: () => Promise<string | null>;
};

export const SuccessShareCard = forwardRef<SuccessShareCardHandle, SuccessShareCardProps>(
  function SuccessShareCard({ days, avoided, savedText, themeId = 'classic', forCapture = false }, ref) {
    const viewRef = useRef<React.ComponentRef<typeof ViewShot>>(null);
    const { t } = useI18n();
    const themes = useLocalizedShareThemes();
    const theme = themes.find((x) => x.id === themeId) || themes[0];

    const doCapture = async (): Promise<string | null> => {
      try {
        if (!viewRef.current) return null;
        const uri = await captureRef(viewRef, { format: 'png', quality: 1, result: 'tmpfile' });
        return uri || null;
      } catch {
        return null;
      }
    };

    useImperativeHandle(ref, () => ({
      capture: doCapture,
      share: async () => {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          const uri = await doCapture();
          if (!uri) {
            Alert.alert(t('home.shareErrorTitle'), t('home.shareErrorMsg'));
            return false;
          }
          if (Platform.OS === 'web') {
            Alert.alert(t('home.shareErrorTitle'), t('home.shareErrorMsg'));
            return false;
          }
          const available = await Sharing.isAvailableAsync();
          if (!available) {
            Alert.alert(t('home.shareErrorTitle'), t('home.shareErrorMsg'));
            return false;
          }
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: t('home.shareDialog'),
          });
          return true;
        } catch {
          Alert.alert(t('home.shareErrorTitle'), t('home.shareErrorMsg'));
          return false;
        }
      },
    }));

    return (
      <View style={[styles.wrapper, forCapture && styles.captureWrapper]}>
        <ViewShot ref={viewRef} options={{ format: 'png', quality: 1 }}>
          <LinearGradient colors={theme.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
            <View style={[styles.glowTop, { backgroundColor: theme.glowTop }]} />
            <View style={[styles.glowBottom, { backgroundColor: theme.glowBottom }]} />
            <View style={[styles.badge, { backgroundColor: theme.badgeBg }]}>
              <Text style={[styles.badgeText, { color: theme.badgeText }]}>{t('successCard.badge')}</Text>
            </View>

            <Text style={styles.appName}>{t('common.appName')}</Text>
            <Text style={styles.subtitle}>{theme.subtitle}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: theme.accent }]}>{days}</Text>
                <Text style={styles.statLabel}>{t('successCard.daysLabel')}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: theme.accent }]}>{avoided}</Text>
                <Text style={styles.statLabel}>{t('successCard.avoidedLabel')}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: theme.accent }]} numberOfLines={1} adjustsFontSizeToFit>
                  {savedText}
                </Text>
                <Text style={styles.statLabel}>{t('successCard.savedLabel')}</Text>
              </View>
            </View>

            <View style={[styles.quoteBox, { borderColor: theme.border }]}>
              <Text style={styles.quote}>{theme.quote}</Text>
            </View>
            <View style={[styles.signatureBadge, { borderColor: theme.accent, backgroundColor: 'rgba(255,255,255,0.12)' }]}>
              <Text style={[styles.signatureTitle, { color: '#FFFFFF' }]}>{t('common.appName')}</Text>
              <Text style={[styles.signatureCta, { color: theme.accent }]}>{t('successCard.storeBadge')}</Text>
            </View>
          </LinearGradient>
        </ViewShot>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  captureWrapper: {
    width: 360,
  },
  card: {
    borderRadius: 24,
    padding: 22,
    overflow: 'hidden',
  },
  glowTop: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -70,
    right: -50,
  },
  glowBottom: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: -60,
    left: -40,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 36,
  },
  quoteBox: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  quote: {
    color: '#FFFFFF',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  signatureBadge: {
    marginTop: 14,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  signatureTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  signatureCta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
