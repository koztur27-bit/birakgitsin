import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabKey } from '../types';
import { fontSizes, spacing } from '../theme';

type TabBarProps = {
  active: TabKey;
  onChange: (tab: TabKey) => void;
};

export function TabBar({ active, onChange }: TabBarProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  // Android 3 tuşlu bar bazı cihazlarda insets.bottom değerini 0 döndürebildiği için minimum güvenli boşluk veriyoruz:
  const bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 24) : insets.bottom;
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'home', label: t('tabs.home') },
    { key: 'craving', label: t('tabs.craving') },
    { key: 'health', label: t('tabs.health') },
    { key: 'stats', label: t('tabs.stats') },
    { key: 'settings', label: t('tabs.settings') },
  ];
  return (
    <View style={[styles.bar, { paddingBottom: bottomInset + spacing.sm }]}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <View style={[styles.dot, isActive && styles.dotActive]} />
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.primaryDark,
  },
});