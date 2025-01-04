/* eslint-disable no-undef */
/** @type {import('tailwindcss').Config} */
export const content = [
  './src/**/*.{ts,tsx}',
  './index.html',
  '../shared/components/**/*.{ts,tsx}',
]
export { theme, prefix, darkMode } from '@cads/shared/tailwind.config.js'
import { plugins as basePlugins } from '@cads/shared/tailwind.config.js'
export const plugins = [...basePlugins]
