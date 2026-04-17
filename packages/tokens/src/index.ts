export const colors = {
  brand: {
    50: '#eef9f1',
    100: '#d4f1dc',
    200: '#a8e3b8',
    300: '#78d18f',
    400: '#47ba66',
    500: '#2e9f4d',
    600: '#227d3d',
    700: '#1c6233',
    800: '#184f2b',
    900: '#153f23',
  },
  neutral: {
    0: '#ffffff',
    50: '#f8f9fa',
    100: '#eef1f4',
    200: '#dde3ea',
    300: '#c5ced9',
    400: '#98a8ba',
    500: '#6f8299',
    600: '#4f6178',
    700: '#38495f',
    800: '#253546',
    900: '#162230',
  },
  danger: '#dc2626',
  warning: '#d97706',
  success: '#16a34a',
  info: '#0284c7',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
} as const;

export const typography = {
  family: {
    sans: 'System',
    mono: 'monospace',
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    '2xl': 28,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const shadow = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.08)',
  md: '0 4px 10px rgba(0, 0, 0, 0.12)',
  lg: '0 10px 18px rgba(0, 0, 0, 0.16)',
} as const;

export const breakpoints = {
  xs: 360,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export const tokens = {
  colors,
  spacing,
  radius,
  typography,
  shadow,
  breakpoints,
} as const;

export type DesignTokens = typeof tokens;
