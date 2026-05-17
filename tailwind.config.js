/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#38bdf8', // sky-400
          DEFAULT: '#0284c7', // sky-600
          dark: '#0369a1', // sky-700
        },
        tsrv: {
          accent: {
            light: '#22d3ee', // cyan-400
            DEFAULT: '#0891b2', // cyan-600
            dark: '#0e7490', // cyan-700
          },
          bg: {
            light: '#f8fafc', // slate-50
            dark: '#030712', // slate-950
          },
          surface: {
            light: '#ffffff',
            dark: '#0b1528', // dark navy surface
          },
          card: {
            light: 'rgba(255, 255, 255, 0.75)',
            dark: 'rgba(11, 21, 40, 0.65)',
          },
          border: {
            light: 'rgba(226, 232, 240, 0.8)', // slate-200
            dark: 'rgba(30, 41, 59, 0.5)', // slate-800
          },
          text: {
            light: '#0f172a',
            dark: '#f8fafc',
            mutedLight: '#64748b',
            mutedDark: '#94a3b8',
          }
        }
      },
      fontFamily: {
        sans: ['Poppins', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'premium-light': '0 10px 30px -10px rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.02)',
        'premium-dark': '0 10px 30px -10px rgba(0, 0, 0, 0.4), 0 1px 3px 0 rgba(0, 0, 0, 0.3)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.12)',
        'glow-cyan-strong': '0 0 35px rgba(6, 182, 212, 0.25)',
        'glow-blue': '0 0 20px rgba(14, 165, 233, 0.12)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
