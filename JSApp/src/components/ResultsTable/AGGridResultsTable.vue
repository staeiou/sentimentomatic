<template>
  <div class="ag-grid-results-container">
    <ag-grid-vue
      :style="{width: 'calc(100% - 2px)', height: gridHeight}"
      :class="gridTheme"
      :columnDefs="columnDefs"
      :rowData="rowData"
      :defaultColDef="defaultColDef"
      :components="components"
      :enableCellTextSelection="true"
      :animateRows="false"
      :suppressRowHoverHighlight="false"
      :getRowId="getRowId"
      :immutableData="true"
      @grid-ready="onGridReady"
      @cell-clicked="onCellClicked"
    />

    <!-- Keep existing modal for detail view -->
    <div
      v-if="modalData"
      class="modal-overlay"
      style="display: flex !important;"
      @click.self="closeModal"
    >
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>{{ modalData.analyzer }} - Line {{ modalData.line }}</h3>
          <button class="modal-close" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="all-classes-list">
            <div class="raw-json-toggle" @click="toggleRawJson">
              <span>📋 Show/Hide Raw JSON</span>
            </div>
            <div v-show="showRawJson" class="raw-output-display">
              <pre>{{ JSON.stringify(modalData.rawOutput, null, 2) }}</pre>
            </div>
            <div class="parsed-outputs">
              <div v-for="(item, index) in modalData.parsedData" :key="index"
                   class="class-item" :class="{ 'top-class': index === 0 }">
                <div class="class-info">
                  <span class="class-name">{{ item.label }}</span>
                  <span class="class-percentage">{{ (item.score * 100).toFixed(1) }}%</span>
                </div>
                <div class="confidence-bar">
                  <div class="confidence-fill" :style="{ width: (item.score * 100) + '%' }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-balham.css'
import type { ColDef, ColGroupDef, GridReadyEvent, CellClickedEvent, GridApi, IHeaderParams } from 'ag-grid-community'
import { useAnalysisStore } from '../../stores/analysisStore'

interface Column {
  name: string
  type: 'sentiment' | 'classification'
  modelId?: string
}

interface AnalysisResult {
  lineIndex: number
  analyzer: string
  type: 'sentiment' | 'classification'
  score?: number
  sentiment?: string
  topClass?: string
  confidence?: number
  allClasses?: { [key: string]: number }
  metadata?: any
  rawOutput?: any
}

const props = defineProps<{
  lines: string[]
  columns: Column[]
  results: AnalysisResult[]
  isComplete: boolean
  statusText: string
  autoScrollEnabled: boolean
}>()

// Grid API reference
const gridApi = ref<GridApi | null>(null)
const analysisStore = useAnalysisStore()

// Text wrapping toggle state (default to clip/single-line)
const textWrapEnabled = ref(false)

// Custom header component for Text column with toggle button
class TextColumnHeader {
  private eGui!: HTMLDivElement
  private params!: IHeaderParams & { textWrapEnabled: boolean; onToggle: () => void }

  init(params: IHeaderParams & { textWrapEnabled: boolean; onToggle: () => void }) {
    this.params = params
    this.eGui = document.createElement('div')
    this.eGui.className = 'text-column-header'
    this.eGui.innerHTML = `
      <span class="header-label">Text</span>
      <button class="wrap-toggle-btn" title="${params.textWrapEnabled ? 'Switch to compact single-line view' : 'Switch to full multi-line view'}">
        ${params.textWrapEnabled ? 'Fit text to one line' : 'Show full text'}
      </button>
    `

    const button = this.eGui.querySelector('.wrap-toggle-btn')
    if (button) {
      button.addEventListener('click', (e) => {
        e.stopPropagation()
        this.params.onToggle()
      })
    }
  }

  getGui() {
    return this.eGui
  }

  refresh() {
    return false
  }

  destroy() {
    const button = this.eGui.querySelector('.wrap-toggle-btn')
    if (button) {
      button.removeEventListener('click', this.params.onToggle)
    }
  }
}

// Modal state (reuse existing modal logic)
const modalData = ref<{
  analyzer: string
  line: number
  rawOutput: any
  parsedData: any[]
} | null>(null)
const showRawJson = ref(false)

