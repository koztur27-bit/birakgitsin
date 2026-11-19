import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';

export type SuccessShareCardProps = {
  durationText: string;
  avoidedTotal: number;
  savedText: string;
};

export type SuccessShareCardHandle = {
  share: () => Promise<void>;
};

const CARD_W = 1080;
const CARD_H = 1920;

export const SuccessShareCard = forwardRef<SuccessShareCardHandle, SuccessShareCardProps>(
  function SuccessShareCard({ durationText, avoidedTotal, savedText }, ref) {
    const shotRef = useRef<ViewShot>(null);

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
            colors={['#071B2F', '#0B3D2E', '#0A2740']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.glowTop} />
            <View style={styles.glowBottom} />

            <View style={styles.header}>
              <Text style={styles.brand}>Bırak Gitsin</Text>
              <Text style={styles.badge}>BAŞARI KARTI</Text>
            </View>

            <Text style={styles.heroTitle}>İlerlemem</Text>
            <Text style={styles.heroSub}>Her nefes, daha güçlü bir ben.</Text>

            <View style={styles.statsBox}>
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
                <Text style={styles.statValueMoney}>{savedText}</Text>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerQuote}>“Küçük adımlar, büyük zaferler.”</Text>
              <Text style={styles.footerApp}>#BirakGitsin</Text>
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
    backgroundColor: 'rgba(46, 204, 113, 0.18)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -140,
    left: -100,
    width: 560,
    height: 560,
    borderRadius: 280,
    backgroundColor: 'rgba(52, 152, 219, 0.16)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    color: '#EAFBF3',
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badge: {
    color: '#0B3D2E',
    backgroundColor: '#7CFFB2',
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
    color: 'rgba(234,251,243,0.85)',
    fontSize: 46,
    fontWeight: '600',
    marginTop: 8,
  },
  statsBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(124,255,178,0.28)',
    borderRadius: 48,
    paddingHorizontal: 56,
    paddingVertical: 44,
    gap: 28,
  },
  statBlock: {
    gap: 10,
  },
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
    color: '#7CFFB2',
    fontSize: 80,
    fontWeight: '900',
  },
  divider: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  footer: {
    alignItems: 'center',
    gap: 16,
  },
  footerQuote: {
    color: '#EAFBF3',
    fontSize: 44,
    fontWeight: '700',
    textAlign: 'center',
  },
  footerApp: {
    color: '#7CFFB2',
    fontSize: 40,
    fontWeight: '800',
  },
});
