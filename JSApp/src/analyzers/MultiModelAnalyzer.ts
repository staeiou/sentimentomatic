import type { SentimentAnalyzer, SentimentResult } from '../types';
import { ModelManager } from '../models/ModelManager';
import { CacheManager } from '../models/CacheManager';
import { WorkerModelManager, getWorkerModelManager } from '../models/WorkerModelManager';

interface HuggingFaceModel {
  id: string;
  huggingFaceId: string;
  displayName: string;
}

export class MultiModelAnalyzer implements SentimentAnalyzer {
  readonly name = 'HuggingFace Models';
  readonly type = 'ml' as const;

  private modelManager: ModelManager;
  private cacheManager: CacheManager;
  private enabledModels: Map<string, HuggingFaceModel> = new Map();
  private loadedPipelines: Map<string, any> = new Map();
  private workerManager: WorkerModelManager | null = null;
  private useWorker: boolean = false;

  constructor(modelManager: ModelManager, options?: { useWorker?: boolean }) {
    this.modelManager = modelManager;
    this.cacheManager = new CacheManager();
    this.useWorker = options?.useWorker ?? false;

    if (this.useWorker) {
      console.log('🔧 MultiModelAnalyzer configured to use Web Worker for complete memory cleanup');
    }
  }

  /**
   * Add a HuggingFace model to the enabled set
   */
  addModel(id: string, huggingFaceId: string, displayName?: string): void {
    this.enabledModels.set(id, {
      id,
      huggingFaceId,
      displayName: displayName || id
    });
    console.log(`➕ Added model: ${displayName || id} (${huggingFaceId})`);
  }

  /**
   * Remove a model from the enabled set
   */
  removeModel(id: string): void {
    this.enabledModels.delete(id);
    this.loadedPipelines.delete(id);
    console.log(`➖ Removed model: ${id}`);
  }

  clearAllModels(): void {
    this.enabledModels.clear();
    this.loadedPipelines.clear();
    console.log(`🧹 Cleared all models`);
  }

  /**
   * Get list of enabled model IDs
   */
  getEnabledModelIds(): string[] {
    return Array.from(this.enabledModels.keys());
  }

  /**
   * Check if any models are enabled
   */
  hasEnabledModels(): boolean {
    return this.enabledModels.size > 0;
  }

  /**
   * Get enabled models
   */
  getEnabledModels(): Map<string, HuggingFaceModel> {
    return new Map(this.enabledModels);
  }

  /**
   * Initialize worker for memory-efficient processing
   */
  async initializeWorker(): Promise<void> {
    if (!this.useWorker) {
      return;
    }

    console.log('🚀 Initializing transformers.js worker for complete memory management...');
    this.workerManager = getWorkerModelManager();
    await this.workerManager.initializeWorker();
    console.log('✅ Worker initialized - models will run in isolated context');
  }

  /**
   * Terminate worker to completely free all memory
   */
  async terminateWorker(): Promise<void> {
    if (!this.useWorker || !this.workerManager) {
      return;
    }

    console.log('💥 Terminating worker to FREE ALL MEMORY...');
    await this.workerManager.terminateWorker();
    this.workerManager = null;
    this.loadedPipelines.clear(); // Clear tracking since worker is gone
    console.log('✅ Worker terminated - ALL MODEL MEMORY FREED');
  }

