import type { SentimentAnalyzer, SentimentResult } from '../types';
import { ModelManager } from '../models/ModelManager';
import { CacheManager } from '../models/CacheManager';

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

  constructor(modelManager: ModelManager) {
    this.modelManager = modelManager;
    this.cacheManager = new CacheManager();
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
        
        // Track in cache
        const estimatedSize = this.cacheManager.estimateModelSize(model.huggingFaceId);
        await this.cacheManager.updateCacheInfo(model.id, model.huggingFaceId, estimatedSize);
        
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
        this.loadedPipelines.set(model.id, pipeline);
        
        // Track in cache
        const estimatedSize = this.cacheManager.estimateModelSize(model.huggingFaceId);
        await this.cacheManager.updateCacheInfo(model.id, model.huggingFaceId, estimatedSize);
      }

      // Perform analysis
      const startTime = performance.now();
      const result = await pipeline(text, {
        top_k: null,  // Return all classes
        return_all_scores: true
      });
      const processingTime = performance.now() - startTime;

      // Handle text classification models
      let prediction;
      if (Array.isArray(result)) {
        // For multiclass models, get the highest confidence prediction
        prediction = result.reduce((max, current) =>
          current.score > max.score ? current : max
        );
        console.log(`🔍 Multiclass model ${model.displayName} top prediction from ${result.length} classes:`, prediction);
      } else {
        prediction = result;
      }
      let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
      let score = 0;
      let rawScores: Record<string, number> = {};

      // Debug logging for problematic models
      if (model.displayName.includes('KoalaAI') || model.displayName.includes('GoEmotions')) {
        console.log(`🔍 DEBUG ${model.displayName} RAW prediction:`, prediction);
        console.log(`🔍 DEBUG ${model.displayName} prediction.label:`, prediction.label);
        console.log(`🔍 DEBUG ${model.displayName} prediction.score:`, prediction.score);
        console.log(`🔍 DEBUG ${model.displayName} typeof prediction:`, typeof prediction);
      }

      if (prediction.label) {
        // Standard POSITIVE/NEGATIVE format
        const label = prediction.label.toLowerCase();
        if (label.includes('pos')) {
          sentiment = 'positive';
          score = prediction.score; // Keep raw score 0-1
        } else if (label.includes('neg')) {
          sentiment = 'negative';
          score = -prediction.score; // Convert to negative for negative sentiment
        } else {
          // Handle star rating labels like "1 star", "3 stars", "5 stars"
          const starMatch = prediction.label.match(/(\d+)\s*stars?/i);
          if (starMatch) {
            const stars = parseInt(starMatch[1]);
            if (stars >= 1 && stars <= 5) {
              score = (stars - 3) / 2; // Convert 1-5 stars to -1 to +1
              sentiment = stars >= 4 ? 'positive' : (stars <= 2 ? 'negative' : 'neutral');
              rawScores = { 
                starLabel: prediction.label,
                stars, 
                confidence: prediction.score 
              };
              
              console.log(`✅ Parsed Multilingual BERT: "${prediction.label}" → ${stars} stars → score ${score}`);
            }
          } else if (model.displayName.includes('KoalaAI') || model.huggingFaceId.includes('KoalaAI')) {
            // Handle KoalaAI Text-Moderation model codes
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

            const mappedLabel = koalaLabelMap[prediction.label] || prediction.label;
            console.log(`🛡️ KoalaAI label mapping: "${prediction.label}" → "${mappedLabel}"`);

            // For content moderation, treat violations as negative sentiment
            sentiment = prediction.label === 'OK' ? 'positive' : 'negative';
            score = prediction.label === 'OK' ? prediction.score : -prediction.score;
            rawScores = {
              originalLabel: prediction.label,
              mappedLabel: mappedLabel,
              confidence: prediction.score,
              modelType: 'content-moderation' as any
            };
          } else {
            // Handle numeric labels that might represent class indices
            const numericLabel = parseInt(prediction.label);
            if (!isNaN(numericLabel) && numericLabel >= 0 && numericLabel <= 4) {
              // Convert 0-4 class indices to 1-5 stars
              const stars = numericLabel + 1;
              score = (stars - 3) / 2; // Convert 1-5 stars to -1 to +1
              sentiment = stars >= 3 ? 'positive' : (stars <= 2 ? 'negative' : 'neutral');
              rawScores = { 
                classIndex: numericLabel, 
                stars, 
                confidence: prediction.score 
              };
            } else {
              // GENERIC HANDLER: For any arbitrary multiclass model
              // Just use the raw prediction score and label as-is
              console.log(`🔍 GENERIC multiclass model "${model.displayName}" returned label: "${prediction.label}"`);
              
              // Use the confidence score directly (no sentiment mapping needed for arbitrary classes)
              score = prediction.score; // Keep raw score 0-1
              sentiment = 'neutral'; // Neutral for arbitrary multiclass (not pos/neg)
              rawScores = {
                predictedClass: prediction.label,
                confidence: prediction.score,
                modelType: 'multiclass' as any
              };
              
              console.log(`✅ GENERIC parsing: "${prediction.label}" → score ${score}`);
            }
          }
        }
        
        if (Object.keys(rawScores).length === 0) {
          rawScores = {
            [prediction.label]: prediction.score
          };
        }
      } else if (prediction.stars || prediction.rating) {
        // Star rating format (1-5 stars) - convert to -1 to +1 scale
        const stars = prediction.stars || prediction.rating;
        score = (stars - 3) / 2; // Convert 1-5 stars to -1 to +1
        sentiment = stars >= 3 ? 'positive' : 'negative';
        rawScores = { stars, score: prediction.score };
      } else {
        // FAILED TO PARSE - DO NOT USE DEFAULT VALUES
        const keys = Object.keys(prediction);
        console.error(`❌ FAILED TO PARSE ${model.displayName}:`, prediction);
        console.error(`❌ Available keys:`, keys);
        console.error(`❌ Raw prediction type:`, typeof prediction);
        
        // Return null to indicate failure instead of fake 0.000 scores
        console.error(`❌ ${model.displayName} returned unparseable format - returning null`);
        return null;
      }

      const analysisResult: SentimentResult = {
        analyzer: model.displayName,
        text,
        sentiment,
        score,
        scores: rawScores,
        processingTime,
        metadata: {
          modelId: model.id,
          huggingFaceId: model.huggingFaceId,
          rawPrediction: prediction,
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
          
          // Track in cache
          const estimatedSize = this.cacheManager.estimateModelSize(model.huggingFaceId);
          await this.cacheManager.updateCacheInfo(model.id, model.huggingFaceId, estimatedSize);
        }

        // Perform analysis
        const startTime = performance.now();
        const result = await pipeline(text);
        const processingTime = performance.now() - startTime;

        // Handle different model output formats
        const prediction = Array.isArray(result) ? result[0] : result;
        let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
        let score = 0;
        let rawScores: Record<string, number> = {};

        if (prediction.label) {
          // Standard POSITIVE/NEGATIVE format
          const label = prediction.label.toLowerCase();
          if (label.includes('pos')) {
            sentiment = 'positive';
            score = prediction.score; // Keep raw score 0-1
          } else if (label.includes('neg')) {
            sentiment = 'negative';
            score = -prediction.score; // Convert to negative for negative sentiment
          }
          
          rawScores = {
            [prediction.label]: prediction.score
          };
        } else if (prediction.stars || prediction.rating) {
          // Star rating format (1-5 stars) - convert to -1 to +1 scale
          const stars = prediction.stars || prediction.rating;
          score = (stars - 3) / 2; // Convert 1-5 stars to -1 to +1
          sentiment = stars >= 3 ? 'positive' : 'negative';
          rawScores = { stars, score: prediction.score };
        }

        const analysisResult: SentimentResult = {
          analyzer: model.displayName,
          text,
          sentiment,
          score,
          scores: rawScores,
          processingTime,
          metadata: {
            modelId: model.id,
            huggingFaceId: model.huggingFaceId,
            rawPrediction: prediction,
            framework: 'transformers.js'
          }
        };

        results.push(analysisResult);
        console.log(`✅ ${model.displayName} analysis complete`);

        // Unload model to save memory (except the last one)
        // DON'T UNLOAD MODELS - KEEP THEM IN MEMORY!
        // if (i < models.length - 1) {
        //   this.modelManager.unloadModel(model.id);
        //   this.loadedPipelines.delete(model.id);
        //   console.log(`🗑️ Unloaded ${model.displayName} to save memory`);
        // }

      } catch (error) {
        console.error(`❌ Analysis failed for ${model.displayName}:`, error);
        // Still unload the model on error
        this.modelManager.unloadModel(model.id);
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