/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'media',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Open Sans"', 'system-ui', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        tle: {
          pink: '#c4698d',
          deep: '#a0496f',
          light: '#eeb8ce',
          blush: '#f8edf2',
          gold: '#bf8f48',
          charcoal: '#0e0e0e',
          ink: '#181818',
          muted: '#8a7e78',
          faint: '#c4b8b2',
          cream: '#faf8f5',
          white: '#ffffff',
        },
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'tle-float': {
          '0%': { transform: 'translateY(0) rotate(0deg) scale(1)' },
          '50%': { transform: 'translateY(-22px) rotate(12deg) scale(1.04)' },
          '100%': { transform: 'translateY(-8px) rotate(-6deg) scale(0.97)' },
        },
        'tle-bar': {
          '0%': { left: '-100%' },
          '60%': { left: '100%' },
          '100%': { left: '100%' },
        },
        'tle-slot-card': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-7px)' },
        },
      },
      animation: {
        marquee: 'marquee 22s linear infinite',
        'tle-float': 'tle-float 8s ease-in-out infinite alternate',
        'tle-bar': 'tle-bar 2.4s ease-in-out infinite',
        'tle-slot-card': 'tle-slot-card 5.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
