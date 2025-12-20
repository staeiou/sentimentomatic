<template>
  <section class="controls-section" aria-label="Analysis Controls">
    <div class="carnival-step step-2">STEP 2</div>
    <div class="controls-header">
      <h3 v-if="themeStore.performanceMode" class="section-title">🕺🤸‍♀️💃 Choose Your Trained Performers (Models)</h3>
      <h3 v-else class="section-title">🤖 Choose Your Trained Models</h3>
      <div class="model-buttons">
        <button type="button" id="select-all-models-btn" class="btn btn-secondary btn-sm" @click="modelStore.selectAllModels()">Select All Models</button>
        <button type="button" id="clear-models-btn" class="btn btn-secondary btn-sm" @click="modelStore.clearAllModels()">Clear All Models</button>
      </div>
    </div>
    <p class="section-description">Each model classifies text differently, some are trained to classify sentiment, emotions, toxicity, news topics, languages, etc.</p>

    <ModelSelector />

    <div class="download-and-share-container" v-if="downloadInfo.totalModels > 0">
      <div class="download-size-display">
        <div class="size-info">
          <span class="size-label">{{ downloadInfo.allCached ? 'All Cached:' : 'Download Needed:' }}</span>
          <span class="size-value" :class="{ cached: downloadInfo.allCached }">{{ formatSize(downloadInfo.downloadSize) }}</span>
          <span class="model-counts" v-if="!downloadInfo.allCached">
            ({{ downloadInfo.cachedCount }}/{{ downloadInfo.totalModels }} models cached, click 'Analyze' to download)
          </span>
          <span class="model-counts" v-else>
            ✅ No download needed, click 'Analyze' to start
          </span>
        </div>
      </div>
      <ShareButton
        buttonText="Share Texts via Link"
        buttonClass="share-button-inline"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useModelStore } from '../stores/modelStore'
import { useThemeStore } from '../stores/themeStore'
import ModelSelector from './ModelSelector/ModelSelector.vue'
import ShareButton from './ShareButton.vue'

const modelStore = useModelStore()
const themeStore = useThemeStore()

// Reactive state for download info
const downloadInfo = ref({
  totalModels: 0,
  downloadSize: 0,
  allCached: false,
  cachedCount: 0
})

// Update download info when model selection changes
async function updateDownloadInfo() {
  const modelDownloadInfo = await modelStore.getModelDownloadInfo()
  const modelsToDownload = modelDownloadInfo.filter(m => !m.cached)
  const downloadSize = modelsToDownload.reduce((sum, model) => sum + model.size, 0)

  downloadInfo.value = {
    totalModels: modelStore.totalSelectedModels,
    downloadSize,
    allCached: modelsToDownload.length === 0,
    cachedCount: modelDownloadInfo.filter(m => m.cached).length
  }
}

// Watch for model selection changes
watch(
  () => [
    modelStore.selectedRuleBasedAnalyzers,
    modelStore.selectedNeuralModels
  ],
  updateDownloadInfo,
  { immediate: true, deep: true }
)

// Methods
function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
  return `${Math.round(bytes / (1024 * 1024))} MB`
}
</script>

<style scoped>
.controls-section {
  position: relative;
  background: white;
  border: 4px solid var(--color-secondary-light);
  border-radius: 20px;
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  box-shadow:
    5px 5px 0 var(--color-accent),
    5px 5px 20px rgba(0,0,0,0.1);
}

.controls-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  margin-left: 50px;
  margin-right: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 2px dashed var(--color-accent);
}

.model-buttons {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.section-title {
  color: var(--color-secondary);
  font-size: var(--font-size-2xl);
  font-family: "Impact", sans-serif;
  font-weight: lighter;
  letter-spacing: 1.25px;
  margin: 0;
}

.section-description {
  color: var(--color-text-secondary);
  font-size: var(--font-size-base);
  margin-bottom: var(--spacing-lg);
  margin-left: 50px;
  margin-right: var(--spacing-md);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .controls-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
    margin-left: 30px;
  }

  .section-description {
    margin-left: 30px;
  }

  .model-buttons {
    flex-direction: column;
    width: 100%;
    gap: var(--spacing-xs);
  }

  .model-buttons .btn-sm {
    width: 100%;
  }

  .download-size-display {
    margin-left: 30px;
  }
}

.download-and-share-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin: var(--spacing-lg) 50px var(--spacing-sm) 50px;
}

.download-size-display {
  flex: 1;
  background: var(--color-download-bg);
  border: 2px solid var(--color-download-border);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  text-align: center;
}

.download-size-display .size-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.download-size-display .size-label {
  font-weight: 600;
  color: var(--color-download-text);
}

.download-size-display .size-value {
  background: var(--color-download-border);
  color: white;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  font-weight: 700;
  font-size: var(--font-size-base);
}

.download-size-display .size-value.cached {
  background: #28a745;
}

.download-size-display .model-counts {
  color: var(--color-download-text);
  font-size: var(--font-size-sm);
  opacity: 0.8;
}

:deep(.share-button-inline) {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
}

:deep(.share-button-inline:hover) {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(102, 126, 234, 0.4);
}

@media (max-width: 768px) {
  .download-and-share-container {
    flex-direction: column;
    margin-left: 30px;
    margin-right: var(--spacing-md);
  }

  :deep(.share-button-inline) {
    width: 100%;
  }
}
</style>