import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { formatMoney, totalMoneySaved } from '../lib/calculations';
import { fontSizes, radius, spacing } from '../theme';
import { Card } from './Card';
import { MapBadge } from './MapBadge';
import { ProgressBar } from './ProgressBar';

export function SavingsGoalCard() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { data, setSavingsGoal } = useApp();
  const { t } = useI18n();
  const plan = data.plan;

  const [goalEditing, setGoalEditing] = useState(false);
  const [goalTitle, setGoalTitle] = useState(data.savingsGoal?.title ?? '');
  const [goalTarget, setGoalTarget] = useState(data.savingsGoal ? String(data.savingsGoal.target) : '');

  if (!plan) return null;

  const saved = totalMoneySaved(plan, data.logs);
  const savingsGoal = data.savingsGoal;
  const goalProgress = savingsGoal && savingsGoal.target > 0 ? Math.min(1, Math.max(0, saved / savingsGoal.target)) : 0;
  const goalRemaining = savingsGoal ? Math.max(0, savingsGoal.target - saved) : 0;

  const saveGoal = () => {
    const title = goalTitle.trim();
    const target = Number(goalTarget.replace(',', '.'));
    if (!title || !Number.isFinite(target) || target <= 0) {
      Alert.alert(t('home.goalInvalidTitle'), t('home.goalInvalidMsg'));
      return;
    }
    setSavingsGoal({ title, target });
    setGoalEditing(false);
  };

  return (
    <Card style={styles.goalCard}>
      <View style={styles.mapTitleRow}><MapBadge code="7" /><Text style={styles.cardLabel}>{t('home.savingsGoal')}</Text></View>
      {!savingsGoal || goalEditing ? (
        <View style={styles.goalForm}>
          <Text style={styles.cardHint}>{t('home.savingsGoalHint')}</Text>
          <TextInput
            style={styles.goalInput}
            placeholder={t('home.goalNamePlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={goalTitle}
            onChangeText={setGoalTitle}
            maxLength={60}
          />
          <TextInput
            style={styles.goalInput}
            placeholder={t('home.goalAmountPlaceholder', { currency: plan.currency })}
            placeholderTextColor={colors.textMuted}
            value={goalTarget}
            onChangeText={setGoalTarget}
            keyboardType="decimal-pad"
            maxLength={12}
          />
          <View style={styles.goalFormActions}>
            {savingsGoal ? (
              <Pressable style={styles.goalGhostBtn} onPress={() => setGoalEditing(false)}>
                <Text style={styles.goalGhostText}>{t('home.goalCancel')}</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.goalSaveBtn} onPress={saveGoal}>
              <Text style={styles.goalSaveText}>{t('home.goalSave')}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.goalBody}>
          <View style={styles.goalHead}>
            <View style={styles.goalHeadText}>
              <Text style={styles.goalTitle}>{savingsGoal.title}</Text>
              <Text style={styles.goalTargetText}>
                {t('home.goalTarget', { amount: formatMoney(savingsGoal.target, plan.currency) })}
              </Text>
            </View>
            <Text style={styles.goalPercent}>%{Math.round(goalProgress * 100)}</Text>
          </View>
          <ProgressBar
            progress={goalProgress}
            color={goalProgress >= 1 ? colors.success : colors.accent}
            height={10}
          />
          <Text style={styles.goalStatus}>
            {goalProgress >= 1
              ? t('home.goalReached', { amount: formatMoney(savingsGoal.target, plan.currency) })
              : t('home.goalStatus', {
                  remaining: formatMoney(goalRemaining, plan.currency),
                  saved: formatMoney(saved, plan.currency),
                })}
          </Text>
          <View style={styles.goalFormActions}>
            <Pressable
              style={styles.goalGhostBtn}
              onPress={() => {
                setSavingsGoal(null);
                setGoalTitle('');
                setGoalTarget('');
              }}
            >
              <Text style={styles.goalGhostText}>{t('home.goalRemove')}</Text>
            </Pressable>
            <Pressable
              style={styles.goalGhostBtn}
              onPress={() => {
                setGoalTitle(savingsGoal.title);
                setGoalTarget(String(savingsGoal.target));
                setGoalEditing(true);
              }}
            >
              <Text style={styles.goalGhostText}>{t('home.goalEdit')}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </Card>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    goalCard: { gap: spacing.sm },
    mapTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    cardLabel: { fontSize: fontSizes.sm, color: colors.textMuted, fontWeight: '600' },
    cardHint: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
    goalForm: { gap: spacing.sm, marginTop: spacing.xs },
    goalInput: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: colors.text,
      fontSize: fontSizes.sm,
    },
    goalFormActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
    goalGhostBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    goalGhostText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textMuted },
    goalSaveBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
    },
    goalSaveText: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.white },
    goalBody: { gap: spacing.sm, marginTop: spacing.xs },
    goalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    goalHeadText: { flex: 1, gap: 2 },
    goalTitle: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text },
    goalTargetText: { fontSize: fontSizes.sm, color: colors.textMuted },
    goalPercent: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.primaryDark },
    goalStatus: { fontSize: fontSizes.sm, color: colors.textMuted, lineHeight: 20 },
  });
