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

  private cacheManager: CacheManager;
  private enabledModels: Map<string, HuggingFaceModel> = new Map();
  private loadedPipelines: Map<string, any> = new Map();
  private workerManager: WorkerModelManager | null = null;

  constructor(_modelManager: ModelManager) {
    // ModelManager passed for compatibility but NOT USED - worker handles everything
    this.cacheManager = new CacheManager();
    // ALWAYS use worker - it's the ONLY way to free memory
    console.log('🔧 MultiModelAnalyzer: Worker mode ENABLED (mandatory for memory management)');
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
   * MUST be called before any model operations
   */
  async initializeWorker(): Promise<void> {
    if (this.workerManager?.isWorkerActive()) {
      console.log('✅ Worker already initialized');
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
    if (!this.workerManager) {
      console.log('⚠️ No worker to terminate');
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
      // ALWAYS use worker - no other option
      // Ensure worker is initialized
      if (!this.workerManager) {
        console.log('🔧 Worker not initialized, initializing now...');
        await this.initializeWorker();
      }

      // Determine task type for the model
      const task = this.getTaskForModel(model.huggingFaceId);
      await this.workerManager!.loadModel(model.id, model.huggingFaceId, task);
      this.loadedPipelines.set(model.id, 'worker'); // Mark as loaded in worker

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
   * Unload a single model from the worker
   */
  async unloadSingleModel(modelId: string): Promise<void> {
    const model = this.enabledModels.get(modelId);
    const modelName = model ? model.displayName : modelId;

    console.log(`🗑️ Unloading ${modelName} from worker...`);

    // Remove from loaded pipelines
    this.loadedPipelines.delete(modelId);

    // Dispose in worker if available
    if (this.workerManager) {
      try {
        await this.workerManager.disposeModel(modelId);
        console.log(`✅ ${modelName} disposed in worker`);
      } catch (error) {
        console.warn(`⚠️ Failed to dispose ${modelName} in worker:`, error);
      }
    }

    console.log(`✅ ${modelName} unloaded`);
  }

  /**
   * Get the cache manager for updating cache status
   */
  getCacheManager() {
    return this.cacheManager;
  }

  /**
   * Unload ALL models by terminating the worker
   * This is the MOST EFFECTIVE way to free all memory
   */
  async unloadAllModels(): Promise<void> {
    console.log('🧹 Unloading all models...');

    // Clear the pipelines map
    this.loadedPipelines.clear();

    // Dispose all models in worker if available
    if (this.workerManager) {
      try {
        await this.workerManager.disposeAll();
        console.log('✅ All models disposed in worker');
      } catch (error) {
        console.warn('⚠️ Failed to dispose all models in worker:', error);
      }
    }

    console.log('✅ All models unloaded');
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
      // CRITICAL FIX: Use worker for getAllPredictions too
      // Ensure worker is initialized
      if (!this.workerManager) {
        console.log('🔧 Worker not initialized in getAllPredictions(), initializing now...');
        await this.initializeWorker();
      }

      // Load model in worker if not already loaded
      let pipeline = this.loadedPipelines.get(model.id);
      if (!pipeline) {
        const task = this.getTaskForModel(model.huggingFaceId);
        await this.workerManager!.loadModel(model.id, model.huggingFaceId, task);
        this.loadedPipelines.set(model.id, 'worker');
      }

      // Get raw result using WORKER
      const result = await this.workerManager!.runInference(model.id, text);

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

    // Initialize worker first
    if (!this.workerManager) {
      await this.initializeWorker();
    }

    const models = Array.from(this.enabledModels.values());
    console.log(`🤖 Initializing ${models.length} HuggingFace models in worker...`);
    console.log(`🔍 Enabled models:`, models.map(m => `${m.displayName} (${m.huggingFaceId})`));

    // Load models one by one in worker
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const modelProgress = (i / models.length) * 100;

      try {
        if (progressCallback) {
          progressCallback(`Loading ${model.displayName} (${i + 1}/${models.length})...`, modelProgress);
        }
        console.log(`📦 Loading ${model.displayName} (${i + 1}/${models.length}) in worker...`);

        // Load model in worker
        const task = this.getTaskForModel(model.huggingFaceId);
        await this.workerManager!.loadModel(model.id, model.huggingFaceId, task);
        this.loadedPipelines.set(model.id, 'worker');

        console.log(`✅ ${model.displayName} loaded successfully in worker`);

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
      progressCallback(`Loaded ${this.loadedPipelines.size} models in worker`, 100);
    }
    console.log(`🎉 Loaded ${this.loadedPipelines.size}/${models.length} models in worker`);
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
        // ALWAYS use worker - it's mandatory
        // Ensure worker is initialized
        if (!this.workerManager) {
          console.log('🔧 Worker not initialized, initializing now...');
          await this.initializeWorker();
        }

        const task = this.getTaskForModel(model.huggingFaceId);
        await this.workerManager!.loadModel(model.id, model.huggingFaceId, task);
        pipeline = 'worker';
        this.loadedPipelines.set(model.id, 'worker');
      }

      // Perform analysis
      const startTime = performance.now();

      // ALWAYS use worker for inference
      if (!this.workerManager) {
        throw new Error('Worker not initialized for inference');
      }

      const rawResult = await this.workerManager.runInference(model.id, text);

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

        // CRITICAL FIX: Use worker for ALL model loading
        // Ensure worker is initialized
        if (!this.workerManager) {
          console.log('🔧 Worker not initialized in analyze(), initializing now...');
          await this.initializeWorker();
        }

        // Load model in worker if not already loaded
        let pipeline = this.loadedPipelines.get(model.id);
        if (!pipeline) {
          const task = this.getTaskForModel(model.huggingFaceId);
          await this.workerManager!.loadModel(model.id, model.huggingFaceId, task);
          pipeline = 'worker';
          this.loadedPipelines.set(model.id, 'worker');
        }

        // Perform analysis with full output using WORKER
        const startTime = performance.now();
        const result = await this.workerManager!.runInference(model.id, text);
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

        // ALWAYS dispose model in worker to save memory after processing
        if (this.workerManager) {
          await this.workerManager.disposeModel(model.id);
        }
        this.loadedPipelines.delete(model.id);
        console.log(`🗑️ Disposed ${model.displayName} in worker to save memory`);

      } catch (error) {
        console.error(`❌ Analysis failed for ${model.displayName}:`, error);
        // Still dispose the model on error
        if (this.workerManager) {
          await this.workerManager.disposeModel(model.id);
        }
        this.loadedPipelines.delete(model.id);
      }
    }

    if (progressCallback) {
      progressCallback(`Analysis complete`, 100);
    }
    console.log(`🎉 Analysis complete with ${results.length} results`);

    return results;
  }

  async cleanup(): Promise<void> {
    // Terminate worker to free ALL memory
    if (this.workerManager) {
      await this.terminateWorker();
    }

    this.loadedPipelines.clear();
    this.enabledModels.clear();
    console.log('🧹 Multi-model analyzer cleaned up');
  }
}