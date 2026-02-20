import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { componentTagger } from "lovable-tagger"
import path from 'path'

export default defineConfig(({ mode }) => ({
    plugins: [
        react(),
        mode === 'development' && componentTagger(),
        {
            name: 'html-transform',
            transformIndexHtml(html: string) {
                return html.replace('%BASE_URL%', "/");
            },
        },
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'favicon.ico', 'robots.txt'],
            workbox: {
                // Força limpeza de cache antigo
                cleanupOutdatedCaches: true,
                // Skip waiting - atualiza imediatamente
                skipWaiting: true,
                // Claim clients - assume controle imediato
                clientsClaim: true,
                // Cache de navegação
                navigateFallback: 'index.html',
                // Não cachear chamadas de API
                navigateFallbackDenylist: [/^\/api/, /^\/functions/],
                // Runtime caching para assets
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 ano
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    }
                ]
            },
            manifest: {
                name: 'BRHUB Envios',
                short_name: 'BRHUB',
                description: 'BRHUB - Solução Inteligente de Envios',
                theme_color: '#ffffff',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            }
        })
    ],
    server: {
        host: "::",
        open: true,
        port: 8080,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    base: "/",
    build: {
        assetsInlineLimit: 0,
        rollupOptions: {
            output: {
                assetFileNames: 'assets/[name]-[hash][extname]',
                chunkFileNames: 'assets/[name]-[hash].js',
                entryFileNames: 'assets/[name]-[hash].js',
            },
        },
        chunkSizeWarningLimit: 600,
    }
}))
