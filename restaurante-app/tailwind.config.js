const preset = require('../packages/tokens/src/tailwind-preset.cjs')

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    '../packages/ui/src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
