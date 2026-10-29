import tailwindcssAnimate from 'tailwindcss-animate';
import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        panel: 'var(--color-panel)',
        'panel-2': 'var(--color-panel-2)',
        ink: 'var(--color-ink)',
        'ink-2': 'var(--color-ink-2)',
        lime: {
          DEFAULT: 'var(--color-lime)',
          bright: 'var(--color-lime-bright)',
          soft: 'var(--color-lime-soft)',
        },
        healthy: { DEFAULT: 'var(--color-healthy)', deep: 'var(--color-healthy-deep)', bg: 'var(--color-healthy-bg)' },
        warning: { DEFAULT: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
        danger: { DEFAULT: 'var(--color-danger)', bg: 'var(--color-danger-bg)' },
        info: { DEFAULT: 'var(--color-info)', bg: 'var(--color-info-bg)' },
        line: 'var(--color-line)',
        'line-2': 'var(--color-line-2)',
        muted: 'var(--color-muted)',
        'muted-2': 'var(--color-muted-2)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        panel: '16px',
        xl2: '24px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(17,19,21,0.04), 0 1px 3px rgba(17,19,21,0.06)',
        pop: '0 8px 30px rgba(17,19,21,0.12)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
