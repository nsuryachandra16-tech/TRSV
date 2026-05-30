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
          205: '#86ecfd',
          450: '#14c4e4',
          650: '#0b83a1',
          755: '#106982',
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
            light: '#22d3ee', // cyan-400
            DEFAULT: '#0891b2', // cyan-600
            dark: '#0e7490', // cyan-700
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
