import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env': '{}',
    'global': 'globalThis'
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/content-scripts/index-vanilla.ts'),
      name: 'content',
      fileName: 'content',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        format: 'iife',
        entryFileNames: 'content.js',
        extend: false
      }
    },
    outDir: 'dist',
    emptyOutDir: false,
    minify: false
  }
})