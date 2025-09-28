<template>
  <!-- File Upload Modal -->
  <div id="file-upload-modal" class="modal-overlay" :style="{ display: showUploadModal ? 'flex' : 'none' }" @click.self="closeUploadModal">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>Import File</h3>
        <button class="modal-close" @click="closeUploadModal">×</button>
      </div>

      <div class="modal-body">
        <div id="file-upload-zone" class="file-upload-zone"
             @click="triggerFileInput"
             @dragover.prevent="onDragOver"
             @dragleave.prevent="onDragLeave"
             @drop.prevent="onDrop"
             :class="{ 'drag-over': isDraggingOver }">
          <div class="upload-icon">📁</div>
          <div class="upload-text">
            <p><strong>Click to browse</strong> or drag and drop</p>
            <p class="file-types">Supports CSV, TSV, and Excel files</p>
          </div>
        </div>

        <input type="file" id="file-input" ref="fileInput"
               accept=".csv,.tsv,.xlsx,.xls"
               @change="handleFileSelect"
               style="display: none">

        <div class="import-options">
          <label>
            <input type="radio" name="import-mode" value="replace" v-model="importMode" checked>
            <span>Replace existing text</span>
          </label>
          <label>
            <input type="radio" name="import-mode" value="append" v-model="importMode">
            <span>Append to existing text</span>
          </label>
        </div>

        <div id="upload-progress" class="upload-progress" v-show="isProcessing">
          <div class="progress-bar-container">
            <div class="progress-bar" :style="{ width: processProgress + '%' }"></div>
          </div>
          <div class="progress-text">{{ progressText }}</div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="closeUploadModal">Cancel</button>
      </div>
    </div>
  </div>

  <!-- Column Selection Modal -->
  <div id="column-selection-modal" class="modal-overlay" :style="{ display: showColumnModal ? 'flex' : 'none' }" @click.self="closeColumnModal">
    <div class="modal-dialog modal-lg">
      <div class="modal-header">
        <h3>Select Text Column</h3>
        <button class="modal-close" @click="closeColumnModal">×</button>
      </div>

      <div class="modal-body">
        <div id="file-info" class="file-info">
          <strong>File:</strong> {{ fileName }}
          ({{ formatFileSize(fileSize) }}, {{ totalRows }} rows)
        </div>

        <h4>Available Columns</h4>
        <div id="columns-list" class="columns-list">
          <div v-for="column in columns" :key="column.index"
               class="column-option"
               :class="{ selected: selectedColumn === column.index }"
               @click="selectColumn(column.index)">
            <input type="radio" name="column-selection"
                   :value="column.index"
                   :checked="selectedColumn === column.index">
            <div class="column-info">
              <div>
                <div class="column-name">{{ column.name }}</div>
                <div class="column-sample">{{ column.sampleText }}</div>
              </div>
              <div class="column-type">
                <span>{{ column.icon }}</span>
                <span>{{ column.dataType }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="import-options">
          <label>
            <input type="checkbox" id="remove-newlines" v-model="removeNewlines" checked>
            <span>Remove newlines within cells (recommended for multi-line text)</span>
          </label>
        </div>

        <div id="preview-section" class="preview-section" v-show="selectedColumn !== null">
          <h4>Preview (first 5 rows)</h4>
          <div id="preview-box" class="preview-box">
            <div v-for="(line, index) in previewData" :key="index" class="preview-item">
              {{ index + 1 }}. {{ line }}
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="backToUpload">Back</button>
        <button class="btn btn-primary" @click="performImport" :disabled="selectedColumn === null">
          Import Selected Column
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAnalysisStore } from '../../stores/analysisStore'

const analysisStore = useAnalysisStore()

// Modal visibility
const showUploadModal = ref(false)
const showColumnModal = ref(false)

// File processing state
const fileInput = ref<HTMLInputElement>()
const isDraggingOver = ref(false)
const isProcessing = ref(false)
const processProgress = ref(0)
const progressText = ref('Processing file...')
const importMode = ref('replace')
const removeNewlines = ref(true)

