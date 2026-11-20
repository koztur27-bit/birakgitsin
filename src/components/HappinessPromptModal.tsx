import * as StoreReview from 'expo-store-review';
import React from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { fontSizes, radius, shadows, spacing } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function HappinessPromptModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const onPositive = async () => {
    try {
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
      } else {
        // Fallback: mağaza sayfası açılamıyorsa sessizce kapat
      }
    } catch {
      // ignore
    } finally {
      onClose();
    }
  };

  const onNegative = async () => {
    const subject = encodeURIComponent(t('happiness.feedbackSubject'));
    const body = encodeURIComponent(t('happiness.feedbackBody'));
    const url = `mailto:birakgitsin.app@gmail.com?subject=${subject}&body=${body}`;
    try {
      await Linking.openURL(url);
    } catch {
      // ignore
    } finally {
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🌟</Text>
          <Text style={styles.title}>{t('happiness.title')}</Text>
          <Text style={styles.subtitle}>{t('happiness.subtitle')}</Text>

          <Pressable style={[styles.btn, styles.btnPositive]} onPress={onPositive}>
            <Text style={styles.btnPositiveText}>{t('happiness.positive')}</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnNegative]} onPress={onNegative}>
            <Text style={styles.btnNegativeText}>{t('happiness.negative')}</Text>
          </Pressable>
          <Pressable style={styles.later} onPress={onClose}>
            <Text style={styles.laterText}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      padding: spacing.lg,
      alignItems: 'center',
      gap: spacing.sm,
      ...shadows.card,
    },
    emoji: { fontSize: 44 },
    title: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text, textAlign: 'center' },
    subtitle: { fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
    btn: {
      alignSelf: 'stretch',
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    btnPositive: { backgroundColor: colors.primary },
    btnPositiveText: { color: colors.white, fontWeight: '800', fontSize: fontSizes.md, textAlign: 'center' },
    btnNegative: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
    btnNegativeText: { color: colors.text, fontWeight: '700', fontSize: fontSizes.md, textAlign: 'center' },
    later: { marginTop: 4, padding: spacing.sm },
    laterText: { color: colors.textMuted, fontWeight: '600' },
  });
