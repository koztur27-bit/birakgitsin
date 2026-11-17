export type ThemeMode = 'light' | 'dark' | 'system';

export const lightColors = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryDarker: '#1E3A8A',
  primarySoft: '#E4EDFF',
  accent: '#FFB84D',
  accentSoft: '#FFF3DC',
  danger: '#E5484D',
  dangerSoft: '#FDEBEC',
  success: '#2BA84A',
  bg: '#F2F6FD',
  card: '#FFFFFF',
  text: '#0F1B33',
  textMuted: '#64748B',
  border: '#DEE7F5',
  white: '#FFFFFF',
  black: '#000000',
};

export const darkColors = {
  primary: '#60A5FA',
  primaryDark: '#3B82F6',
  primaryDarker: '#1E3A8A',
  primarySoft: '#1E293B',
  accent: '#FBBF24',
  accentSoft: '#3B2F1A',
  danger: '#F87171',
  dangerSoft: '#3B1F24',
  success: '#4ADE80',
  bg: '#0B1220',
  card: '#111A2E',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
  border: '#1F2A44',
  white: '#FFFFFF',
  black: '#000000',
};

export const colors = lightColors;

export function resolveColors(mode: ThemeMode, system: 'light' | 'dark'): typeof lightColors {
  if (mode === 'dark') return darkColors;
  if (mode === 'light') return lightColors;
  return system === 'dark' ? darkColors : lightColors;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  xl: 28,
  round: 999,
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 40,
  huge: 64,
};

export const shadows = {
  card: {
    shadowColor: '#12306B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
};

export const currencySymbols = ['₺', '$', '€', '£', '¥'] as const;