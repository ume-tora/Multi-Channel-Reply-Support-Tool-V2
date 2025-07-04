import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/background/index.ts'),
      name: 'background',
      fileName: 'background',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        format: 'iife',
        entryFileNames: 'background.js',
        extend: false
      }
    },
    outDir: 'dist',
    emptyOutDir: false,
    minify: false
  }
})