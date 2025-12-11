export const colors = {
  // Primary colors
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // Secondary colors
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // Visibility overlay colors (red to green gradient)
  visibility: {
    poor: '#ef4444',      // Red - 0-30% visibility
    moderate: '#f59e0b',   // Orange - 30-70% visibility
    good: '#10b981',       // Green - 70-100% visibility
  },

  // Background colors
  background: {
    dark: '#0f172a',
    darker: '#020617',
    light: '#ffffff',
    gray: '#1e293b',
  },

  // Text colors
  text: {
    primary: '#ffffff',
    secondary: '#cbd5e1',
    muted: '#94a3b8',
    dark: '#0f172a',
  },

  // Status colors
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },

  // Navbar colors
  navbar: {
    base: '#0a0f1a',
    border: '#1a2332',
    background: 'rgba(10, 15, 26, 0.60)',
  },

  // Common colors
  transparent: 'transparent',
  white: '#ffffff',
} as const

