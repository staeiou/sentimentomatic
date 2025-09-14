import './styles.css';
import { AnalyzerRegistry } from './analyzers';
import { MultiModelAnalyzer } from './analyzers/MultiModelAnalyzer';
import { StreamingAnalysisController } from './analysis/StreamingAnalysisController';
import { IncrementalTableRenderer } from './analysis/IncrementalTableRenderer';
import { CacheManager } from './models/CacheManager';
import { exportToCSV, exportToJSON, exportToExcel } from './utils/exportUtils';
import type { MultiModalAnalysisResult } from './analysis/AnalysisStrategy';
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";

class SentimentomaticApp {
  private analyzerRegistry: AnalyzerRegistry;
  private multiModelAnalyzer: MultiModelAnalyzer;
  private analysisController: StreamingAnalysisController;
  private cacheManager: CacheManager;
  private currentResult: MultiModalAnalysisResult | null = null;

  // UI Elements
  private editorView!: EditorView;
  private analyzeBtn!: HTMLInputElement;
  private resultsSection!: HTMLElement;
  private resultsTableContainer!: HTMLElement;
  
  // No more analysis type - all models are independent
  
  // Sentiment Analysis Controls
  private useAfinnCheckbox!: HTMLInputElement;
  private useVaderCheckbox!: HTMLInputElement;
  private useDistilbertCheckbox!: HTMLInputElement;
  private useTwitterRobertaCheckbox!: HTMLInputElement;
  private useFinancialCheckbox!: HTMLInputElement;
  private useMultilingualCheckbox!: HTMLInputElement;
  private useMultilingualStudentCheckbox!: HTMLInputElement;
  
  // Classification Controls (now checkboxes)
  private goEmotionsCheckbox!: HTMLInputElement;
  private koalaModerationCheckbox!: HTMLInputElement;
  private iptcNewsCheckbox!: HTMLInputElement;
  private languageDetectionCheckbox!: HTMLInputElement;
  private intentClassificationCheckbox!: HTMLInputElement;
  private toxicBertCheckbox!: HTMLInputElement;
  private jigsawToxicityCheckbox!: HTMLInputElement;
  private industryClassificationCheckbox!: HTMLInputElement;
  
  // Other Controls
  private cacheStatsElement!: HTMLElement;
  private clearCacheBtn!: HTMLButtonElement;
  private debugCacheBtn!: HTMLButtonElement;
  private keepModelsCachedCheckbox!: HTMLInputElement;
  private selectAllModelsBtn!: HTMLButtonElement;
  private clearModelsBtn!: HTMLButtonElement;
  private clearTextBtn!: HTMLButtonElement;
  private exportCsvBtn!: HTMLButtonElement;
  private exportExcelBtn!: HTMLButtonElement;
  private exportJsonBtn!: HTMLButtonElement;

  constructor() {
    this.analyzerRegistry = new AnalyzerRegistry();
    this.multiModelAnalyzer = new MultiModelAnalyzer(this.analyzerRegistry.getModelManager());
    this.cacheManager = new CacheManager();

    this.initializeElements();
    this.analysisController = new StreamingAnalysisController(
      this.analyzerRegistry,
      this.multiModelAnalyzer,
      this.resultsTableContainer
    );

    this.setupEventListeners();
    this.updateCacheStats();

    // Initialize modal styles for classification results
    IncrementalTableRenderer.initializeModalStyles();
  }

