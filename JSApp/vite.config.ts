import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/sentimentomatic/' : './',  // GitHub Pages path
  optimizeDeps: {
    include: ['sentiment', 'vader-sentiment'],
    exclude: ['@xenova/transformers', 'onnxruntime-web', 'onnxruntime-common'],
    force: true
  },
  build: {
    rollupOptions: {
      external: ['@xenova/transformers'],
      output: {
        manualChunks: {
          'sentiment-core': ['sentiment', 'vader-sentiment']
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    },
    fs: {
      allow: ['..']
    }
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': '"development"'
  },
  worker: {
    format: 'es'
  },
  resolve: {
    alias: {
      'path': 'path-browserify',
      'os': 'os-browserify',
      'fs': false,
      'crypto': false
    }
  }
})