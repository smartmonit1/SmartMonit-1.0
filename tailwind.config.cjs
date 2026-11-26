module.exports = {
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './components/**/*.{js,ts,jsx,tsx}',
    './services/**/*.{js,ts,jsx,tsx}',
    './utils/**/*.{js,ts,jsx,tsx}',
    './data/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'system-ui', '-apple-system', 'sans-serif']
      },
      colors: {
        military: {
          50: '#f4f6f5',
          100: '#e3e8e5',
          200: '#c2cec8',
          300: '#95aa9f',
          400: '#6d8678',
          500: '#4e695b',
          600: '#3c5246',
          700: '#32423a',
          800: '#2a3630',
          900: '#232d29',
          950: '#161d1a'
        },
        action: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          400: '#facc15',
          500: '#e1ad01',
          600: '#b88d00',
          700: '#8f6c00'
        },
        airforce: {
          500: '#1d4ed8',
          700: '#1e3a8a'
        }
      }
    }
  },
  plugins: []
};
