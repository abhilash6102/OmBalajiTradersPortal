import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
  // Ensures scripts load from the GitHub repo subfolder
  base: '/OmBalajiTradersPortal/', 
  
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.jpeg'],
      manifest: {
        name: 'Om Balaji Traders',
        short_name: 'BalajiPortal',
        description: 'Business Management for Om Balaji Traders',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', // 🔥 Key for the "Real App Feel"
        scope: '/OmBalajiTradersPortal/',
        start_url: '/OmBalajiTradersPortal/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' 
          }
        ]
      }
    })
  ],

  resolve: {
    alias: {
      // Keeps your preferred alias method
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
});