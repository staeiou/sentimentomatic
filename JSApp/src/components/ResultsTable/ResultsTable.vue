<template>
  <div ref="tableContainer" :style="{ ...containerStyles, ...columnStyles }" class="table-scroll-container">
    <table class="results-table unified-table" :class="{ 'text-wrapped': textWrapped }" :style="tableStyles">
      <thead>
        <tr>
          <th class="line-number-col" rowspan="2">
            <span class="header-icon">#</span>
          </th>
          <th class="text-col" rowspan="2">
            <div class="text-header-content">
              <span class="header-icon">📝</span>
              <span class="header-text">Text</span>
              <button
                type="button"
                id="text-wrap-toggle"
                class="text-wrap-toggle"
                :class="{ active: textWrapped }"
                title="Toggle text wrapping"
                @click="toggleTextWrap"
              >
                <span class="wrap-icon">{{ textWrapped ? '↩' : '⋯' }}</span>
                <span class="wrap-text">{{ textWrapped ? 'Truncate' : 'Wrap' }}</span>
              </button>
            </div>
          </th>
          <th
            v-for="column in props.columns"
            :key="column.name"
            class="model-header"
            :class="column.type === 'classification' ? 'classification-col' : 'sentiment-col'"
            colspan="2"
          >
            <div class="analyzer-header">
              <a
                v-if="getModelUrl(column.name)"
                :href="getModelUrl(column.name)"
                target="_blank"
                rel="noopener"
                class="analyzer-name-link"
              >
                <span class="analyzer-icon">{{ getColumnIcon(column) }}</span>
                {{ column.name }}
              </a>
              <span v-else class="analyzer-name">
                <span class="analyzer-icon">{{ getColumnIcon(column) }}</span>
                {{ column.name }}
              </span>
            </div>
          </th>
        </tr>
        <tr class="subheader-row">
          <template v-for="column in props.columns" :key="`sub-${column.name}`">
            <th class="pred-header" :data-analyzer="column.name">{{ getColumnHeaders(column).class }}</th>
            <th class="conf-header" :data-analyzer="column.name">
              <div style="line-height: 1.2;">
                {{ getColumnHeaders(column).score }}
              </div>
            </th>
          </template>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(line, lineIndex) in lines"
          :key="lineIndex"
          class="result-row"
          :data-line-index="lineIndex"
        >
          <td class="line-number-cell">
            <span class="line-number">{{ lineIndex + 1 }}</span>
          </td>
          <td class="text-cell">
            <div class="text-content">{{ line }}</div>
          </td>
          <template v-for="column in props.columns" :key="`cell-${lineIndex}-${column.name}`">
            <td
              class="pred-cell clickable"
              :data-analyzer="column.name"
              :title="getResult(lineIndex, column.name) ? 'Click to see raw model output' : 'Pending...'"
              @click="showModal(lineIndex, column.name)"
            >
              <span v-if="getResult(lineIndex, column.name)" class="pred-value">
                {{ getDisplayLabel(lineIndex, column.name) }}
              </span>
              <span v-else class="pending-dot">⋯</span>
            </td>
            <td
              class="conf-cell clickable"
              :data-analyzer="column.name"
              :title="getResult(lineIndex, column.name) ? 'Click to see raw model output' : 'Pending...'"
              @click="showModal(lineIndex, column.name)"
            >
              <span v-if="getResult(lineIndex, column.name)" class="conf-value">
                {{ getDisplayScore(lineIndex, column.name) }}
              </span>
              <span v-else class="pending-dot">⋯</span>
            </td>
          </template>
        </tr>
      </tbody>
    </table>

    <!-- Classification Detail Modal -->
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
import { ref, computed, onMounted, onUnmounted, nextTick, type CSSProperties } from 'vue'

interface Column {
  name: string
  type: 'sentiment' | 'classification'
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

// Props
const props = defineProps<{
  lines: string[]
  columns: Column[]
  results: AnalysisResult[]
  isComplete: boolean
  statusText: string
}>()

// State
const textWrapped = ref(true)
const modalData = ref<{
  analyzer: string
  line: number
  rawOutput: any
  parsedData: any[]
} | null>(null)
const showRawJson = ref(false)
const tableContainer = ref<HTMLElement>()

// Reactive viewport tracking
const viewportWidth = ref(window.innerWidth)
const containerWidth = ref(0)

// Update viewport on resize
const updateViewport = () => {
  viewportWidth.value = window.innerWidth
  if (tableContainer.value) {
    const rect = tableContainer.value.getBoundingClientRect()
    containerWidth.value = rect.width || viewportWidth.value - 100
  }
}

// Setup responsive behavior
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  updateViewport()
  window.addEventListener('resize', updateViewport)

