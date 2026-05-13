const fs = require('fs')
const path = require('path')
const nativewindPreset = require('nativewind/preset')

const monorepoPresetPath = path.resolve(__dirname, '../packages/tokens/src/tailwind-preset.cjs')
const localPresetPath = path.resolve(__dirname, './src/tailwind-preset.cjs')
const preset = require(fs.existsSync(monorepoPresetPath) ? monorepoPresetPath : localPresetPath)

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [nativewindPreset, preset],
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