// Use retrofuture theme colors
const gridTheme = ref('ag-theme-balham ag-theme-retrofuture')

// Dynamic grid height based on number of rows
const gridHeight = computed(() => {
  const rowCount = props.lines.length
  const headerHeight = 100 // Two header rows (group + sub-headers)
  const rowHeight = 35
  const maxHeight = 600
  const minHeight = 250

  const calculatedHeight = headerHeight + (rowCount * rowHeight)
  return `${Math.min(Math.max(calculatedHeight, minHeight), maxHeight)}px`
})

// Build column definitions dynamically with proper grouping
const columnDefs = computed((): (ColDef | ColGroupDef)[] => {
  const cols: (ColDef | ColGroupDef)[] = [
    {
      field: 'line',
      headerName: '#',
      width: 60,
      pinned: 'left',
      lockPosition: true,
      cellClass: 'line-number-cell',
      sortable: true,
      filter: false // NO FILTER for line number
    },
    {
      field: 'text',
      headerName: 'Text',
      width: 300,
      pinned: 'left',
      wrapText: textWrapEnabled.value,
      autoHeight: textWrapEnabled.value,
      sortable: false,
      filter: false, // NO FILTER for text
      cellStyle: textWrapEnabled.value ? {
        lineHeight: '1.4',
        padding: '8px'
      } : {
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        overflow: 'hidden'
      },
      headerComponent: 'TextColumnHeader',
      headerComponentParams: {
        textWrapEnabled: textWrapEnabled.value,
        onToggle: () => {
          textWrapEnabled.value = !textWrapEnabled.value
        }
      }
    }
  ]

  // Add dynamic model columns WITH PROPER GROUPING
  props.columns.forEach(column => {
    // Get URL for this model
    const modelUrl = getModelUrl(column.name)

    // Create a group for each model with two child columns
    const modelGroup: ColGroupDef = {
      headerName: column.name,
      marryChildren: true, // Keep children together when moving
      children: [],
      headerClass: modelUrl ? 'has-link' : '',
      // Store URL in column definition for access
      headerTooltip: modelUrl || column.name,
    }

    if (column.type === 'sentiment') {
      modelGroup.children = [
        {
          field: `${column.name}_sentiment`,
          headerName: 'Sentiment',
          width: 100,
          minWidth: 100,
          maxWidth: 150,
          sortable: true,
          filter: false,
          cellRenderer: (params: any) => {
            const result = getResultForCell(params.data.lineIndex, column.name)
            if (!result) return '⋯'
            return result.sentiment || 'neutral'
          },
          cellClass: (params: any) => {
            const result = getResultForCell(params.data.lineIndex, column.name)
            return `sentiment-${result?.sentiment || 'neutral'}`
          }
        },
        {
          field: `${column.name}_score`,
          headerName: isRuleBased(column.name) ? 'Score' : 'Confidence',
          width: 100,
          minWidth: 100,
          maxWidth: 150,
          sortable: true,
          filter: false,
          cellRenderer: (params: any) => {
            const result = getResultForCell(params.data.lineIndex, column.name)
            if (!result) return '⋯'

            if (isRuleBased(column.name)) {
              return (result.score || 0).toFixed(3)
            } else {
              const confidence = result.confidence || Math.abs(result.score || 0)
              return `${(confidence * 100).toFixed(1)}%`
            }
          }
        }
      ]
    } else {
      // Classification columns
      modelGroup.children = [
        {
          field: `${column.name}_class`,
          headerName: 'Class',
          width: 120,
          minWidth: 120,
          maxWidth: 150,
          sortable: true,
          filter: false,
          cellRenderer: (params: any) => {
            const result = getResultForCell(params.data.lineIndex, column.name)
            console.log('Classification result for', column.name, ':', result) // DEBUG
            if (!result) return '⋯'
            return result.topClass || result.metadata?.topLabel || 'Unknown'
          }
        },
        {
          field: `${column.name}_confidence`,
          headerName: 'Confidence',
          width: 100,
          minWidth: 100,
          maxWidth: 150,
          sortable: true,
          filter: false,
          cellRenderer: (params: any) => {
            const result = getResultForCell(params.data.lineIndex, column.name)
            if (!result) return '⋯'
            return `${((result.confidence || 0) * 100).toFixed(1)}%`
          }
        }
      ]
    }

    cols.push(modelGroup)
  })

  return cols
})

