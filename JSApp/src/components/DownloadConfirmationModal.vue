<template>
  <div v-if="show" class="modal-overlay" style="display: flex !important;" @click.self="close">
    <div class="modal-dialog" :class="{ 'compact': allCached && !isLoading }">
      <!-- Loading state -->
      <div v-if="isLoading" class="loading-state">
        <div class="modal-header">
          <h3>🔍 Checking Model Cache...</h3>
          <button class="modal-close" @click="close">×</button>
        </div>
        <div class="modal-body">
          <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Checking which models need to be downloaded...</p>
            <p v-if="isSafari" class="safari-warning">
              This can take 1-3 minutes on Safari, Firefox & Chrome are recommended
            </p>
          </div>
        </div>
      </div>

      <!-- Content state -->
      <template v-else>
        <div class="modal-header" :class="{ 'cached': allCached }">
          <h3>{{ allCached ? '✅ All Models Cached' : '📥 Download Required' }} - {{ formatSize(downloadSize) }}</h3>
          <button class="modal-close" @click="close">×</button>
        </div>

        <div class="modal-body">
        <div class="models-table">
          <div v-if="cachedModels.length > 0" class="model-group">
            <div class="model-group-header">✅ Cached Models</div>
            <div v-for="model in cachedModels" :key="model.name" class="model-row">
              <span class="model-name">✅ {{ model.name }}</span>
              <span class="model-size-badge cached">{{ formatSize(model.size) }}</span>
            </div>
          </div>

          <div v-if="modelsToDownload.length > 0" class="model-group">
            <div class="model-group-header">📥 To Download</div>
            <div v-for="model in modelsToDownload" :key="model.name" class="model-row">
              <span class="model-name">{{ model.name }}</span>
              <span class="model-size-badge" :class="model.huggingFaceId.startsWith('Rule-based') ? 'rule-based' : 'neural'">
                {{ formatSize(model.size) }}
              </span>
            </div>
          </div>
        </div>

        <div class="total-size" :class="{ 'cached': allCached }">
          <strong>{{ allCached ? 'All models ready instantly!' : `Download: ${formatSize(downloadSize)}` }}</strong>
          <span class="download-note">
            {{ allCached
              ? 'No download required'
              : cachedModels.length > 0
                ? `${cachedModels.length} model${cachedModels.length > 1 ? 's' : ''} already cached`
                : downloadSize > 1024 * 1024 * 1024
                  ? '⚠️ Large download'
                  : '💡 Cached after first download'
            }}
          </span>
        </div>
        </div>

        <div class="modal-footer">
          <button v-if="!allCached" class="btn btn-secondary" @click="cancel">Cancel</button>
          <button class="btn btn-primary" @click="confirm">
            {{ allCached ? '🚀 Start Analysis' : '📥 Download & Analyze' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useModelStore } from '../stores/modelStore'

interface ModelInfo {
  name: string
  size: number
  huggingFaceId: string
  cached: boolean
}

const modelStore = useModelStore()

const show = ref(false)
const isLoading = ref(false)
const resolvePromise = ref<((value: boolean) => void) | null>(null)
const models = ref<ModelInfo[]>([])

// Detect Safari browser
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

const cachedModels = computed(() => models.value.filter(m => m.cached))
const modelsToDownload = computed(() => models.value.filter(m => !m.cached))
const downloadSize = computed(() => modelsToDownload.value.reduce((sum, model) => sum + model.size, 0))
const allCached = computed(() => modelsToDownload.value.length === 0)

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

async function showConfirmationWithLoading(): Promise<boolean> {
  return new Promise((resolve) => {
    resolvePromise.value = resolve
    show.value = true
    isLoading.value = true
    models.value = []

    // Load model info asynchronously after modal is shown
    modelStore.getModelDownloadInfo().then((downloadInfo) => {
      models.value = downloadInfo
      isLoading.value = false
    }).catch((error) => {
      console.error('Failed to get model download info:', error)
      // On error, just close modal
      isLoading.value = false
      resolvePromise.value?.(false)
      close()
    })
  })
}

function confirm() {
  resolvePromise.value?.(true)
  close()
}

function cancel() {
  resolvePromise.value?.(false)
  close()
}

function close() {
  show.value = false
  isLoading.value = false
  resolvePromise.value = null
  models.value = []
}

defineExpose({ showConfirmationWithLoading })
</script>

<style>
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

.modal-dialog.compact {
  max-width: 450px;
}

.modal-header {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header.cached {
  background: linear-gradient(135deg, #28a745, #20c997);
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
  padding: 12px 16px;
}

.models-table {
  margin-bottom: 12px;
}

.model-group {
  margin-bottom: 15px;
}

.model-group-header {
  font-weight: 600;
  color: #2c3e50;
  font-size: 13px;
  margin: 8px 0 4px 0;
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 2px;
}

.model-group-header:first-child {
  margin-top: 0;
}

.model-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
  font-size: 13px;
}

.model-name {
  color: #2c3e50;
  flex-grow: 1;
}

.model-size-badge {
  color: white;
  padding: 1px 6px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  min-width: 40px;
  text-align: center;
}

.model-size-badge.rule-based {
  background: #27ae60;
}

.model-size-badge.neural {
  background: #e74c3c;
}

.model-size-badge.cached {
  background: #28a745;
}

.total-size {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  border-top: 2px solid #3498db;
}

.total-size.cached {
  border-top: 2px solid #28a745;
}

.total-size strong {
  color: #2c3e50;
  font-size: 14px;
}

.download-note {
  color: #6c757d;
  font-size: 11px;
  font-style: italic;
}

.modal-footer {
  padding: 8px 16px;
  background: #f8f9fa;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  border-top: 1px solid #e9ecef;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-primary {
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #218838, #1fa080);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateY(-20px) scale(0.95); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

/* Loading state styles */
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  min-height: 200px;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--color-bg-secondary);
  border-top: 4px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-spinner p {
  color: var(--color-text-secondary);
  font-size: var(--font-size-base);
  margin: 0;
}

.safari-warning {
  color: var(--color-warning, #ff9800);
  font-size: var(--font-size-sm);
  font-style: italic;
  margin-top: var(--spacing-sm) !important;
}
</style>