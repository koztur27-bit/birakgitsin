import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { showRewardedUnlockAd } from '../lib/ads';
import { adBlockedText, hasProAccess } from '../lib/proAccess';
import { useTheme } from '../context/ThemeContext';
import {
  avoidedCigarettesTotal,
  formatMoney,
  pricePerCigarette,
  todayKey,
} from '../lib/calculations';
import { DayRecord, Plan } from '../types';
import { fontSizes, radius, spacing } from '../theme';
import { Card } from './Card';

type SavingsSimulatorProps = {
  plan: Plan;
  logs: DayRecord[];
};

const HORIZONS = [
  { key: '1w', days: 7 },
  { key: '1m', days: 30 },
  { key: '3m', days: 90 },
  { key: '6m', days: 180 },
  { key: '1y', days: 365 },
] as const;

export function SavingsSimulator({ plan, logs }: SavingsSimulatorProps) {
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { data, grantAdProUnlock } = useApp();
  const pro = hasProAccess(data);
  const [customDays, setCustomDays] = useState('45');

  const savedSoFar = avoidedCigarettesTotal(plan, logs) * pricePerCigarette(plan);
  const dailyAvoided = Math.max(0, plan.baselinePerDay); // basit projeksiyon: günlük ortalama kaçınılan
  const perDayMoney = dailyAvoided * pricePerCigarette(plan);

  const customN = Math.max(1, parseInt(customDays || '0', 10) || 0);
  const customAmount = perDayMoney * customN;

  const todayLog = logs.find((l) => l.date === todayKey());
  const todaySmoked = todayLog?.smoked || 0;
  // basit what-if: bugün içilenlerin tamamı içilmeseydi
  const whatIfExtra = todaySmoked * pricePerCigarette(plan);

  const unlockWithAd = async () => {
    const blocked = adBlockedText(data, t as any);
    if (blocked) {
      Alert.alert(t('home.adTitle'), blocked);
      return;
    }
    const res = await showRewardedUnlockAd();
    if (res.rewarded) {
      const granted = grantAdProUnlock();
      Alert.alert(
        t('home.unlockedTitle'),
        granted.ok ? t('home.unlockedMsg') : t('pro.adNone'),
      );
    } else {
      Alert.alert(t('home.adTitle'), res.message || t('home.adNotReady'));
    }
  };

  return (
    <Card>
      <Text style={styles.title}>{t('simulator.title')}</Text>
      <Text style={styles.sub}>
        {t('simulator.subtitle', { saved: formatMoney(savedSoFar, plan.currency) })}
      </Text>

      <View style={styles.grid}>
        {HORIZONS.map((h) => {
          const amount = perDayMoney * h.days;
          return (
            <View key={h.key} style={styles.cell}>
              <Text style={styles.cellLabel}>{t(`simulator.horizons.${h.key}`)}</Text>
              <Text style={styles.cellValue}>{formatMoney(amount, plan.currency)}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('simulator.whatIfTitle')}</Text>
        {!pro ? (
          <>
            <Text style={styles.muted}>{t('simulator.proOnly')}</Text>
            <Pressable style={styles.adBtn} onPress={unlockWithAd}>
              <Text style={styles.adBtnText}>{t('simulator.watchAd')}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.muted}>{t('simulator.whatIfSub')}</Text>
            <Text style={styles.resultText}>
              {whatIfExtra <= 0
                ? t('simulator.whatIfNone')
                : t('simulator.whatIfResult', {
                    count: todaySmoked,
                    amount: formatMoney(whatIfExtra, plan.currency),
                  })}
            </Text>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('simulator.customTitle')}</Text>
        {!pro ? (
          <>
            <Text style={styles.muted}>{t('simulator.proOnly')}</Text>
            <Pressable style={styles.adBtn} onPress={unlockWithAd}>
              <Text style={styles.adBtnText}>{t('simulator.watchAd')}</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.customRow}>
            <TextInput
              style={styles.input}
              value={customDays}
              onChangeText={setCustomDays}
              keyboardType="number-pad"
              placeholder={t('simulator.customLabel')}
              placeholderTextColor={colors.textMuted}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.muted}>{t('simulator.customLabel')}</Text>
              <Text style={styles.resultText}>
                {t('simulator.customResult', { days: customN, amount: formatMoney(customAmount, plan.currency) })}
              </Text>
            </View>
          </View>
        )}
      </View>

      <Text style={{fontSize:11,color:colors.textMuted,marginTop:8,lineHeight:14}}>
        {locale==='en'
          ? 'Estimates are based on your current price and average daily reduction; they do not account for inflation or price changes and are not financial/investment advice.'
          : 'Tahminler mevcut fiyat ve ortalama gunluk azaltma uzerine dayanir; enflasyon veya fiyat degisimlerini icermez ve yatirim/finansal tavsiye niteligi tasimaz.'}
      </Text>
    </Card>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    title: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
    sub: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    cell: {
      width: '48%',
      backgroundColor: colors.bg,
      borderRadius: radius.md,
      padding: spacing.sm,
    },
    cellLabel: { fontSize: fontSizes.xs, color: colors.textMuted },
    cellValue: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text, marginTop: 2 },
    section: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
    sectionTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text, marginBottom: 6 },
    muted: { fontSize: fontSizes.sm, color: colors.textMuted },
    resultText: { fontSize: fontSizes.md, fontWeight: '700', color: colors.primary, marginTop: 4 },
    adBtn: {
      alignSelf: 'flex-start',
      marginTop: spacing.sm,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.round,
    },
    adBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSizes.sm },
    customRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    input: {
      width: 90,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: colors.text,
      backgroundColor: colors.bg,
      fontSize: fontSizes.md,
    },
  });
