import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'node:url'
// @ts-expect-error - Build plugin is JS file
import { extensionBuildPlugin } from './build-plugin.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// ビルドターゲットを環境変数で指定
const BUILD_TARGET = process.env.BUILD_TARGET || 'popup'

const getConfig = (target: string) => {
  const baseConfig = {
    outDir: 'dist',
    emptyOutDir: false,
    minify: false,
    sourcemap: false,
    target: 'es2020'
  }

  switch (target) {
    case 'background':
      return {
        ...baseConfig,
        lib: {
          entry: resolve(__dirname, 'src/background/index.ts'),
          name: 'background',
          fileName: 'background',
          formats: ['iife' as const]
        },
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
            format: 'iife' as const,
            entryFileNames: 'background.js',
            extend: false
          }
        }
      }

    case 'content':
      return {
        ...baseConfig,
        lib: {
          entry: resolve(__dirname, 'src/content-scripts/index.ts'),
          name: 'content',
          fileName: 'content',
          formats: ['iife' as const]
        },
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
            format: 'iife' as const,
            entryFileNames: 'content.js',
            extend: false
          }
        }
      }

    case 'popup':
    default:
      return {
        ...baseConfig,
        rollupOptions: {
          input: {
            popup: resolve(__dirname, 'src/popup/index.html')
          },
          output: {
            entryFileNames: (chunkInfo: { name?: string }) => {
              if (chunkInfo.name === 'popup') return 'popup/popup.js'
              return 'assets/[name].js'
            },
            chunkFileNames: (chunkInfo: { name?: string; facadeModuleId?: string }) => {
              if (chunkInfo.name && chunkInfo.facadeModuleId && chunkInfo.facadeModuleId.includes('popup')) {
                return 'popup/[name].js'
              }
              return 'assets/[name].js'
            },
            assetFileNames: (assetInfo: { name?: string }) => {
              if (assetInfo.name && assetInfo.name.endsWith('.html')) {
                if (assetInfo.name.includes('index')) {
                  return 'popup/index.html'
                }
              }
              return 'assets/[name].[ext]'
            },
            format: 'es' as const,
            manualChunks: (id: string) => {
              if (id.includes('node_modules/')) {
                // React ecosystem - separate chunk
                if (id.includes('react') || id.includes('@babel') || id.includes('scheduler')) {
                  return 'react-vendor';
                }
                // Other vendor libraries
                return 'vendor';
              }
              
              // Application chunks
              if (id.includes('/src/shared/')) {
                // Shared utilities - separate chunk
                if (id.includes('/api/') || id.includes('/storage/')) {
                  return 'shared-core';
                }
                // Error handling - separate chunk
                if (id.includes('/errors/')) {
                  return 'shared-errors';
                }
                // Types only - bundle with main
                if (id.includes('/types/')) {
                  return undefined;
                }
                return 'shared-utils';
              }
              
              return undefined;
            }
          }
        }
      }
  }
}

export default defineConfig({
  plugins: BUILD_TARGET === 'popup' ? [react(), extensionBuildPlugin()] : [],
  css: {
    postcss: './postcss.config.js',
  },
  define: BUILD_TARGET === 'content' ? {
    'process.env.NODE_ENV': '"production"',
    'process.env': '{}',
    'global': 'globalThis'
  } : {},
  build: getConfig(BUILD_TARGET),
  publicDir: BUILD_TARGET === 'popup' ? 'src/public' : false
})