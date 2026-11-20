import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../i18n';
import { formatMoney, pricePerCigarette } from '../lib/calculations';
import { fontSizes, radius, shadows, spacing } from '../theme';
import { Plan } from '../types';
import { useTheme } from '../context/ThemeContext';
import { WidgetGalleryScreen } from './WidgetGalleryScreen';

type Props = {
  plan: Plan;
  onContinue: () => void;
};

export function FutureOnboardingScreen({ plan, onContinue }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [widgetsOpen, setWidgetsOpen] = useState(false);

  const yearlyCigs = Math.round(plan.baselinePerDay * 365);
  const yearlyMoney = plan.baselinePerDay * 365 * pricePerCigarette(plan);
  const yearlyMoneyText = formatMoney(yearlyMoney, plan.currency);

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.md }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroBadgeWrap}>
          <Image source={require('../../assets/widget_mascot.png')} style={styles.mascot} />
        </View>
        <Text style={styles.title}>{t('onboardingFuture.title')}</Text>
        <Text style={styles.subtitle}>{t('onboardingFuture.subtitle')}</Text>

        <LinearGradient colors={[colors.primary, colors.primaryDarker]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bigCard}>
          <Text style={styles.cardLabel}>{t('onboardingFuture.moneyLabel')}</Text>
          <Text style={styles.moneyValue}>{yearlyMoneyText}</Text>
          <Text style={styles.cardHint}>{t('onboardingFuture.moneyHint')}</Text>

          <View style={styles.divider} />

          <Text style={styles.cardLabel}>{t('onboardingFuture.cigsLabel')}</Text>
          <Text style={styles.cigsValue}>{yearlyCigs.toLocaleString(locale === 'en' ? 'en-US' : 'tr-TR')}</Text>
          <Text style={styles.cardHint}>{t('onboardingFuture.cigsHint')}</Text>
        </LinearGradient>

        <View style={styles.infoCard}>
          <Text style={styles.infoEmoji}>✨</Text>
          <Text style={styles.infoText}>
            {locale === 'en'
              ? `Based on ${plan.baselinePerDay} cigarettes/day and ${formatMoney(plan.packPrice, plan.currency)} per pack.`
              : `Günde ${plan.baselinePerDay} sigara ve ${formatMoney(plan.packPrice, plan.currency)} paket fiyatına göre hesaplandı.`}
          </Text>
        </View>

        <Pressable style={[styles.pinBtn, shadows.card]} onPress={() => setWidgetsOpen(true)}>
          <Text style={styles.pinBtnText}>{t('onboardingFuture.pinCta')}</Text>
        </Pressable>

        <Pressable style={styles.continueBtn} onPress={onContinue}>
          <Text style={styles.continueText}>{t('onboardingFuture.continue')}</Text>
        </Pressable>
      </ScrollView>

      <WidgetGalleryScreen visible={widgetsOpen} onClose={() => setWidgetsOpen(false)} />
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
    heroBadgeWrap: { alignItems: 'center', marginTop: spacing.sm },
    mascot: { width: 84, height: 84, borderRadius: 42 },
    title: { fontSize: 30, fontWeight: '900', color: colors.text, textAlign: 'center', marginTop: spacing.sm },
    subtitle: { fontSize: fontSizes.md, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
    bigCard: {
      borderRadius: radius.xl,
      padding: spacing.xl,
      gap: 6,
      alignItems: 'center',
      ...shadows.card,
    },
    cardLabel: { color: 'rgba(255,255,255,0.9)', fontSize: fontSizes.sm, fontWeight: '700', textAlign: 'center' },
    moneyValue: { color: colors.accent || '#FFD700', fontSize: 44, fontWeight: '900', textAlign: 'center', marginTop: 4 },
    cigsValue: { color: '#FFFFFF', fontSize: 40, fontWeight: '900', textAlign: 'center', marginTop: 4 },
    cardHint: { color: 'rgba(255,255,255,0.85)', fontSize: fontSizes.sm, textAlign: 'center' },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'stretch', marginVertical: spacing.md },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoEmoji: { fontSize: 22 },
    infoText: { flex: 1, fontSize: fontSizes.sm, color: colors.textMuted, lineHeight: 20 },
    pinBtn: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    pinBtnText: { fontSize: fontSizes.md, fontWeight: '800', color: colors.primaryDark, textAlign: 'center' },
    continueBtn: {
      backgroundColor: colors.primary,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    continueText: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.white },
  });
