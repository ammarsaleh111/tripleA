/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FFCC00',
          hover: '#E6B800',
          light: '#FFD633',
          dark: '#CC0300',
        },
        accent: {
          DEFAULT: '#FFCC00',
          cream: '#FFF8E7',
        },
        neon: '#FFCC00', // TRIPLE A Industrial Yellow accent
        dark: {
          bg: '#0A0A0A',
          panel: '#141414',
          card: '#1A1A1A',
          input: '#161616',
          border: '#282828',
          hover: '#222222',
        },
        cream: '#FFF8E7',
        brand: {
          50: '#FFFDF0',
          100: '#FFF8C4',
          200: '#FFF08A',
          300: '#FFE64D',
          400: '#FFD60F',
          500: '#FFCC00',
          600: '#D6A600',
          700: '#A37C00',
          800: '#705300',
          900: '#3D2D00',
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
