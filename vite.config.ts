import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
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
