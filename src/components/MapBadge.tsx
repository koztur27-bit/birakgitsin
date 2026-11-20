import { useTheme } from '../context/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { fontSizes, radius } from '../theme';

type MapBadgeProps = {
  code: string;
  style?: ViewStyle;
};

export function MapBadge({ code, style }: MapBadgeProps) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.text}>{code}</Text>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  badge: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.round,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: fontSizes.sm, fontWeight: '900', color: '#3D2800' },
});
