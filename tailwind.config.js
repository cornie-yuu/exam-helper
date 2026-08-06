/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'navy': '#1F316D',
        'apple-red': '#8C0A18',
        'cream': '#FAF8F5',
        'text-dark': '#1A1A1A',
        'text-light': '#6B6B6B',
      },
      fontFamily: {
        'display': ['Georgia', 'serif'],
        'body': ['-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
      },
    },
    fontSize: {
      'xs': ['0.7rem', { lineHeight: '1.4' }],
      'sm': ['0.8rem', { lineHeight: '1.5' }],
      'base': ['0.9rem', { lineHeight: '1.5' }],
      'lg': ['1rem', { lineHeight: '1.5' }],
      'xl': ['1.125rem', { lineHeight: '1.4' }],
      '2xl': ['1.35rem', { lineHeight: '1.3' }],
      '3xl': ['1.6rem', { lineHeight: '1.25' }],
      '4xl': ['2rem', { lineHeight: '1.2' }],
    },
  },
  plugins: [],
}
