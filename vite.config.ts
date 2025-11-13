import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    // Carrega as variáveis de ambiente baseado no modo
    const env = loadEnv(mode, process.cwd(), '')
    
    return {
        plugins: [
            react(),
            {
                name: 'html-transform',
                transformIndexHtml(html) {
                    return html.replace('%BASE_URL%', "/");
                },
            },
            VitePWA({
                registerType: 'autoUpdate',
                includeAssets: ['favicon.svg', 'favicon.ico', 'robots.txt'],
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
            open: true,
            port: env.VITE_PORT ? Number(env.VITE_PORT) : 5555,
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
        }
    }
})