  private initializeElements(): void {
    // Initialize CodeMirror 6
    const defaultText = `Each line will be analyzed independently and given scores by various models.
THIS IS SO SUPER COOL AND THE BEST EVER! YES!
This means that lines are the units of analysis, no matter how many sentences. AWESOME! 😍
Ugh, I hate hate HATE trying to write examples, it's not fun! I'm not happy!
😢😠😢
Darkness cannot drive out darkness; only light can do that. Hate cannot drive out hate; only love can do that.
There are three kinds of lies: lies, damned lies, and statistics.
Facebook says sorry for shutting down page of French town of Bitche
u can def analyze slang w/ vader, its gr8! text analysis ftw!
Although a double negative in English implies a positive meaning, there is no language in which a double positive implies a negative.
Yeah, right.
Sentiment analysis is the perfect and foolproof method for every research project ever --- NOT!
Your items/lines can be up to 2,500 characters. Just make sure there are no newlines in your units of texts. Note that long texts (more than 250 words) can break VADER, and textblob handles longer texts better.`;

    const fixedHeightTheme = EditorView.theme({
      "&": { height: "400px" },
      ".cm-scroller": { overflow: "auto" }
    });

    this.editorView = new EditorView({
      state: EditorState.create({
        doc: defaultText,
        extensions: [basicSetup, fixedHeightTheme]
      }),
      parent: document.getElementById('text-input')!
    });

    this.analyzeBtn = document.getElementById('analyze-btn') as HTMLInputElement;
    this.resultsSection = document.getElementById('results-section') as HTMLElement;
    this.resultsTableContainer = document.getElementById('results-table') as HTMLElement;
    
    // No more separate analysis type controls - all models are unified
    
    // Sentiment analysis controls
    this.useAfinnCheckbox = document.getElementById('use-afinn') as HTMLInputElement;
    this.useVaderCheckbox = document.getElementById('use-vader') as HTMLInputElement;
    this.useDistilbertCheckbox = document.getElementById('use-distilbert') as HTMLInputElement;
    this.useTwitterRobertaCheckbox = document.getElementById('use-twitter-roberta') as HTMLInputElement;
    this.useFinancialCheckbox = document.getElementById('use-financial') as HTMLInputElement;
    this.useMultilingualCheckbox = document.getElementById('use-multilingual') as HTMLInputElement;
    this.useMultilingualStudentCheckbox = document.getElementById('use-multilingual-student') as HTMLInputElement;
    
    // Classification controls (now checkboxes)
    this.goEmotionsCheckbox = document.getElementById('use-goemotions') as HTMLInputElement;
    this.koalaModerationCheckbox = document.getElementById('use-koala-moderation') as HTMLInputElement;
    this.iptcNewsCheckbox = document.getElementById('use-iptc-news') as HTMLInputElement;
    this.languageDetectionCheckbox = document.getElementById('use-language-detection') as HTMLInputElement;
    this.intentClassificationCheckbox = document.getElementById('use-intent-classification') as HTMLInputElement;
    this.toxicBertCheckbox = document.getElementById('use-toxic-bert') as HTMLInputElement;
    this.jigsawToxicityCheckbox = document.getElementById('use-jigsaw-toxicity') as HTMLInputElement;
    this.industryClassificationCheckbox = document.getElementById('use-industry-classification') as HTMLInputElement;
    
    // Other controls
    this.cacheStatsElement = document.getElementById('cache-stats') as HTMLElement;
    this.clearCacheBtn = document.getElementById('clear-cache') as HTMLButtonElement; // Button exists in HTML
    this.debugCacheBtn = document.getElementById('debug-cache') as HTMLButtonElement;
    this.keepModelsCachedCheckbox = document.getElementById('keep-models-cached') as HTMLInputElement;
    this.selectAllModelsBtn = document.getElementById('select-all-models-btn') as HTMLButtonElement;
    this.clearModelsBtn = document.getElementById('clear-models-btn') as HTMLButtonElement;
    this.clearTextBtn = document.getElementById('clear-text-btn') as HTMLButtonElement;
    this.exportCsvBtn = document.getElementById('export-csv') as HTMLButtonElement;
    this.exportExcelBtn = document.getElementById('export-excel') as HTMLButtonElement;
    this.exportJsonBtn = document.getElementById('export-json') as HTMLButtonElement;
  }

