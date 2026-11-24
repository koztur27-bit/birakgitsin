import React, { useState } from 'react';
import {
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import { SUPPORT_EMAIL } from '../lib/legalContent';
import { fontSizes, radius, spacing } from '../theme';

type Props = {
  onConfirm: () => void;
};

export function AgeGate({ onConfirm }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [blocked, setBlocked] = useState(false);

  const handleNo = () => {
    if (Platform.OS === 'android') {
      BackHandler.exitApp();
      return;
    }
    setBlocked(true);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }, { backgroundColor: colors.bg }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={styles.badge}>{t('ageGate.badge')}</Text>
        <Text style={[styles.title, { color: colors.text }]}>
          {blocked ? t('ageGate.blockedTitle') : t('ageGate.title')}
        </Text>
        {blocked ? (
          <>
            <Text style={[styles.body, { color: colors.textMuted }]}>{t('ageGate.blockedBody')}</Text>
            <Pressable style={styles.secondaryBtn} onPress={() => setBlocked(false)}>
              <Text style={[styles.secondaryText, { color: colors.primary }]}>{t('ageGate.back')}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[styles.question, { color: colors.text }]}>{t('ageGate.question')}</Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>{t('ageGate.note')}</Text>
            <Pressable style={styles.primaryBtn} onPress={onConfirm} accessibilityRole="button">
              <Text style={styles.primaryText}>{t('ageGate.yes')}</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={handleNo} accessibilityRole="button">
              <Text style={[styles.secondaryText, { color: colors.textMuted }]}>{t('ageGate.no')}</Text>
            </Pressable>
          </>
        )}
        <Pressable
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})}
          style={styles.supportBtn}
        >
          <Text style={[styles.supportText, { color: colors.textMuted }]}>{SUPPORT_EMAIL}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: {
    width: '100%',
    maxWidth: 460,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  badge: { fontSize: 11, fontWeight: '800', color: '#B45309', letterSpacing: 1 },
  title: { fontSize: fontSizes.xl, fontWeight: '900', lineHeight: 28 },
  question: { fontSize: fontSizes.lg, fontWeight: '700', marginTop: spacing.sm },
  body: { fontSize: fontSizes.sm, lineHeight: 20 },
  primaryBtn: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: fontSizes.md },
  secondaryBtn: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { fontSize: fontSizes.sm, fontWeight: '700' },
  supportBtn: { marginTop: spacing.md, alignItems: 'center' },
  supportText: { fontSize: 11, textDecorationLine: 'underline' },
});
