// Single source of truth for project color palette.
// All design-system tokens must consume this file, never redefine hex values elsewhere.
//
// New Design System color architecture:
// - primary: amber 50-900 scale (brand color)
// - neutral: warm gray 50-900 scale
// - semantic: success, warning, error, info (each with light/default/dark)
// - surface: base, card, elevated, overlay
// - text: primary, secondary, tertiary, disabled, inverse, onPrimary
// - border: default, subtle, strong, focus
//
// Supports light/dark mode via Appearance.getColorScheme()

import { Appearance } from 'react-native';

/** Full amber primary scale (50-900). */
const primaryScale = {
  50: '#FFFBEB',
  100: '#FEF3C7',
  200: '#FDE68A',
  300: '#FCD34D',
  400: '#FBBF24',
  500: '#F59E0B',
  600: '#D97706',
  700: '#B45309',
  800: '#92400E',
  900: '#78350F',
} as const;

/** Full warm gray neutral scale (50-900). */
const neutralScale = {
  50: '#FAFAF9',
  100: '#F5F5F4',
  200: '#E7E5E4',
  300: '#D6D3D1',
  400: '#A8A29E',
  500: '#78716C',
  600: '#57534E',
  700: '#44403C',
  800: '#292524',
  900: '#1C1917',
} as const;

/** Semantic color definitions with light/default/dark variants. */
const semanticRaw = {
  success: { light: '#DCFCE7', default: '#16A34A', dark: '#166534' },
  warning: { light: '#FEF3C7', default: '#D97706', dark: '#92400E' },
  error:   { light: '#FEE2E2', default: '#DC2626', dark: '#991B1B' },
  info:    { light: '#DBEAFE', default: '#2563EB', dark: '#1E40AF' },
} as const;

/* ------------------------------------------------------------------ */
/*  Migration guidance                                                  */
/*  USE: designColors                                                   */
/*  LEGADO: colors (flat)                                               */
/*  NAO USE: colorSystem em telas novas                                */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Legacy colorSystem — preserved for backward compatibility.         */
/* ------------------------------------------------------------------ */

export const colorSystem = {
  primary: '#0E7490',
  secondary: '#0F172A',
  accent: '#F97316',
  accentText: '#B45309',
  background: '#F4F6FB',
  surface: '#FFFFFF',
  success: '#16A34A',
  warning: '#D97706',
  warningText: '#92400E',
  error: '#DC2626',
  text: '#0B1220',
  textMuted: '#5B6472',
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  onAccent: '#0B1220',
  border: '#D7DEEA',
  overlay: 'rgba(11, 18, 32, 0.52)',
};

/* ------------------------------------------------------------------ */
/*  Legacy flat `colors` — default export for existing screens.        */
/*  DO NOT remove or rename — 170+ files depend on this shape.         */
/* ------------------------------------------------------------------ */

/**
 * Flat color palette for backward compatibility.
 * All values are hex strings suitable for RN `color` style props.
 *
 * @deprecated For **new** UI, prefer `designColors` (nested, light/dark aware).
 */
export const colors = {
  primary: colorSystem.primary,
  secondary: colorSystem.accentText,
  background: colorSystem.background,
  white: colorSystem.surface,
  text: colorSystem.text,
  textSecondary: colorSystem.textMuted,
  textLight: colorSystem.textMuted,
  border: colorSystem.border,
  success: colorSystem.success,
  warning: colorSystem.warningText,
  danger: colorSystem.error,
  onDanger: '#FFFFFF',
  successSurface: '#ECFDF3',
  warningSurface: '#FFF7ED',
  dangerSurface: '#FEE2E2',
  primaryDivider: '#7A2828',
  primaryContrastMuted: 'rgba(255,255,255,0.7)',
  overlay: 'rgba(0,0,0,0.5)',
  dangerLight: '#FF6B6B',
  userInfo: '#CFE8EF',
  surfaceMuted: '#F5F5F5',
  primaryTint: '#f0f9ff',
  logoutBg: 'rgba(255,255,255,0.2)',
  disabled: '#9AA4B2',
  shadow: '#000000',
} as const;

/* ------------------------------------------------------------------ */
/*  New Design System colors — nested, light/dark aware.               */
/* ------------------------------------------------------------------ */

type ColorScheme = 'light' | 'dark';

function getScheme(): ColorScheme {
  const cs = Appearance.getColorScheme();
  return cs === 'dark' ? 'dark' : 'light';
}

/** Light-mode design system palette. */
const _lightDesignColors = {
  primary: primaryScale,
  neutral: neutralScale,
  semantic: semanticRaw,
  surface: {
    base: '#F4F6FB',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    overlay: 'rgba(11, 18, 32, 0.52)',
  } as const,
  text: {
    primary: '#0B1220',
    secondary: '#5B6472',
    tertiary: '#9AA4B2',
    disabled: '#9AA4B2',
    inverse: '#FFFFFF',
    onPrimary: '#FFFFFF',
  } as const,
  border: {
    default: '#D7DEEA',
    subtle: '#E7E5E4',
    strong: '#A8A29E',
    focus: '#0E7490',
  } as const,
} as const;

/** Dark-mode design system palette. */
const _darkDesignColors = {
  primary: primaryScale,
  neutral: {
    50: neutralScale[900],
    100: neutralScale[800],
    200: neutralScale[700],
    300: neutralScale[600],
    400: neutralScale[500],
    500: neutralScale[400],
    600: neutralScale[300],
    700: neutralScale[200],
    800: neutralScale[100],
    900: neutralScale[50],
  },
  semantic: {
    success: { light: '#166534', default: '#22C55E', dark: '#DCFCE7' },
    warning: { light: '#92400E', default: '#FBBF24', dark: '#FEF3C7' },
    error:   { light: '#991B1B', default: '#EF4444', dark: '#FEE2E2' },
    info:    { light: '#1E40AF', default: '#3B82F6', dark: '#DBEAFE' },
  } as const,
  surface: {
    base: '#0F172A',
    card: '#1E293B',
    elevated: '#334155',
    overlay: 'rgba(0, 0, 0, 0.70)',
  } as const,
  text: {
    primary: '#F5F5F4',
    secondary: '#A8A29E',
    tertiary: '#78716C',
    disabled: '#57534E',
    inverse: '#0B1220',
    onPrimary: '#FFFFFF',
  } as const,
  border: {
    default: '#334155',
    subtle: '#1E293B',
    strong: '#475569',
    focus: '#38BDF8',
  } as const,
} as const;

/**
 * Design System color tokens — nested structure with light/dark awareness.
 *
 * Usage (new UI):
 *   import { designColors } from '../theme/colors';
 *   designColors.primary[500]       // amber-500
 *   designColors.text.primary       // theme-aware text color
 *   designColors.semantic.success   // { light, default, dark }
 */
export const designColors: typeof _lightDesignColors | typeof _darkDesignColors = (() => {
  const scheme = getScheme();
  return scheme === 'dark' ? _darkDesignColors : _lightDesignColors;
})();

/** Explicit alias for new code paths while legacy screens still use flat colors. */
export const uiColors = designColors;

/* ------------------------------------------------------------------ */
/*  Legacy compatibility alias.                                        */
/* ------------------------------------------------------------------ */

/** @deprecated Use `colors` (flat) or `designColors` (nested) instead. */
export const legacyColors = colors;

/* ------------------------------------------------------------------ */
/*  Type exports                                                       */
/* ------------------------------------------------------------------ */

export type ColorToken = typeof colors;
export type DesignColorToken = typeof _lightDesignColors;
export type ColorSchemeToken = ColorScheme;
