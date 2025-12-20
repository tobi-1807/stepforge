import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writePortFile, dynamicDaemonProxy } from './vite-plugins'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        writePortFile(),
        dynamicDaemonProxy()
    ],
    server: {
        hmr: {
            path: '/vite-hmr',
            host: 'localhost',
        }
    },
    build: {
        outDir: '../dist/ui',
        emptyOutDir: false
    }
})
