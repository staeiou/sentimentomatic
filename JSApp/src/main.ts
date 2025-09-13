import './style-compact.css';
import { AnalyzerRegistry } from './analyzers';
import { MultiModelAnalyzer } from './analyzers/MultiModelAnalyzer';
import { StreamingAnalysisController } from './analysis/StreamingAnalysisController';
import { CacheManager } from './models/CacheManager';
// Line numbering handled by HTML event handlers and global functions
import { exportToCSV, exportToJSON } from './utils/exportUtils';
import type { MultiModalAnalysisResult } from './analysis/AnalysisStrategy';

class SentimentomaticApp {
  private analyzerRegistry: AnalyzerRegistry;
  private multiModelAnalyzer: MultiModelAnalyzer;
  private analysisController: StreamingAnalysisController;
  private cacheManager: CacheManager;
  private currentResult: MultiModalAnalysisResult | null = null;

  // UI Elements
  private textInput!: HTMLTextAreaElement;
  // Line numbers handled by global functions
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
  private covidMisinfoCheckbox!: HTMLInputElement;
  private imdbSentimentCheckbox!: HTMLInputElement;
  
  // Other Controls
  private cacheStatsElement!: HTMLElement;
  private clearCacheBtn!: HTMLButtonElement;
  private clearTextBtn!: HTMLButtonElement;
  private exportCsvBtn!: HTMLButtonElement;
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
    this.loadStylesheet();
    this.updateCacheStats();
  }

  private initializeElements(): void {
    // Main elements
    this.textInput = document.getElementById('text-input') as HTMLTextAreaElement;
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
    this.covidMisinfoCheckbox = document.getElementById('use-covid-misinfo') as HTMLInputElement;
    this.imdbSentimentCheckbox = document.getElementById('use-imdb-sentiment') as HTMLInputElement;
    
    // Other controls
    this.cacheStatsElement = document.getElementById('cache-stats') as HTMLElement;
    this.clearCacheBtn = document.getElementById('clear-cache') as HTMLButtonElement; // Button exists in HTML
    this.clearTextBtn = document.getElementById('clear-text-btn') as HTMLButtonElement;
    this.exportCsvBtn = document.getElementById('export-csv') as HTMLButtonElement;
    this.exportJsonBtn = document.getElementById('export-json') as HTMLButtonElement;
  }

  private setupEventListeners(): void {
    // Line numbering is handled by HTML event handlers now, like Flask

    // No more mode switching - all models work together

    // Analyze button - prevent form submission and handle click
    this.analyzeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.analyzeText();
    });

    // Also prevent form submission
    const form = document.querySelector('form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.analyzeText();
      });
    }

    // Export buttons
    this.exportCsvBtn.addEventListener('click', () => {
      if (this.currentResult) {
        exportToCSV(this.currentResult);
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
    
    // Clear text
    this.clearTextBtn.addEventListener('click', () => {
      this.textInput.value = '';
      window.input_changed(this.textInput);
      this.resultsSection.style.display = 'none';
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
      this.covidMisinfoCheckbox,
      this.imdbSentimentCheckbox
    ];
    
    allCheckboxes.forEach(checkbox => {
      if (checkbox) {
        checkbox.addEventListener('change', () => this.updateAllModelSelections());
      }
    });
  }

  // No more mode switching - removed switchToMode method

  private updateAllModelSelections(): void {
    // Clear multimodel analyzer
    this.multiModelAnalyzer.clearAllModels();
    
    // Add all selected models (both sentiment and classification)
    const allModelMappings = [
      // Sentiment models
      { checkbox: this.useDistilbertCheckbox, id: 'distilbert', hfId: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', name: 'DistilBERT SST-2' },
      { checkbox: this.useTwitterRobertaCheckbox, id: 'twitter-roberta', hfId: 'cardiffnlp/twitter-roberta-base-sentiment-latest', name: 'Twitter RoBERTa' },
      { checkbox: this.useFinancialCheckbox, id: 'financial', hfId: 'ProsusAI/finbert', name: 'Financial DistilRoBERTa' },
      { checkbox: this.useMultilingualCheckbox, id: 'multilingual', hfId: 'Xenova/bert-base-multilingual-uncased-sentiment', name: 'Multilingual BERT' },
      { checkbox: this.useMultilingualStudentCheckbox, id: 'multilingual-student', hfId: 'Xenova/distilbert-base-multilingual-cased-sentiments-student', name: 'Multilingual DistilBERT' },
      // Classification models
      { checkbox: this.goEmotionsCheckbox, id: 'go-emotions', hfId: 'SamLowe/roberta-base-go_emotions-onnx', name: 'GoEmotions' },
      { checkbox: this.koalaModerationCheckbox, id: 'text-moderation', hfId: 'KoalaAI/Text-Moderation', name: 'KoalaAI Moderation' },
      { checkbox: this.iptcNewsCheckbox, id: 'iptc-news', hfId: 'onnx-community/multilingual-IPTC-news-topic-classifier-ONNX', name: 'IPTC News' },
      { checkbox: this.covidMisinfoCheckbox, id: 'covid-misinfo', hfId: 'spencer-gable-cook/COVID-19_Misinformation_Detector', name: 'COVID Misinfo' },
      { checkbox: this.imdbSentimentCheckbox, id: 'imdb-sentiment', hfId: 'pitangent-ds/distilbert-base-imdb', name: 'IMDB Sentiment' }
    ];

    allModelMappings.forEach(({ checkbox, id, hfId, name }) => {
      if (checkbox?.checked) {
        this.multiModelAnalyzer.addModel(id, hfId, name);
      }
    });
  }

  private async analyzeText(): Promise<void> {
    const text = this.textInput.value.trim();
    if (!text) {
      alert('Please enter some text to analyze');
      return;
    }

    const lines = text.split('\n').filter(line => line.trim());
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
        selectedHuggingFaceModels: this.multiModelAnalyzer.getEnabledModelIds()
      };

      // Show results section immediately and scroll to very bottom
      this.resultsSection.style.display = 'block';
      setTimeout(() => {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'smooth'
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

  // Classification models are now part of the unified selection
  // Removed getSelectedClassificationModel method

  private loadStylesheet(): void {
    // Stylesheet already loaded in index.html
  }

  private async updateCacheStats(): Promise<void> {
    try {
      const stats = await this.cacheManager.getCacheStats();
      const sizeSpan = this.cacheStatsElement.querySelector('.cache-size');
      if (sizeSpan) {
        sizeSpan.textContent = `${(stats.totalSize / (1024 * 1024)).toFixed(1)} MB used`;
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
      
      await this.updateCacheStats();
      
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