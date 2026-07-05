/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F6E5C', // Deep Teal
          hover: '#0C594A',
          light: '#E6F0EE'
        },
        accent: {
          DEFAULT: '#E8973B', // Warm Amber
          hover: '#CF812A',
          light: '#FAF1E6'
        },
        navy: {
          50: '#F0F2F5',
          100: '#E1E5EB',
          200: '#C2CAD6',
          300: '#94A3B8',
          400: '#64748B',
          450: '#5E6E82',
          500: '#475569',
          600: '#334155',
          700: '#1E293B',
          800: '#0F172A',
          850: '#0E1322',
          855: '#0A0E1A',
          900: '#0B0F19', // Custom Ink Navy (rich blue undertone)
          950: '#05070C'
        },
        ink: {
          light: '#F9F9FB',
          dark: '#0B0F19'
        }
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif']
      },
      boxShadow: {
        premium: '0 4px 20px -2px rgba(15, 110, 92, 0.12), 0 2px 10px -1px rgba(11, 15, 25, 0.04)',
        glow: '0 0 15px rgba(15, 110, 92, 0.25)',
        card: '0 1px 3px rgba(11, 15, 25, 0.05), 0 1px 2px rgba(11, 15, 25, 0.02)',
        cardHover: '0 10px 25px -5px rgba(11, 15, 25, 0.08), 0 8px 16px -6px rgba(11, 15, 25, 0.04)'
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' }
        }
      }
    },
  },
  plugins: [],
}
