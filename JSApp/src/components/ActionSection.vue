<template>
  <section class="action-section">
    <div class="action-bar">
      <div class="carnival-step step-3">STEP 3</div>
      <div class="analyze-button-container">
        <button type="button" id="analyze-btn" class="btn btn-primary" @click="$emit('analyze')" :disabled="isAnalyzing">
          {{ isAnalyzing ? 'Divining \n(Analyzing)...' : 'Divine \n(Analyze)' }}
        </button>

        <!-- Inline progress bar - always visible -->
        <div class="progress-bar-inline">
          <div class="progress-fill" :style="{ width: analysisStore.progress + '%' }"></div>
          <div class="progress-text">
            <span v-if="!isAnalyzing">The stage awaits a new performance... (Click Divine / Analyze)</span>
            <span v-else class="tqdm-progress">
              {{ analysisStore.progressStatus }}
              <span v-if="analysisStore.currentModelName" class="timing-info">
                [{{ analysisStore.currentModelElapsed }}&lt;{{ analysisStore.currentModelRemaining }}]
              </span>
              <span class="timing-separator">|</span>
              <span class="timing-overall">
                All [{{ analysisStore.overallElapsed }}&lt;{{ analysisStore.overallRemaining }}]
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAnalysisStore } from '../stores/analysisStore'

const analysisStore = useAnalysisStore()

// Events
defineEmits<{
  analyze: []
}>()

// Computed
const isAnalyzing = computed(() => analysisStore.isAnalyzing)
</script>

<style scoped>
.action-section {
  position: relative;
  background: white;
  border: 4px solid var(--color-pink);
  border-radius: 20px;
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  box-shadow:
    5px 5px 0 var(--color-accent),
    5px 5px 20px rgba(0,0,0,0.1);
}


.action-bar {
  position: relative;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-sm);
}

.analyze-button-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-left: 50px; /* Align with content like other sections */
  flex: 1;
}

/* Special analyze button styling */
:deep(#analyze-btn) {
  padding: var(--spacing-sm) var(--spacing-lg);
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
  white-space: pre-line;
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

.tqdm-progress {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.timing-info {
  font-family: 'Courier New', monospace;
  font-size: var(--font-size-md);
  color: #00ff00;
  font-weight: 600;
}

.timing-separator {
  color: rgba(255, 255, 255, 0.5);
  font-weight: 400;
  margin: 0 4px;
}

.timing-overall {
  font-family: 'Courier New', monospace;
  font-size: var(--font-size-md);
  color: #00d4ff;
  font-weight: 600;
}

/* Step-3 badge positioning is handled by global carnival-step styles */

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