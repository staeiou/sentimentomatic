import './styles.css';
import { LabelManager } from './labels/LabelManager';
import { ZeroShotClassifier, type ClassificationResult } from './nli/ZeroShotClassifier';
import { exportToCSV, exportToJSON, type ExportData } from './utils/exportUtils';
import { getTestCorpus } from './TestCorpora';
import { StreamingResultsRenderer } from './ui/StreamingResultsRenderer';

class ClassifierApp {
  private labelManager: LabelManager;
  private classifier: ZeroShotClassifier;
  private resultsRenderer: StreamingResultsRenderer;
  private currentResults: ClassificationResult[] = [];

  // UI Elements
  private newLabelInput!: HTMLInputElement;
  private addLabelBtn!: HTMLButtonElement;
  private resetLabelsBtn!: HTMLButtonElement;
  private sentenceTemplateInput!: HTMLInputElement;
  private textInput!: HTMLTextAreaElement;
  private testCorpusSelect!: HTMLSelectElement;
  private lineCountSpan!: HTMLSpanElement;
  private modelSelect!: HTMLSelectElement;
  private multiLabelCheckbox!: HTMLInputElement;
  private thresholdSlider!: HTMLInputElement;
  private thresholdValue!: HTMLSpanElement;
  private keepCachedCheckbox!: HTMLInputElement;
  private classifyBtn!: HTMLButtonElement;
  private progressContainer!: HTMLElement;
  private progressFill!: HTMLElement;
  private progressText!: HTMLSpanElement;
  private resultsSection!: HTMLElement;
  private resultsTable!: HTMLElement;
  private exportCsvBtn!: HTMLButtonElement;
  private exportJsonBtn!: HTMLButtonElement;

  constructor() {
    this.labelManager = new LabelManager('labels-container');
    this.classifier = new ZeroShotClassifier();

    this.initializeElements();
    this.resultsRenderer = new StreamingResultsRenderer(this.resultsTable);
    this.setupEventListeners();
    this.loadDefaultLabels();
  }

  private initializeElements(): void {
    // Label management
    this.newLabelInput = document.getElementById('new-label-name') as HTMLInputElement;
    this.addLabelBtn = document.getElementById('add-label-btn') as HTMLButtonElement;
    this.resetLabelsBtn = document.getElementById('reset-labels-btn') as HTMLButtonElement;
    this.sentenceTemplateInput = document.getElementById('sentence-template') as HTMLInputElement;

    // Text input
    this.textInput = document.getElementById('text-input') as HTMLTextAreaElement;
    this.testCorpusSelect = document.getElementById('test-corpus') as HTMLSelectElement;
    this.lineCountSpan = document.getElementById('line-count') as HTMLSpanElement;

    // Settings
    this.modelSelect = document.getElementById('model-select') as HTMLSelectElement;
    this.multiLabelCheckbox = document.getElementById('multi-label') as HTMLInputElement;
    this.thresholdSlider = document.getElementById('threshold') as HTMLInputElement;
    this.thresholdValue = document.getElementById('threshold-value') as HTMLSpanElement;
    this.keepCachedCheckbox = document.getElementById('keep-model-cached') as HTMLInputElement;

    // Classification
    this.classifyBtn = document.getElementById('classify-btn') as HTMLButtonElement;
    this.progressContainer = document.getElementById('progress-container') as HTMLElement;
    this.progressFill = document.getElementById('progress-fill') as HTMLElement;
    this.progressText = document.getElementById('progress-text') as HTMLSpanElement;

    // Results
    this.resultsSection = document.getElementById('results-section') as HTMLElement;
    this.resultsTable = document.getElementById('results-table') as HTMLElement;
    this.exportCsvBtn = document.getElementById('export-csv') as HTMLButtonElement;
    this.exportJsonBtn = document.getElementById('export-json') as HTMLButtonElement;
  }

