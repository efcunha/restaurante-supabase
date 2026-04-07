import { Platform } from 'react-native';
// Keep palette centralized in theme/colors to avoid duplicated hex definitions.
import { colorSystem } from '../theme/colors';

export { colorSystem };

export const colorUsageRules = {
  // Safe for normal text on white/surface (WCAG AA 4.5:1 or higher).
  textOnLightAllowed: ['primary', 'secondary', 'accentText', 'warningText', 'text', 'textMuted'] as const,
  // Do not use for normal text on white/surface; use as fills, chips, highlights, or icons.
  textOnLightDisallowed: ['accent', 'warning'] as const,
  textOnLightMinimumRatio: 4.5,
};

export const typography = {
  headingXL: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800' as const,
    letterSpacing: -0.8,
  },
  headingL: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  headingM: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  small: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  button: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
};

export const spacing = {
  s4: 4,
  s8: 8,
  s12: 12,
  s16: 16,
  s24: 24,
  s32: 32,
  s48: 48,
  s64: 64,
};

export const radius = {
  small: 8,
  medium: 12,
  large: 18,
  xl: 26,
};

export const shadows = {
  low: Platform.select({
    ios: {
      shadowColor: '#0B1220',
      shadowOpacity: 0.07,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
    },
    android: { elevation: 2 },
    web: {
      boxShadow: '0px 2px 6px rgba(11, 18, 32, 0.07)',
    },
  }) as object,
  medium: Platform.select({
    ios: {
      shadowColor: '#0B1220',
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 12,
    },
    android: { elevation: 5 },
    web: {
      boxShadow: '0px 6px 12px rgba(11, 18, 32, 0.12)',
    },
  }) as object,
  high: Platform.select({
    ios: {
      shadowColor: '#0B1220',
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 18,
    },
    android: { elevation: 8 },
    web: {
      boxShadow: '0px 10px 18px rgba(11, 18, 32, 0.18)',
    },
  }) as object,
  floating: Platform.select({
    ios: {
      shadowColor: '#0B1220',
      shadowOpacity: 0.24,
      shadowOffset: { width: 0, height: 14 },
      shadowRadius: 24,
    },
    android: { elevation: 12 },
    web: {
      boxShadow: '0px 14px 24px rgba(11, 18, 32, 0.24)',
    },
  }) as object,
};

export const layout = {
  maxContentWidth: 1240,
};
