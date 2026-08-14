import type { Config } from 'tailwindcss';

/**
 * Tailwind consumes ONLY our CSS-variable tokens (see src/styles/tokens.css).
 * No raw hex in components. Add a token to tokens.css, then map it here.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        text: 'var(--text)',
        'text-dim': 'var(--text-dim)',
        'text-faint': 'var(--text-faint)',
        gold: 'var(--gold)',
        'gold-strong': 'var(--gold-strong)',
        'gold-dim': 'var(--gold-dim)',
        up: 'var(--up)',
        down: 'var(--down)',
        buy: 'var(--buy)',
        sell: 'var(--sell)',
        warn: 'var(--warn)',
        danger: 'var(--danger)',
        ok: 'var(--ok)',
        info: 'var(--info)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        ui: 'var(--font-ui)',
        mono: 'var(--font-mono)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        overlay: 'var(--shadow)',
      },
      keyframes: {
        'flash-up': {
          '0%': { backgroundColor: 'var(--up-bg)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'flash-down': {
          '0%': { backgroundColor: 'var(--down-bg)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
      animation: {
        'flash-up': 'flash-up 400ms ease-out',
        'flash-down': 'flash-down 400ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
