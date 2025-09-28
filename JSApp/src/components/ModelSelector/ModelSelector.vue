<template>
  <div class="models-grid">
    <fieldset class="model-group">
      <legend>Sentiment Models</legend>
      <div class="model-subgroup">
        <div class="subgroup-header-row">
          <h4 class="subgroup-header">Rule-Based Models</h4>
          <span class="size-header">Size</span>
        </div>
        <label class="model-option">
          <input type="checkbox" id="use-vader" v-model="modelStore.useVader" checked>
          <a href="https://github.com/vaderSentiment/vaderSentiment-js" target="_blank" rel="noopener">VADER</a>
          <span class="model-size">1MB</span>
        </label>
        <label class="model-option">
          <input type="checkbox" id="use-afinn" v-model="modelStore.useAfinn">
          <a href="https://github.com/thisandagain/sentiment" target="_blank" rel="noopener">AFINN</a>
          <span class="model-size">1MB</span>
        </label>
      </div>
      <div class="model-subgroup">
        <div class="subgroup-header-row">
          <h4 class="subgroup-header">Neural Network Models</h4>
          <span class="size-header">Size</span>
        </div>
        <label class="model-option">
          <input type="checkbox" id="use-multilingual-student" v-model="modelStore.useMultilingualStudent" checked>
          <a href="https://huggingface.co/Xenova/distilbert-base-multilingual-cased-sentiments-student" target="_blank" rel="noopener">Multilingual DistilBERT</a>
          <span class="model-size">132MB</span>
        </label>
        <label class="model-option">
          <input type="checkbox" id="use-twitter-roberta" v-model="modelStore.useTwitterRoberta">
          <a href="https://huggingface.co/Xenova/twitter-roberta-base-sentiment-latest" target="_blank" rel="noopener">Twitter RoBERTa</a>
          <span class="model-size">122MB</span>
        </label>
        <label class="model-option">
          <input type="checkbox" id="use-financial" v-model="modelStore.useFinancial">
          <a href="https://huggingface.co/Xenova/finbert" target="_blank" rel="noopener">Financial DistilRoBERTa</a>
          <span class="model-size">106MB</span>
        </label>
        <label class="model-option">
          <input type="checkbox" id="use-distilbert" v-model="modelStore.useDistilbert">
          <a href="https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-sst-2-english" target="_blank" rel="noopener">DistilBERT SST-2</a>
          <span class="model-size">65MB</span>
        </label>
      </div>
    </fieldset>

    <fieldset class="model-group">
      <legend>Classification</legend>
      <div class="classification-header-row">
        <span class="classification-label">Model</span>
        <span class="size-header">Size</span>
      </div>
      <label class="model-option">
        <input type="checkbox" id="use-goemotions" v-model="modelStore.useGoEmotions" checked>
        <a href="https://huggingface.co/SamLowe/roberta-base-go_emotions-onnx" target="_blank" rel="noopener">GoEmotions</a>
        <span class="model-size">122MB</span>
      </label>
      <label class="model-option">
        <input type="checkbox" id="use-jigsaw-toxicity" v-model="modelStore.useJigsawToxicity" checked>
        <a href="https://huggingface.co/minuva/MiniLMv2-toxic-jigsaw-onnx" target="_blank" rel="noopener">Jigsaw Toxicity</a>
        <span class="model-size">22MB</span>
      </label>
      <label class="model-option">
        <input type="checkbox" id="use-koala-moderation" v-model="modelStore.useKoalaModeration">
        <a href="https://huggingface.co/KoalaAI/Text-Moderation" target="_blank" rel="noopener">KoalaAI Content Moderation</a>
        <span class="model-size">140MB</span>
      </label>
      <label class="model-option">
        <input type="checkbox" id="use-toxic-bert" v-model="modelStore.useToxicBert">
        <a href="https://huggingface.co/Xenova/toxic-bert" target="_blank" rel="noopener">Toxic BERT</a>
        <span class="model-size">106MB</span>
      </label>
      <label class="model-option">
        <input type="checkbox" id="use-iptc-news" v-model="modelStore.useIptcNews">
        <a href="https://huggingface.co/onnx-community/multilingual-IPTC-news-topic-classifier-ONNX" target="_blank" rel="noopener">IPTC News Topics</a>
        <span class="model-size">553MB</span>
      </label>
      <label class="model-option">
        <input type="checkbox" id="use-language-detection" v-model="modelStore.useLanguageDetection">
        <a href="https://huggingface.co/protectai/xlm-roberta-base-language-detection-onnx" target="_blank" rel="noopener">Language Detection</a>
        <span class="model-size">282MB</span>
      </label>
      <label class="model-option">
        <input type="checkbox" id="use-industry-classification" v-model="modelStore.useIndustryClassification">
        <a href="https://huggingface.co/sabatale/industry-classification-api-onnx" target="_blank" rel="noopener">Industry Classification</a>
        <span class="model-size">106MB</span>
      </label>
    </fieldset>
  </div>

  <div class="cache-options">
    <div class="cache-controls">
      <label class="cache-option">
        <input type="checkbox" id="keep-models-cached" v-model="modelStore.keepModelsCached" @change="saveKeepCachedSetting">
        Keep downloaded models in browser cache
      </label>
      <button type="button" id="clear-cache" class="btn btn-secondary btn-sm" @click="clearCache">Clear Cache</button>
      <button type="button" id="debug-cache" class="btn btn-secondary btn-sm" @click="showCacheDebug">Debug Cache</button>
    </div>
    <div id="cache-stats" class="cache-stats">
      Cache: <span class="cache-size">{{ formatSize(modelStore.cacheSize) }} used</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useModelStore } from '../../stores/modelStore'

