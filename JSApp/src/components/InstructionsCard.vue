<template>
  <div class="instructions-card">
    <h2 class="step-number">🎪 Three Simple Steps</h2>
    <div class="instructions-steps">
      <div class="step">
        <span class="step-badge">1</span>
        <span>Enter your text below (or import file)</span>
      </div>
      <div class="step">
        <span class="step-badge">2</span>
        <span>Select analysis models</span>
      </div>
      <div class="step">
        <span class="step-badge">3</span>
        <span>Click Analyze for results</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Pure presentational component
</script>

<style scoped>
.instructions-card {
  background: white;
  border: 3px dashed var(--color-accent);
  border-radius: 20px;
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  box-shadow: var(--shadow-lg);
  position: relative;
}


.instructions-card h2 {
  color: var(--color-primary);
  font-size: var(--font-size-xl);
  margin-bottom: var(--spacing-lg);
  text-align: center;
  font-weight: 700;
  letter-spacing: normal;
}

.instructions-steps {
  display: flex;
  justify-content: space-around;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}

.step {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
}

.step-badge {
  background: var(--color-accent);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: var(--font-size-xl);
  box-shadow: 3px 3px 0 var(--color-secondary);
}
</style>