// Default column configuration
const defaultColDef = ref<ColDef>({
  resizable: true,
  sortable: true,
  suppressMenu: false
})

// Transform results to row data for AG-Grid
const rowData = computed(() => {
  return props.lines.map((text, lineIndex) => ({
    line: lineIndex + 1,
    lineIndex,
    text,
    id: lineIndex // Add stable ID for immutable data
  }))
})

// Row ID getter for AG-Grid to track rows (must return string)
function getRowId(params: any) {
  return String(params.data.id)
}

// Helper functions
function getResultForCell(lineIndex: number, columnName: string): AnalysisResult | undefined {
  return props.results.find(r =>
    r.lineIndex === lineIndex && r.analyzer === columnName
  )
}

function isRuleBased(columnName: string): boolean {
  return columnName.toLowerCase().includes('afinn') ||
         columnName.toLowerCase().includes('vader')
}

// Register custom header component
const components = {
  TextColumnHeader
}

// Grid event handlers
function onGridReady(params: GridReadyEvent) {
  gridApi.value = params.api

  // Don't auto-size - use the explicit widths we set

  // FORCE links in headers - try multiple times because AG-Grid renders async
  const addLinks = () => {
    let linksAdded = false
    document.querySelectorAll('.ag-header-group-cell-label').forEach((labelEl) => {
      const text = labelEl.textContent || ''
      const url = getModelUrl(text.trim())
      if (url && !labelEl.querySelector('a')) {
        labelEl.innerHTML = `<a href="${url}" target="_blank" rel="noopener" class="model-header-link" style="color: var(--color-primary) !important; text-decoration: underline !important;">${text}</a>`
        linksAdded = true
      }
    })
    return linksAdded
  }

  // Try immediately, then retry a few times
  setTimeout(addLinks, 0)
  setTimeout(addLinks, 100)
  setTimeout(addLinks, 250)
  setTimeout(addLinks, 500)
}

function onCellClicked(event: CellClickedEvent) {
  // Only show modal for result cells, not line/text
  const field = event.column.getColId()
  if (field === 'line' || field === 'text') return

  // Extract analyzer name from field
  const analyzerName = field.split('_')[0]
  const result = getResultForCell(event.data.lineIndex, analyzerName)

  if (result) {
    showModal(event.data.lineIndex, analyzerName, result)
  }
}

function showModal(lineIndex: number, columnName: string, result: AnalysisResult) {
  let parsedData: any[] = []

  try {
    if (result.type === 'classification' && result.allClasses) {
      if (Array.isArray(result.allClasses)) {
        parsedData = [...result.allClasses]
          .filter(item => item && typeof item === 'object')
          .sort((a, b) => (b.score || 0) - (a.score || 0))
      } else if (typeof result.allClasses === 'object') {
        parsedData = Object.entries(result.allClasses)
          .map(([label, score]) => ({ label, score: Number(score) }))
          .sort((a, b) => b.score - a.score)
      }
    } else if (result.rawOutput && Array.isArray(result.rawOutput.fullRawOutput)) {
      parsedData = [...result.rawOutput.fullRawOutput]
        .filter(item => item && typeof item === 'object')
        .sort((a, b) => (b.score || 0) - (a.score || 0))
    } else {
      parsedData = [{
        label: result.sentiment || result.topClass || 'Result',
        score: result.score || result.confidence || 0
      }]
    }
  } catch (error) {
    console.warn('Failed to parse modal data:', error)
    parsedData = [{ label: 'Error parsing data', score: 0 }]
  }

  modalData.value = {
    analyzer: columnName,
    line: lineIndex + 1,
    rawOutput: result.rawOutput || result,
    parsedData
  }
  showRawJson.value = false
}

function closeModal() {
  modalData.value = null
}

function toggleRawJson() {
  showRawJson.value = !showRawJson.value
}

