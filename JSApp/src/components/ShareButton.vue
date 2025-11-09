<template>
  <button @click="openModal" :class="buttonClass">
    <span class="icon">🔗</span>
    {{ buttonText }}
  </button>
</template>

<script setup lang="ts">
import { inject } from 'vue'

defineProps<{
  buttonText?: string
  buttonClass?: string
}>()

const openShareModal = inject<() => void>('openShareModal')

function openModal() {
  openShareModal?.()
}
</script>

<style scoped>
button {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.icon {
  font-size: 1.2rem;
}
</style>
