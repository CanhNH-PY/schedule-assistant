/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        priority: {
          high: { bg: '#FEE2E2', text: '#991B1B' },
          medium: { bg: '#FEF3C7', text: '#92400E' },
          low: { bg: '#DCFCE7', text: '#166534' }
        }
      }
    }
  },
  plugins: []
}