  private setupEventListeners(): void {
    // Analyze button click handler
    this.analyzeBtn.addEventListener('click', () => {
      this.analyzeText();
    });

    // Export buttons
    this.exportCsvBtn.addEventListener('click', () => {
      if (this.currentResult) {
        exportToCSV(this.currentResult);
      }
    });
    this.exportExcelBtn.addEventListener('click', () => {
      if (this.currentResult) {
        exportToExcel(this.currentResult);
      }
    });
    this.exportJsonBtn.addEventListener('click', () => {
      if (this.currentResult) {
        exportToJSON(this.currentResult);
      }
    });

    // Cache management
    this.clearCacheBtn.addEventListener('click', async () => {
      console.log('Clear cache button clicked');
      await this.clearModelCache();
    });

    // Debug cache
    this.debugCacheBtn.addEventListener('click', async () => {
      await this.showCacheDebugModal();
    });

    // Select all models
    this.selectAllModelsBtn.addEventListener('click', () => {
      this.selectAllModels();
    });

    // Clear all models
    this.clearModelsBtn.addEventListener('click', () => {
      this.clearAllModels();
    });

    // Clear text
    this.clearTextBtn.addEventListener('click', () => {
      this.editorView.dispatch({
        changes: {
          from: 0,
          to: this.editorView.state.doc.length,
          insert: ''
        }
      });
      this.resultsSection.hidden = true;
    });

    // All models update together when any checkbox changes
    const allCheckboxes = [
      this.useAfinnCheckbox,
      this.useVaderCheckbox,
      this.useDistilbertCheckbox,
      this.useTwitterRobertaCheckbox,
      this.useFinancialCheckbox,
      this.useMultilingualCheckbox,
      this.useMultilingualStudentCheckbox,
      this.goEmotionsCheckbox,
      this.koalaModerationCheckbox,
      this.iptcNewsCheckbox,
      this.languageDetectionCheckbox,
      this.intentClassificationCheckbox,
      this.toxicBertCheckbox,
      this.jigsawToxicityCheckbox,
      this.industryClassificationCheckbox
    ];

    allCheckboxes.forEach(checkbox => {
      if (checkbox) {
        checkbox.addEventListener('change', async () => {
          this.updateAllModelSelections();
          await this.updateDownloadSizeDisplay();
        });
      }
    });

    // Initial download size display
    this.updateDownloadSizeDisplay().catch(console.error);
  }

  // No more mode switching - removed switchToMode method

