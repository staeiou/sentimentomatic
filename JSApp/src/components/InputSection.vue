<template>
  <section class="input-section" aria-label="Text Input">
    <div class="carnival-step step-1">STEP 1</div>
    <div class="input-header">
      <div class="header-left">
        <h3>🎭 Insert Texts Here</h3>
        <span class="input-hint">1 line = 1 unit<span class="hide-narrow"> of text</span> to analyze</span>
      </div>
      <div class="text-buttons">
        <button type="button" id="template-generator-btn" class="btn btn-secondary btn-sm" @click="$emit('showTemplateGenerator')">Mad Libs<span class="hide-narrow"> Template</span></button>
        <button type="button" id="sample-datasets-btn" class="btn btn-secondary btn-sm" @click="$emit('showSampleDatasets')">Sample Data</button>
        <button type="button" id="import-file-btn" class="btn btn-secondary btn-sm" @click="$emit('showFileImport')">Import File</button>
        <button type="button" id="clear-text-btn" class="btn btn-secondary btn-sm" @click="$emit('clearText')">Clear</button>
      </div>
    </div>
    <TextInput ref="textInputRef" />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TextInput from './TextInput/TextInput.vue'

// Component ref
const textInputRef = ref<InstanceType<typeof TextInput>>()

// Events
defineEmits<{
  showTemplateGenerator: []
  showSampleDatasets: []
  showFileImport: []
  clearText: []
}>()

// Expose text input methods
defineExpose({
  clearText() {
    textInputRef.value?.clearText()
  },
  setText(text: string) {
    textInputRef.value?.setText(text)
  },
  focus() {
    textInputRef.value?.focus()
  }
})
</script>

<style scoped>
.input-section {
  background: white;
  border: 4px solid var(--color-mint);
  border-radius: 20px;
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  box-shadow:
    5px 5px 0 var(--color-secondary),
    5px 5px 20px rgba(0,0,0,0.1);
  position: relative;
}

.input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  margin-left: 50px;
  margin-right: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 2px dashed var(--color-accent);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.input-header h3 {
  color: var(--color-secondary);
  font-size: var(--font-size-2xl);
  margin: 0;
  font-family: "Impact", sans-serif;
  font-weight: lighter;
  letter-spacing: 1.25px;
}

.input-hint {
  font-size: var(--font-size-base);
  color: var(--color-primary);
  font-weight: 600;
  background: var(--color-bg-primary);
  padding: 4px 12px;
  border-radius: 20px;
  border: 2px solid var(--color-accent);
}

.text-buttons {
  display: flex;
  gap: var(--spacing-sm);
}

/* Hide text on narrower viewports */
@media (max-width: 1024px) {
  .hide-narrow {
    display: none;
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .input-header {
    margin-left: 30px;
  }

  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .text-buttons {
    flex-direction: column;
    width: 100%;
  }

  .text-buttons .btn {
    width: 100%;
  }
}
</style>