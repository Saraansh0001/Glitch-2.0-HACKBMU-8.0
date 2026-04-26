import forms from '@tailwindcss/forms'
import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0ea5e9',
          secondary: '#14b8a6',
          accent: '#f59e0b',
          danger: '#ef4444',
          success: '#22c55e',
          dark: '#060b16',
          card: 'rgba(255,255,255,0.06)',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        float: 'float 7s ease-in-out infinite',
        scan: 'scan 2.4s linear infinite',
        glow: 'glow 2.4s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        glow: {
          from: { boxShadow: '0 0 16px rgba(14, 165, 233, 0.25)' },
          to: { boxShadow: '0 0 34px rgba(14, 165, 233, 0.65)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [forms, typography],
}

