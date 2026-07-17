/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       'rgb(var(--bg) / <alpha-value>)',
        card:     'rgb(var(--card) / <alpha-value>)',
        surface:  'rgb(var(--surface) / <alpha-value>)',
        ink:      'rgb(var(--ink) / <alpha-value>)',
        sub:      'rgb(var(--sub) / <alpha-value>)',
        brand:    'rgb(var(--brand) / <alpha-value>)',
        danger:   'rgb(var(--danger) / <alpha-value>)',
        positive: 'rgb(var(--positive) / <alpha-value>)',
        line:     'rgb(var(--line) / <alpha-value>)',
      },
      backgroundColor: {
        dim: 'rgb(var(--dim))',
      },
      fontFamily: {
        script: ['"Great Vibes"', 'cursive'],
      },
    },
  },
  plugins: [],
}
