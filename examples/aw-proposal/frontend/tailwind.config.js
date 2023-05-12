/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      spacing: {
        87: '87rem',
      },
      colors: {
        'slate-70': 'rgba(51,65,85,0.8)',
      },
    },
  },
  plugins: [],
};