  private setupEventListeners(): void {
    // Label management
    this.addLabelBtn.addEventListener('click', () => this.addLabel());
    this.newLabelInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addLabel();
    });

    this.resetLabelsBtn.addEventListener('click', () => this.resetLabels());

    this.sentenceTemplateInput.addEventListener('input', () => {
      this.labelManager.setTemplate(this.sentenceTemplateInput.value);
    });

    // Text input
    this.textInput.addEventListener('input', () => this.updateLineCount());
    this.testCorpusSelect.addEventListener('change', () => this.loadTestCorpus());

    // Settings
    this.modelSelect.addEventListener('change', () => {
      // Force model reload when changing models
      this.classifier.unload();
    });

    this.thresholdSlider.addEventListener('input', () => {
      const value = parseInt(this.thresholdSlider.value) / 100;
      this.thresholdValue.textContent = value.toFixed(2);

      // Update threshold for all labels silently (no change events)
      this.labelManager.getLabels().forEach(label => {
        this.labelManager.updateLabelThreshold(label.id, value, true);
      });
    });

    this.multiLabelCheckbox.addEventListener('change', () => {
      this.classifier.updateConfig({
        multiLabel: this.multiLabelCheckbox.checked
      });
    });

    // Classification
    this.classifyBtn.addEventListener('click', () => this.runClassification());

    // Export
    this.exportCsvBtn.addEventListener('click', () => this.exportResults('csv'));
    this.exportJsonBtn.addEventListener('click', () => this.exportResults('json'));

    // Label changes
    this.labelManager.onChange(() => this.onLabelsChanged());
  }

  private loadDefaultLabels(): void {
    // Set the template input to match what's in the LabelManager
    this.sentenceTemplateInput.value = this.labelManager.getTemplate();

    // Only add default labels if there are no labels already
    if (this.labelManager.getLabels().length === 0) {
      // Add some default labels for quick start
      // Use lowercase for better NLI model compatibility
      const threshold = parseInt(this.thresholdSlider.value) / 100;
      const defaults = ['positive', 'negative', 'neutral'];
      defaults.forEach(label => this.labelManager.addLabel(label, threshold));
    }
  }

  private addLabel(): void {
    const labelName = this.newLabelInput.value.trim();
    if (labelName) {
      const threshold = parseInt(this.thresholdSlider.value) / 100;
      this.labelManager.addLabel(labelName, threshold);
      this.newLabelInput.value = '';
      this.newLabelInput.focus();
    }
  }

  private resetLabels(): void {
    // Clear all labels and reset to defaults
    this.labelManager.clear();
    const threshold = parseInt(this.thresholdSlider.value) / 100;
    const defaults = ['positive', 'negative', 'neutral'];
    defaults.forEach(label => this.labelManager.addLabel(label, threshold));
  }

  private updateLineCount(): void {
    const lines = this.textInput.value.split('\n').filter(line => line.trim());
    this.lineCountSpan.textContent = `${lines.length} lines`;
  }

  private loadTestCorpus(): void {
    const corpusId = this.testCorpusSelect.value;
    if (!corpusId) return;

    const corpus = getTestCorpus(corpusId);
    if (!corpus) return;

    console.log('Loading corpus:', corpusId, {
      template: corpus.template,
      labels: corpus.labels,
      textsCount: corpus.texts.length
    });

    // Set the template
    this.sentenceTemplateInput.value = corpus.template;
    this.labelManager.setTemplate(corpus.template);

    // Clear and set labels
    this.labelManager.clear();
    const threshold = parseInt(this.thresholdSlider.value) / 100;
    corpus.labels.forEach(label => this.labelManager.addLabel(label, threshold));

    // Set the text
    this.textInput.value = corpus.texts.join('\n');
    this.updateLineCount();

    // Reset the dropdown to show selection is complete
    this.testCorpusSelect.value = '';
  }

  private onLabelsChanged(): void {
    // Labels have changed - we can react here if needed
    // Note: Don't update thresholds here to avoid infinite recursion
  }

  private async runClassification(): Promise<void> {
    // Validate inputs
    const texts = this.textInput.value
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.trim());

    if (texts.length === 0) {
      alert('Please enter some text to classify');
      return;
    }

    const labels = this.labelManager.getLabels();
    if (labels.length === 0) {
      alert('Please add at least one label');
      return;
    }

    // Update classifier config
    const threshold = parseInt(this.thresholdSlider.value) / 100;
    const selectedModel = this.modelSelect.value;
    const selectedOption = this.modelSelect.options[this.modelSelect.selectedIndex];
    const quantized = selectedOption.getAttribute('data-quantized') === 'true';

    this.classifier.updateConfig({
      modelId: selectedModel,
      multiLabel: this.multiLabelCheckbox.checked,
      threshold,
      quantized,
      keepCached: this.keepCachedCheckbox.checked
    });

    // Show progress
    this.progressContainer.hidden = false;
    this.classifyBtn.disabled = true;
    this.resultsSection.hidden = true;

    try {
      // Initialize model if not already done
      if (!this.classifier.isReady()) {
        await this.classifier.initialize((status, progress) => {
          this.updateProgress(status, progress);
        });
      }

      // Initialize streaming table with all rows
      this.resultsRenderer.initialize(texts, labels, this.multiLabelCheckbox.checked);
      this.currentResults = [];

      // Classify texts one by one with streaming updates
      const template = this.labelManager.getTemplate();
      console.log('Starting classification with:', {
        template,
        labels: labels.map(l => l.name),
        textsCount: texts.length
      });

      // Process texts sequentially with DOM updates between each
      await new Promise<void>((resolve, reject) => {
        const processNextText = async (index: number) => {
          if (index >= texts.length) {
            // All done - clean up if needed
            if (!this.keepCachedCheckbox.checked) {
              await this.classifier.unload();
            }
            resolve();
            return;
          }

          try {
            const progress = 50 + ((index + 1) / texts.length) * 50;
            this.updateProgress(`Classifying ${index + 1}/${texts.length}...`, progress);

            // Classify single text
            const result = await this.classifier.classifyText(texts[index], labels, template);

            // Update row in table
            this.resultsRenderer.updateRow(index, result);

            // Store result
            this.currentResults.push(result);

            // Update progress in renderer
            this.resultsRenderer.updateProgress(index + 1, texts.length);

            // Yield control to browser for DOM update, then process next
            requestAnimationFrame(() => {
              processNextText(index + 1);
            });
          } catch (error) {
            reject(error);
          }
        };

        // Start processing
        processNextText(0);
      });

    } catch (error) {
      console.error('Classification failed:', error);
      alert(`Classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.progressContainer.hidden = true;
      this.classifyBtn.disabled = false;
    }
  }

  private updateProgress(status: string, progress: number): void {
    this.progressText.textContent = status;
    this.progressFill.style.width = `${progress}%`;
  }


  private exportResults(format: 'csv' | 'json'): void {
    if (this.currentResults.length === 0) {
      alert('No results to export');
      return;
    }

    const exportData: ExportData = {
      results: this.currentResults,
      labels: this.labelManager.getLabels(),
      multiLabel: this.multiLabelCheckbox.checked,
      timestamp: new Date().toISOString()
    };

    if (format === 'csv') {
      exportToCSV(exportData);
    } else {
      exportToJSON(exportData);
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ClassifierApp();
});

// Add some styling for empty state
const style = document.createElement('style');
style.textContent = `
  .empty-labels {
    text-align: center;
    padding: 2rem;
    color: var(--color-text-muted);
    font-style: italic;
  }
`;
document.head.appendChild(style);