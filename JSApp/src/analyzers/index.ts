import { AfinnAnalyzer } from './AfinnAnalyzer';
import { VaderAnalyzer } from './VaderAnalyzer';
import { TransformersAnalyzer } from './TransformersAnalyzer';
import { ModelManager } from '../models/ModelManager';
import { PresetManager } from '../models/PresetManager';
import type { SentimentAnalyzer } from '../types';

export class AnalyzerRegistry {
  private analyzers: Map<string, SentimentAnalyzer> = new Map();
  private modelManager: ModelManager;
  private presetManager: PresetManager;

  constructor(modelManager?: ModelManager, presetManager?: PresetManager) {
    this.modelManager = modelManager || new ModelManager();
    this.presetManager = presetManager || new PresetManager();
    
    // Register available analyzers (lazy initialization)
    this.analyzers.set('afinn', new AfinnAnalyzer());
    this.analyzers.set('vader', new VaderAnalyzer());
    // Don't initialize Transformers until requested
  }

  /**
   * Get the ModelManager instance
   */
  getModelManager(): ModelManager {
    return this.modelManager;
  }

  /**
   * Get the PresetManager instance
   */
  getPresetManager(): PresetManager {
    return this.presetManager;
  }

  getAnalyzer(name: string): SentimentAnalyzer | undefined {
    const lowerName = name.toLowerCase();
    
    // Lazy initialize Transformers analyzer with current preset model
    if (lowerName === 'transformers' && !this.analyzers.has('transformers')) {
      const modelId = this.presetManager.getModelForAnalyzer('transformers') || 'distilbert-sst2';
      this.analyzers.set('transformers', new TransformersAnalyzer(this.modelManager, modelId));
    }
    
    return this.analyzers.get(lowerName);
  }

  /**
   * Update the model for a specific analyzer
   */
  updateAnalyzerModel(analyzerName: string, modelId: string): boolean {
    const lowerName = analyzerName.toLowerCase();
    
    if (lowerName === 'transformers') {
      const analyzer = this.analyzers.get('transformers') as TransformersAnalyzer;
      if (analyzer) {
        analyzer.setModel(modelId);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Apply a preset to all analyzers
   */
  applyPreset(presetId: string): boolean {
    if (!this.presetManager.setPreset(presetId)) {
      return false;
    }

    const preset = this.presetManager.getCurrentPreset();
    if (!preset) return false;

    // Update model for transformers analyzer if it exists
    const transformersModelId = preset.models.transformers;
    if (transformersModelId) {
      this.updateAnalyzerModel('transformers', transformersModelId);
    }

    return true;
  }

  getAvailableAnalyzers(): string[] {
    return Array.from(this.analyzers.keys());
  }

  async initializeAnalyzer(name: string): Promise<void> {
    const analyzer = this.getAnalyzer(name);
    if (analyzer && analyzer.initialize) {
      await analyzer.initialize();
    }
  }

  isAnalyzerReady(name: string): boolean {
    const analyzer = this.getAnalyzer(name);
    return analyzer ? analyzer.isReady() : false;
  }
}

// Export analyzer classes for direct use
export { AfinnAnalyzer, VaderAnalyzer, TransformersAnalyzer };