  // Watch for container size changes
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(updateViewport)
    nextTick(() => {
      if (tableContainer.value && resizeObserver) {
        resizeObserver.observe(tableContainer.value)
      }
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewport)
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

// Truly reactive table sizing
const tableLayout = computed(() => {
  const columnCount = props.columns?.length || 0
  if (columnCount === 0) {
    return {
      useFlexLayout: true,
      totalMinWidth: 0,
      needsScroll: false
    }
  }

  // Base column sizes (minimum functional widths)
  const lineColMin = 50
  const textColMin = 300
  const analyzerColMin = 90

  // Calculate minimum required width
  const totalMinWidth = lineColMin + textColMin + (columnCount * analyzerColMin * 2) // *2 for pred+conf columns

  // Get available container width (accounting for padding/borders)
  const availableWidth = containerWidth.value || viewportWidth.value - 100
  const usableWidth = availableWidth - 20 // Account for padding

  // Determine if we need scrolling
  const needsScroll = totalMinWidth > usableWidth

  if (needsScroll) {
    // Use minimum widths and let it scroll
    return {
      useFlexLayout: false,
      totalMinWidth,
      needsScroll: true,
      lineColWidth: lineColMin,
      textColWidth: textColMin,
      analyzerColWidth: analyzerColMin
    }
  } else {
    // Distribute available space proportionally
    const extraSpace = usableWidth - totalMinWidth
    const textColExtra = Math.min(extraSpace * 0.6, 200) // Give text column more space but cap it
    const analyzerColExtra = (extraSpace - textColExtra) / (columnCount * 2) // Distribute rest to analyzer columns

    return {
      useFlexLayout: false,
      totalMinWidth: usableWidth,
      needsScroll: false,
      lineColWidth: lineColMin,
      textColWidth: textColMin + textColExtra,
      analyzerColWidth: analyzerColMin + analyzerColExtra
    }
  }
})

// Reactive container styles
const containerStyles = computed((): CSSProperties => {
  const layout = tableLayout.value

  return {
    width: '100%',
    overflowX: layout.needsScroll ? 'auto' : 'visible',
    border: '2px solid var(--color-border)',
    borderRadius: '8px',
    backgroundColor: 'white'
  }
})

// Reactive table styles
const tableStyles = computed((): CSSProperties => {
  const layout = tableLayout.value

  if (layout.needsScroll) {
    return {
      minWidth: `${layout.totalMinWidth}px`,
      width: `${layout.totalMinWidth}px`,
      tableLayout: 'fixed' as const
    }
  } else {
    return {
      width: '100%',
      tableLayout: 'fixed' as const
    }
  }
})

// Dynamic column styles - CSS custom properties
const columnStyles = computed(() => {
  // DISABLE JavaScript width control - let CSS handle it
  return {} as CSSProperties
})

// Methods
function toggleTextWrap() {
  textWrapped.value = !textWrapped.value
}

function getResult(lineIndex: number, columnName: string): AnalysisResult | undefined {
  return props.results.find(r =>
    r.lineIndex === lineIndex && r.analyzer === columnName
  )
}

function getDisplayLabel(lineIndex: number, columnName: string): string {
  const result = getResult(lineIndex, columnName)
  if (!result) return ''

  if (result.type === 'sentiment') {
    return result.sentiment || 'unknown'
  } else {
    return result.topClass || 'unknown'
  }
}

function getDisplayScore(lineIndex: number, columnName: string): string {
  const result = getResult(lineIndex, columnName)
  if (!result) return ''

  const isRuleBased = columnName.toLowerCase().includes('afinn') ||
                     columnName.toLowerCase().includes('vader')

  if (isRuleBased) {
    return (result.score || 0).toFixed(3)
  } else {
    const confidence = result.confidence || Math.abs(result.score || 0)
    return `${(confidence * 100).toFixed(1)}%`
  }
}

function showModal(lineIndex: number, columnName: string) {
  const result = getResult(lineIndex, columnName)
  if (!result) return

  let parsedData: any[] = []

  try {
    // Handle different data formats (like original)
    if (result.type === 'classification' && result.allClasses) {
      // Check if allClasses is an array (like from fullRawOutput) or object
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
      // Use fullRawOutput from metadata
      parsedData = [...result.rawOutput.fullRawOutput]
        .filter(item => item && typeof item === 'object')
        .sort((a, b) => (b.score || 0) - (a.score || 0))
    } else if (result.rawOutput && result.rawOutput.metadata && Array.isArray(result.rawOutput.metadata.fullRawOutput)) {
      // Try metadata.fullRawOutput
      parsedData = [...result.rawOutput.metadata.fullRawOutput]
        .filter(item => item && typeof item === 'object')
        .sort((a, b) => (b.score || 0) - (a.score || 0))
    } else {
      // Fallback: show score and sentiment
      parsedData = [{
        label: result.sentiment || result.topClass || 'Result',
        score: result.score || result.confidence || 0
      }]
    }

    // Ensure we have some data
    if (parsedData.length === 0) {
      parsedData = [{
        label: result.sentiment || result.topClass || 'No data',
        score: result.score || result.confidence || 0
      }]
    }

  } catch (error) {
    console.warn('Failed to parse modal data:', error, result)
    parsedData = [{
      label: 'Error parsing data',
      score: 0
    }]
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


function getColumnIcon(column: Column): string {
  if (column.type === 'classification') return '🏷️'
  return '😊'
}

function getModelUrl(name: string): string | undefined {
  // Map of model names to URLs
  const urls: { [key: string]: string } = {
    'VADER': 'https://github.com/vaderSentiment/vaderSentiment-js',
    'AFINN': 'https://github.com/thisandagain/sentiment',
    'DistilBERT SST-2': 'https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-sst-2-english',
    'Twitter RoBERTa': 'https://huggingface.co/Xenova/twitter-roberta-base-sentiment-latest',
    'Financial DistilRoBERTa': 'https://huggingface.co/Xenova/finbert',
    'Multilingual DistilBERT': 'https://huggingface.co/Xenova/distilbert-base-multilingual-cased-sentiments-student',
    'GoEmotions': 'https://huggingface.co/SamLowe/roberta-base-go_emotions-onnx',
    'KoalaAI Content Moderation': 'https://huggingface.co/KoalaAI/Text-Moderation',
    'IPTC News Topics': 'https://huggingface.co/onnx-community/multilingual-IPTC-news-topic-classifier-ONNX',
    'Language Detection': 'https://huggingface.co/protectai/xlm-roberta-base-language-detection-onnx',
    'Toxic BERT': 'https://huggingface.co/Xenova/toxic-bert',
    'Jigsaw Toxicity': 'https://huggingface.co/minuva/MiniLMv2-toxic-jigsaw-onnx',
    'Industry Classification': 'https://huggingface.co/sabatale/industry-classification-api-onnx'
  }
  return urls[name]
}

function getColumnHeaders(column: Column) {
  if (column.type === 'classification') {
    return {
      class: 'Class',
      score: 'Confidence'
    }
  } else {
    return {
      class: 'Sentiment',
      score: 'Score'
    }
  }
}
</script>

<style scoped>
/* Modal styles matching original JSApp */
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

.all-classes-list {
  margin: 0;
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

.parsed-outputs {
  margin: 0;
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

/* Table container and column sizing */
.table-scroll-container {
  position: relative;
  background: white;
}

.table-scroll-container .results-table {
  border-collapse: separate;
  border-spacing: 0;
}

/* Reactive column widths using CSS custom properties */
.line-number-col {
  width: fit-content;
  min-width: 50px;
}

.text-col {
  width: var(--text-col-width, 300px);
  min-width: 300px; /* Always keep minimum readable width */
}

/* Override the JavaScript-set width for specific analyzers */
.pred-cell[data-analyzer="iptc-news"],
.pred-header[data-analyzer="iptc-news"],
.pred-cell[data-analyzer="industry-classification"],
.pred-header[data-analyzer="industry-classification"] {
  width: calc(var(--analyzer-col-width, 90px) + 20px) !important;
  min-width: 110px !important;
}

/* Base column styles - FORCE WIDTH */
.pred-header, .pred-cell {
  padding: 3px 8px !important;
  text-align: center;
  min-width: 100px !important;
  width: auto !important;
}

.conf-header, .conf-cell {
  padding: 3px 8px !important;
  text-align: center;
  min-width: 85px !important;
  width: auto !important;
}

/* SENTIMENT MODELS - 90px for prediction, 90px for confidence */
/* VADER */
.pred-header[data-analyzer="vader"],
.pred-cell[data-analyzer="vader"] {
  min-width: 90px !important;
  white-space: nowrap;
}
.conf-header[data-analyzer="vader"],
.conf-cell[data-analyzer="vader"] {
  min-width: 90px !important;
}

/* AFINN */
.pred-header[data-analyzer="afinn"],
.pred-cell[data-analyzer="afinn"] {
  min-width: 90px;
  white-space: nowrap;
}
.conf-header[data-analyzer="afinn"],
.conf-cell[data-analyzer="afinn"] {
  min-width: 90px;
}

/* DistilBERT */
.pred-header[data-analyzer="distilbert"],
.pred-cell[data-analyzer="distilbert"] {
  min-width: 90px;
  white-space: nowrap;
}
.conf-header[data-analyzer="distilbert"],
.conf-cell[data-analyzer="distilbert"] {
  min-width: 90px;
}

/* Twitter RoBERTa */
.pred-header[data-analyzer="twitter-roberta"],
.pred-cell[data-analyzer="twitter-roberta"] {
  min-width: 90px;
  white-space: nowrap;
}
.conf-header[data-analyzer="twitter-roberta"],
.conf-cell[data-analyzer="twitter-roberta"] {
  min-width: 90px;
}

/* Financial */
.pred-header[data-analyzer="financial"],
.pred-cell[data-analyzer="financial"] {
  min-width: 90px;
  white-space: nowrap;
}
.conf-header[data-analyzer="financial"],
.conf-cell[data-analyzer="financial"] {
  min-width: 90px;
}

/* Multilingual Student */
.pred-header[data-analyzer="multilingual-student"],
.pred-cell[data-analyzer="multilingual-student"] {
  min-width: 90px;
  white-space: nowrap;
}
.conf-header[data-analyzer="multilingual-student"],
.conf-cell[data-analyzer="multilingual-student"] {
  min-width: 90px;
}

/* CLASSIFICATION MODELS - varying widths */
/* Go Emotions - 110px for class, 85px for confidence */
.pred-header[data-analyzer="go-emotions"],
.pred-cell[data-analyzer="go-emotions"] {
  min-width: 110px;
  white-space: normal;
  overflow-wrap: break-word;
}
.conf-header[data-analyzer="go-emotions"],
.conf-cell[data-analyzer="go-emotions"] {
  min-width: 85px;
}

/* Text Moderation - 100px for class, 85px for confidence */
.pred-header[data-analyzer="text-moderation"],
.pred-cell[data-analyzer="text-moderation"] {
  min-width: 100px;
  white-space: normal;
  overflow-wrap: break-word;
}
.conf-header[data-analyzer="text-moderation"],
.conf-cell[data-analyzer="text-moderation"] {
  min-width: 85px;
}

/* IPTC News - 110px for class, 85px for confidence */
.pred-header[data-analyzer="iptc-news"],
.pred-cell[data-analyzer="iptc-news"] {
  min-width: 110px;
  white-space: normal;
  overflow-wrap: break-word;
}
.conf-header[data-analyzer="iptc-news"],
.conf-cell[data-analyzer="iptc-news"] {
  min-width: 85px;
}

/* Language Detection - 100px for class, 85px for confidence */
.pred-header[data-analyzer="language-detection"],
.pred-cell[data-analyzer="language-detection"] {
  min-width: 100px;
  white-space: normal;
  overflow-wrap: break-word;
}
.conf-header[data-analyzer="language-detection"],
.conf-cell[data-analyzer="language-detection"] {
  min-width: 85px;
}

/* Toxic BERT - 100px for class, 85px for confidence */
.pred-header[data-analyzer="toxic-bert"],
.pred-cell[data-analyzer="toxic-bert"] {
  min-width: 100px;
  white-space: normal;
  overflow-wrap: break-word;
}
.conf-header[data-analyzer="toxic-bert"],
.conf-cell[data-analyzer="toxic-bert"] {
  min-width: 85px;
}

/* Jigsaw Toxicity - 100px for class, 85px for confidence */
.pred-header[data-analyzer="jigsaw-toxicity"],
.pred-cell[data-analyzer="jigsaw-toxicity"] {
  min-width: 100px;
  white-space: normal;
  overflow-wrap: break-word;
}
.conf-header[data-analyzer="jigsaw-toxicity"],
.conf-cell[data-analyzer="jigsaw-toxicity"] {
  min-width: 85px;
}

/* Industry Classification - 110px for class, 85px for confidence */
.pred-header[data-analyzer="industry-classification"],
.pred-cell[data-analyzer="industry-classification"] {
  min-width: 110px;
  white-space: normal;
  overflow-wrap: break-word;
}
.conf-header[data-analyzer="industry-classification"],
.conf-cell[data-analyzer="industry-classification"] {
  min-width: 85px;
}

/* Text cell responsive behavior */
.text-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 3px 12px; /* Match table cell padding */
  line-height: 1.2; /* Match table line-height */
}

/* When wrapping: each cell grows only as needed */
.results-table.text-wrapped .text-cell {
  white-space: normal;
  word-wrap: break-word;
  text-overflow: initial;
  overflow: visible;
  max-height: none;
  height: auto; /* Natural height for this cell's content */
}

/* Text header with toggle button - CRITICAL MISSING STYLES */
.text-header-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  justify-content: space-between;
}

.text-wrap-toggle {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  padding: 2px 6px;
  cursor: pointer;
  font-size: var(--font-size-xs);
  line-height: 1;
  transition: all 0.2s ease;
  min-width: 60px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.text-wrap-toggle:hover {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.text-wrap-toggle.active {
  background: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

.wrap-icon {
  font-family: monospace;
  font-weight: bold;
}

/* Remove any inherited height constraints in wrapped mode */
.results-table.text-wrapped td {
  height: auto !important;
  max-height: none !important;
}

/* Override global CSS that adds excessive padding */
.results-table th,
.results-table td {
  padding: 3px 6px !important; /* Override global var(--spacing-sm) */
}

/* Override global text-wrapped padding that adds extra 16px vertical */
.results-table.text-wrapped .text-cell {
  padding: 3px 12px !important; /* Override global padding-top/padding-bottom */
  line-height: 1.2 !important; /* Override global line-height: 1.4 */
}

/* Ensure all cells respect the auto layout for content sizing */
.results-table {
  table-layout: auto;
}

/* Table base styling - ESSENTIAL BORDERS AND STRUCTURE */
.results-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: var(--font-size-sm);
  table-layout: auto;
}

/* Table headers and cells - BORDERS AND PADDING */
.results-table th,
.results-table td {
  padding: 3px 6px; /* Minimal vertical padding */
  border: 1px solid var(--color-border-light);
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2; /* Tight but readable */
  vertical-align: top; /* Don't stretch cells vertically */
  height: auto; /* Let each cell be natural height */
}

.results-table th {
  background-color: var(--color-bg-secondary);
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 10;
}

.results-table tbody tr:hover {
  background-color: rgba(52, 152, 219, 0.05);
}

/* Force each ROW to be only as tall as its own content */
.results-table tr {
  height: auto; /* Each row determines its own height */
}

/* In truncated mode: force single line height */
.results-table:not(.text-wrapped) td {
  height: 1.5em; /* Single line height */
  max-height: 1.5em;
}

/* Model header styling */
.model-header {
  text-align: center;
}

.analyzer-header {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
}

/* Analyzer name links in table headers */
.analyzer-name-link {
  font-weight: 700;
  color: var(--color-primary);
  text-decoration: underline;
  transition: color 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.analyzer-name-link:hover {
  color: var(--color-primary-dark);
  text-decoration: underline;
}

.analyzer-name {
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* Line number column styling */
.line-number-cell {
  text-align: center;
  font-weight: 600;
  background: #f8f9fa;
  border-right: 2px solid #dee2e6;
}

/* Prediction and confidence cells */
.pred-cell, .conf-cell {
  text-align: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.pred-cell:hover, .conf-cell:hover {
  background-color: #f8f9fa;
}

/* Style the prediction value */
.pred-value {
  font-weight: 600;
  display: inline-block;
}

/* Responsive container behavior */
@media (max-width: 768px) {
  .table-scroll-container {
    font-size: 14px;
  }

  .results-table td,
  .results-table th {
    padding: 6px 4px;
  }
}
</style>