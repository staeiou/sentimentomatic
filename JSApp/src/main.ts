import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// Import global styles - preserving exact original UI/UX
import './styles/global.css'

// Setup browser environment polyfills for ONNX runtime (critical for ML models)
function setupBrowserEnvironment(): void {
  const w = window as any

  w.global = globalThis
  w.process = w.process || {
    env: { NODE_ENV: 'production' },
    nextTick: (fn: Function) => setTimeout(fn, 0),
    version: '18.0.0'
  }

  w.Buffer = w.Buffer || {
    isBuffer: () => false,
    from: (data: any) => new Uint8Array(data),
    alloc: (size: number) => new Uint8Array(size)
  }

  w.module = w.module || { exports: {} }
  w.exports = w.exports || {}
  w.__dirname = w.__dirname || '/'
  w.__filename = w.__filename || '/index.js'
}

// Setup environment before app initialization
setupBrowserEnvironment()

// Create and mount Vue app
const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')

// Export for debugging in development
if (import.meta.env.DEV) {
  (window as any).app = app
}