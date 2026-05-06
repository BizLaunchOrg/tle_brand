import plugin from 'tailwindcss/plugin'

/** @type {import('tailwindcss').Config} */
const poppinsWeights = [
  ['thin', '100'],
  ['extralight', '200'],
  ['light', '300'],
  ['regular', '400'],
  ['medium', '500'],
  ['semibold', '600'],
  ['bold', '700'],
  ['extrabold', '800'],
  ['black', '900'],
]

const latoWeights = [
  ['thin', '100'],
  ['light', '300'],
  ['regular', '400'],
  ['bold', '700'],
  ['black', '900'],
]

function namedWeightUtilities(prefix, fontFamily, weights) {
  /** @type {Record<string, Record<string, string>>} */
  const out = {}
  for (const [label, w] of weights) {
    out[`.${prefix}-${label}`] = {
      'font-family': fontFamily,
      'font-weight': w,
      'font-style': 'normal',
    }
    out[`.${prefix}-${label}-italic`] = {
      'font-family': fontFamily,
      'font-weight': w,
      'font-style': 'italic',
    }
  }
  return out
}

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        lato: ['Lato', 'sans-serif'],
        'open-sans': ['"Open Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities, addComponents }) {
      addUtilities({
        ...namedWeightUtilities('poppins', 'Poppins, sans-serif', poppinsWeights),
        ...namedWeightUtilities('lato', 'Lato, sans-serif', latoWeights),
      })
      addComponents({
        '.open-sans-text': {
          fontFamily: '"Open Sans", sans-serif',
          fontOpticalSizing: 'auto',
          fontVariationSettings: '"wdth" 100',
        },
      })
    }),
  ],
}
