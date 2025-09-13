import { AnalyzerRegistry } from '../analyzers';
import { MultiModelAnalyzer } from '../analyzers/MultiModelAnalyzer';
import { IncrementalTableRenderer } from './IncrementalTableRenderer';
import type { MultiModalAnalysisResult, UnifiedAnalysisResult } from './AnalysisStrategy';

export class StreamingAnalysisController {
  private incrementalRenderer: IncrementalTableRenderer;
  private collectedResults: MultiModalAnalysisResult | null = null;

  constructor(
    private analyzerRegistry: AnalyzerRegistry,
    private multiModelAnalyzer: MultiModelAnalyzer,
    resultsContainer: HTMLElement
  ) {
    this.incrementalRenderer = new IncrementalTableRenderer(resultsContainer);
  }

  // No more modes - all models work together

  async analyzeWithStreaming(
    lines: string[],
    config: {
      selectedRuleBasedAnalyzers?: string[];
      selectedHuggingFaceModels?: string[];
    },
    progressCallback?: (status: string, progress: number) => void
  ): Promise<MultiModalAnalysisResult | null> {
    // Process all selected models together
    await this.analyzeAllModelsWithStreaming(lines, config, progressCallback);
    return this.collectedResults;
  }

  getLastResults(): MultiModalAnalysisResult | null {
    return this.collectedResults;
  }

  private async analyzeAllModelsWithStreaming(
    lines: string[],
    config: {
      selectedRuleBasedAnalyzers?: string[];
      selectedHuggingFaceModels?: string[];
    },
    progressCallback?: (status: string, progress: number) => void
  ): Promise<void> {
    const selectedAnalyzers = config.selectedRuleBasedAnalyzers || [];
    const selectedModels = config.selectedHuggingFaceModels || [];

    // Define which models are classification models
    const classificationModels = new Set(['go-emotions', 'text-moderation', 'iptc-news']);

    // Initialize unified results storage - use proper type
    const unifiedResults: UnifiedAnalysisResult[] = [];
    
    // Build list of all columns with their types
    const columns: Array<{name: string, type: 'sentiment' | 'classification', modelId?: string}> = [];
    
    // Add rule-based analyzers (all sentiment)
    for (const analyzer of selectedAnalyzers) {
      columns.push({ name: analyzer.toUpperCase(), type: 'sentiment' });
    }
    
    // Add ML models with proper types
    for (const modelId of selectedModels) {
      const modelInfo = this.multiModelAnalyzer.getEnabledModels().get(modelId);
      const displayName = modelInfo ? modelInfo.displayName : modelId;
      const modelType = classificationModels.has(modelId) ? 'classification' : 'sentiment';
      columns.push({ name: displayName, type: modelType, modelId });
    }
    
    // Initialize unified table
    this.incrementalRenderer.initializeUnifiedTable(columns);
    
    // Initialize analyzers
    progressCallback?.('Initializing analyzers...', 0);
    
    for (const analyzerName of selectedAnalyzers) {
      if (!this.analyzerRegistry.isAnalyzerReady(analyzerName)) {
        await this.analyzerRegistry.initializeAnalyzer(analyzerName);
      }
    }
    
    if (selectedModels.length > 0) {
      progressCallback?.('Loading ML models...', 10);
      await this.multiModelAnalyzer.initialize((status, progress) => {
        progressCallback?.(status, progress * 0.3); // 0-30% for model loading
      });
    }
    
    // Process lines ONE BY ONE with actual streaming
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const text = lines[lineIndex];
      const lineProgress = 30 + ((lineIndex / lines.length) * 70); // 30-100% for analysis
      
      progressCallback?.(`Analyzing line ${lineIndex + 1} of ${lines.length}...`, lineProgress);
      
      const lineResults: any[] = [];
      
      // Analyze with each rule-based analyzer (all sentiment)
      for (const analyzerName of selectedAnalyzers) {
        const analyzer = this.analyzerRegistry.getAnalyzer(analyzerName);
        if (analyzer?.isReady()) {
          try {
            const result = await analyzer.analyze(text);
            const processedResult = Array.isArray(result) ? result[0] : result;
            lineResults.push({
              analyzer: processedResult.analyzer,
              type: 'sentiment',
              score: processedResult.score,
              sentiment: processedResult.sentiment,
              metadata: processedResult.metadata
            });
          } catch (error) {
            console.warn(`Failed to analyze with ${analyzerName}:`, error);
            lineResults.push({
              analyzer: analyzerName.toUpperCase(),
              type: 'sentiment',
              score: 0,
              sentiment: 'neutral',
              metadata: { error: true }
            });
          }
        }
      }
      
      // Analyze with ML models (mixed sentiment and classification)
      if (selectedModels.length > 0 && this.multiModelAnalyzer.isReady()) {
        for (const modelId of selectedModels) {
          const modelInfo = this.multiModelAnalyzer.getEnabledModels().get(modelId);
          if (!modelInfo) continue;
          
          try {
            if (classificationModels.has(modelId)) {
              // Handle classification models
              const predictions = await this.multiModelAnalyzer.getAllPredictions(text, modelId);
              if (predictions && predictions.length > 0) {
                const topPrediction = predictions.reduce((max, current) => 
                  current.score > max.score ? current : max
                );
                lineResults.push({
                  analyzer: modelInfo.displayName,
                  type: 'classification',
                  topClass: topPrediction.label,
                  confidence: topPrediction.score,
                  allClasses: predictions.reduce((acc, pred) => {
                    acc[pred.label] = pred.score;
                    return acc;
                  }, {} as {[key: string]: number})
                });
              }
            } else {
              // Handle sentiment models
              const result = await this.multiModelAnalyzer.analyzeWithModel(text, modelId);
              if (result) {
                lineResults.push({
                  analyzer: result.analyzer,
                  type: 'sentiment',
                  score: result.score,
                  sentiment: result.sentiment,
                  metadata: result.metadata
                });
              }
            }
          } catch (error) {
            console.warn(`Model ${modelInfo.displayName} failed on line ${lineIndex + 1}:`, error);
            lineResults.push({
              analyzer: modelInfo.displayName,
              type: classificationModels.has(modelId) ? 'classification' : 'sentiment',
              score: 0,
              sentiment: 'error',
              topClass: 'ERROR',
              confidence: 0,
              metadata: { error: true }
            });
          }
        }
      }
      
      // Add unified row with mixed results
      await this.incrementalRenderer.addUnifiedRow({
        lineIndex,
        text,
        results: lineResults
      });

      // Store unified results for export - keep the same structure as the UI
      unifiedResults.push({
        lineIndex,
        text,
        results: lineResults
      });

      // Small delay for visual streaming effect
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Mark complete
    this.incrementalRenderer.complete();
    progressCallback?.('Analysis complete!', 100);

    // Store unified results for export - clean type-safe approach
    if (unifiedResults.length > 0) {
      this.collectedResults = {
        type: 'multimodal',
        lines,
        data: unifiedResults,
        columns
      };
    } else {
      this.collectedResults = null;
    }
  }

  // Removed analyzeClassificationWithStreaming - all models are handled together now
}