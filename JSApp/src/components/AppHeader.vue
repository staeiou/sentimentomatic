<template>
  <header class="app-header" :class="{ 'performance-mode': themeStore.performanceMode }">
    <!-- Performance Mode Card -->
    <PerformanceModeCard />

    <!-- Header Image (Default Mode) -->
    <div v-show="!themeStore.performanceMode" class="header-image-container">
      <a href="http://sentimentomatic.org">
        <img src="/header.png" alt="Stuart's Super Magic Sentiment-O-Matic Sentimentomatic" class="header-image" />
      </a>
    </div>

    <!-- Header Image (Performance Mode) -->
    <div v-show="themeStore.performanceMode" class="header-image-container performance-header">
      <a href="http://sentimentomatic.org">
        <img src="/header-performance.png" alt="Stuart's Super Magic Sentiment-O-Matic Sentimentomatic" class="header-image-performance" />
      </a>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useThemeStore } from '../stores/themeStore'
import PerformanceModeCard from './PerformanceModeCard.vue'

const themeStore = useThemeStore()
</script>

<style scoped>
/* ============================================
   DEFAULT MODE - Simple Container for Header Image
   ============================================ */
.app-header {
  padding: var(--spacing-sm) var(--spacing-xl);
  text-align: center;
  position: relative;
  background: #000000;
}

/* Remove decorative elements for both modes */
.app-header::before,
.app-header::after {
  content: none;
}

/* Header Image (Default Mode) */
.header-image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

/* Add padding ONLY to default mode to match performance mode header height */
/* Default: 1443x566 (ratio 2.549), Performance: 1428x649 (ratio 2.200) */
/* At 960px width: default=376px, performance=436px, diff=60px */
.header-image-container:not(.performance-header) {
  padding: 30px 0;
}

.header-image-container a {
  display: block;
  max-width: 100%;
}

.header-image {
  width: 100%;
  max-width: 960px;
  height: auto;
  display: block;
  margin: 0 auto;
}

/* Performance Mode Header Image */
.header-image-performance {
  width: 100%;
  max-width: 960px;
  height: auto;
  display: block;
  margin: 0 auto;
}

@media (max-width: 480px) {
  .app-header {
    padding: var(--spacing-md);
  }
}
</style>
