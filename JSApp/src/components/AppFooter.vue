<template>
  <footer class="app-footer">
    <div class="footer-content">
      <span>A <a href="https://stuartgeiger.com" target="_blank" rel="noopener">Stuart Geiger</a> Confabulation</span>
      <span class="separator">|</span>
      <span><a href="https://github.com/staeiou/sentimentomatic/" target="_blank" rel="noopener">GitHub</a></span>
      <span class="separator">|</span>
      <span><a href="https://github.com/staeiou/sentimentomatic/issues" target="_blank" rel="noopener">Open an Issue</a></span>
      <span class="separator">|</span>
      <span class="built-with">Built with</span>
      <span class="heart">❤️</span>
      <a href="https://huggingface.co/docs/transformers.js" target="_blank" rel="noopener">Transformers.js</a>
      <span class="separator">|</span>
      <a href="https://vuejs.org" target="_blank" rel="noopener">Vue 3</a>
      <span class="separator">|</span>
      <a href="https://vitejs.dev" target="_blank" rel="noopener">Vite</a>
      <span class="separator">|</span>
      <a href="https://pinia.vuejs.org" target="_blank" rel="noopener">Pinia</a>
      <span class="separator">|</span>
      <a href="https://sheetjs.com" target="_blank" rel="noopener">SheetJS</a>
      <span class="separator">|</span>
      <a href="https://www.papaparse.com" target="_blank" rel="noopener">PapaParse</a>
      <span class="separator">|</span>
      <span class="models-credit">Models from <a href="https://huggingface.co" target="_blank" rel="noopener">Hugging Face</a></span>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  margin-top: 0;
  padding: var(--spacing-sm) var(--spacing-xl);
  background: var(--color-secondary);
  color: white;
  font-size: var(--font-size-sm);
}

.footer-content {
  max-width: 100%;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-xs);
  white-space: nowrap;
  text-align: center;
  overflow: hidden;
}

.built-with {
  color: rgba(255, 255, 255, 0.8);
}

.heart {
  font-size: var(--font-size-base);
  animation: heartbeat 1.5s ease-in-out infinite;
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  10% { transform: scale(1.1); }
  20% { transform: scale(1); }
  30% { transform: scale(1.1); }
  40% { transform: scale(1); }
}

/* All links in footer */
a {
  color: #FFD700;
  text-decoration: none;
  padding: 2px 4px;
  border-radius: var(--border-radius-sm);
  transition: all var(--transition-base);
}

a:hover {
  background: rgba(255, 215, 0, 0.2);
  transform: translateY(-1px);
  text-decoration: underline;
}

.separator {
  color: rgba(255, 255, 255, 0.4);
  margin: 0 var(--spacing-xs);
}

.models-credit {
  color: rgba(255, 255, 255, 0.8);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .footer-content {
    font-size: var(--font-size-xs);
  }

  .separator {
    display: none;
  }

  .tech-stack {
    gap: var(--spacing-sm);
  }

  .tech-stack a {
    display: inline-block;
  }
}
</style>