// Helper function to get model URLs (same as original)
function getModelUrl(name: string): string | undefined {
  const urls: { [key: string]: string } = {
    'VADER': 'https://github.com/vaderSentiment/vaderSentiment-js',
    'AFINN': 'https://github.com/thisandagain/sentiment',
    'DistilBERT SST-2': 'https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-sst-2-english',
    'Twitter RoBERTa': 'https://huggingface.co/Xenova/twitter-roberta-base-sentiment-latest',
    'Financial DistilRoBERTa': 'https://huggingface.co/Xenova/finbert',
    'Multilingual DistilBERT': 'https://huggingface.co/Xenova/distilbert-base-multilingual-cased-sentiments-student',
    'GoEmotions': 'https://huggingface.co/SamLowe/roberta-base-go_emotions-onnx',
    'KoalaAI Moderation': 'https://huggingface.co/KoalaAI/Text-Moderation',
    'IPTC News': 'https://huggingface.co/onnx-community/multilingual-IPTC-news-topic-classifier-ONNX',
    'Language Detection': 'https://huggingface.co/protectai/xlm-roberta-base-language-detection-onnx',
    'Toxic BERT': 'https://huggingface.co/Xenova/toxic-bert',
    'Jigsaw Toxicity': 'https://huggingface.co/minuva/MiniLMv2-toxic-jigsaw-onnx',
    'Industry Classification': 'https://huggingface.co/sabatale/industry-classification-api-onnx'
  }
  return urls[name]
}

// Helper to add links to headers
const addHeaderLinks = () => {
  document.querySelectorAll('.ag-header-group-cell-label').forEach((labelEl) => {
    const text = labelEl.textContent || ''
    const url = getModelUrl(text.trim())
    if (url && !labelEl.querySelector('a')) {
      labelEl.innerHTML = `<a href="${url}" target="_blank" rel="noopener" class="model-header-link" style="color: var(--color-primary) !important; text-decoration: underline !important;">${text}</a>`
    }
  })
}

// Watch for column changes
watch(() => props.columns, () => {
  setTimeout(addHeaderLinks, 100)
  setTimeout(addHeaderLinks, 250)
}, { deep: true })

// Watch for new results and update grid efficiently
watch(() => props.results.length, () => {
  if (gridApi.value) {
    // Only refresh cells, not the entire grid
    gridApi.value.refreshCells({ force: true })

    // Re-add links after refresh
    setTimeout(addHeaderLinks, 100)
    setTimeout(addHeaderLinks, 250)
  }
}, { flush: 'post' })

// AUTOSCROLL: Watch analysisStore currentModelProcessedLines directly (NOT results array!)
watch(() => analysisStore.currentModelProcessedLines, (processedLines) => {
  if (!props.autoScrollEnabled || !gridApi.value) return

  const lineIndex = processedLines - 1 // Convert to 0-indexed
  if (lineIndex >= 0 && lineIndex < props.lines.length) {
    console.log(`🚀AUTOSCROLL🚀 Model: ${analysisStore.currentModelName}, Line: ${lineIndex + 1}/${props.lines.length}`)
    setTimeout(() => {
      if (gridApi.value) {
        gridApi.value.ensureIndexVisible(lineIndex, 'middle')
      }
    }, 100)
  }
})

// Watch for text wrap toggle and update column definitions
watch(textWrapEnabled, () => {
  if (gridApi.value) {
    // Force grid to update column definitions
    gridApi.value.setGridOption('columnDefs', columnDefs.value)
    // Reset row heights
    gridApi.value.resetRowHeights()
  }
})
</script>

<style scoped>
.ag-grid-results-container {
  width: 100%;
  max-width: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
  position: relative;
}

/* Retrofuture theme overrides for AG-Grid */
:deep(.ag-theme-retrofuture) {
  --ag-header-background-color: var(--color-bg-secondary);
  --ag-header-foreground-color: var(--color-text-primary);
  --ag-header-height: 40px;
  --ag-row-height: 35px;
  --ag-odd-row-background-color: #ffffff;
  --ag-even-row-background-color: #fafafa;
  --ag-row-hover-color: rgba(52, 152, 219, 0.05);
  --ag-border-color: var(--color-border-light);
  --ag-font-family: var(--font-family-base);
  --ag-font-size: 14px;
  --ag-alpine-active-color: var(--color-primary);
  --ag-selected-row-background-color: rgba(255, 107, 53, 0.1);
  --ag-range-selection-border-color: var(--color-accent);
}

