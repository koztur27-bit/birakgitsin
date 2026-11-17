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
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.round,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: fontSizes.xs, fontWeight: '800', color: '#5A3D00' },
});
