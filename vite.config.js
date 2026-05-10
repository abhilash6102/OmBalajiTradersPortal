import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
  // This must match your GitHub repository name exactly
  base: '/OmBalajiTradersPortal/', 
  
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // We use 'injectRegister: 'inline' to make it more stable on GitHub Pages
      injectRegister: 'inline',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
        // This ensures the PWA works even with GitHub's subfolder structure
        navigateFallback: '/OmBalajiTradersPortal/index.html',
      },
      includeAssets: ['favicon.ico', 'logo.jpeg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Om Balaji Traders',
        short_name: 'BalajiPortal',
        description: 'Business Management for Om Balaji Traders',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        // Important: scope and start_url must match your base path
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
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // This helps avoid the "MIME type" error by ensuring the index.html 
    // is built correctly for GitHub subfolders
    emptyOutDir: true,
  },
});