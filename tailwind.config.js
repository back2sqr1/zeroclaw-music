/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'musica-yellow': '#ebd564',
        'musica-yellow-light': 'rgba(235,213,100,0.94)',
        'musica-yellow-faint': 'rgba(222,207,131,0.27)',
        'musica-dark': '#242424',
      },
      fontFamily: {
        raleway: ['Raleway', 'sans-serif'],
        puritan: ['Puritan', 'serif'],
        mono: ['"PT Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
