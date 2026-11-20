import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import { fontSizes, spacing } from '../theme';
import { Card } from './Card';

type GuideItem = {
  period: string;
  emoji: string;
  symptoms: string[];
  tips: string[];
};

export function WithdrawalGuide() {
  const { colors } = useTheme();
  const { t, ta, locale } = useI18n();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const items = ta<GuideItem[]>('withdrawal.items') || [];
  const symptomsLabel = locale === 'en' ? 'Possible symptoms' : 'Olası belirtiler';
  const tipsLabel = locale === 'en' ? 'Coping tips' : 'Başa çıkma önerileri';

  return (
    <Card>
      <Text style={styles.title}>{t('withdrawal.title')}</Text>
      <Text style={styles.sub}>{t('withdrawal.subtitle')}</Text>

      <View style={styles.timeline}>
        {items.map((item, idx) => {
          const last = idx === items.length - 1;
          return (
            <View key={`${item.period}-${idx}`} style={styles.row}>
              <View style={styles.rail}>
                <View style={styles.dot}>
                  <Text style={styles.dotEmoji}>{item.emoji}</Text>
                </View>
                {!last ? <View style={styles.line} /> : null}
              </View>

              <View style={[styles.content, last && styles.contentLast]}>
                <Text style={styles.period}>{item.period}</Text>

                <Text style={styles.sectionLabel}>{symptomsLabel}</Text>
                {(item.symptoms || []).map((s, i) => (
                  <Text key={`${s}-${i}`} style={styles.bullet}>
                    • {s}
                  </Text>
                ))}

                <Text style={[styles.sectionLabel, { marginTop: spacing.xs }]}>
                  {tipsLabel}
                </Text>
                {(item.tips || []).map((tip, i) => (
                  <Text key={`${tip}-${i}`} style={styles.bullet}>
                    • {tip}
                  </Text>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    title: {
      fontSize: fontSizes.lg,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.xs,
    },
    sub: {
      fontSize: fontSizes.sm,
      color: colors.textMuted,
      marginBottom: spacing.md,
      lineHeight: 20,
    },
    timeline: {
      marginTop: spacing.xs,
    },
    row: {
      flexDirection: 'row',
    },
    rail: {
      width: 36,
      alignItems: 'center',
    },
    dot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    dotEmoji: {
      fontSize: 16,
    },
    line: {
      flex: 1,
      width: 2,
      backgroundColor: colors.primarySoft,
      marginVertical: 4,
    },
    content: {
      flex: 1,
      paddingLeft: spacing.sm,
      paddingBottom: spacing.md,
    },
    contentLast: {
      paddingBottom: 0,
    },
    period: {
      fontSize: fontSizes.md,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    sectionLabel: {
      fontSize: fontSizes.sm,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 2,
    },
    bullet: {
      fontSize: fontSizes.sm,
      color: colors.textMuted,
      lineHeight: 20,
      marginBottom: 2,
    },
  });
