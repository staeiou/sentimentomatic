import { defineConfig } from 'vite'

export default defineConfig({
  base: './',  // Use relative paths for GitHub Pages custom domain
  optimizeDeps: {
    include: ['sentiment', 'vader-sentiment'],
    exclude: ['onnxruntime-web', 'onnxruntime-common'],
    force: true
  },
  build: {
    rollupOptions: {
      external: [],
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
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
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