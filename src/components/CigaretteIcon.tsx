import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const cigaretteImage = require('../../assets/cigarette.png');

type CigaretteIconProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function CigaretteIcon({ size = 22, style }: CigaretteIconProps) {
  const box = size * 1.5;
  return (
    <Image
      source={cigaretteImage}
      style={[{ width: box, height: box }, style]}
      resizeMode="contain"
    />
  );
}