const modelStore = useModelStore()

// Initialize default selections (from original)
onMounted(() => {
  modelStore.useVader = true
  modelStore.useMultilingualStudent = true
  modelStore.useGoEmotions = true
  modelStore.useJigsawToxicity = true

  // Update cache stats periodically
  setInterval(() => {
    modelStore.updateCacheStats()
  }, 5000)
})

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

function saveKeepCachedSetting() {
  if (modelStore.keepModelsCached) {
    localStorage.setItem('sentimentomatic_keep_models_cached', 'true')
  } else {
    localStorage.removeItem('sentimentomatic_keep_models_cached')
  }
}

async function clearCache() {
  const sizeBefore = modelStore.cacheSize
  await modelStore.clearCache()

  // Force refresh storage estimate
  await new Promise(resolve => setTimeout(resolve, 500))
  await modelStore.updateCacheStats()

  const sizeAfter = modelStore.cacheSize
  const cleared = sizeBefore - sizeAfter

  if (cleared > 0) {
    console.log(`✅ Cleared ${formatSize(cleared)} from cache`)
  } else {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    if (isSafari && sizeAfter > 0) {
      console.log(`⚠️ SAFARI BUG: ${formatSize(sizeAfter)} stuck in IndexedDB WAL files`)
      console.log('This is WebKit bug #202137 - WAL file doesn\'t get garbage collected')
      console.log('To manually clear: Safari → Settings → Privacy → Manage Website Data → Remove')
      alert(`Safari bug: ${formatSize(sizeAfter)} stuck in WAL files.\n\nTo clear manually:\nSafari → Settings → Privacy → Manage Website Data → Remove`)
    } else {
      console.log(`⚠️ Cache cleared but storage unchanged (still ${formatSize(sizeAfter)})`)
    }
  }
}

async function showCacheDebug() {
  console.log('=== CACHE DEBUG ===')

  // Check storage estimate
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate()
    console.log('Storage estimate:', {
      usage: `${Math.round((estimate.usage || 0) / (1024 * 1024))} MB`,
      quota: `${Math.round((estimate.quota || 0) / (1024 * 1024))} MB`
    })
  }

  // Check cache names
  if ('caches' in window) {
    const cacheNames = await caches.keys()
    console.log('Cache names:', cacheNames)

    for (const name of cacheNames) {
      const cache = await caches.open(name)
      const keys = await cache.keys()
      console.log(`Cache "${name}" has ${keys.length} entries`)
    }
  }

  // Check IndexedDB
  if ('indexedDB' in window && indexedDB.databases) {
    const databases = await indexedDB.databases()
    console.log('IndexedDB databases:', databases)
  }

  // Check localStorage size
  let localStorageSize = 0
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      localStorageSize += localStorage[key].length + key.length
    }
  }
  console.log('localStorage size:', `${Math.round(localStorageSize / 1024)} KB`)

  // Check Service Workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    console.log(`Service Workers: ${registrations.length} registered`)
    for (const reg of registrations) {
      console.log(`  - ${reg.scope} (${reg.active ? 'active' : 'inactive'})`)
    }
  }

  // Check OPFS (Origin Private File System)
  try {
    const root = await (navigator.storage as any).getDirectory?.()
    if (root) {
      console.log('OPFS root found, scanning contents:')

      async function listDirectory(dir: any, prefix = '') {
        for await (const entry of dir.values()) {
          console.log(`${prefix}- ${entry.name} (${entry.kind})`)
          if (entry.kind === 'directory') {
            const subDir = await dir.getDirectoryHandle(entry.name)
            await listDirectory(subDir, prefix + '  ')
          }
        }
      }

      await listDirectory(root)
    } else {
      console.log('OPFS not available')
    }
  } catch (e) {
    console.log('OPFS check error:', e)
  }

  console.log('=== END DEBUG ===')
}
</script>

<style scoped>
.models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
}

.model-group {
  border: 1px solid var(--color-border-light);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  background: var(--color-bg-secondary);
}

.model-group legend {
  font-weight: 600;
  color: var(--color-text-primary);
  padding: 0 var(--spacing-sm);
  background: var(--color-bg-secondary);
}

/* Model subgroup headers */
.subgroup-header-row, .classification-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xs);
  padding-bottom: var(--spacing-xs);
  border-bottom: 1px solid var(--color-border-light);
}

.size-header {
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.classification-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.model-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) 0;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.model-option:hover {
  background-color: rgba(52, 152, 219, 0.05);
  margin: 0 calc(-1 * var(--spacing-sm));
  padding-left: var(--spacing-sm);
  padding-right: var(--spacing-sm);
  border-radius: var(--border-radius-sm);
}

.model-option input[type="checkbox"] {
  cursor: pointer;
}

.model-option a {
  flex: 1;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
}

.model-size {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  background: var(--color-bg-primary);
  padding: 2px 6px;
  border-radius: var(--border-radius-sm);
}

/* Cache options section */
.cache-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--border-radius-md);
}

.cache-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.cache-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.cache-option input[type="checkbox"] {
  cursor: pointer;
}

.cache-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.cache-size {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* Clear cache button special styling */
:deep(#clear-cache) {
  background-color: var(--color-danger);
}

:deep(#clear-cache:hover:not(:disabled)) {
  background-color: var(--color-danger-dark);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .models-grid {
    grid-template-columns: 1fr;
  }

  .cache-options {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-sm);
  }

  .cache-controls {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-xs);
  }
}
</style>