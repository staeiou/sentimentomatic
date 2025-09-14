import type { LabelConfig } from '../labels/LabelManager';
import { TextChunker } from '../chunking/TextChunker';

export interface ClassificationResult {
  text: string;
  predictions: Array<{
    label: string;
    score: number;
  }>;
  topPrediction: string;
  topScore: number;
  multiLabel?: string[];
}

export interface ClassifierConfig {
  modelId: string;
  multiLabel: boolean;
  threshold: number;
  keepCached: boolean;
  quantized: boolean;
  device?: 'wasm' | 'webgpu';
}

export class ZeroShotClassifier {
  private pipeline: any = null;
  private chunker: TextChunker;
  private config: ClassifierConfig;
  private isLoading = false;
  private transformersModule: any = null;

  constructor(config?: Partial<ClassifierConfig>) {
    this.config = {
      modelId: 'Xenova/nli-deberta-v3-xsmall',
      multiLabel: false,
      threshold: 0.5,
      keepCached: true,
      quantized: true,
      device: 'wasm',  // Force WASM only for stability
      ...config
    };

    this.chunker = new TextChunker();
  }

  /**
   * Initialize the model pipeline
   */
  async initialize(
    progressCallback?: (status: string, progress: number) => void
  ): Promise<void> {
    if (this.pipeline) {
      console.log('Pipeline already initialized');
      return;
    }

    if (this.isLoading) {
      console.log('Pipeline is already loading');
      return;
    }

    this.isLoading = true;

    try {
      progressCallback?.('Loading Transformers.js library...', 10);

      // Import transformers.js from local package
      if (!this.transformersModule) {
        this.transformersModule = await import('@huggingface/transformers');
      }

      const { pipeline, env } = this.transformersModule;

      // Configure environment for WASM-only
      progressCallback?.('Configuring environment...', 20);
      env.allowRemoteModels = true;
      env.useBrowserCache = true;
      env.backends.onnx.wasm.numThreads = 1;
      env.backends.onnx.wasm.simd = false;
      env.backends.onnx.webgl = false;
      env.backends.onnx.webgpu = false;

      progressCallback?.('Loading model...', 30);

      // Create zero-shot classification pipeline
      this.pipeline = await pipeline(
        'zero-shot-classification',
        this.config.modelId,
        {
          quantized: this.config.quantized,
          progress_callback: (data: any) => {
            if (data.status === 'downloading' || data.status === 'download') {
              const progress = Math.round(data.progress || 0);
              progressCallback?.(
                `Downloading model... ${progress}%`,
                30 + (progress * 0.6)
              );
            } else if (data.status === 'done') {
              progressCallback?.('Model ready!', 95);
            }
          }
        }
      );

      progressCallback?.('Model loaded successfully!', 100);
      console.log('Zero-shot classification pipeline initialized');

    } catch (error) {
      console.error('Failed to initialize pipeline:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Classify a single text
   */
  async classifyText(
    text: string,
    labels: LabelConfig[],
    template?: string
  ): Promise<ClassificationResult> {
    if (!this.pipeline) {
      throw new Error('Pipeline not initialized. Call initialize() first.');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    if (labels.length === 0) {
      throw new Error('At least one label is required');
    }

    // Check if text needs chunking
    const chunks = this.chunker.chunkText(text);
    const labelNames = labels.map(l => l.name);

    let aggregatedScores: number[];

    if (chunks.length === 1) {
      // Single chunk - process directly
      const result = await this.classifyChunk(
        chunks[0].text,
        labelNames,
        template
      );

      // Map scores back to original label order
      aggregatedScores = labelNames.map(label => {
        const idx = result.labels.indexOf(label);
        return idx >= 0 ? result.scores[idx] : 0;
      });
    } else {
      // Multiple chunks - process and aggregate
      const chunkResults = await Promise.all(
        chunks.map(chunk =>
          this.classifyChunk(chunk.text, labelNames, template)
        )
      );

      // Map each chunk's scores back to original label order
      const alignedChunkScores = chunkResults.map(result => {
        return labelNames.map(label => {
          const idx = result.labels.indexOf(label);
          return idx >= 0 ? result.scores[idx] : 0;
        });
      });

      aggregatedScores = this.chunker.aggregateScores(alignedChunkScores);
    }

    // Create predictions array
    const predictions = labelNames.map((name, idx) => ({
      label: name,
      score: aggregatedScores[idx]
    }));

    // Sort by score
    predictions.sort((a, b) => b.score - a.score);

    // Determine top prediction
    const topPrediction = predictions[0].label;
    const topScore = predictions[0].score;

    // Handle multi-label classification
    let multiLabel: string[] | undefined;
    if (this.config.multiLabel) {
      multiLabel = predictions
        .filter(p => {
          const labelConfig = labels.find(l => l.name === p.label);
          const threshold = labelConfig?.threshold || this.config.threshold;
          return p.score >= threshold;
        })
        .map(p => p.label);
    }

    return {
      text,
      predictions,
      topPrediction,
      topScore,
      multiLabel
    };
  }

  /**
   * Classify multiple texts in batch
   */
  async classifyBatch(
    texts: string[],
    labels: LabelConfig[],
    template?: string,
    progressCallback?: (current: number, total: number) => void
  ): Promise<ClassificationResult[]> {
    const results: ClassificationResult[] = [];

    for (let i = 0; i < texts.length; i++) {
      progressCallback?.(i + 1, texts.length);
      const result = await this.classifyText(texts[i], labels, template);
      results.push(result);
    }

    return results;
  }

  /**
   * Internal: Classify a single chunk
   */
  private async classifyChunk(
    text: string,
    labels: string[],
    template?: string
  ): Promise<{ labels: string[]; scores: number[] }> {
    // Use custom template or hypothesis sentences
    const hypothesisTemplate = template || "This text is about {}.";

    console.log('classifyChunk called with:', {
      text: text.substring(0, 50),
      labels,
      template,
      hypothesisTemplate,
      multiLabel: this.config.multiLabel
    });

    const result = await this.pipeline(
      text,
      labels,
      {
        multi_label: this.config.multiLabel,
        hypothesis_template: hypothesisTemplate
      }
    );

    console.log('Pipeline returned:', {
      labels: result.labels,
      scores: result.scores
    });

    // Extract labels and scores
    return {
      labels: result.labels,
      scores: result.scores
    };
  }

  /**
   * Unload the model from memory
   */
  async unload(): Promise<void> {
    if (this.pipeline) {
      // Dispose of the pipeline if method is available
      if (typeof this.pipeline.dispose === 'function') {
        await this.pipeline.dispose();
      }
      this.pipeline = null;
      console.log('Model unloaded from memory');
    }
  }

  /**
   * Check if pipeline is ready
   */
  isReady(): boolean {
    return this.pipeline !== null;
  }

  /**
   * Get current configuration
   */
  getConfig(): ClassifierConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ClassifierConfig>): void {
    const oldModelId = this.config.modelId;
    this.config = { ...this.config, ...config };

    // If model changed, unload the current one
    if (config.modelId && config.modelId !== oldModelId) {
      this.unload();
    }
  }

  /**
   * Clear browser cache for models
   */
  async clearCache(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        if (cacheName.includes('transformers') ||
            cacheName.includes('huggingface') ||
            cacheName.includes('onnx')) {
          await caches.delete(cacheName);
          console.log(`Cleared cache: ${cacheName}`);
        }
      }
    }
  }
}