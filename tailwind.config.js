/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#3182F6',
        ink: '#191F28',
        sub: '#8B95A1',
        card: '#F2F4F6',
      },
    },
  },
  plugins: [],
}