// File data
const fileName = ref('')
const fileSize = ref(0)
const totalRows = ref(0)
const columns = ref<any[]>([])
const selectedColumn = ref<number | null>(null)
const rawData = ref<any[][]>([])
const previewData = computed(() => {
  if (selectedColumn.value === null || rawData.value.length < 2) return []

  return rawData.value
    .slice(1, 6) // Skip header, take first 5
    .map(row => {
      // Proper null safety for selectedColumn
      if (selectedColumn.value === null) return ''

      let value = row[selectedColumn.value] || ''
      if (removeNewlines.value) {
        value = value.toString().replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim()
      }
      return value
    })
    .filter(v => v)
})

// Public method to show the modal
function show() {
  showUploadModal.value = true
  resetState()
}

function resetState() {
  isProcessing.value = false
  processProgress.value = 0
  progressText.value = 'Processing file...'
  selectedColumn.value = null
  columns.value = []
  rawData.value = []
}

function closeUploadModal() {
  showUploadModal.value = false
}

function closeColumnModal() {
  showColumnModal.value = false
}

function backToUpload() {
  showColumnModal.value = false
  showUploadModal.value = true
}

function triggerFileInput() {
  fileInput.value?.click()
}

function onDragOver(_e: DragEvent) {
  isDraggingOver.value = true
}

function onDragLeave(_e: DragEvent) {
  isDraggingOver.value = false
}

function onDrop(e: DragEvent) {
  isDraggingOver.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    handleFile(files[0])
  }
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    handleFile(target.files[0])
  }
}

async function handleFile(file: File) {
  // Validate file
  if (file.size > 10 * 1024 * 1024) {
    alert(`File too large (${formatFileSize(file.size)}). Maximum is 10 MB.`)
    return
  }

  const extension = file.name.toLowerCase().split('.').pop()
  if (!['csv', 'tsv', 'xlsx', 'xls'].includes(extension || '')) {
    alert('Unsupported file format. Please use CSV, TSV, or Excel files.')
    return
  }

  isProcessing.value = true
  progressText.value = 'Reading file...'

  try {
    if (extension === 'csv' || extension === 'tsv') {
      await parseCSV(file, extension === 'tsv' ? '\t' : ',')
    } else {
      await parseExcel(file)
    }

    fileName.value = file.name
    fileSize.value = file.size

    // Analyze columns
    analyzeColumns()

    // Show column selection
    showUploadModal.value = false
    showColumnModal.value = true
  } catch (error) {
    console.error('File processing error:', error)
    alert(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    isProcessing.value = false
  }
}

function parseCSV(file: File, delimiter: string): Promise<void> {
  return new Promise((resolve, reject) => {
    (window as any).Papa.parse(file, {
      delimiter,
      header: false,
      skipEmptyLines: true,
      complete: (results: any) => {
        rawData.value = results.data.slice(0, 5001) // Limit to 5000 rows + header
        totalRows.value = rawData.value.length - 1
        resolve()
      },
      error: (error: any) => {
        reject(new Error(`CSV parsing failed: ${error.message}`))
      }
    })
  })
}

function parseExcel(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = (window as any).XLSX.read(data, { type: 'array' })

        // Use first sheet
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Convert to array
        const jsonData = (window as any).XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          raw: false
        })

        rawData.value = jsonData.slice(0, 5001) // Limit to 5000 rows + header
        totalRows.value = rawData.value.length - 1
        resolve()
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

function analyzeColumns() {
  if (rawData.value.length < 2) return

  const headers = rawData.value[0]
  const dataRows = rawData.value.slice(1)

  columns.value = headers.map((header: any, index: number) => {
    const columnName = header || `Column ${index + 1}`
    const values = dataRows.slice(0, 20).map((row: any[]) => row[index] || '')

    // Analyze column data type
    const analysis = analyzeColumnData(values, columnName)
    const sampleValues = values.filter((v: any) => v).slice(0, 3)
    const sampleText = sampleValues
      .map((v: any) => `"${v.toString().slice(0, 30)}${v.toString().length > 30 ? '...' : ''}"`)
      .join(', ')

    return {
      name: columnName,
      index,
      sampleText: sampleText || 'No preview available',
      dataType: analysis.dataType,
      icon: analysis.icon,
      textScore: analysis.textScore
    }
  })

  // Sort by text likelihood
  columns.value.sort((a, b) => b.textScore - a.textScore)

  // Auto-select best column
  if (columns.value.length > 0) {
    selectedColumn.value = columns.value[0].index
  }
}

