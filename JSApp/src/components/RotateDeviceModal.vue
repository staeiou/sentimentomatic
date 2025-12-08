<template>
  <div v-if="isOpen" class="modal-overlay rotate-modal-overlay" @click.self="close">
    <div class="rotate-modal-dialog">
      <button class="rotate-modal-close" @click="close" aria-label="Close">×</button>

      <div class="rotate-modal-body">
        <!-- Rotating phone animation -->
        <div class="phone-animation">
          <div class="phone-icon">📱</div>
          <div class="arrow-icon">→</div>
          <div class="phone-icon rotated">📱</div>
        </div>

        <h3>Rotate for Best Experience</h3>
        <p>This app is easier to use in landscape mode</p>

        <button type="button" class="btn btn-primary got-it-btn" @click="close">
          Got it
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'

const isOpen = ref(false)
let orientationListener: ((e: MediaQueryListEvent) => void) | null = null

function open() {
  isOpen.value = true
  setupOrientationListener()
}

function close() {
  localStorage.setItem('sentimentomatic_rotation_dismissed', 'true')
  isOpen.value = false
  cleanupOrientationListener()
}

function setupOrientationListener() {
  const portraitQuery = window.matchMedia("(orientation: portrait)")

  orientationListener = (e: MediaQueryListEvent) => {
    if (!e.matches) {
      // Now in landscape - auto-close
      close()
    }
  }

  portraitQuery.addEventListener('change', orientationListener)
}

function cleanupOrientationListener() {
  if (orientationListener) {
    const portraitQuery = window.matchMedia("(orientation: portrait)")
    portraitQuery.removeEventListener('change', orientationListener)
    orientationListener = null
  }
}

onBeforeUnmount(() => {
  cleanupOrientationListener()
})

defineExpose({
  open,
  close
})
</script>

<style scoped>
.rotate-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex !important;
  align-items: flex-end;
  justify-content: center;
  z-index: 15000;
  animation: fadeIn 0.3s ease;
}

.rotate-modal-dialog {
  background: white;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 500px;
  position: relative;
  animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  padding: var(--spacing-xl) var(--spacing-lg) var(--spacing-lg);
}

.rotate-modal-close {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 32px;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
  line-height: 1;
}

.rotate-modal-close:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--color-text-primary);
}

.rotate-modal-body {
  text-align: center;
  padding: var(--spacing-md) 0;
}

/* Phone animation */
.phone-animation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  font-size: 48px;
}

.phone-icon {
  animation: subtle-pulse 2s ease-in-out infinite;
}

.phone-icon.rotated {
  transform: rotate(90deg);
  animation: rotate-phone 2s ease-in-out infinite;
}

.arrow-icon {
  color: var(--color-primary);
  font-size: 32px;
  font-weight: bold;
  animation: pulse-arrow 1.5s ease-in-out infinite;
}

@keyframes rotate-phone {
  0%, 100% {
    transform: rotate(90deg) scale(1);
  }
  50% {
    transform: rotate(90deg) scale(1.1);
  }
}

@keyframes subtle-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes pulse-arrow {
  0%, 100% {
    opacity: 0.6;
    transform: translateX(0);
  }
  50% {
    opacity: 1;
    transform: translateX(8px);
  }
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.rotate-modal-body h3 {
  color: var(--color-secondary);
  font-size: var(--font-size-2xl);
  margin-bottom: var(--spacing-sm);
  font-weight: 700;
}

.rotate-modal-body p {
  color: var(--color-text-secondary);
  font-size: var(--font-size-lg);
  margin-bottom: var(--spacing-xl);
}

.got-it-btn {
  padding: var(--spacing-md) var(--spacing-2xl);
  font-size: var(--font-size-lg);
  font-weight: 600;
  min-width: 150px;
}

/* Desktop - don't show as bottom sheet */
@media (min-width: 769px) {
  .rotate-modal-overlay {
    align-items: center;
  }

  .rotate-modal-dialog {
    border-radius: 20px;
    max-width: 450px;
  }
}
</style>
