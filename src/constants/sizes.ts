export const sizes = {
  // Layout sizes
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Component sizes
  sidebar: {
    width: '280px',
    collapsed: '64px',
  },

  navbar: {
    height: '64px',
  },

  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    full: '9999px',
  },

  // Z-index scale
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },

  // Widget sizes
  widget: {
    minWidth: '200px',
    maxWidth: '480px',
    searchWidth: '150px',
    timeButtonWidth: '240px',
  },

  // Blur effects
  blur: {
    default: '12px',
    modal: '4px',
  },

  // Input & Button standard sizes
  inputs: {
    borderWidth: '2px',
    paddingVertical: '12px',
    paddingHorizontal: '16px',
    paddingLeftWithIcon: '50px',
    iconOffset: '24px',
    borderRadius: '0.5rem', // sizes.borderRadius.lg (8px)
    gap: '12px',
  },

  // Modal specific sizes
  modal: {
    width: '500px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    paddingContent: '40px',
    headerPaddingTop: '24px',
    headerPaddingBottom: '16px',
    borderWidth: '1px',
  },

  // Panel specific sizes
  panel: {
    width: 'clamp(260px, 28vw, 360px)',
    height: '70vh',
    maxWidth: 'calc(100vw - 40px)',
    buttonWidth: '90%',
    indent: '24px',
    toggleSize: '40px',
    borderWidth: '1px',
  },

  // Font sizes
  fonts: {
    xs: '12px',
    sm: '14px',
  },
} as const

