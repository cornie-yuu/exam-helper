/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cream': '#FAF8F5',
        'sage': '#8AB8B0',
        'coral': '#E8967A',
        'text-dark': '#1A1A1A',
        'text-light': '#6B6B6B',
      },
      fontFamily: {
        'display': ['Georgia', 'serif'],
        'body': ['-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1.5rem',
        '2xl': '2rem',
      },
      boxShadow: {
        'vocab': '0 3px 0 #1A1A1A',
        'vocab-card': '0 4px 0 #1A1A1A',
      },
    },
    fontSize: {
      'xs': ['0.75rem', { lineHeight: '1.4' }],
      'sm': ['0.875rem', { lineHeight: '1.5' }],
      'base': ['1rem', { lineHeight: '1.5' }],
      'lg': ['1.125rem', { lineHeight: '1.5' }],
      'xl': ['1.25rem', { lineHeight: '1.4' }],
      '2xl': ['1.5rem', { lineHeight: '1.3' }],
      '3xl': ['1.875rem', { lineHeight: '1.25' }],
      '4xl': ['2.25rem', { lineHeight: '1.2' }],
    },
  },
  plugins: [],
}

