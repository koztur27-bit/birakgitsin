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
    minWidth: 30,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.round,
    backgroundColor: '#FFD400',
    borderWidth: 2,
    borderColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  text: { fontSize: fontSizes.md, fontWeight: '900', color: '#1A1A1A' },
});
