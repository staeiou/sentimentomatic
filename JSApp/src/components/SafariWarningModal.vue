<template>
  <div v-if="isOpen" class="modal-overlay" style="display: flex !important;" @click.self="close">
    <div class="modal-dialog safari-warning-modal">
      <div class="modal-header">
        <h3>⚠️ iPhone/iPad (iOS/iPadOS) Detected</h3>
        <button class="modal-close" @click="close">×</button>
      </div>

        <div class="modal-body">
          <div class="warning-message">
            <p><strong>iPhone/iPad uses WebKit for all browsers — neural models are not guaranteed to be stable.</strong></p>
            <p>This app runs models entirely in your browser. On iOS/iPadOS, WebKit memory limits are much tighter, so neural models can crash or stall, especially larger ones.</p>

            <ul class="issues-list">
              <li>✅ <strong>VADER and AFINN (rule-based) are 100% supported</strong></li>
              <li>⚠️ Neural models may work, but stability depends on RAM and model size</li>
              <li>📉 Larger models are more likely to crash or lock up the device</li>
              <li>🔢 For best stability on iPhone/iPad, select only one model at a time</li>
              <li>💻 <strong>Desktop/laptop is strongly recommended</strong> for multi-model runs</li>
            </ul>

            <div class="safari-storage-warning">
              <strong>⚠️ To delete downloaded models:</strong> Settings → Safari → Advanced → Website Data → Remove
            </div>

            <p class="browser-recommendation">
              <strong>These limits are not enforced by the app.</strong>
              If you can, use a desktop or laptop for best stability and performance.
            </p>

            <p class="continue-message">
              Rule-based analyzers run instantly; neural models may be unstable on iPhone/iPad.
            </p>
          </div>

          <div class="modal-footer">
            <label class="dont-show-again">
              <input type="checkbox" v-model="dontShowAgain">
              Don't show this warning again
            </label>
            <button type="button" class="btn btn-primary" @click="close">
              Continue on iPhone/iPad
            </button>
          </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isOpen = ref(false)
const dontShowAgain = ref(false)

function open() {
  isOpen.value = true
}

function close() {
  if (dontShowAgain.value) {
    localStorage.setItem('sentimentomatic_safari_warning_dismissed', 'true')
  }
  isOpen.value = false
}

defineExpose({
  open,
  close
})
</script>

<style scoped>
.safari-warning-modal {
  max-width: 800px;
  max-height: 95vh;
  overflow-y: auto;
}

.safari-warning-modal .modal-header {
  background: #e65100;
  color: white;
}

.safari-warning-modal .modal-header h3 {
  color: white;
}

.safari-warning-modal .modal-close {
  color: white;
}

.warning-message {
  color: var(--color-text-primary);
  line-height: 1.6;
}

.issues-list {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  margin: var(--spacing-md) 0;
  list-style: none;
}

.issues-list li {
  margin: var(--spacing-sm) 0;
  padding-left: var(--spacing-sm);
}

.browser-recommendation {
  text-align: center;
  color: var(--color-primary);
  margin: var(--spacing-md) 0;
}

.browser-recommendation a {
  color: var(--color-primary);
  text-decoration: underline;
}

.safari-storage-warning {
  background: #b71c1c;
  border: 2px solid #8b0000;
  border-radius: var(--border-radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  margin: var(--spacing-md) 0;
  color: white;
  font-size: var(--font-size-base);
  line-height: 1.4;
}

.continue-message {
  margin-top: var(--spacing-lg);
  font-style: italic;
  color: var(--color-text-secondary);
  text-align: center;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border-light);
}

.dont-show-again {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
  color: var(--color-text-secondary);
}

.dont-show-again input[type="checkbox"] {
  cursor: pointer;
}

/* Mobile responsive */
@media (max-width: 600px) {
  .safari-warning-modal {
    margin: var(--spacing-md);
  }
}
</style>
