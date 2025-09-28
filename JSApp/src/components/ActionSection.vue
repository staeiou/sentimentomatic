<template>
  <section class="action-section">
    <div class="download-size-display" v-if="downloadInfo.totalModels > 0">
      <div class="size-info">
        <span class="size-label">{{ downloadInfo.allCached ? 'All Cached:' : 'Download Needed:' }}</span>
        <span class="size-value" :class="{ cached: downloadInfo.allCached }">{{ formatSize(downloadInfo.downloadSize) }}</span>
        <span class="model-counts" v-if="!downloadInfo.allCached">
          ({{ downloadInfo.cachedCount }}/{{ downloadInfo.totalModels }} models cached)
        </span>
        <span class="model-counts" v-else>
          ✅ No download needed
        </span>
      </div>
    </div>

    <div class="action-bar">
      <div class="carnival-step step-3">STEP 3</div>
      <div class="analyze-button-container">
        <button type="button" id="analyze-btn" class="btn btn-primary" @click="$emit('analyze')" :disabled="isAnalyzing">
          {{ isAnalyzing ? 'Analyzing...' : 'Analyze' }}
        </button>

        <!-- Inline progress bar - always visible -->
        <div class="progress-bar-inline">
          <div class="progress-fill" :style="{ width: analysisStore.progress + '%' }"></div>
          <div class="progress-text">
            {{ analysisStore.progressStatus || 'Ready to analyze' }} ({{ Math.round(analysisStore.progress) }}%)
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAnalysisStore } from '../stores/analysisStore'
import { useModelStore } from '../stores/modelStore'

const analysisStore = useAnalysisStore()
const modelStore = useModelStore()

// Events
defineEmits<{
  analyze: []
}>()

// Computed
const isAnalyzing = computed(() => analysisStore.isAnalyzing)

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
.action-section {
  margin-bottom: 10px;
}

.download-size-display {
  background: var(--color-download-bg);
  border: 2px solid var(--color-download-border);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  margin: var(--spacing-md) 0;
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

.action-bar {
  position: relative;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-2xl);
  border-top: 1px solid var(--color-border-light);
}

.analyze-button-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-left: 10px; /* Further reduced to align with steps 1 and 2 */
  flex: 1;
}

/* Special analyze button styling */
:deep(#analyze-btn) {
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: var(--font-size-lg);
  letter-spacing: 2px;
  background: var(--color-pink);
  box-shadow:
    0 4px 0 var(--color-danger-dark),
    0 8px 15px rgba(255, 22, 84, 0.3);
  font-weight: 900;
  text-transform: uppercase;
  border-radius: 30px;
  position: relative;
  animation: pulse 2s infinite;
  margin-top: -5px;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

:deep(#analyze-btn:hover:not(:disabled)) {
  letter-spacing: 3px;
  transform: translateY(-2px);
  box-shadow:
    0 6px 0 var(--color-danger-dark),
    0 12px 20px rgba(255, 22, 84, 0.4);
}

:deep(#analyze-btn:active:not(:disabled)) {
  transform: translateY(2px);
  box-shadow:
    0 2px 0 var(--color-danger-dark),
    0 4px 10px rgba(255, 22, 84, 0.3);
}

.progress-bar-inline {
  position: relative;
  flex: 1;
  height: 57px;
  background: #333;
  border: 2px solid var(--color-border);
  border-radius: 30px;
  overflow: hidden;
  display: flex;
  align-items: center;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
}

.progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #4A148C, #6A1B9A, #8E24AA);
  transition: width var(--transition-base);
  border-radius: 30px;
  box-shadow: 0 0 10px rgba(74, 20, 140, 0.5);
}

.progress-text {
  position: relative;
  z-index: 2;
  width: 100%;
  text-align: center;
  font-size: var(--font-size-lg);
  color: white;
  font-weight: 700;
  white-space: nowrap;
}

.step-3 {
  margin-left: 0px;
  margin-top: -10px;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-sm);
  }

  .analyze-button-container {
    margin-left: 20px; /* Adjusted for mobile alignment */
    margin-bottom: var(--spacing-md);
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-sm);
  }

  :deep(#analyze-btn) {
    width: 100%;
  }

  .inline-progress {
    justify-content: center;
  }

  .progress-bar-inline {
    width: 100%;
  }
}
</style>