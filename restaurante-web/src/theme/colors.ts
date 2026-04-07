// Single source of truth for project color palette.
// All design-system tokens must consume this file, never redefine hex values elsewhere.
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

// Legacy compatibility bridge. Existing screens can keep importing `colors`
// while new UI uses `colorSystem` directly.
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
    danger: colorSystem.error, // Also used for remove buttons
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
};
