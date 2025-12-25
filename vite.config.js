import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'SMB File Manager',
        short_name: 'SMB Files',
        description: 'Zarządzanie plikami SMB',
        theme_color: '#1e3a8a',
        background_color: '#1e3a8a',
        display: 'standalone', // Pełny tryb standalone - bez paska przeglądarki
        display_override: ['standalone', 'fullscreen', 'minimal-ui'],
        orientation: 'portrait-primary',
        start_url: '/', // Chrome na Androidzie może mieć problemy z parametrami query
        scope: '/', // Zakres aplikacji - cała domena
        lang: 'pl',
        dir: 'ltr',
        id: '/',
        // Dodatkowe ustawienia dla Chrome na Androidzie
        prefer_related_applications: false,
        related_applications: [],
        icons: [
          {
            src: '/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'maskable'
          },
          {
            src: '/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Pliki',
            short_name: 'Pliki',
            description: 'Otwórz listę plików',
            url: '/files',
            icons: [{ src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' }]
          },
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'Otwórz dashboard',
            url: '/dashboard',
            icons: [{ src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' }]
          }
        ],
        categories: ['productivity', 'utilities']
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Ustawienia dla Chrome na Androidzie
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Strategia cache dla lepszej kompatybilności z Androidem
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/_/, /^\/sw\.js/, /^\/workbox-/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      },
      // Strategia rejestracji service workera
      strategies: 'generateSW',
      // Inline manifest w HTML dla lepszej kompatybilności
      injectManifest: {
        injectionPoint: undefined
      }
    })
  ],
  server: {
    host: '0.0.0.0', // Nasłuchuj na wszystkich interfejsach
    port: 3000,
    proxy: {
      '/api': {
        // Domyślnie używamy HTTP
        // Możesz zmienić przez zmienną środowiskową VITE_API_URL
        // Przykład: VITE_API_URL=http://10.10.10.17:5087
        target: process.env.VITE_API_URL || 'http://localhost:5087',
        changeOrigin: true,
        ws: true, // WebSocket support
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying request:', req.method, req.url, '->', proxyReq.path);
          });
        },
      }
    }
  }
})