function analyzeColumnData(values: any[], columnName: string) {
  const nonEmpty = values.filter(v => v && v.toString().trim())

  if (nonEmpty.length === 0) {
    return { dataType: 'mixed', textScore: 0, icon: '❓' }
  }

  let textScore = 0
  let numberCount = 0
  let textCount = 0

  for (const value of nonEmpty) {
    const str = value.toString().trim()

    if (!isNaN(Number(str))) {
      numberCount++
    } else {
      textCount++
      // Score text quality
      if (str.length > 10) textScore += 0.3
      if (str.includes(' ')) textScore += 0.2
      if (/[.!?]/.test(str)) textScore += 0.2
      if (str.length > 30) textScore += 0.3
    }
  }

  // Name-based bonus
  const lowerName = columnName.toLowerCase()
  const textKeywords = ['comment', 'text', 'feedback', 'review', 'description', 'message', 'content']
  if (textKeywords.some(kw => lowerName.includes(kw))) {
    textScore += 0.5
  }

  const textRatio = textCount / nonEmpty.length

  let dataType = 'mixed'
  let icon = '🔀'

  if (textRatio > 0.7) {
    dataType = 'text'
    icon = '📝'
    textScore += textRatio
  } else if (numberCount / nonEmpty.length > 0.8) {
    dataType = 'number'
    icon = '🔢'
    textScore *= 0.1
  }

  return {
    dataType,
    textScore: Math.min(textScore, 1),
    icon
  }
}

function selectColumn(index: number) {
  selectedColumn.value = index
}

function performImport() {
  if (selectedColumn.value === null) return

  // Extract column data
  let columnData = rawData.value
    .slice(1) // Skip header
    .map(row => row[selectedColumn.value!] || '')
    .filter(value => value.toString().trim())

  // Process newlines if requested
  if (removeNewlines.value) {
    columnData = columnData.map(value =>
      value.toString().replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim()
    )
  }

  const dataText = columnData.join('\n')

  // Import to editor
  if (importMode.value === 'replace') {
    analysisStore.updateText(dataText)
  } else {
    const currentText = analysisStore.text
    analysisStore.updateText(currentText ? currentText + '\n' + dataText : dataText)
  }

  // Close modal
  showColumnModal.value = false

  console.log(`📤 Imported ${columnData.length} text entries from ${fileName.value} in ${importMode.value} mode`)
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`
  } else {
    return `${bytes} bytes`
  }
}

// Expose show method for parent components
defineExpose({ show })
</script>

<style>
.modal-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  align-items: center;
  justify-content: center;
}

.modal-overlay[style*="display: block"],
.modal-overlay[style*="display: flex"] {
  display: flex !important;
}

.modal-dialog {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-dialog.modal-lg {
  max-width: 800px;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6c757d;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex-grow: 1;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid #dee2e6;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.file-upload-zone {
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.file-upload-zone:hover,
.file-upload-zone.drag-over {
  border-color: #007bff;
  background: #f0f8ff;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.upload-text p {
  margin: 5px 0;
}

.file-types {
  color: #6c757d;
  font-size: 14px;
}

.import-options {
  margin-top: 20px;
}

.import-options label {
  display: block;
  margin: 10px 0;
  cursor: pointer;
}

.columns-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 10px;
}

.column-option {
  padding: 10px;
  margin: 5px 0;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
}

.column-option:hover {
  background: #f8f9fa;
}

.column-option.selected {
  background: #e7f3ff;
  border-color: #007bff;
}

.column-info {
  flex-grow: 1;
  display: flex;
  justify-content: space-between;
}

.column-name {
  font-weight: 500;
}

.column-sample {
  font-size: 12px;
  color: #6c757d;
  margin-top: 4px;
}

.column-type {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  color: #6c757d;
}

.preview-section {
  margin-top: 20px;
}

.preview-box {
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 10px;
  background: #f8f9fa;
  max-height: 200px;
  overflow-y: auto;
}

.preview-item {
  padding: 5px;
  font-size: 14px;
  border-bottom: 1px solid #dee2e6;
}

.preview-item:last-child {
  border-bottom: none;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.upload-progress {
  margin-top: 20px;
}

.progress-bar-container {
  height: 20px;
  background: #e9ecef;
  border-radius: 10px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #007bff;
  transition: width 0.3s ease;
}

.progress-text {
  margin-top: 10px;
  text-align: center;
  font-size: 14px;
}
</style>