  /**
   * Initialize a single model for memory-efficient processing
   */
  async initializeSingleModel(modelId: string, progressCallback?: (status: string, progress: number) => void): Promise<void> {
    const model = this.enabledModels.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found in enabled models`);
    }

    // Skip if already loaded
    if (this.loadedPipelines.has(modelId)) {
      console.log(`✅ ${model.displayName} already loaded`);
      return;
    }

    console.log(`📦 Loading single model: ${model.displayName}...`);
    progressCallback?.(`Loading ${model.displayName}...`, 0);

    try {
      // Use worker if enabled
      if (this.useWorker) {
        // Ensure worker is initialized
        if (!this.workerManager) {
          this.workerManager = getWorkerModelManager();
          await this.workerManager.initializeWorker();
        }
        // Determine task type for the model
        const task = this.getTaskForModel(model.huggingFaceId);
        await this.workerManager.loadModel(model.id, model.huggingFaceId, task);
        this.loadedPipelines.set(model.id, 'worker'); // Mark as loaded in worker
      } else {
        // Original non-worker path
        const modelConfig = {
          id: model.id,
          name: model.displayName,
          description: `Custom HuggingFace model: ${model.huggingFaceId}`,
          provider: 'transformers' as const,
          size: 'Unknown',
          speed: 'medium' as const,
          accuracy: 'unknown' as const,
          languages: ['en'],
          huggingFaceId: model.huggingFaceId,
          metadata: {
            architecture: 'Unknown',
            framework: 'transformers.js'
          }
        };

        (this.modelManager as any).tempModelConfigs = (this.modelManager as any).tempModelConfigs || new Map();
        (this.modelManager as any).tempModelConfigs.set(model.id, modelConfig);

        const pipeline = await this.modelManager.loadModel(model.id);
        this.loadedPipelines.set(model.id, pipeline);
      }

      console.log(`✅ ${model.displayName} loaded successfully`);
      progressCallback?.(`✅ Loaded ${model.displayName}`, 100);
    } catch (error) {
      console.error(`❌ Failed to load ${model.displayName}:`, error);
      progressCallback?.(`Failed to load ${model.displayName}`, 0);
      throw error;
    }
  }

  /**
   * Determine the task type for a model
   */
  private getTaskForModel(huggingFaceId: string): string {
    if (huggingFaceId.includes('sentiment') || huggingFaceId.includes('sst') || huggingFaceId.includes('imdb')) {
      return 'sentiment-analysis';
    }
    return 'text-classification';
  }

  /**
   * Unload a single model and clear its cache to free memory
   */
  async unloadSingleModel(modelId: string): Promise<void> {
    const model = this.enabledModels.get(modelId);
    const modelName = model ? model.displayName : modelId;

    console.log(`🗑️ Unloading ${modelName} to free memory...`);

    // Get pipeline before deleting for proper cleanup
    const pipeline = this.loadedPipelines.get(modelId);
    if (pipeline) {
      // Clear any references in the pipeline object
      if (typeof pipeline === 'object') {
        Object.keys(pipeline).forEach(key => {
          pipeline[key] = null;
        });
      }
    }

    // Remove from loaded pipelines FIRST
    this.loadedPipelines.delete(modelId);

    // Then unload from model manager (which will dispose tensors)
    await this.modelManager.unloadModel(modelId);

    // Force garbage collection hint if available
    if (typeof (globalThis as any).gc === 'function') {
      try {
        (globalThis as any).gc();
        console.log(`🧹 Triggered garbage collection for ${modelName}`);
      } catch (error) {
        // Ignore GC errors
      }
    }

    console.log(`✅ ${modelName} fully unloaded from memory`);
  }

  /**
   * Get the cache manager for updating cache status
   */
  getCacheManager() {
    return this.cacheManager;
  }

  /**
   * Unload ALL models and clear all caches to free memory
   * Should be called before starting a new analysis to prevent memory accumulation
   */
  async unloadAllModels(): Promise<void> {
    console.log('🧹 Unloading all models from memory...');

    // Get all loaded pipeline IDs
    const loadedIds = Array.from(this.loadedPipelines.keys());

    // Unload each model
    for (const modelId of loadedIds) {
      try {
        await this.unloadSingleModel(modelId);
      } catch (error) {
        console.warn(`Failed to unload ${modelId}:`, error);
      }
    }

    // Clear the pipelines map completely
    this.loadedPipelines.clear();

    // Also clear from model manager
    for (const modelId of this.enabledModels.keys()) {
      try {
        await this.modelManager.unloadModel(modelId);
      } catch (error) {
        // Ignore errors
      }
    }

    // Force garbage collection if available
    if (typeof (globalThis as any).gc === 'function') {
      try {
        (globalThis as any).gc();
        console.log('🧹 Triggered garbage collection');
      } catch (error) {
        // Ignore GC errors
      }
    }

    console.log('✅ All models unloaded from memory');
  }

  /**
   * Detect model type based on output labels and structure
   */
  private detectModelType(output: Array<{label: string, score: number}>): 'sentiment' | 'multi-label' | 'multi-class' | 'moderation' {
    if (!output || output.length === 0) return 'multi-class';

    const labels = output.map(o => o.label.toLowerCase());

    // Check for sentiment models (binary or ternary)
    if (output.length <= 3 &&
        (labels.some(l => l.includes('pos') || l.includes('neg')) ||
         labels.includes('neutral'))) {
      return 'sentiment';
    }

    // Check for emotion models (GoEmotions has 28 emotions)
    const emotionLabels = ['joy', 'anger', 'fear', 'sadness', 'love', 'surprise',
                          'admiration', 'approval', 'annoyance', 'gratitude',
                          'desire', 'excitement', 'optimism', 'pride', 'relief'];
    if (labels.some(l => emotionLabels.includes(l))) {
      return 'multi-label';
    }

    // Check for toxicity models (multiple can be active)
    const toxicityLabels = ['toxic', 'severe_toxic', 'obscene', 'threat',
                           'insult', 'identity_hate', 'identity_attack'];
    if (labels.some(l => toxicityLabels.some(tox => l.includes(tox)))) {
      return 'multi-label';
    }

    // Check for moderation models (KoalaAI)
    if (labels.some(l => ['ok', 's', 'h', 'v', 'hr', 'sh', 's3', 'h2', 'v2'].includes(l))) {
      return 'moderation';
    }

    // Language detection (2-letter codes)
    if (labels.every(l => l.length === 2 || l.length === 3)) {
      return 'multi-class';
    }

    // Default to multi-class for everything else
    return 'multi-class';
  }

  /**
   * Get ALL predictions from a model (not just top one)
   */
  async getAllPredictions(text: string, modelId: string): Promise<Array<{label: string, score: number}> | null> {
    const model = this.enabledModels.get(modelId);
    if (!model) {
      return null;
    }

    try {
      let pipeline = this.loadedPipelines.get(model.id);
      if (!pipeline) {
        // Load the model if not cached
        const modelConfig = {
          id: model.id,
          name: model.displayName,
          description: `Custom HuggingFace model: ${model.huggingFaceId}`,
          provider: 'transformers' as const,
          size: 'Unknown',
          speed: 'medium' as const,
          accuracy: 'unknown' as const,
          languages: ['en'],
          huggingFaceId: model.huggingFaceId,
          metadata: {
            architecture: 'Unknown',
            framework: 'transformers.js'
          }
        };

        (this.modelManager as any).tempModelConfigs = (this.modelManager as any).tempModelConfigs || new Map();
        (this.modelManager as any).tempModelConfigs.set(model.id, modelConfig);
        
        pipeline = await this.modelManager.loadModel(model.id);
        this.loadedPipelines.set(model.id, pipeline);
      }

      // Get raw result from pipeline - request ALL class probabilities
      const result = await pipeline(text, {
        top_k: null,  // Return all classes
        return_all_scores: true
      });

      // Apply KoalaAI label mapping if needed
      let processedResult = Array.isArray(result) ? result : [result];

      if (model.displayName.includes('KoalaAI') || model.huggingFaceId.includes('KoalaAI')) {
        const koalaLabelMap: Record<string, string> = {
          'S': 'Sexual',
          'H': 'Hate',
          'V': 'Violence',
          'HR': 'Harassment',
          'SH': 'Self-harm',
          'S3': 'Sexual/minors',
          'H2': 'Hate/threatening',
          'V2': 'Violence/graphic',
          'OK': 'OK'
        };

        processedResult = processedResult.map(prediction => ({
          ...prediction,
          label: koalaLabelMap[prediction.label] || prediction.label
        }));
        console.log(`🛡️ KoalaAI getAllPredictions label mapping applied`);
      }

      return processedResult;
    } catch (error) {
      console.error(`❌ getAllPredictions failed for ${model.displayName}:`, error);
      return null;
    }
  }

  async initialize(progressCallback?: (status: string, progress: number) => void): Promise<void> {
    if (!this.hasEnabledModels()) {
      console.log('⚠️ No HuggingFace models enabled');
      return;
    }

    const models = Array.from(this.enabledModels.values());
    console.log(`🤖 Initializing ${models.length} HuggingFace models serially...`);
    console.log(`🔍 Enabled models:`, models.map(m => `${m.displayName} (${m.huggingFaceId})`));

    // Load models one by one to avoid memory issues
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const modelProgress = (i / models.length) * 100;
      
      try {
        if (progressCallback) {
          progressCallback(`Loading ${model.displayName} (${i + 1}/${models.length})...`, modelProgress);
        }
        console.log(`📦 Loading ${model.displayName} (${i + 1}/${models.length})...`);
        
        // Create a unique model config for this HuggingFace model
        const modelConfig = {
          id: model.id,
          name: model.displayName,
          description: `Custom HuggingFace model: ${model.huggingFaceId}`,
          provider: 'transformers' as const,
          size: 'Unknown',
          speed: 'medium' as const,
          accuracy: 'unknown' as const,
          languages: ['en'],
          huggingFaceId: model.huggingFaceId,
          metadata: {
            architecture: 'Unknown',
            framework: 'transformers.js'
          }
        };

        // Register the model config temporarily
        (this.modelManager as any).tempModelConfigs = (this.modelManager as any).tempModelConfigs || new Map();
        (this.modelManager as any).tempModelConfigs.set(model.id, modelConfig);

        // Load the model
        const pipeline = await this.modelManager.loadModel(model.id);
        this.loadedPipelines.set(model.id, pipeline);
        
        // Cache tracking no longer needed - we read directly from browser cache
        
        console.log(`✅ ${model.displayName} loaded successfully`);
        
        // Update progress to show successful load
        const loadedProgress = ((i + 1) / models.length) * 100;
        if (progressCallback) {
          progressCallback(`✅ Loaded ${model.displayName}`, loadedProgress);
        }
      } catch (error) {
        console.error(`❌ Failed to load ${model.displayName}:`, error);
        
        // Provide user-friendly error message
        if (progressCallback) {
          progressCallback(`Failed to load ${model.displayName}: ${error instanceof Error ? error.message : String(error)}`, modelProgress);
        }
        
        this.enabledModels.delete(model.id);
      }
    }

    if (progressCallback) {
      progressCallback(`Loaded ${this.loadedPipelines.size} models`, 100);
    }
    console.log(`🎉 Loaded ${this.loadedPipelines.size}/${models.length} models`);
  }

  isReady(): boolean {
    return this.loadedPipelines.size > 0;
  }

  /**
   * Analyze text with a specific model
   */
  async analyzeWithModel(text: string, modelId: string, progressCallback?: (status: string, progress: number) => void): Promise<SentimentResult | null> {
    const model = this.enabledModels.get(modelId);
    if (!model) {
      console.warn(`Model ${modelId} not found in enabled models`);
      return null;
    }

    try {
      if (progressCallback) {
        progressCallback(`Analyzing with ${model.displayName}...`, 0);
      }
      console.log(`🔍 Analyzing with ${model.displayName}...`);

      // Load model if not already loaded
      let pipeline = this.loadedPipelines.get(model.id);
      if (!pipeline) {
        // Use worker if enabled
        if (this.useWorker) {
          // Ensure worker is initialized
          if (!this.workerManager) {
            this.workerManager = getWorkerModelManager();
            await this.workerManager.initializeWorker();
          }
          const task = this.getTaskForModel(model.huggingFaceId);
          await this.workerManager.loadModel(model.id, model.huggingFaceId, task);
          pipeline = 'worker';
          this.loadedPipelines.set(model.id, 'worker');
        } else {
          // Original non-worker path
          const modelConfig = {
            id: model.id,
            name: model.displayName,
            description: `Custom HuggingFace model: ${model.huggingFaceId}`,
            provider: 'transformers' as const,
            size: 'Unknown',
            speed: 'medium' as const,
            accuracy: 'unknown' as const,
            languages: ['en'],
            huggingFaceId: model.huggingFaceId,
            metadata: {
              architecture: 'Unknown',
              framework: 'transformers.js'
            }
          };

          (this.modelManager as any).tempModelConfigs = (this.modelManager as any).tempModelConfigs || new Map();
          (this.modelManager as any).tempModelConfigs.set(model.id, modelConfig);

          pipeline = await this.modelManager.loadModel(model.id);
          this.loadedPipelines.set(model.id, pipeline);
        }
      }

      // Perform analysis
      const startTime = performance.now();
      let rawResult;

      // Use worker if enabled
      if (this.useWorker && this.workerManager && pipeline === 'worker') {
        rawResult = await this.workerManager.runInference(model.id, text);
      } else {
        rawResult = await pipeline(text, {
          top_k: null,  // Return all classes
          return_all_scores: true
        });
      }

      const processingTime = performance.now() - startTime;

      // Store the FULL raw output
      const fullRawOutput = Array.isArray(rawResult) ? rawResult : [rawResult];

      // Get the top prediction for display
      const prediction = Array.isArray(rawResult)
        ? rawResult.reduce((max, current) => current.score > max.score ? current : max)
        : rawResult;

      // Detect model type from output
      const modelType = this.detectModelType(fullRawOutput);
      console.log(`🔍 Model ${model.displayName}: Type=${modelType}, ${fullRawOutput.length} outputs, top: ${prediction.label} (${prediction.score.toFixed(3)})`);

      let sentiment: 'positive' | 'negative' | 'neutral' | null = null;
      let displayScore = prediction.score; // Default to raw confidence
      let displayLabel = prediction.label;
      let rawScores: Record<string, number> = {};

      // Process based on detected model type
      switch (modelType) {
        case 'sentiment': {
          // Sentiment models: determine sentiment from label
          const label = prediction.label.toLowerCase();
          if (label.includes('pos')) {
            sentiment = 'positive';
          } else if (label.includes('neg')) {
            sentiment = 'negative';
          } else if (label.includes('neutral')) {
            sentiment = 'neutral';
          }
          displayLabel = sentiment || prediction.label;
          displayScore = prediction.score; // Keep as confidence 0-1
          break;
        }

        case 'multi-label': {
          // Multi-label models: show top prediction with indicator if others are significant
          const significant = fullRawOutput.filter(p => p.score > 0.1);
          displayLabel = prediction.label;
          if (significant.length > 1) {
            displayLabel += '+'; // Indicate multiple active labels
          }
          displayScore = prediction.score;
          break;
        }

        case 'moderation': {
          // KoalaAI moderation model
          const koalaLabelMap: Record<string, string> = {
            'S': 'Sexual',
            'H': 'Hate',
            'V': 'Violence',
            'HR': 'Harassment',
            'SH': 'Self-harm',
            'S3': 'Sexual/minors',
            'H2': 'Hate/threatening',
            'V2': 'Violence/graphic',
            'OK': 'Safe'
          };
          displayLabel = koalaLabelMap[prediction.label] || prediction.label;
          displayScore = prediction.score;
          sentiment = prediction.label === 'OK' ? 'positive' : 'negative'; // For backwards compatibility
          break;
        }

        case 'multi-class':
        default: {
          // Multi-class models: just show top class and confidence
          displayLabel = prediction.label;
          displayScore = prediction.score;
          break;
        }
      }

      // Populate raw scores for metadata
      rawScores = {
        [prediction.label]: prediction.score,
        modelType: modelType as any,
        displayLabel: displayLabel,
        displayScore: displayScore
      };

      // Add multi-label indicators to metadata if applicable
      if (modelType === 'multi-label') {
        const significant = fullRawOutput.filter(p => p.score > 0.1);
        if (significant.length > 1) {
          rawScores.multipleActive = 1; // Use 1 for true as rawScores is Record<string, number>
          rawScores.activeCount = significant.length;
        }
      }

      const analysisResult: SentimentResult = {
        analyzer: model.displayName,
        text,
        sentiment: sentiment || 'neutral', // Default for non-sentiment models
        score: displayScore, // Use the display score (always 0-1)
        scores: rawScores,
        processingTime,
        metadata: {
          modelId: model.id,
          huggingFaceId: model.huggingFaceId,
          modelType: modelType,
          rawPrediction: prediction,  // Top prediction
          fullRawOutput: fullRawOutput,  // FULL raw output array
          topLabel: displayLabel,  // Use the processed display label
          topScore: displayScore,  // Use the display score
          framework: 'transformers.js'
        }
      };

      if (progressCallback) {
        progressCallback(`Analysis complete`, 100);
      }
      console.log(`✅ ${model.displayName} analysis complete`);

      return analysisResult;

    } catch (error) {
      console.error(`❌ Analysis failed for ${model.displayName}:`, error);
      return null;
    }
  }

  async analyze(text: string, progressCallback?: (status: string, progress: number) => void): Promise<SentimentResult[]> {
    const results: SentimentResult[] = [];

    if (!this.hasEnabledModels()) {
      return results;
    }

    const models = Array.from(this.enabledModels.values());
    console.log(`🔍 Analyzing with ${models.length} models serially...`);

    // Analyze with each model serially, loading and unloading as we go
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const analysisProgress = (i / models.length) * 100;
      
      try {
        if (progressCallback) {
          progressCallback(`Analyzing with ${model.displayName}...`, analysisProgress);
        }
        console.log(`🔍 Analyzing with ${model.displayName} (${i + 1}/${models.length})...`);

        // Load model if not already loaded
        let pipeline = this.loadedPipelines.get(model.id);
        if (!pipeline) {
          // Create model config
          const modelConfig = {
            id: model.id,
            name: model.displayName,
            description: `Custom HuggingFace model: ${model.huggingFaceId}`,
            provider: 'transformers' as const,
            size: 'Unknown',
            speed: 'medium' as const,
            accuracy: 'unknown' as const,
            languages: ['en'],
            huggingFaceId: model.huggingFaceId,
            metadata: {
              architecture: 'Unknown',
              framework: 'transformers.js'
            }
          };

          // Register temporarily and load
          (this.modelManager as any).tempModelConfigs = (this.modelManager as any).tempModelConfigs || new Map();
          (this.modelManager as any).tempModelConfigs.set(model.id, modelConfig);
          
          pipeline = await this.modelManager.loadModel(model.id);
          
          // Cache tracking no longer needed - we read directly from browser cache
        }

        // Perform analysis with full output
        const startTime = performance.now();
        const result = await pipeline(text, { top_k: null, return_all_scores: true });
        const processingTime = performance.now() - startTime;

        // Get full output array and top prediction
        const fullRawOutput = Array.isArray(result) ? result : [result];
        const prediction = Array.isArray(result)
          ? result.reduce((max, current) => current.score > max.score ? current : max)
          : result;

        // Detect model type
        const modelType = this.detectModelType(fullRawOutput);

        let sentiment: 'positive' | 'negative' | 'neutral' | null = null;
        let displayScore = prediction.score;
        let displayLabel = prediction.label;
        let rawScores: Record<string, number> = {};

        // Process based on model type
        switch (modelType) {
          case 'sentiment':
            const label = prediction.label.toLowerCase();
            if (label.includes('pos')) {
              sentiment = 'positive';
            } else if (label.includes('neg')) {
              sentiment = 'negative';
            } else if (label.includes('neutral')) {
              sentiment = 'neutral';
            }
            displayLabel = sentiment || prediction.label;
            break;

          case 'multi-label':
            const significant = fullRawOutput.filter(p => p.score > 0.1);
            if (significant.length > 1) {
              displayLabel = prediction.label + '+';
            }
            break;

          case 'moderation':
            const koalaMap: Record<string, string> = {
              'S': 'Sexual', 'H': 'Hate', 'V': 'Violence',
              'HR': 'Harassment', 'SH': 'Self-harm',
              'S3': 'Sexual/minors', 'H2': 'Hate/threatening',
              'V2': 'Violence/graphic', 'OK': 'Safe'
            };
            displayLabel = koalaMap[prediction.label] || prediction.label;
            sentiment = prediction.label === 'OK' ? 'positive' : 'negative';
            break;
        }

        rawScores = {
          [prediction.label]: prediction.score,
          modelType: modelType as any,
          displayLabel: displayLabel,
          displayScore: displayScore
        };

        const analysisResult: SentimentResult = {
          analyzer: model.displayName,
          text,
          sentiment: sentiment || 'neutral',
          score: displayScore, // Always 0-1
          scores: rawScores,
          processingTime,
          metadata: {
            modelId: model.id,
            huggingFaceId: model.huggingFaceId,
            modelType: modelType,
            rawPrediction: prediction,
            fullRawOutput: fullRawOutput,
            topLabel: displayLabel,
            topScore: displayScore,
            framework: 'transformers.js'
          }
        };

        results.push(analysisResult);
        console.log(`✅ ${model.displayName} analysis complete`);

        // ALWAYS unload model to save memory after processing
        await this.modelManager.unloadModel(model.id);
        this.loadedPipelines.delete(model.id);
        console.log(`🗑️ Unloaded ${model.displayName} to save memory`);

      } catch (error) {
        console.error(`❌ Analysis failed for ${model.displayName}:`, error);
        // Still unload the model on error
        await this.modelManager.unloadModel(model.id);
        this.loadedPipelines.delete(model.id);
      }
    }

    if (progressCallback) {
      progressCallback(`Analysis complete`, 100);
    }
    console.log(`🎉 Analysis complete with ${results.length} results`);

    return results;
  }

  cleanup(): void {
    this.loadedPipelines.clear();
    this.enabledModels.clear();
    console.log('🧹 Multi-model analyzer cleaned up');
  }
}