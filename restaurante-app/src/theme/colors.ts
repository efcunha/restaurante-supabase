import { colorSystem } from '../design-system';

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
