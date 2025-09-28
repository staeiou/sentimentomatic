<template>
  <div class="template-generator-overlay" :style="{ display: show ? 'flex' : 'none' }" @click.self="close">
    <div class="template-generator-modal">
      <div class="modal-header">
        <h3>🎭 Template Text Generator</h3>
        <button class="modal-close" @click="close">×</button>
      </div>
      <div class="modal-body">
        <div class="template-section">
          <label for="template-input">Template (use &#123;&#123;variable&#125;&#125; for placeholders):</label>
          <textarea id="template-input" v-model="template" class="template-input"
                    placeholder="Example: I {{feeling}} {{thing}}" rows="3"></textarea>
          <button class="btn btn-secondary btn-sm" @click="detectVariables">Detect Variables</button>
        </div>

        <div v-if="variables.length > 0" class="variables-section">
          <div v-for="variable in variables" :key="variable" class="variable-input-group">
            <label>Values for &#123;&#123;{{ variable }}&#125;&#125; (one per line):</label>
            <textarea v-model="variableValues[variable]" class="variable-input"
                      :placeholder="`Enter values for ${variable}, one per line`" rows="4"></textarea>
          </div>
        </div>

        <div v-if="preview.length > 0" class="preview-section">
          <label>Preview (first 5 combinations):</label>
          <div class="preview-output">
            <div v-for="(line, index) in preview" :key="index" class="preview-line">{{ line }}</div>
            <div v-if="totalCombinations > 5" class="preview-more">
              ...and {{ totalCombinations - 5 }} more
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Cancel</button>
        <button class="btn btn-primary" @click="generate" :disabled="variables.length === 0">
          Generate & Replace Text
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAnalysisStore } from '../stores/analysisStore'

const analysisStore = useAnalysisStore()

const show = ref(false)
const template = ref('I {{feeling}} {{thing}}')
const variables = ref<string[]>([])
const variableValues = ref<Record<string, string>>({})

const totalCombinations = computed(() => {
  if (variables.value.length === 0) return 0

  return variables.value.reduce((total, variable) => {
    const values = variableValues.value[variable]?.split('\n').filter(v => v.trim()) || []
    return total * (values.length || 1)
  }, 1)
})

const preview = computed(() => {
  if (variables.value.length === 0) return []

  const results: string[] = []
  const allValues = variables.value.map(v =>
    variableValues.value[v]?.split('\n').filter(val => val.trim()) || []
  )

  // Generate first 5 combinations
  const maxPreview = Math.min(5, totalCombinations.value)

  for (let i = 0; i < maxPreview; i++) {
    let text = template.value
    variables.value.forEach((variable, idx) => {
      const values = allValues[idx]
      if (values.length > 0) {
        const valueIndex = i % values.length
        text = text.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), values[valueIndex])
      }
    })
    results.push(text)
  }

  return results
})

watch(template, () => {
  detectVariables()
})

function open() {
  show.value = true
  detectVariables()
}

function close() {
  show.value = false
}

function detectVariables() {
  const regex = /\{\{(\w+)\}\}/g
  const found = new Set<string>()
  let match

  while ((match = regex.exec(template.value)) !== null) {
    found.add(match[1])
  }

  variables.value = Array.from(found)

  // Set default values for new variables
  variables.value.forEach(variable => {
    if (!variableValues.value[variable]) {
      if (variable.toLowerCase().includes('feeling')) {
        variableValues.value[variable] = 'love\nhate\nenjoy\ndislike'
      } else if (variable.toLowerCase().includes('thing')) {
        variableValues.value[variable] = 'cats\ndogs\ncoffee\nmondays'
      } else {
        variableValues.value[variable] = ''
      }
    }
  })
}

function generate() {
  const results: string[] = []
  const allValues = variables.value.map(v =>
    variableValues.value[v]?.split('\n').filter(val => val.trim()) || []
  )

  // Generate all combinations
  function cartesianProduct(arrays: string[][]): string[][] {
    if (arrays.length === 0) return [[]]
    const [first, ...rest] = arrays
    const restProduct = cartesianProduct(rest)
    return first.flatMap(x => restProduct.map(combo => [x, ...combo]))
  }

  const combinations = cartesianProduct(allValues)

  combinations.forEach(combo => {
    let text = template.value
    variables.value.forEach((variable, idx) => {
      text = text.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), combo[idx])
    })
    results.push(text)
  })

  analysisStore.updateText(results.join('\n'))
  close()
}

defineExpose({ open })
</script>

<style>
.template-generator-overlay {
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

.template-generator-overlay[style*="display: block"],
.template-generator-overlay[style*="display: flex"] {
  display: flex !important;
}

.template-generator-modal {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
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

.template-section,
.variables-section,
.preview-section {
  margin-bottom: 20px;
}

.template-input,
.variable-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  margin: 10px 0;
}

.variable-input-group {
  margin-bottom: 15px;
}

.variable-input-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.preview-output {
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 10px;
  background: #f8f9fa;
  max-height: 200px;
  overflow-y: auto;
}

.preview-line {
  padding: 5px;
  border-bottom: 1px solid #dee2e6;
}

.preview-line:last-child {
  border-bottom: none;
}

.preview-more {
  padding: 5px;
  text-align: center;
  color: #6c757d;
  font-style: italic;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-sm {
  padding: 5px 10px;
  font-size: 12px;
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
</style>