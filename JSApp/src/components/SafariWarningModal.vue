<template>
  <div v-if="isOpen" class="modal-overlay" style="display: flex !important;" @click.self="close">
    <div class="modal-dialog safari-warning-modal">
      <div class="modal-header">
        <h3>⚠️ Safari Browser Detected</h3>
        <button class="modal-close" @click="close">×</button>
      </div>

        <div class="modal-body">
          <div class="warning-message">
            <p><strong>Safari works with Sentiment-O-Matic, but is not recommended.</strong></p>
            <p>This web app downloads small language models that run entirely in your web browser, but Safari has some limitations:

            <ul class="issues-list">
              <li>⌛ Model analysis is much slower (2-10x faster on Firefox/Chrome) </li>
              <li>🐌 Model loading is much slower (20-30 seconds vs 2-3 seconds)</li>
              <li>💾 Models often need to be re-downloaded each session</li>
              <li>📦 Cache storage is limited and unreliable</li>
              <li>🗑️ <strong>Downloaded models (up to 1.7GB) cannot be deleted from within the app</strong></li>
            </ul>

            <div class="safari-storage-warning">
              <strong>⚠️ To delete downloaded models:</strong> Safari → Settings → Privacy → Manage Website Data → Remove
            </div>

            <p class="browser-recommendation">
              <strong>For the best experience, use <a href="https://www.mozilla.org/firefox/" target="_blank">Firefox</a>, <a href="https://www.google.com/chrome/" target="_blank">Chrome</a>, or a Firefox/Chrome-based browser like <a href="https://brave.com/download/">Brave</a> or <a href="https://www.opera.com/download">Opera</a>.</strong>
            </p>

            <p class="continue-message">
              You can continue using Safari, but expect longer loading times.
            </p>
          </div>

          <div class="modal-footer">
            <label class="dont-show-again">
              <input type="checkbox" v-model="dontShowAgain">
              Don't show this warning again
            </label>
            <button type="button" class="btn btn-primary" @click="close">
              Continue with Safari
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
