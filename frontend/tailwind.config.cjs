const forms = require('@tailwindcss/forms');
const typography = require('@tailwindcss/typography');

module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d'
        },
        surface: { DEFAULT: '#ffffff' },
        page: '#f7fafc',
        accent: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 500: '#2f855a', 700: '#2f855a' }
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', ' -apple-system', 'BlinkMacSystemFont'] },
      container: { center: true, padding: '1rem' }
    }
  },
  plugins: [forms, typography]
};

