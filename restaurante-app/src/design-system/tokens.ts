/**
 * Design System Tokens
 *
 * Centralized design tokens for spacing, typography, borders, shadows, and layout.
 * All values must come from this file — never hardcode visual values in components.
 *
 * @module design-system/tokens
 */

import { Platform } from 'react-native';
// Keep palette centralized in theme/colors to avoid duplicated hex definitions.
import { colorSystem, designColors } from '../theme/colors';

export { colorSystem, designColors };

/* ------------------------------------------------------------------ */
/*  Color usage rules                                                  */
/* ------------------------------------------------------------------ */

export const colorUsageRules = {
  // Safe for normal text on white/surface (WCAG AA 4.5:1 or higher).
  textOnLightAllowed: ['primary', 'secondary', 'accentText', 'warningText', 'text', 'textMuted'] as const,
  // Do not use for normal text on white/surface; use as fills, chips, highlights, or icons.
  textOnLightDisallowed: ['accent', 'warning'] as const,
  textOnLightMinimumRatio: 4.5,
};

/* ------------------------------------------------------------------ */
/*  Spacing — 4px base grid                                            */
/* ------------------------------------------------------------------ */

/**
 * Spacing scale based on a 4px grid.
 * Key = semantic step, Value = pixels.
 * Also includes legacy keys (s4, s8, s12, ...) for backward compat.
 */
export const spacing = {
  // New numeric keys
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  // Legacy aliases — @deprecated use numeric keys instead
  s4: 4,
  s8: 8,
  s10: 40,
  s12: 12,
  s16: 16,
  s24: 24,
  s32: 32,
  s48: 48,
  s64: 64,
} as const;

/* ------------------------------------------------------------------ */
/*  Typography                                                         */
/* ------------------------------------------------------------------ */

/** Font size scale in pixels. */
export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

/** Font weight presets. */
export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
} as const;

/** Line-height multipliers. */
export const lineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.7,
} as const;

/** Letter-spacing in pixels. */
export const letterSpacings = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
} as const;

/**
 * @deprecated Use `fontSizes`, `fontWeights`, `lineHeights`, `letterSpacings` individually.
 * Old typography presets flattened into style objects.
 */
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
} as const;

/* ------------------------------------------------------------------ */
/*  Border radius & width                                              */
/* ------------------------------------------------------------------ */

/**
 * Border radius presets in pixels.
 * Also includes legacy keys (small, medium, large, xl) for backward compat.
 */
export const borderRadius = {
  // New keys
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
  // Legacy aliases — @deprecated use sm/md/lg/xl instead
  small: 8,
  medium: 12,
  large: 18,
} as const;

/** @deprecated Use `borderRadius` directly. */
export const radius = borderRadius;

/** Border width presets in pixels. */
export const borderWidth = {
  thin: 0.5,
  default: 1,
  thick: 2,
} as const;

/* ------------------------------------------------------------------ */
/*  Shadows — RN + web compatible                                     */
/* ------------------------------------------------------------------ */

/**
 * Shadow presets compatible with iOS (shadow*), Android (elevation), and web (boxShadow).
 * Also includes legacy keys (low, medium, high, floating) for backward compat.
 */
export const shadows = {
  // New keys
  sm: {
    shadowOffset: { width: 0, height: 1 } as const,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowOffset: { width: 0, height: 2 } as const,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowOffset: { width: 0, height: 4 } as const,
    shadowRadius: 16,
    elevation: 6,
  },
  // Legacy aliases — @deprecated use sm/md/lg instead
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
} as const;

/* ------------------------------------------------------------------ */
/*  Breakpoints (app parity with web)                                  */
/* ------------------------------------------------------------------ */

/** Responsive breakpoints in pixels for cross-platform layout parity. */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

/* ------------------------------------------------------------------ */
/*  Layout                                                             */
/* ------------------------------------------------------------------ */

export const layout = {
  maxContentWidth: 1240,
};

/* ------------------------------------------------------------------ */
/*  Type exports                                                       */
/* ------------------------------------------------------------------ */

export type SpacingToken = keyof typeof spacing;
export type FontSizeToken = keyof typeof fontSizes;
export type FontWeightToken = keyof typeof fontWeights;
export type LineHeightToken = keyof typeof lineHeights;
export type LetterSpacingToken = keyof typeof letterSpacings;
export type BorderRadiusToken = keyof typeof borderRadius;
export type BorderWidthToken = keyof typeof borderWidth;
export type ShadowToken = keyof typeof shadows;
export type BreakpointToken = keyof typeof breakpoints;
