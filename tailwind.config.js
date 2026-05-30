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
          light: '#34d399', // emerald-400
          DEFAULT: '#10b981', // emerald-500
          dark: '#059669', // emerald-600
        },
        slate: {
          55: '#f4f7fa',
          205: '#d6dee8',
          250: '#d6dee8',
          255: '#d3dbe6',
          350: '#afbcd0',
          405: '#7e8da1',
          440: '#78879b',
          450: '#7c8ba0',
          455: '#7a899e',
          550: '#55647a',
          605: '#3d4b5f',
          650: '#3d4b5f',
          705: '#283548',
          750: '#243043',
          805: '#172032',
          850: '#111827',
          855: '#101726',
          880: '#0b0f19',
          905: '#090e1e',
          955: '#060814',
        },
        cyan: {
          50: '#e6fffa',
          100: '#b2f5ea',
          200: '#81e6d9',
          300: '#4fd1c5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
          205: '#a7f3d0',
          450: '#34d399',
          650: '#059669',
          755: '#047857',
        },
        sky: {
          50: '#fef9c3',
          100: '#fef08a',
          200: '#fde047',
          300: '#facc15',
          400: '#fbbf24',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          950: '#451a03',
        },
        blue: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        rose: {
          450: '#f75871',
          550: '#ea2e53',
          655: '#cf1742',
          850: '#931238',
        },
        amber: {
          450: '#f8ad18',
        },
        emerald: {
          250: '#8ae6c3',
          450: '#22c68d',
          550: '#0ba775',
        },
        green: {
          550: '#1cb454',
          555: '#1bb353',
        },
        violet: {
          750: '#6424c7',
        },
        trsv: {
          accent: {
            light: '#fef08a', // yellow-200
            DEFAULT: '#eab308', // yellow-500
            dark: '#ca8a04', // yellow-600
          },
          bg: {
            light: '#f8fafc', // slate-50
            dark: '#05070e', // premium obsidian black background
          },
          surface: {
            light: '#ffffff',
            dark: '#0a0d16', // rich charcoal-black surface
          },
          card: {
            light: 'rgba(255, 255, 255, 0.75)',
            dark: 'rgba(9, 11, 20, 0.7)', // sleek translucent card
          },
          border: {
            light: 'rgba(226, 232, 240, 0.8)', // slate-200
            dark: 'rgba(255, 255, 255, 0.05)', // fine translucent border
          },
          text: {
            light: '#0f172a',
            dark: '#f1f5f9', // crisp off-white text
            mutedLight: '#64748b',
            mutedDark: '#94a3b8',
          }
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        display: ['"Outfit"', 'sans-serif'],
      },
      boxShadow: {
        'premium-light': '0 10px 30px -10px rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.02)',
        'premium-dark': '0 10px 30px -10px rgba(0, 0, 0, 0.4), 0 1px 3px 0 rgba(0, 0, 0, 0.3)',
        'glow-cyan': '0 0 20px rgba(16, 185, 129, 0.12)',
        'glow-cyan-strong': '0 0 35px rgba(16, 185, 129, 0.25)',
        'glow-blue': '0 0 20px rgba(234, 179, 8, 0.12)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
