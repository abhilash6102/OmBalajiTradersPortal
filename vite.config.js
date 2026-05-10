import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './', // 🔥 Fixes the blank white screen on GitHub Pages
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    react() // 🔥 Pure React only! Base44 completely removed.
  ]
});