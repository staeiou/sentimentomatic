<template>
  <div id="sample-datasets-modal" class="modal-overlay" :style="{ display: show ? 'flex' : 'none' }" @click.self="close">
    <div class="modal-dialog modal-lg">
      <div class="modal-header">
        <h3>Sample Datasets</h3>
        <button class="modal-close" @click="close">×</button>
      </div>
      <div class="modal-body">
        <div class="import-options">
          <label>
            <input type="radio" name="load-mode" value="replace" v-model="loadMode" checked>
            <span>Replace existing text</span>
          </label>
          <label>
            <input type="radio" name="load-mode" value="append" v-model="loadMode">
            <span>Append to existing text</span>
          </label>
        </div>

        <div id="datasets-grid" class="datasets-grid">
          <div v-for="dataset in sampleDatasets" :key="dataset.id" class="dataset-card">
            <div class="dataset-header">
              <span class="dataset-icon">{{ dataset.icon }}</span>
              <h3 class="dataset-name">{{ dataset.name }}</h3>
            </div>
            <p class="dataset-description" v-html="dataset.description"></p>
            <div class="dataset-purpose">{{ dataset.purpose }}</div>
            <div class="dataset-actions">
              <button class="dataset-preview-btn" @click="previewDataset(dataset)">
                👁️ Preview
              </button>
              <button class="dataset-load-btn" @click="loadDataset(dataset)">
                📥 Load Dataset
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { sampleDatasets } from '../data/datasets'
import { useAnalysisStore } from '../stores/analysisStore'

const analysisStore = useAnalysisStore()
const show = ref(false)
const loadMode = ref('replace')

function open() {
  show.value = true
}

function close() {
  show.value = false
}

function previewDataset(dataset: any) {
  const preview = dataset.data.slice(0, 10).join('\n')
  alert(`Preview of ${dataset.name}:\n\n${preview}\n\n...and ${dataset.data.length - 10} more lines`)
}

function loadDataset(dataset: any) {
  const dataText = dataset.data.join('\n')

  if (loadMode.value === 'replace') {
    analysisStore.updateText(dataText)
  } else {
    const currentText = analysisStore.text
    analysisStore.updateText(currentText ? currentText + '\n' + dataText : dataText)
  }

  close()
  console.log(`📊 Loaded ${dataset.name} dataset (${dataset.data.length} lines) in ${loadMode.value} mode`)
}

defineExpose({ open })
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
  max-width: 900px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-dialog.modal-lg {
  max-width: 900px;
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

.datasets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.dataset-card {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 15px;
  background: #f8f9fa;
}

.dataset-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.dataset-icon {
  font-size: 24px;
}

.dataset-name {
  margin: 0;
  font-size: 16px;
}

.dataset-description {
  font-size: 14px;
  color: #666;
  margin: 10px 0;
}

.dataset-purpose {
  font-size: 12px;
  color: #999;
  font-style: italic;
  margin-bottom: 10px;
}

.dataset-actions {
  display: flex;
  gap: 10px;
}

.dataset-preview-btn,
.dataset-load-btn {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid #dee2e6;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.dataset-preview-btn:hover,
.dataset-load-btn:hover {
  background: #e9ecef;
}

.import-options {
  display: flex;
  justify-content: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-lg);
}

.import-options label {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin: 0;
  cursor: pointer;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}
</style>