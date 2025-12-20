import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // Load from localStorage or default to false (regular mode)
  const storedMode = localStorage.getItem('sentimentomatic_performance_mode')
  const performanceMode = ref(storedMode === 'true')

  // Toggle function
  function togglePerformanceMode() {
    performanceMode.value = !performanceMode.value
    localStorage.setItem('sentimentomatic_performance_mode', String(performanceMode.value))
  }

  return {
    performanceMode,
    togglePerformanceMode
  }
})
