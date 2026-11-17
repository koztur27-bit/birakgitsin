import { useTheme } from '../context/ThemeContext';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { radius, shadows } from '../theme';

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
};

export function Card({ children, style }: CardProps) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return <View style={[styles.card, style]}>{children}</View>;
}

const createStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 20,
    ...shadows.card,
  },
});