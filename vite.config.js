import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
  base: '/OmBalajiTradersPortal/', 
  
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script', 
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
        navigateFallback: '/OmBalajiTradersPortal/index.html',
      },
      includeAssets: ['favicon.ico', 'logo.jpeg'],
      manifest: {
        name: 'Om Balaji Traders',
        short_name: 'BalajiPortal',
        description: 'Business Management for Om Balaji Traders',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/OmBalajiTradersPortal/',
        start_url: '/OmBalajiTradersPortal/',
        icons: [
          {
            src: 'logo.jpeg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: 'logo.jpeg',
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      }
    })
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    // 🔥 This helps prevent the OneDrive "Permission Denied" build errors
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});