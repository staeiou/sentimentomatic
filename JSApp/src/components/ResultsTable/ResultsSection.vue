<template>
  <section id="results-section" class="results-section" aria-label="Analysis Results" :hidden="!showResults">
    <div class="results-toolbar">
      <h2>📊 Analysis Results</h2>

      <div class="export-buttons">
        <button type="button" id="export-csv" class="btn btn-secondary" @click="exportCSV">Export CSV</button>
        <button type="button" id="export-excel" class="btn btn-secondary" @click="exportExcel">Export Excel</button>
        <button type="button" id="export-json" class="btn btn-secondary" @click="exportJSON">Export JSON</button>
        <div class="export-options" id="export-options" :style="{ display: modelStore.hasClassificationModels ? 'flex' : 'none' }">
          <label class="export-option">
            <input type="checkbox" id="export-multiclass-columns" v-model="exportMulticlass">
            Export individual class columns for classification models
          </label>
        </div>
      </div>
    </div>

    <!-- Vue reactive table with smart horizontal scrolling -->
    <div class="table-wrapper">
      <ResultsTable
        v-if="analysisData.lines.length > 0"
        :lines="analysisData.lines"
        :columns="analysisData.columns"
        :results="analysisData.results"
        :is-complete="!analysisStore.isAnalyzing"
        :status-text="getStatusText()"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAnalysisStore } from '../../stores/analysisStore'
import { useModelStore } from '../../stores/modelStore'
import { exportToCSV, exportToJSON, exportToExcel } from '../../utils/exportUtils'
import ResultsTable from './ResultsTable.vue'

const analysisStore = useAnalysisStore()
const modelStore = useModelStore()
const exportMulticlass = ref(false)

// Computed properties
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
        results.push({
          lineIndex,
          analyzer: r.analyzer,
          type: r.type || (r.sentiment !== undefined ? 'sentiment' : 'classification'),
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
  box-shadow:
    5px 5px 0 var(--color-primary),
    5px 5px 20px rgba(0,0,0,0.1);
}

.results-section[hidden] {
  display: none;
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
  overflow-x: auto;
}

/* Mobile responsive */
@media (max-width: 768px) {
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