/* Sticky header styling */
:deep(.ag-header) {
  background: var(--color-bg-secondary) !important;
  border-bottom: 2px solid var(--color-border) !important;
  font-weight: 600;
}

/* Group header styling - Model names */
:deep(.ag-header-group-cell) {
  background: linear-gradient(135deg, var(--color-bg-secondary), #f9f9f9) !important;
  border-bottom: 2px solid var(--color-primary) !important;
  font-weight: 700 !important;
  color: var(--color-primary) !important;
  text-align: center !important;
}

/* Model header links */
:deep(.model-header-link) {
  color: var(--color-primary) !important;
  text-decoration: underline !important;
  font-weight: 700 !important;
  transition: color 0.2s ease !important;
}

:deep(.model-header-link:hover) {
  color: var(--color-primary-dark) !important;
}

/* Sub-headers (Sentiment/Score, Class/Confidence) */
:deep(.ag-header-cell) {
  background: var(--color-bg-secondary) !important;
  font-weight: 500 !important;
  font-size: 13px !important;
  text-align: center !important;
}

/* Pinned columns shadow */
:deep(.ag-pinned-left-header),
:deep(.ag-pinned-left-cols-container) {
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1) !important;
}

/* Center align result cells */
:deep(.ag-cell) {
  text-align: center;
  cursor: pointer;
}

/* Add vertical borders between model groups */
:deep(.ag-header-group-cell:not(:last-child)) {
  border-right: 2px solid var(--color-border) !important;
}

/* Add vertical borders to data cells - target the rightmost column of each model group */
:deep(.ag-cell[col-id$="_score"]),
:deep(.ag-cell[col-id$="_confidence"]) {
  border-right: 2px solid var(--color-border) !important;
}

/* Left align text column */
:deep([col-id="text"]) {
  text-align: left !important;
}

:deep(.line-number-cell) {
  font-weight: 600;
  background: #f8f9fa;
  text-align: center;
}

/* Sentiment colors */
:deep(.sentiment-positive) {
  color: #27ae60;
  font-weight: 600;
}

:deep(.sentiment-negative) {
  color: #e74c3c;
  font-weight: 600;
}

:deep(.sentiment-neutral) {
  color: #7f8c8d;
}

/* Keep existing modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 15000;
  animation: fadeIn 0.2s ease;
}

.modal-dialog {
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  max-width: 500px;
  width: 90%;
  animation: slideIn 0.3s ease;
}

.modal-header {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 8px 8px 0 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.modal-close:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.modal-body {
  padding: 16px;
}

.raw-json-toggle {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  margin-bottom: 12px;
  font-size: 14px;
  color: #495057;
  transition: background-color 0.2s ease;
}

.raw-json-toggle:hover {
  background: #e9ecef;
}

.raw-output-display {
  background: #f5f5f5;
  padding: 10px;
  margin: 10px 0;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #dee2e6;
}

.class-item {
  margin-bottom: 12px;
  padding: 8px;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  background: #fefefe;
}

.class-item.top-class {
  background: #f8f9fa;
  border-color: #007bff;
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.1);
}

.class-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.class-name {
  font-weight: 600;
  color: #212529;
  font-size: 14px;
}

.class-percentage {
  font-weight: 700;
  color: #007bff;
  font-size: 14px;
  padding: 2px 6px;
  background: rgba(0, 123, 255, 0.1);
  border-radius: 12px;
  min-width: 50px;
  text-align: center;
}

.confidence-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #0056b3);
  transition: width 0.3s ease;
  border-radius: 4px;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateY(-20px) scale(0.95); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

/* Custom Text column header with toggle button */
:deep(.text-column-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 4px;
}

:deep(.text-column-header .header-label) {
  font-weight: 500;
  flex-grow: 1;
}

:deep(.text-column-header .wrap-toggle-btn) {
  background: var(--color-primary);
  color: white;
  border: 2px solid var(--color-primary-dark);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 8px;
  line-height: 1.2;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

:deep(.text-column-header .wrap-toggle-btn:hover) {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
}

:deep(.text-column-header .wrap-toggle-btn:active) {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}
</style>