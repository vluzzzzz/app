/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Colores semánticos ligados a variables CSS (cambian con el tema).
        // `ink` = color de texto/acento neutro; `surface` = fondo de la app.
        ink: 'rgb(var(--ink) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'Segoe UI',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.35)',
        'glass-lg': '0 20px 60px rgba(0, 0, 0, 0.45)',
        'inner-glow': 'inset 0 1px 1px rgba(255, 255, 255, 0.25)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(20px, -30px) scale(1.1)' },
        },
      },
      animation: {
        float: 'float 12s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
