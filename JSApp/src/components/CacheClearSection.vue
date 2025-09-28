<template>
  <section class="cache-clear-section" aria-label="Cache Clear">
    <div class="carnival-step step-4">STEP 4</div>
    <div class="section-content">
      <button type="button" class="cache-clear-button" @click="clearCache" :disabled="isClearing || isSafari">
        {{ buttonText }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useModelStore } from '../stores/modelStore'

const modelStore = useModelStore()
const isClearing = ref(false)
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
const buttonText = ref(isSafari ?
  '⚠️ Safari: To delete models, use Safari → Settings → Privacy → Manage Website Data → Remove' :
  '🧹 If you no longer need them, click to delete downloaded models from browser')

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 MB'
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

async function updateButtonText() {
  // Use fast storage estimate for all browsers
  await modelStore.updateCacheStats()
  const cacheSize = modelStore.cacheSize
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  // Different text for Safari vs other browsers
  if (isSafari && cacheSize > 0) {
    buttonText.value = `⚠️ Safari: ${formatSize(cacheSize)} stored. To delete: Safari → Settings → Privacy → Manage Website Data → Remove`
  } else {
    buttonText.value = `🧹 If you no longer need them, click to delete downloaded models from browser (${formatSize(cacheSize)})`
  }
}

async function clearCache() {
  isClearing.value = true

  // Get size before clearing
  const previousSize = modelStore.cacheSize

  try {
    await modelStore.clearCache()

    // Force refresh storage estimate after clearing
    await new Promise(resolve => setTimeout(resolve, 500))
    await modelStore.updateCacheStats()

    const newSize = modelStore.cacheSize
    const actuallyCleared = previousSize - newSize

    if (actuallyCleared > 0) {
      buttonText.value = `✅ Models deleted from browser cache! (${formatSize(actuallyCleared)} cleared)`
    } else {
      // Safari WAL file bug - storage remains even after clearing
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
      if (isSafari && previousSize > 0) {
        buttonText.value = `⚠️ Safari bug: ${formatSize(previousSize)} stuck in WAL files. Use Safari → Settings → Privacy → Manage Website Data to clear`
      } else {
        buttonText.value = `⚠️ Cache cleared but storage unchanged (was ${formatSize(previousSize)})`
      }
    }
  } catch (error) {
    console.error('Failed to clear cache:', error)
    buttonText.value = '❌ Failed to clear cache. Please try again.'
  } finally {
    isClearing.value = false
  }
}

onMounted(() => {
  // Initial update
  updateButtonText()
  // Update periodically (now safe for all browsers since we use fast method for Safari)
  setInterval(() => {
    if (!isClearing.value) {
      updateButtonText()
    }
  }, 5000)
})
</script>

<style scoped>
.cache-clear-section {
  position: relative;
  background: white;
  border: 4px solid var(--color-mint);
  border-radius: 20px;
  padding: 10px;
  margin: 0 auto var(--spacing-xl) auto;
  max-width: var(--max-width-content);
  box-shadow:
    5px 5px 0 var(--color-secondary-light),
    5px 5px 20px rgba(0,0,0,0.1);
}

.carnival-step.step-4 {
  background: linear-gradient(135deg, var(--color-mint), var(--color-secondary-light));
  transform: rotate(12deg);
  top: -32px;
  left: -12px;
}

.carnival-step.step-4:hover {
  transform: rotate(12deg);
  transition: transform 0.3s ease;
}

.section-content {
  margin-left: 50px;
  margin-top: var(--spacing-md);
}

.cache-clear-button {
  width: 100%;
  height: 50px;
  padding: var(--spacing-md) var(--spacing-xl);
  background: var(--color-danger);
  color: white;
  border: none;
  border-radius: 30px;
  font-size: var(--font-size-lg);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow:
    0 4px 0 var(--color-danger-dark),
    0 8px 15px rgba(255, 22, 84, 0.3);
}

.cache-clear-button:hover {
  background: var(--color-danger-light);
  box-shadow:
    0 4px 0 var(--color-danger-dark),
    0 8px 15px rgba(255, 22, 84, 0.3);
}

.cache-clear-button:active {
  transform: translateY(2px);
  box-shadow:
    0 2px 0 var(--color-danger-dark),
    0 4px 10px rgba(255, 22, 84, 0.3);
}

.cache-clear-button:disabled {
  opacity: 1;
  cursor: default;
  background: var(--color-secondary);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .cache-clear-section {
    margin: var(--spacing-lg) var(--spacing-md);
  }

  .section-content {
    margin-left: 20px;
  }
}
</style>