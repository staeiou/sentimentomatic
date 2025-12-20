<template>
  <section id="results-section" class="results-section" :class="{ 'regular-mode': !themeStore.performanceMode }" aria-label="Analysis Results">
    <!-- Theater curtains (Performance Mode only) -->
    <div v-if="themeStore.performanceMode" class="stage-container">
      <div class="curtain curtain-left" :class="{ open: isAnalyzing || showResults }"></div>
      <div class="curtain curtain-right" :class="{ open: isAnalyzing || showResults }"></div>
      <div class="stage-valance"></div>
    </div>

    <div class="results-toolbar" v-if="showResults">
      <h2>📊 Analysis Results</h2>

      <button
        type="button"
        class="auto-scroll-toggle"
        @click="autoScrollEnabled = !autoScrollEnabled"
        :title="autoScrollEnabled ? 'Disable auto-scroll' : 'Enable auto-scroll'"
      >
        {{ autoScrollEnabled ? '📜 auto-scroll: ON' : '⏸️ auto-scroll: OFF' }}
      </button>

      <div class="export-buttons">
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
import { useThemeStore } from '../../stores/themeStore'
import { exportToCSV, exportToJSON, exportToExcel } from '../../utils/exportUtils'
import ResultsTable from './AGGridResultsTable.vue'

const analysisStore = useAnalysisStore()
const modelStore = useModelStore()
const themeStore = useThemeStore()
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
  const result = currentResult.value

  if (!result || !result.data) {
    return {
      lines: [],
      columns: [],
      results: []
    }
  }

  // Use snapshotted text from results (frozen at analysis time)
  // This prevents results from changing if user edits text box after analysis
  const lines = result.data.map((row: any) => row.text)

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
  padding-top: 60px;
  margin-bottom: calc(var(--spacing-xl) + 5px);
  min-height: 600px;
  box-shadow:
    5px 5px 0 var(--color-primary),
    5px 5px 20px rgba(0,0,0,0.1);
}

/* Regular Mode - Clean retro computer panel aesthetic */
.results-section.regular-mode {
  padding-top: var(--spacing-lg);
  border: 4px solid var(--color-secondary);
  background:
    linear-gradient(0deg, rgba(0,78,100,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,78,100,0.03) 1px, transparent 1px),
    linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%);
  background-size: 20px 20px, 20px 20px, 100% 100%;
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.05),
    4px 4px 0 var(--color-secondary-light),
    4px 4px 20px rgba(0,0,0,0.1);
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

.auto-scroll-toggle {
  background: var(--color-accent);
  color: var(--color-text-primary);
  border: 2px solid var(--color-accent);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: var(--spacing-md);
}

.auto-scroll-toggle:hover {
  background: #e65a00;
  border-color: #e65a00;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.auto-scroll-toggle:active {
  transform: translateY(0);
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

/* Theater Curtains */
.stage-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  min-height: 600px;
  height: 100%;
  pointer-events: none;
  z-index: 5;
  overflow: hidden;
  border-radius: 20px;
}

.curtain {
  position: absolute;
  top: 0;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg,
    #8B0000 0%,
    #A52A2A 20%,
    #DC143C 40%,
    #A52A2A 60%,
    #8B0000 100%
  );
  transition: transform 3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.4);
  z-index: 6;
}

.curtain::before {
  content: '';
  position: absolute;
  top: 0;
  width: 100%;
  height: 100%;
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 40px,
      rgba(0, 0, 0, 0.1) 40px,
      rgba(0, 0, 0, 0.1) 80px
    );
}

.curtain::after {
  content: '';
  position: absolute;
  width: 30px;
  height: 100%;
  background: linear-gradient(90deg,
    #DAA520 0%,
    #FFD700 50%,
    #DAA520 100%
  );
  box-shadow:
    0 0 10px rgba(218, 165, 32, 0.5),
    inset 0 0 20px rgba(255, 255, 255, 0.3);
}

.curtain-left {
  left: 0;
  transform: translateX(0);
}

.curtain-left::after {
  right: 0;
}

.curtain-left.open {
  transform: translateX(-100%);
}

.curtain-right {
  right: 0;
  transform: translateX(0);
}

.curtain-right::after {
  left: 0;
}

.curtain-right.open {
  transform: translateX(100%);
}

.stage-valance {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 40px;
  background: linear-gradient(180deg,
    #8B0000 0%,
    #A52A2A 50%,
    #8B0000 100%
  );
  border-bottom: 4px solid #DAA520;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  z-index: 7;
}

.stage-valance::after {
  content: '';
  position: absolute;
  bottom: -12px;
  left: 0;
  width: 100%;
  height: 12px;
  background:
    repeating-linear-gradient(
      90deg,
      #DAA520 0px,
      #FFD700 20px,
      #DAA520 40px,
      transparent 40px,
      transparent 50px
    );
}

/* Adjust progress bar to look like stage footlights */
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

  .stage-valance {
    height: 30px;
  }
}
</style>