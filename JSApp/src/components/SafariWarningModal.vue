<template>
  <div v-if="isOpen" class="modal-overlay" style="display: flex !important;" @click.self="close">
    <div class="modal-dialog safari-warning-modal">
      <div class="modal-header">
        <h3>⚠️ Safari Browser Detected</h3>
        <button class="modal-close" @click="close">×</button>
      </div>

        <div class="modal-body">
          <div class="warning-message">
            <p><strong>Safari works with Sentiment-O-Matic, but has known performance issues:</strong></p>

            <ul class="issues-list">
              <li>🐌 Model loading is significantly slower (20-30 seconds vs 2-3 seconds)</li>
              <li>💾 Models often need to be re-downloaded each session</li>
              <li>📦 Cache storage is limited and unreliable</li>
            </ul>

            <div class="browser-recommendations">
              <p class="recommendation">
                <strong>For the best experience, we recommend using:</strong>
              </p>
              <a href="https://www.mozilla.org/firefox/" target="_blank" class="browser-card firefox">
                <span class="browser-icon">🦊</span>
                <span class="browser-name">Firefox</span>
                <span class="browser-status">Recommended</span>
              </a>

              <a href="https://www.google.com/chrome/" target="_blank" class="browser-card chrome">
                <span class="browser-icon">🌐</span>
                <span class="browser-name">Chrome</span>
                <span class="browser-status">Recommended</span>
              </a>
            </div>

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

.browser-recommendations {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin: var(--spacing-lg) 0;
  justify-content: center;
}

.recommendation {
  margin: 0;
  color: var(--color-primary);
  flex-shrink: 0;
}

.browser-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  border: 2px solid var(--color-border);
  border-radius: var(--border-radius-md);
  text-decoration: none;
  color: inherit;
  transition: all var(--transition-base);
  max-width: 150px;
}

.browser-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border-color: var(--color-primary);
}

.browser-card.firefox:hover {
  border-color: #ff6611;
}

.browser-card.chrome:hover {
  border-color: #4285f4;
}

.browser-icon {
  font-size: 32px;
  margin-bottom: var(--spacing-xs);
}

.browser-name {
  font-weight: 700;
  font-size: var(--font-size-base);
  margin-bottom: var(--spacing-xs);
}

.browser-status {
  font-size: var(--font-size-xs);
  color: var(--color-success);
  background: rgba(76, 175, 80, 0.1);
  padding: 2px 6px;
  border-radius: var(--border-radius-sm);
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

  .browser-recommendations {
    flex-direction: column;
  }

  .browser-card {
    flex-direction: row;
    justify-content: flex-start;
    gap: var(--spacing-md);
  }

  .browser-icon {
    font-size: 32px;
    margin-bottom: 0;
  }
}
</style>