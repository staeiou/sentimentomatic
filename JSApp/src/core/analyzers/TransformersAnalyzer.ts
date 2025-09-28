import type { SentimentAnalyzer, SentimentResult } from '../../types/types';
import type { ModelConfig } from '../models/types';
import { ModelManager } from '../models/ModelManager';
import { getModelConfig } from '../models/registry';

export class TransformersAnalyzer implements SentimentAnalyzer {
  readonly name = 'Transformers.js';
  readonly type = 'ml' as const;
  
  private pipeline: any = null;
  private ready = false;
  private initializing = false;
  private modelManager: ModelManager;
  private currentModelId: string;

  constructor(modelManager: ModelManager, modelId: string = 'distilbert-sst2') {
    this.modelManager = modelManager;
    this.currentModelId = modelId;
  }

  /**
   * Set the model to use for analysis
   */
  setModel(modelId: string): void {
    if (this.currentModelId !== modelId) {
      this.currentModelId = modelId;
      this.ready = false;
      this.pipeline = null;
    }
  }

  /**
   * Get the current model configuration
   */
  getCurrentModel(): ModelConfig | undefined {
    return getModelConfig(this.currentModelId);
  }

  async initialize(): Promise<void> {
    if (this.initializing) {
      // Wait for existing initialization
      while (this.initializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    // Check if model is already loaded
    if (this.modelManager.isModelReady(this.currentModelId)) {
      this.pipeline = this.modelManager.getModel(this.currentModelId);
      this.ready = true;
      return;
    }

    this.initializing = true;
    
    try {
      const modelConfig = this.getCurrentModel();
      if (!modelConfig) {
        throw new Error(`Model configuration not found: ${this.currentModelId}`);
      }

      console.log(`🤖 Initializing ${modelConfig.name}...`);
      
      // Load model through ModelManager
      this.pipeline = await this.modelManager.loadModel(this.currentModelId);
      this.ready = true;
      
      console.log(`✅ ${modelConfig.name} ready for analysis!`);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to initialize ${this.currentModelId}:`, errorMsg);
      console.warn('⚠️ Continuing with AFINN and VADER analyzers only');
      this.ready = false;
    } finally {
      this.initializing = false;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  async analyze(text: string): Promise<SentimentResult> {
    if (!this.isReady()) {
      await this.initialize();
    }

    if (!this.isReady() || !this.pipeline) {
      throw new Error('Transformers.js pipeline not available - initialization failed');
    }

    const startTime = performance.now();
    const result = await this.pipeline(text, {
      top_k: null,  // Return all classes
      return_all_scores: true
    });
    const processingTime = performance.now() - startTime;

    // Transformers.js returns: [{ label: 'POSITIVE' | 'NEGATIVE', score: number }]
    const prediction = result[0];
    const label = prediction.label.toLowerCase() as 'positive' | 'negative';

    // For negative predictions, invert the confidence score
    const actualConfidence = label === 'negative' ? 1 - prediction.score : prediction.score;

    const modelConfig = this.getCurrentModel();
    return {
      analyzer: this.name,
      text,
      sentiment: label,
      score: actualConfidence,
      scores: {
        [label]: prediction.score,
        [label === 'positive' ? 'negative' : 'positive']: 1 - prediction.score
      },
      processingTime,
      metadata: {
        model: modelConfig?.name || this.currentModelId,
        modelId: this.currentModelId,
        huggingFaceId: modelConfig?.huggingFaceId,
        rawPrediction: prediction,
        framework: 'transformers.js'
      }
    };
  }

  cleanup(): void {
    this.pipeline = null;
    this.ready = false;
  }
}