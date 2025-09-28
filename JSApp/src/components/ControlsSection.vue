<template>
  <section class="controls-section" aria-label="Analysis Controls">
    <div class="carnival-step step-2">STEP 2</div>
    <div class="controls-header">
      <h3 class="section-title">🎛️ Choose Your Oracles</h3>
      <div class="model-buttons">
        <button type="button" id="select-all-models-btn" class="btn btn-secondary btn-sm" @click="modelStore.selectAllModels()">Select All Models</button>
        <button type="button" id="clear-models-btn" class="btn btn-secondary btn-sm" @click="modelStore.clearAllModels()">Clear All Models</button>
      </div>
    </div>
    <p class="section-description">Each model analyzes sentiment differently - select the ones you want to compare</p>

    <ModelSelector />
  </section>
</template>

<script setup lang="ts">
import { useModelStore } from '../stores/modelStore'
import ModelSelector from './ModelSelector/ModelSelector.vue'

const modelStore = useModelStore()
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
  font-weight: 400;
  letter-spacing: 1px;
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
}
</style>