import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'node:url'
// @ts-ignore
import { extensionBuildPlugin } from './build-plugin.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), extensionBuildPlugin()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'popup') return 'popup/popup.js'
          return 'assets/[name].js'
        },
        chunkFileNames: (chunkInfo) => {
          // popupに関連するchunkはpopupディレクトリに配置
          if (chunkInfo.name && chunkInfo.facadeModuleId && chunkInfo.facadeModuleId.includes('popup')) {
            return 'popup/[name].js'
          }
          return 'assets/[name].js'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.html')) {
            // HTMLファイルのパスを調整
            if (assetInfo.name.includes('index')) {
              return 'popup/index.html'
            }
          }
          return 'assets/[name].[ext]'
        },
        format: 'es',
        manualChunks: (id) => {
          // React関連の依存関係
          if (id.includes('node_modules/') && (
              id.includes('react') || 
              id.includes('@babel') || 
              id.includes('scheduler')
            )) {
            return 'vendor';
          }
          return undefined;
        }
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    sourcemap: false,
    target: 'es2020'
  },
  publicDir: 'src/public'
})
