import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { IS_USER_RELEASE } from '../lib/buildFlags';
import { fontSizes, radius, spacing } from '../theme';

type MapBadgeProps = {
  code: string;
  style?: ViewStyle;
};

export function MapBadge({ code, style }: MapBadgeProps) {
  if (IS_USER_RELEASE) return null;
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.text}>{code}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: radius.round,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#FFD400',
    borderWidth: 2,
    borderColor: '#7A2E00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  text: {
    fontSize: fontSizes.sm,
    fontWeight: '900',
    color: '#3A1400',
    letterSpacing: 0.2,
  },
});
