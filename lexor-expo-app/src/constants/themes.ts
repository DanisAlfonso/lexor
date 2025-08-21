import { Theme } from '@/types/theme';

const baseTheme = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  typography: {
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 24,
      xxl: 32,
    },
    fontWeight: {
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
};

export const lightTheme: Theme = {
  ...baseTheme,
  colors: {
    background: '#ffffff',
    surface: '#f8fafc',
    primary: '#3b82f6',
    secondary: '#64748b',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    card: '#ffffff',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
  },
};

export const darkTheme: Theme = {
  ...baseTheme,
  colors: {
    background: '#0f172a',
    surface: '#1e293b',
    primary: '#60a5fa',
    secondary: '#94a3b8',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: '#334155',
    card: '#1e293b',
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
  },
};