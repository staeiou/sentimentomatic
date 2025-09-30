<template>
  <section id="results-section" class="results-section" aria-label="Analysis Results">
    <div class="carnival-step step-3">STEP 3</div>

    <div class="action-bar">
      <div class="analyze-button-container">
        <button type="button" id="analyze-btn" class="btn btn-primary" @click="$emit('analyze')" :disabled="isAnalyzing" aria-label="Start sentiment analysis" data-testid="main-analyze-button">
          {{ isAnalyzing ? 'Analyzing...' : 'Analyze' }}
        </button>

        <!-- Inline progress bar - always visible -->
        <div class="progress-bar-inline">
          <div class="progress-fill" :style="{ width: analysisStore.progress + '%' }"></div>
          <div class="progress-text">
            <span v-if="!isAnalyzing">Ready to analyze</span>
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

    <div class="results-toolbar" v-if="showResults">
      <h2>📊 Analysis Results</h2>

      <div class="export-buttons">
        <button
          type="button"
          class="btn btn-secondary auto-scroll-toggle"
          @click="autoScrollEnabled = !autoScrollEnabled"
          :title="autoScrollEnabled ? 'Disable auto-scroll' : 'Enable auto-scroll'"
        >
          {{ autoScrollEnabled ? '📜 auto-scroll: ON' : '⏸️ auto-scroll: OFF' }}
        </button>
        <button type="button" id="export-csv" class="btn btn-secondary" @click="exportCSV" aria-label="Export results as CSV" data-testid="export-csv-button">Export CSV</button>
        <button type="button" id="export-excel" class="btn btn-secondary" @click="exportExcel" aria-label="Export results as Excel" data-testid="export-excel-button">Export Excel</button>
        <button type="button" id="export-json" class="btn btn-secondary" @click="exportJSON" aria-label="Export results as JSON" data-testid="export-json-button">Export JSON</button>
        <div class="export-options" id="export-options" :style="{ display: modelStore.hasClassificationModels ? 'flex' : 'none' }" data-testid="export-options">
          <label class="export-option">
            <input type="checkbox" id="export-multiclass-columns" v-model="exportMulticlass" aria-label="Export individual class columns for classification models" data-testid="export-multiclass-checkbox">
            Export individual class columns for classification models
          </label>
        </div>
      </div>
    </div>

    <!-- Vue reactive table with smart horizontal scrolling -->
    <div class="table-wrapper" v-if="showResults">
      <ResultsTable
        v-if="analysisData.lines.length > 0"
        :lines="analysisData.lines"
        :columns="analysisData.columns"
        :results="analysisData.results"
        :is-complete="!analysisStore.isAnalyzing"
        :status-text="getStatusText()"
        :auto-scroll-enabled="autoScrollEnabled"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAnalysisStore } from '../../stores/analysisStore'
import { useModelStore } from '../../stores/modelStore'
import { exportToCSV, exportToJSON, exportToExcel } from '../../utils/exportUtils'
import ResultsTable from './AGGridResultsTable.vue'

const analysisStore = useAnalysisStore()
const modelStore = useModelStore()
const exportMulticlass = ref(false)

// Auto-scroll state (enabled by default if >50 lines)
const autoScrollEnabled = ref(true) // Always start enabled for testing
console.log(`🚀AUTOSCROLL_INIT🚀 Lines: ${analysisStore.lines.length}, Enabled: ${autoScrollEnabled.value}`)

// Events
defineEmits<{
  analyze: []
}>()

// Computed properties
const isAnalyzing = computed(() => analysisStore.isAnalyzing)
const showResults = computed(() => analysisStore.currentResult !== null || analysisStore.isAnalyzing)
const currentResult = computed(() => analysisStore.currentResult)

// Analysis data for Vue table
const analysisData = computed(() => {
  const lines = analysisStore.lines
  const result = currentResult.value

  if (!result || !result.data || lines.length === 0) {
    return {
      lines: [],
      columns: [],
      results: []
    }
  }

  // Use columns from the store (all columns created upfront) instead of deriving from results
  const columns = result.columns || []

  // Flatten all results for easy lookup
  const results: any[] = []
  result.data.forEach((row: any, lineIndex: number) => {
    if (row.results) {
      row.results.forEach((r: any) => {
        // Find the column type from the columns array (DON'T GUESS!)
        const column = columns.find((col: any) => col.name === r.analyzer)
        const columnType = column?.type || r.type || 'sentiment'

        results.push({
          lineIndex,
          analyzer: r.analyzer,
          type: columnType,
          score: r.score,
          sentiment: r.sentiment,
          topClass: r.topClass || r.prediction,
          confidence: r.confidence || r.likelihood,
          allClasses: r.allClasses || r.classes,
          metadata: r.metadata,
          rawOutput: r.rawOutput || r
        })
      })
    }
  })

  return {
    lines,
    columns,
    results
  }
})

function getStatusText(): string {
  if (analysisStore.isAnalyzing) {
    return analysisStore.progressStatus || 'Analyzing...'
  }
  const resultCount = analysisData.value.results.length
  if (resultCount > 0) {
    return `Analysis complete - ${analysisData.value.lines.length} lines processed`
  }
  return 'Ready to analyze'
}

function exportCSV() {
  if (currentResult.value) {
    exportToCSV(currentResult.value, exportMulticlass.value)
  }
}

function exportExcel() {
  if (currentResult.value) {
    exportToExcel(currentResult.value, exportMulticlass.value)
  }
}

function exportJSON() {
  if (currentResult.value) {
    exportToJSON(currentResult.value, exportMulticlass.value)
  }
}
</script>

<style scoped>
.results-section {
  position: relative;
  background: white;
  border: 4px solid var(--color-pink);
  border-radius: 20px;
  padding: var(--spacing-lg);
  margin-bottom: calc(var(--spacing-xl) + 5px);
  box-shadow:
    5px 5px 0 var(--color-primary),
    5px 5px 20px rgba(0,0,0,0.1);
}

.action-bar {
  position: relative;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-sm);
  margin-bottom: var(--spacing-xl);
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

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
  gap: var(--spacing-lg);
}

.results-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.results-toolbar h2 {
  color: var(--color-secondary);
  font-size: var(--font-size-2xl);
  margin: 0;
  flex-shrink: 0;
}

.export-buttons {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.export-options {
  margin-left: var(--spacing-md);
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
}

.export-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
}

.export-option input[type="checkbox"] {
  margin: 0;
}



.table-wrapper {
  /* AG-Grid handles its own scrolling */
  overflow: visible;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-sm);
  }

  .analyze-button-container {
    margin-left: 20px;
    margin-bottom: var(--spacing-md);
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-sm);
  }

  :deep(#analyze-btn) {
    width: 100%;
  }

  .progress-bar-inline {
    width: 100%;
  }

  .results-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-sm);
  }

  .export-buttons {
    flex-direction: column;
    width: 100%;
  }

  .results-toolbar .btn {
    width: 100%;
  }
}
</style>