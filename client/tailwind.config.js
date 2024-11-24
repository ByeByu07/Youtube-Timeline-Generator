/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        secondary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-dots': 'radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.07) 1px, transparent 0)',
        'gradient-mesh': 'linear-gradient(to right, rgb(0 0 0 / 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgb(0 0 0 / 0.05) 1px, transparent 1px)',
        'circuit-pattern': 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M15 0 H85 V100 H15 V0 M30 50 H70 M50 30 V70\' stroke=\'%23333\' stroke-opacity=\'0.05\' fill=\'none\' stroke-width=\'1\'/%3E%3C/svg%3E")',
        'hex-pattern': 'url("data:image/svg+xml,%3Csvg width=\'24\' height=\'40\' viewBox=\'0 0 24 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 40 L12 28 L24 40 M0 0 L12 12 L24 0\' fill=\'none\' stroke=\'%23333\' stroke-opacity=\'0.05\'/%3E%3C/svg%3E")',
      },
      animation: {
        'gradient': 'gradient 15s ease infinite',
        'pulse': 'pulse 6s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 15s linear infinite',
        'processing': 'processing 2s ease-in-out infinite',
        'upload-pulse': 'uploadPulse 1.5s ease-in-out infinite',
        'shimmer': 'shimmer 2.2s linear infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': '0% 50%',
          },
          '50%': {
            'background-size': '400% 400%',
            'background-position': '100% 50%',
          },
        },
        pulse: {
          '0%, 100%': {
            opacity: 0.4,
            transform: 'scale(1)',
          },
          '50%': {
            opacity: 0.6,
            transform: 'scale(1.05)',
          },
        },
        float: {
          '0%, 100%': {
            transform: 'translateY(0)',
          },
          '50%': {
            transform: 'translateY(-20px)',
          },
        },
        processing: {
          '0%': {
            width: '0%',
            opacity: '1',
          },
          '50%': {
            width: '100%',
            opacity: '0.5',
          },
          '100%': {
            width: '0%',
            opacity: '1',
          },
        },
        uploadPulse: {
          '0%, 100%': {
            transform: 'scale(1)',
            opacity: '0.85',
          },
          '50%': {
            transform: 'scale(1.05)',
            opacity: '1',
          },
        },
        shimmer: {
          '0%': {
            backgroundPosition: '-1000px 0',
          },
          '100%': {
            backgroundPosition: '1000px 0',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
