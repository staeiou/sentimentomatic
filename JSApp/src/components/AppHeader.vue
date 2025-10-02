<template>
  <header class="app-header">
    <div class="neon-sign">
      <h1 class="app-title">
        <a href="http://sentimentomatic.org">
          <span class="title-super">Stuart's Super Magic</span>
          <span class="title-main">SENTIMENT-O-MATIC</span>
        </a>
      </h1>
      <div class="app-tagline">
        ⚡ Step Right Up! Test Your Text's True Feelings! ⚡
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
// Pure presentational component - no logic needed
</script>

<style scoped>
.app-header {
  background: var(--color-secondary);
  background-image:
    repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,.1) 10px, rgba(0,0,0,.1) 20px),
    radial-gradient(circle at 20% 80%, var(--color-mint) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, var(--color-accent) 0%, transparent 50%);
  padding: var(--spacing-2xl) var(--spacing-xl);
  border-bottom: 8px solid var(--color-primary);
  text-align: center;
  position: relative;
  overflow: hidden;
}

.neon-sign {
  background: var(--color-bg-primary);
  display: inline-block;
  padding: var(--spacing-xl) var(--spacing-2xl);
  border-radius: 20px;
  border: 4px solid var(--color-primary);
  box-shadow:
    0 0 20px rgba(255, 107, 53, 0.5),
    inset 0 0 20px rgba(255, 107, 53, 0.1);
  transform: perspective(300px) rotateX(5deg);
}

.app-title {
  margin: 0;
}

.app-title a {
  color: inherit;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.title-super {
  font-family: "Courier New", monospace;
  font-size: var(--font-size-lg);
  color: var(--color-secondary);
  letter-spacing: 2px;
  text-transform: uppercase;
}

.title-main {
  font-family: "Arial Black", "Impact", sans-serif;
  font-size: 2.5rem;
  color: var(--color-primary);
  text-shadow:
    2px 2px 0 var(--color-accent),
    4px 4px 8px rgba(0,0,0,0.2);
  letter-spacing: 0.5px;
  word-spacing: 0.2em;
}

.app-tagline {
  font-size: var(--font-size-lg);
  color: var(--color-secondary);
  font-weight: 600;
  margin-top: var(--spacing-md);
  letter-spacing: 1px;
}

/* Mobile responsive */
@media (max-width: 480px) {
  .app-header {
    padding: var(--spacing-md);
  }
}
</style>
