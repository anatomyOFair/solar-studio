export const transitions = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  timing: {
    ease: 'ease',
    'ease-in': 'ease-in',
    'ease-out': 'ease-out',
    'ease-in-out': 'ease-in-out',
    linear: 'linear',
  },

  // Common transition presets
  default: 'all 200ms ease-in-out',
  colors: 'color 200ms ease-in-out, background-color 200ms ease-in-out',
  transform: 'transform 200ms ease-in-out',
} as const

