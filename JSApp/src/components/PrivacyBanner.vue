<template>
  <div class="privacy-banner">
    <span class="privacy-icon">🎪</span>
    <span class="privacy-text">
      <strong>No Cloud Behind the Curtain:</strong> Local-first privacy • Your text is processed 100% in your browser and is not sent to any server • Internet is only used to download this web app and models from HuggingFace
    </span>
  </div>
</template>

<script setup lang="ts">
// Pure presentational component
</script>

<style scoped>
.privacy-banner {
  background: linear-gradient(135deg,
    #2d1b69 0%,
    #1e3a5f 50%,
    #0f4c75 100%); /* Dark purple to dark turquoise */
  border: 2px solid var(--color-secondary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-md) var(--spacing-lg);
  margin: var(--spacing-lg) 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  box-shadow: var(--shadow-md);
  position: relative;
  overflow: hidden;
}

.privacy-banner::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='%23ffffff' opacity='0.1'%3E%3Ccircle cx='20' cy='20' r='2'/%3E%3Ccircle cx='80' cy='80' r='2'/%3E%3Ccircle cx='40' cy='60' r='1'/%3E%3Ccircle cx='70' cy='30' r='1'/%3E%3C/g%3E%3C/svg%3E");
  background-size: 50px 50px;
  pointer-events: none;
}

.privacy-icon {
  font-size: 2rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  z-index: 1;
}

.privacy-text {
  color: white;
  font-size: var(--font-size-base);
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  z-index: 1;
  line-height: var(--line-height-base);
}

.privacy-text strong {
  font-weight: 700;
  color: var(--color-bg-primary);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .privacy-banner {
    flex-direction: column;
    text-align: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
  }

  .privacy-text {
    font-size: var(--font-size-sm);
  }
}
</style>