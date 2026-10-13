import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fontSizes, radius } from '../theme';

type MapBadgeProps = {
  code: string;
  style?: ViewStyle;
};

export function MapBadge({ code, style }: MapBadgeProps) {
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.text}>{code}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
