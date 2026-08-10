/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--theme-accent)',
          hover: 'var(--theme-accent-hover)',
          light: 'var(--theme-accent-soft)',
          dark: 'var(--theme-accent-press)',
        },
        accent: {
          DEFAULT: 'var(--theme-accent)',
          cream: 'var(--theme-text-primary)',
        },
        neon: 'var(--theme-accent)',
        dark: {
          bg: 'var(--theme-bg-canvas)',
          panel: 'var(--theme-bg-surface)',
          card: 'var(--theme-bg-elevated)',
          input: 'var(--theme-bg-muted)',
          border: 'var(--theme-border-soft)',
          hover: 'var(--theme-bg-muted)',
        },
        cream: 'var(--theme-text-primary)',
        brand: {
          50: 'var(--theme-accent-soft)',
          100: 'var(--theme-accent-soft)',
          200: 'var(--theme-accent-soft)',
          300: 'var(--theme-accent-soft)',
          400: 'var(--theme-accent-hover)',
          500: 'var(--theme-accent)',
          600: 'var(--theme-accent-hover)',
          700: 'var(--theme-accent-press)',
          800: 'var(--theme-accent-press)',
          900: 'var(--theme-accent-press)',
        },
      },
      fontFamily: {
        heading: ['"Montserrat"', 'sans-serif'],
        display: ['"Montserrat"', 'sans-serif'],
        body: ['"Hanken Grotesk"', '"Inter"', 'sans-serif'],
        sans: ['"Hanken Grotesk"', '"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
