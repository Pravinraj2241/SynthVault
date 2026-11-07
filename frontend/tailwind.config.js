/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* Single brand accent (indigo) - solid colors only, no gradients. */
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      maxWidth: {
        /* Landing page / app shell width (~1200px). */
        shell: '1200px',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      keyframes: {
        'sv-fade': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'sv-fade': 'sv-fade 150ms ease-out',
      },
    },
  },
  plugins: [],
};