/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3f0',
          100: '#e8e3dc',
          200: '#d4c9bb',
          300: '#b8a894',
          400: '#9d8a70',
          500: '#88755d',
          600: '#6f5f4d',
          700: '#5a4d40',
          800: '#4d4237',
          900: '#433a31',
        },
        background: {
          light: '#ffffff',
          dark: '#1a1a1a',
          sepia: '#f4e8d8'
        }
      }
    },
  },
  plugins: [],
}
