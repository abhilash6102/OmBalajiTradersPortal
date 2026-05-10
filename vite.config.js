import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
  // This ensures all scripts load from /OmBalajiTradersPortal/ instead of the root
  base: '/OmBalajiTradersPortal/', 
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // 🔥 ADD THIS PART BELOW
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
});

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

export default defineConfig({
  plugins: [react()],
  base: '/OmBalajiTradersPortal/', // 🔥 MUST match your repo name exactly
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})