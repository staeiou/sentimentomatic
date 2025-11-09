<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <button class="close-button" @click="close">×</button>

      <h2 class="modal-title">🔗 Share Your Text & Models</h2>

      <!-- Explanation -->
      <div class="explanation">
        <p>
          <strong>How it works:</strong> This feature compresses the text in your text box
          and your selected models into a URL that you can share with others.
        </p>
        <ul class="info-list">
          <li>✅ <strong>No cloud storage</strong> - Everything is encoded in the URL itself</li>
          <li>✅ <strong>Privacy-friendly</strong> - Your text never touches our servers</li>
          <li>⚠️ <strong>Recipients will see your text</strong> - Only share if you're comfortable with that</li>
          <li>🔄 <strong>No results included</strong> - Recipients must run analysis themselves (results should be identical)</li>
        </ul>
      </div>

      <!-- Status/Warning Messages -->
      <div v-if="isGenerating" class="status-message generating">
        <div class="spinner"></div>
        Compressing with Brotli Level 11...
      </div>

      <div v-if="error" class="status-message error">
        ❌ {{ error }}
      </div>

      <div v-if="shareUrl && urlTooLong" class="status-message error">
        <strong>❌ URL TOO LONG ({{ shareUrl.length }} chars)</strong>
        <p>The URL exceeds 8,000 characters and may not work in all browsers and servers.</p>
        <p><strong>Please reduce your text</strong> or remove some selected models.</p>
      </div>

      <div v-if="shareUrl && urlWarning && !urlTooLong" class="status-message warning">
        <strong>⚠️ URL LENGTH WARNING ({{ shareUrl.length }} chars)</strong>
        <p>The URL exceeds 2,048 characters. While it should work, some older systems may have issues.</p>
        <p>Consider reducing text length for maximum compatibility.</p>
      </div>

      <div v-if="shareUrl && !urlWarning && !urlTooLong" class="status-message success">
        <strong>✅ URL Generated Successfully ({{ shareUrl.length }} chars)</strong>
        <p>Your shareable link is ready!</p>
      </div>

      <!-- Share URL Display -->
      <div v-if="shareUrl && !urlTooLong" class="share-url-container">
        <label class="url-label">Shareable URL:</label>
        <div class="url-input-group">
          <input
            ref="urlInput"
            type="text"
            :value="shareUrl"
            readonly
            @click="selectAll"
            class="url-input"
          />
          <button @click="copyToClipboard" class="copy-button">
            {{ copied ? '✓ Copied!' : 'Copy Link' }}
          </button>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="modal-actions">
        <button v-if="!shareUrl" @click="generateUrl" class="btn-primary" :disabled="isGenerating">
          {{ isGenerating ? 'Generating...' : 'Generate Share Link' }}
        </button>
        <button v-if="shareUrl && urlTooLong" @click="close" class="btn-secondary">
          Close & Edit Text
        </button>
        <button v-if="shareUrl && !urlTooLong" @click="close" class="btn-secondary">
          Done
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAnalysisStore } from '../stores/analysisStore'
import { useModelStore } from '../stores/modelStore'
import { generateShareUrl } from '../utils/urlSharing'

const analysisStore = useAnalysisStore()
const modelStore = useModelStore()

const isOpen = ref(false)
const shareUrl = ref('')
const copied = ref(false)
const isGenerating = ref(false)
const error = ref('')
const urlInput = ref<HTMLInputElement>()

const urlTooLong = computed(() => shareUrl.value.length > 8000)
const urlWarning = computed(() => shareUrl.value.length > 2048)

function open() {
  isOpen.value = true
  shareUrl.value = ''
  copied.value = false
  error.value = ''
}

function close() {
  isOpen.value = false
}

async function generateUrl() {
  error.value = ''
  const text = analysisStore.text

  if (!text.trim()) {
    error.value = 'Please enter some text to share'
    return
  }

  isGenerating.value = true
  shareUrl.value = ''

  try {
    const url = await generateShareUrl({
      text,
      models: [
        ...modelStore.selectedRuleBasedAnalyzers,
        ...modelStore.selectedNeuralModels
      ]
    })

    shareUrl.value = url

    // Auto-select URL for easy copying (if not too long)
    if (!urlTooLong.value) {
      setTimeout(() => {
        urlInput.value?.select()
      }, 100)
    }
  } catch (err) {
    console.error('Failed to generate share URL:', err)
    error.value = 'Failed to generate share URL. Please try again.'
  } finally {
    isGenerating.value = false
  }
}

function selectAll() {
  urlInput.value?.select()
}

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
    // Fallback: select text for manual copy
    urlInput.value?.select()
  }
}

defineExpose({
  open
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.close-button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #666;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-button:hover {
  background: #f0f0f0;
  color: #333;
}

.modal-title {
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  color: #333;
}

.explanation {
  background: #f8f9fa;
  border-left: 4px solid #667eea;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 4px;
}

.explanation p {
  margin: 0 0 0.75rem 0;
  line-height: 1.5;
}

.info-list {
  margin: 0;
  padding-left: 1.25rem;
  line-height: 1.8;
}

.info-list li {
  margin-bottom: 0.5rem;
}

.status-message {
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.status-message.generating {
  background: #e3f2fd;
  border: 1px solid #2196f3;
  color: #1565c0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-message.error {
  background: #ffebee;
  border: 1px solid #f44336;
  color: #c62828;
}

.status-message.warning {
  background: #fff3e0;
  border: 1px solid #ff9800;
  color: #e65100;
}

.status-message.success {
  background: #e8f5e9;
  border: 1px solid #4caf50;
  color: #2e7d32;
}

.status-message p {
  margin: 0.5rem 0 0 0;
  font-size: 0.9rem;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(33, 150, 243, 0.3);
  border-top-color: #2196f3;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.share-url-container {
  margin-bottom: 1.5rem;
}

.url-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #333;
}

.url-input-group {
  display: flex;
  gap: 0.5rem;
}

.url-input {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  background: #f9f9f9;
  transition: border-color 0.2s;
}

.url-input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
}

.copy-button {
  padding: 0.75rem 1.5rem;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.copy-button:hover {
  background: #218838;
  transform: translateY(-1px);
}

.copy-button:active {
  transform: translateY(0);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
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
  transform: translateY(-1px);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .modal-content {
    padding: 1.5rem;
  }

  .modal-title {
    font-size: 1.25rem;
    margin-right: 2rem;
  }

  .url-input-group {
    flex-direction: column;
  }

  .copy-button {
    width: 100%;
  }

  .modal-actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}
</style>
