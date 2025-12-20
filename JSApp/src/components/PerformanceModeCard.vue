<template>
  <div class="performance-card">
    <label class="toggle-label">
      <span class="toggle-text">Performance Mode</span>
      <input
        type="checkbox"
        :checked="themeStore.performanceMode"
        @change="themeStore.togglePerformanceMode"
        class="toggle-checkbox"
      />
      <span class="toggle-slider"></span>
    </label>
  </div>
</template>

<script setup lang="ts">
import { useThemeStore } from '../stores/themeStore'

const themeStore = useThemeStore()
</script>

<style scoped>
.performance-card {
  /* To make floating with viewport: change 'absolute' to 'fixed' */
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  z-index: 9999;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  border: 2px solid var(--color-pink);
  border-radius: 12px;
  padding: var(--spacing-sm) var(--spacing-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.performance-card:hover {
  background: rgba(0, 0, 0, 0.95);
  box-shadow: 0 6px 16px rgba(255, 20, 147, 0.4);
  transform: translateY(-2px);
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  user-select: none;
  margin: 0;
}

.toggle-text {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-bg-primary);
  white-space: nowrap;
}

.toggle-checkbox {
  display: none;
}

.toggle-slider {
  position: relative;
  width: 50px;
  height: 26px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 13px;
  border: 2px solid var(--color-bg-primary);
  transition: background-color 0.3s ease;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 2px;
  top: 2px;
  background: var(--color-bg-primary);
  border-radius: 50%;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.toggle-checkbox:checked + .toggle-slider {
  background: var(--color-pink);
}

.toggle-checkbox:checked + .toggle-slider::before {
  transform: translateX(24px);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .performance-card {
    top: var(--spacing-sm);
    right: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
  }

  .toggle-text {
    font-size: var(--font-size-xs);
  }

  .toggle-slider {
    width: 40px;
    height: 22px;
  }

  .toggle-slider::before {
    width: 16px;
    height: 16px;
  }

  .toggle-checkbox:checked + .toggle-slider::before {
    transform: translateX(18px);
  }
}

@media (max-width: 480px) {
  .performance-card {
    padding: 6px 10px;
  }

  .toggle-text {
    font-size: 11px;
  }
}
</style>
