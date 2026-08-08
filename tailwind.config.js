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
          pink: 'rgb(var(--tle-pink-rgb, 196 105 141) / <alpha-value>)',
          deep: 'rgb(var(--tle-deep-rgb, 160 73 111) / <alpha-value>)',
          light: 'rgb(var(--tle-light-rgb, 238 184 206) / <alpha-value>)',
          blush: 'rgb(var(--tle-blush-rgb, 248 237 242) / <alpha-value>)',
          gold: 'rgb(var(--tle-gold-rgb, 191 143 72) / <alpha-value>)',
          charcoal: 'rgb(var(--tle-charcoal-rgb, 14 14 14) / <alpha-value>)',
          ink: '#181818',
          muted: '#8a7e78',
          faint: '#c4b8b2',
          cream: 'rgb(var(--tle-cream-rgb, 250 248 245) / <alpha-value>)',
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
        marquee: 'marquee 30s linear infinite',
        'tle-float': 'tle-float 8s ease-in-out infinite alternate',
        'tle-bar': 'tle-bar 2.4s ease-in-out infinite',
        'tle-slot-card': 'tle-slot-card 5.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
