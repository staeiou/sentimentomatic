<template>
  <div class="action-bar">
    <div class="action-buttons">
      <button id="analyze-btn" class="btn btn-primary" @click="analyze" :disabled="isAnalyzing">
        {{ isAnalyzing ? 'Analyzing...' : 'Analyze' }}
      </button>
      <button id="clear-text-btn" class="btn btn-secondary" @click="clearText">
        Clear Text
      </button>
      <button id="template-generator-btn" class="btn btn-secondary" @click="showTemplateGenerator">
        🎭 Template Generator
      </button>
      <button id="sample-datasets-btn" class="btn btn-secondary" @click="showSampleDatasets">
        📊 Sample Datasets
      </button>
      <button id="import-file-btn" class="btn btn-secondary" @click="showFileImport">
        📁 Import File
      </button>
    </div>

    <!-- Export Options (shown when classification models are selected) -->
    <div id="export-options" class="export-options" v-if="modelStore.hasClassificationModels">
      <label>
        <input type="checkbox" id="export-multiclass-columns" v-model="exportMulticlass">
        <span>Export multi-class scores as separate columns</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAnalysisStore } from '../../stores/analysisStore'
import { useModelStore } from '../../stores/modelStore'
import { IncrementalTableRenderer } from '../../core/analysis/IncrementalTableRenderer'

const analysisStore = useAnalysisStore()
const modelStore = useModelStore()

const isAnalyzing = ref(false)
const exportMulticlass = ref(false)

const emit = defineEmits<{
  showTemplateGenerator: []
  showSampleDatasets: []
  showFileImport: []
  clearText: []
}>()

async function analyze() {
  const lines = analysisStore.lines
  if (lines.length === 0) {
    alert('Please enter some text to analyze')
    return
  }

  // Check if any models are selected
  const selectedRuleBased = modelStore.selectedRuleBasedAnalyzers
  const selectedNeural = modelStore.selectedNeuralModels

  if (selectedRuleBased.length === 0 && selectedNeural.length === 0) {
    alert('Please select at least one model to analyze')
    return
  }

  // Show download confirmation if needed
  const modelsToDownload = await modelStore.getModelDownloadInfo()
  const needsDownload = modelsToDownload.filter(m => !m.cached)

  if (needsDownload.length > 0) {
    const confirmed = await IncrementalTableRenderer.showDownloadConfirmation(modelsToDownload)
    if (!confirmed) {
      return
    }
  }

  isAnalyzing.value = true

  try {
    await analysisStore.runAnalysis(
      selectedRuleBased,
      selectedNeural,
      modelStore.keepModelsCached,
      () => {
        // Table ready callback - could emit event if needed
      }
    )

    // Update cache stats after analysis
    setTimeout(() => {
      modelStore.updateCacheStats()
    }, 3000)
  } catch (error) {
    console.error('Analysis failed:', error)
    alert(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    isAnalyzing.value = false
  }
}

function clearText() {
  emit('clearText')
  analysisStore.clearText()
}

function showTemplateGenerator() {
  emit('showTemplateGenerator')
}

function showSampleDatasets() {
  emit('showSampleDatasets')
}

function showFileImport() {
  emit('showFileImport')
}
</script>

<style>
.action-bar {
  margin: 20px 0;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 4px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
}

.export-options {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #dee2e6;
}

.export-options label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.export-options input[type="checkbox"] {
  margin-right: 8px;
}
</style>