  private updateAllModelSelections(): void {
    // Clear multimodel analyzer
    this.multiModelAnalyzer.clearAllModels();
    
    // Add all selected models (both sentiment and classification)
    const allModelMappings = [
      // Sentiment models
      { checkbox: this.useDistilbertCheckbox, id: 'distilbert', hfId: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', name: 'DistilBERT SST-2' },
      { checkbox: this.useTwitterRobertaCheckbox, id: 'twitter-roberta', hfId: 'Xenova/twitter-roberta-base-sentiment-latest', name: 'Twitter RoBERTa' },
      { checkbox: this.useFinancialCheckbox, id: 'financial', hfId: 'Xenova/finbert', name: 'Financial DistilRoBERTa' },
      { checkbox: this.useMultilingualCheckbox, id: 'multilingual', hfId: 'Xenova/bert-base-multilingual-uncased-sentiment', name: 'Multilingual BERT' },
      { checkbox: this.useMultilingualStudentCheckbox, id: 'multilingual-student', hfId: 'Xenova/distilbert-base-multilingual-cased-sentiments-student', name: 'Multilingual DistilBERT' },
      // Classification models
      { checkbox: this.goEmotionsCheckbox, id: 'go-emotions', hfId: 'SamLowe/roberta-base-go_emotions-onnx', name: 'GoEmotions' },
      { checkbox: this.koalaModerationCheckbox, id: 'text-moderation', hfId: 'KoalaAI/Text-Moderation', name: 'KoalaAI Moderation' },
      { checkbox: this.iptcNewsCheckbox, id: 'iptc-news', hfId: 'onnx-community/multilingual-IPTC-news-topic-classifier-ONNX', name: 'IPTC News' },
      { checkbox: this.languageDetectionCheckbox, id: 'language-detection', hfId: 'protectai/xlm-roberta-base-language-detection-onnx', name: 'Language Detection' },
      { checkbox: this.intentClassificationCheckbox, id: 'intent-classification', hfId: 'kousik-2310/intent-classifier-minilm', name: 'Intent Classification' },
      { checkbox: this.toxicBertCheckbox, id: 'toxic-bert', hfId: 'Xenova/toxic-bert', name: 'Toxic BERT' },
      { checkbox: this.jigsawToxicityCheckbox, id: 'jigsaw-toxicity', hfId: 'minuva/MiniLMv2-toxic-jigsaw-onnx', name: 'Jigsaw Toxicity' },
      { checkbox: this.industryClassificationCheckbox, id: 'industry-classification', hfId: 'sabatale/industry-classification-api-onnx', name: 'Industry Classification' }
    ];

    allModelMappings.forEach(({ checkbox, id, hfId, name }) => {
      if (checkbox?.checked) {
        this.multiModelAnalyzer.addModel(id, hfId, name);
      }
    });
  }

  private async analyzeText(): Promise<void> {
    const text = this.editorView.state.doc.toString().trim();
    if (!text) {
      alert('Please enter some text to analyze');
      return;
    }

    const lines = text.split('\n').filter((line: string) => line.trim());
    if (lines.length === 0) {
      alert('Please enter some text to analyze');
      return;
    }

    try {
      // Update all model selections before analysis
      this.updateAllModelSelections();

      // Prepare configuration with all selected models
      const config = {
        selectedRuleBasedAnalyzers: this.getSelectedRuleBasedAnalyzers(),
        selectedHuggingFaceModels: this.multiModelAnalyzer.getEnabledModelIds(),
        keepModelsCached: this.keepModelsCachedCheckbox.checked
      };

      // Check if any models are selected and show download confirmation
      if (config.selectedHuggingFaceModels.length > 0 || config.selectedRuleBasedAnalyzers.length > 0) {
        const modelsToDownload = await this.getModelDownloadInfo(config.selectedHuggingFaceModels);
        const confirmed = await IncrementalTableRenderer.showDownloadConfirmation(modelsToDownload);

        if (!confirmed) {
          console.log('User cancelled download');
          return;
        }
      }

      // Show results section immediately and scroll to top of results
      this.resultsSection.hidden = false;
      setTimeout(() => {
        this.resultsSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);

      // Create progress log area if it doesn't exist
      this.showProgressLog();
      
      // Perform streaming analysis
      const result = await this.analysisController.analyzeWithStreaming(
        lines,
        config,
        (status: string, progress: number) => {
          // Show progress in UI
          this.updateProgressLog(status, progress);
          console.log(`${status} - ${Math.round(progress)}%`);
        }
      );

      // Store results for export functionality
      this.currentResult = result;

      // Refresh cache status display after analysis completes (with delay to ensure cache is written)
      console.log('🔄 Refreshing cache status in 3 seconds...');
      setTimeout(async () => {
        await this.updateDownloadSizeDisplay();
        await this.updateCacheStats(); // Also update cache stats
        console.log('✅ Cache status refreshed after analysis');
      }, 3000); // 3 second delay to allow all cache operations to complete

      console.log('✅ Analysis complete');

    } catch (error) {
      console.error('❌ Analysis failed:', error);
      this.resultsTableContainer.innerHTML = `<div class="error">Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
    }
  }

  private getSelectedRuleBasedAnalyzers(): string[] {
    const selected: string[] = [];
    if (this.useAfinnCheckbox.checked) selected.push('afinn');
    if (this.useVaderCheckbox.checked) selected.push('vader');
    return selected;
  }

  private async getModelDownloadInfo(selectedModelIds: string[]): Promise<Array<{name: string, size: number, huggingFaceId: string, cached: boolean}>> {
    const models = [];
    const enabledModels = this.multiModelAnalyzer.getEnabledModels();
    const selectedRuleBased = this.getSelectedRuleBasedAnalyzers();

    // Add rule-based models with 1MB size each (always considered "cached" since they're local)
    for (const analyzer of selectedRuleBased) {
      models.push({
        name: analyzer.toUpperCase(),
        size: 1 * 1024 * 1024, // 1MB in bytes
        huggingFaceId: `Rule-based ${analyzer} analyzer`,
        cached: true // Rule-based models are always available locally
      });
    }

    // Add neural network models with their estimated sizes and ACTUAL cache status
    for (const modelId of selectedModelIds) {
      const modelInfo = enabledModels.get(modelId);
      if (modelInfo) {
        const estimatedSizeMB = this.cacheManager.estimateModelSize(modelInfo.huggingFaceId);

        // Check actual browser cache instead of just localStorage metadata
        const isCached = await this.cacheManager.isModelActuallyCached(modelInfo.huggingFaceId);

        models.push({
          name: modelInfo.displayName,
          size: estimatedSizeMB * 1024 * 1024, // Convert MB to bytes
          huggingFaceId: modelInfo.huggingFaceId,
          cached: isCached
        });
      }
    }

    return models;
  }

  private formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  }

  private selectAllModels(): void {
    // Check all model checkboxes
    const allCheckboxes = [
      this.useAfinnCheckbox,
      this.useVaderCheckbox,
      this.useDistilbertCheckbox,
      this.useTwitterRobertaCheckbox,
      this.useFinancialCheckbox,
      this.useMultilingualCheckbox,
      this.useMultilingualStudentCheckbox,
      this.goEmotionsCheckbox,
      this.koalaModerationCheckbox,
      this.iptcNewsCheckbox,
      this.languageDetectionCheckbox,
      this.intentClassificationCheckbox,
      this.toxicBertCheckbox,
      this.jigsawToxicityCheckbox,
      this.industryClassificationCheckbox
    ];

    allCheckboxes.forEach(checkbox => {
      if (checkbox) {
        checkbox.checked = true;
      }
    });

    // Update model selections and download size
    this.updateAllModelSelections();
    this.updateDownloadSizeDisplay().catch(console.error);
  }

  private clearAllModels(): void {
    // Uncheck all model checkboxes
    const allCheckboxes = [
      this.useAfinnCheckbox,
      this.useVaderCheckbox,
      this.useDistilbertCheckbox,
      this.useTwitterRobertaCheckbox,
      this.useFinancialCheckbox,
      this.useMultilingualCheckbox,
      this.useMultilingualStudentCheckbox,
      this.goEmotionsCheckbox,
      this.koalaModerationCheckbox,
      this.iptcNewsCheckbox,
      this.languageDetectionCheckbox,
      this.intentClassificationCheckbox,
      this.toxicBertCheckbox,
      this.jigsawToxicityCheckbox,
      this.industryClassificationCheckbox
    ];

    allCheckboxes.forEach(checkbox => {
      if (checkbox) {
        checkbox.checked = false;
      }
    });

    // Update model selections and download size display
    this.updateAllModelSelections();
    this.updateDownloadSizeDisplay().catch(console.error);
  }

  private async updateDownloadSizeDisplay(): Promise<void> {
    // Update model selections to get current enabled models
    this.updateAllModelSelections();

    const config = {
      selectedRuleBasedAnalyzers: this.getSelectedRuleBasedAnalyzers(),
      selectedHuggingFaceModels: this.multiModelAnalyzer.getEnabledModelIds()
    };

    const modelsInfo = await this.getModelDownloadInfo(config.selectedHuggingFaceModels);

    // Separate cached and non-cached models
    const cachedModels = modelsInfo.filter(m => m.cached);
    const modelsToDownload = modelsInfo.filter(m => !m.cached);
    const downloadSize = modelsToDownload.reduce((sum, model) => sum + model.size, 0);
    const totalSize = modelsInfo.reduce((sum, model) => sum + model.size, 0);

    // Find or create download size display element
    let sizeDisplay = document.querySelector('.download-size-display') as HTMLElement;
    if (!sizeDisplay) {
      sizeDisplay = document.createElement('div');
      sizeDisplay.className = 'download-size-display';

      // Insert right before the action bar
      const actionBar = document.querySelector('.action-bar');
      if (actionBar && actionBar.parentNode) {
        actionBar.parentNode.insertBefore(sizeDisplay, actionBar);
      }
    }

    if (modelsInfo.length > 0) {
      const totalModelsCount = modelsInfo.length;
      const cachedCount = cachedModels.length;

      if (downloadSize > 0) {
        // Some models need downloading
        sizeDisplay.innerHTML = `
          <div class="size-info">
            <span class="size-label">Download Needed:</span>
            <span class="size-value">${this.formatSize(downloadSize)}</span>
            <span class="model-counts">(${cachedCount}/${totalModelsCount} models cached)</span>
          </div>
        `;
      } else {
        // All models are cached
        sizeDisplay.innerHTML = `
          <div class="size-info">
            <span class="size-label">All Cached:</span>
            <span class="size-value cached">${this.formatSize(totalSize)}</span>
            <span class="model-counts">✅ No download needed</span>
          </div>
        `;
      }
      sizeDisplay.style.display = 'block';
    } else {
      sizeDisplay.style.display = 'none';
    }
  }

  private async showCacheDebugModal(): Promise<void> {
    try {
      // Check if Cache API is available
      if (!('caches' in window)) {
        alert('Cache API not available in this browser/context');
        return;
      }

      // Get all cache names available
      const cacheNames = await caches.keys();

      // Check ALL caches for any files
      let allCacheContents: {[cacheName: string]: string[]} = {};
      let totalCachedFiles = 0;

      for (const cacheName of cacheNames) {
        try {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          const urls = keys.map(req => req.url);
          allCacheContents[cacheName] = urls;
          totalCachedFiles += urls.length;
        } catch (error) {
          allCacheContents[cacheName] = [`Error: ${error}`];
        }
      }

      // Get transformers-cache contents specifically
      let transformersCacheFiles: string[] = [];
      let transformersCacheSize = 0;

      try {
        const cache = await caches.open('transformers-cache');
        const keys = await cache.keys();
        transformersCacheFiles = keys.map(req => req.url);

        // Calculate approximate size
        for (const req of keys) {
          const resp = await cache.match(req);
          if (resp) {
            const contentLength = resp.headers.get('content-length');
            if (contentLength) {
              transformersCacheSize += parseInt(contentLength);
            }
          }
        }
      } catch (error) {
        console.warn('Could not access transformers-cache:', error);
      }

      // localStorage cache metadata removed - now using browser cache directly

      const modalHtml = `
        <div class="cache-debug-overlay" onclick="event.target === this && this.remove()">
          <div class="cache-debug-modal" onclick="event.stopPropagation()">
            <div class="modal-header">
              <h3>🔍 Cache Debug - Raw Data</h3>
              <button class="modal-close" onclick="this.closest('.cache-debug-overlay').remove();">×</button>
            </div>
            <div class="modal-body">
              <div class="cache-section">
                <h4>ALL Cache Contents (${totalCachedFiles} total files across ${cacheNames.length} caches)</h4>
                <pre>${JSON.stringify(allCacheContents, null, 2)}</pre>
              </div>

              <div class="cache-section">
                <h4>transformers-cache Specific (${transformersCacheFiles.length} files, ~${this.formatSize(transformersCacheSize)})</h4>
                <div class="file-list">
                  ${transformersCacheFiles.length > 0
                    ? transformersCacheFiles.map(url => `<div class="file-url">${url}</div>`).join('')
                    : '<div class="no-files">❌ EMPTY - This is the problem!</div>'
                  }
                </div>
              </div>

              <div class="cache-section">
                <h4>Cache System</h4>
                <p>Now using browser cache directly - no localStorage metadata</p>
              </div>

              <div class="cache-section">
                <h4>Current Model Detection Results</h4>
                ${await this.debugCurrentModels()}
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" onclick="this.closest('.cache-debug-overlay').remove();">Close</button>
              <button class="btn btn-primary" onclick="window.location.reload();">Refresh Page</button>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHtml);

    } catch (error) {
      console.error('Failed to show cache debug modal:', error);
      alert(`Cache debug failed: ${error}`);
    }
  }

  private async debugCurrentModels(): Promise<string> {
    const config = {
      selectedRuleBasedAnalyzers: this.getSelectedRuleBasedAnalyzers(),
      selectedHuggingFaceModels: this.multiModelAnalyzer.getEnabledModelIds()
    };

    let debugHtml = '<div class="model-debug">';

    // Open the cache to calculate actual sizes
    const cache = await caches.open('transformers-cache');
    const allKeys = await cache.keys();

    for (const modelId of config.selectedHuggingFaceModels) {
      const modelInfo = this.multiModelAnalyzer.getEnabledModels().get(modelId);
      if (modelInfo) {
        const isCached = await this.cacheManager.isModelActuallyCached(modelInfo.huggingFaceId);

        // Calculate ACTUAL size from cache
        let actualSize = 0;
        for (const req of allKeys) {
          if (req.url.includes(modelInfo.huggingFaceId)) {
            const resp = await cache.match(req);
            if (resp) {
              const contentLength = resp.headers.get('content-length');
              if (contentLength) {
                actualSize += parseInt(contentLength);
              } else {
                // If no content-length header, try to get blob size
                try {
                  const blob = await resp.blob();
                  actualSize += blob.size;
                } catch (e) {
                  console.warn('Could not get size for', req.url);
                }
              }
            }
          }
        }

        debugHtml += `
          <div class="model-debug-item">
            <strong>${modelInfo.displayName}</strong><br>
            HF ID: ${modelInfo.huggingFaceId}<br>
            Actual Cache Size: ${actualSize > 0 ? this.formatSize(actualSize) : 'Not cached'}<br>
            Detected as cached: ${isCached ? '✅ YES' : '❌ NO'}
          </div>
        `;
      }
    }

    debugHtml += '</div>';
    return debugHtml;
  }

  // Classification models are now part of the unified selection
  // Removed getSelectedClassificationModel method

  private async updateCacheStats(): Promise<void> {
    try {
      console.log('🔄 Updating cache stats...');
      const stats = await this.cacheManager.getCacheStats();
      console.log('📊 Cache stats:', stats);

      const sizeSpan = this.cacheStatsElement.querySelector('.cache-size');
      console.log('📍 Size span element:', sizeSpan);

      if (sizeSpan) {
        const sizeText = `${(stats.totalSize / (1024 * 1024)).toFixed(1)} MB used`;
        sizeSpan.textContent = sizeText;
        console.log('✅ Updated cache display to:', sizeText);
      } else {
        console.error('❌ Could not find .cache-size element');
      }
    } catch (error) {
      console.warn('Failed to update cache stats:', error);
    }
  }

  private async clearModelCache(): Promise<void> {
    try {
      // Show feedback immediately
      if (this.clearCacheBtn) {
        this.clearCacheBtn.disabled = true;
        this.clearCacheBtn.textContent = 'Clearing...';
      }
      
      console.log('🧹 Clearing model cache...');
      await this.cacheManager.clearCache();

      // Clear loaded models from memory too
      this.multiModelAnalyzer.clearAllModels();

      // Force immediate cache stats update
      console.log('🔄 Updating cache stats after clear...');
      await this.updateCacheStats();

      // Also update download size display
      await this.updateDownloadSizeDisplay();
      
      // Show success feedback
      if (this.clearCacheBtn) {
        this.clearCacheBtn.textContent = '✅ Cleared!';
        setTimeout(() => {
          this.clearCacheBtn.textContent = 'Clear Cache';
          this.clearCacheBtn.disabled = false;
        }, 2000);
      }
      
      console.log('✅ Model cache cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
      
      // Show error feedback
      if (this.clearCacheBtn) {
        this.clearCacheBtn.textContent = '❌ Failed';
        setTimeout(() => {
          this.clearCacheBtn.textContent = 'Clear Cache';
          this.clearCacheBtn.disabled = false;
        }, 2000);
      }
    }
  }

  private showProgressLog(): void {
    // Check if progress log already exists
    let progressLog = document.getElementById('progress-log');
    if (!progressLog) {
      // Create simple progress log area
      const logHtml = `
        <div id="progress-log" class="progress-log">
          <div class="progress-bar-container">
            <div class="progress-bar" id="progress-bar" style="width: 0%"></div>
          </div>
          <div class="progress-status" id="progress-status">Ready to analyze...</div>
        </div>
      `;
      
      // Insert before results table
      this.resultsTableContainer.insertAdjacentHTML('beforebegin', logHtml);
      progressLog = document.getElementById('progress-log');
    }
    
    // Show and scroll to it
    if (progressLog) {
      progressLog.style.display = 'block';
      progressLog.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  private updateProgressLog(status: string, progress: number): void {
    // Only show model loading logs, not line-by-line analysis
    if (status.includes('Analyzing line')) {
      return; // Skip line analysis logs
    }
    
    const progressBar = document.getElementById('progress-bar') as HTMLElement;
    const progressStatus = document.getElementById('progress-status') as HTMLElement;
    
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
      progressBar.style.background = progress < 100 
        ? 'linear-gradient(90deg, #4F46E5, #7C3AED)' 
        : '#28a745';
    }
    
    if (progressStatus) {
      // Just show the current status with an icon
      let icon = '⏳';
      if (status.includes('Loading') || status.includes('Initializing')) icon = '📦';
      if (status.includes('complete')) icon = '✅';
      if (status.includes('Failed') || status.includes('Error')) icon = '❌';
      
      progressStatus.innerHTML = `${icon} ${status}`;
    }
  }
}

// Initialize the application
new SentimentomaticApp();
console.log('🚀 Sentimentomatic application initialized');