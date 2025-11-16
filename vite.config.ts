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
                manualChunks: {
                    // React core
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    // Forms e validação
                    'forms-vendor': ['react-hook-form', 'yup', '@hookform/resolvers'],
                    // UI Libraries
                    'ui-vendor': ['@heroui/react', '@heroui/system', '@heroui/tabs', '@heroui/theme', 'framer-motion'],
                    // Charts
                    'charts-vendor': ['apexcharts', 'react-apexcharts'],
                    // Utils
                    'utils-vendor': ['axios', 'date-fns', 'date-fns-tz', 'decimal.js', 'moment-timezone'],
                    // Icons
                    'icons-vendor': ['lucide-react'],
                    // PDF
                    'pdf-vendor': ['jspdf', 'html2canvas', 'react-pdf'],
                    // Supabase
                    'supabase-vendor': ['@supabase/supabase-js'],
                    // Outras libs
                    'misc-vendor': ['sonner', 'clsx', 'jwt-decode', 'mobx', 'mobx-react-lite', '@tanstack/react-query'],
                },
            },
        },
        chunkSizeWarningLimit: 600,
    }
}))
