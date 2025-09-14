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
      keepModelsCached?: boolean;
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
      keepModelsCached?: boolean;
    },
    progressCallback?: (status: string, progress: number) => void
  ): Promise<void> {
    const selectedAnalyzers = config.selectedRuleBasedAnalyzers || [];
    const selectedModels = config.selectedHuggingFaceModels || [];

    // Define which models are classification models
    const classificationModels = new Set([
      'go-emotions',
      'text-moderation',
      'iptc-news',
      'language-detection',
      'personal-info-detection',
      'intent-classification',
      'toxic-bert',
      'jigsaw-toxicity',
      'industry-classification'
    ]);

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
    
    // Initialize table with all text rows upfront
    this.incrementalRenderer.initializeTableWithAllText(columns, lines);

    // Initialize rule-based analyzers only (no ML models yet)
    progressCallback?.('Initializing rule-based analyzers...', 0);

    for (const analyzerName of selectedAnalyzers) {
      if (!this.analyzerRegistry.isAnalyzerReady(analyzerName)) {
        await this.analyzerRegistry.initializeAnalyzer(analyzerName);
      }
    }

    // Initialize unified results storage for export
    for (let i = 0; i < lines.length; i++) {
      unifiedResults.push({
        lineIndex: i,
        text: lines[i],
        results: []
      });
    }

    // Process ANALYZER BY ANALYZER across all lines
    const totalAnalyzers = selectedAnalyzers.length + selectedModels.length;
    let completedAnalyzers = 0;

    // Process rule-based analyzers
    for (const analyzerName of selectedAnalyzers) {
      const analyzer = this.analyzerRegistry.getAnalyzer(analyzerName);
      if (!analyzer?.isReady()) continue;

      progressCallback?.(`Running ${analyzerName.toUpperCase()} on all lines...`, 30 + (completedAnalyzers / totalAnalyzers) * 70);

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const text = lines[lineIndex];

        try {
          const result = await analyzer.analyze(text);
          const processedResult = Array.isArray(result) ? result[0] : result;

          const cellResult = {
            analyzer: processedResult.analyzer,
            type: 'sentiment' as const,
            score: processedResult.score,
            sentiment: processedResult.sentiment,
            metadata: processedResult.metadata
          };

          // Update cell in table
          this.incrementalRenderer.updateAnalysisCell(lineIndex, analyzerName.toUpperCase(), cellResult);

          // Store for export
          unifiedResults[lineIndex].results.push(cellResult);

        } catch (error) {
          console.warn(`Failed to analyze with ${analyzerName} on line ${lineIndex + 1}:`, error);
          const errorResult = {
            analyzer: analyzerName.toUpperCase(),
            type: 'sentiment' as const,
            score: 0,
            sentiment: 'neutral' as const,
            metadata: { error: true }
          };

          this.incrementalRenderer.updateAnalysisCell(lineIndex, analyzerName.toUpperCase(), errorResult);
          unifiedResults[lineIndex].results.push(errorResult);
        }

        // Small delay for visual effect
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      completedAnalyzers++;
    }

    // Process ML models with download-run-clear pattern for memory efficiency
    if (selectedModels.length > 0) {
      for (const modelId of selectedModels) {
        const modelInfo = this.multiModelAnalyzer.getEnabledModels().get(modelId);
        if (!modelInfo) continue;

        try {
          // STEP 1: Download/Load this specific model
          progressCallback?.(`📥 Loading ${modelInfo.displayName}...`, 30 + (completedAnalyzers / totalAnalyzers) * 70);
          await this.multiModelAnalyzer.initializeSingleModel(modelId, (status) => {
            progressCallback?.(`${status}`, 30 + (completedAnalyzers / totalAnalyzers) * 70);
          });

          // No need to update cache status - we read directly from browser cache now

          // STEP 2: Run this model on all lines
          progressCallback?.(`🔍 Running ${modelInfo.displayName} on all lines...`, 30 + ((completedAnalyzers + 0.5) / totalAnalyzers) * 70);

          for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const text = lines[lineIndex];

            try {
              if (classificationModels.has(modelId)) {
                // Handle classification models
                const predictions = await this.multiModelAnalyzer.getAllPredictions(text, modelId);
                if (predictions && predictions.length > 0) {
                  const topPrediction = predictions.reduce((max, current) =>
                    current.score > max.score ? current : max
                  );

                  const cellResult = {
                    analyzer: modelInfo.displayName,
                    type: 'classification' as const,
                    topClass: topPrediction.label,
                    confidence: topPrediction.score,
                    allClasses: predictions.reduce((acc, pred) => {
                      acc[pred.label] = pred.score;
                      return acc;
                    }, {} as {[key: string]: number})
                  };

                  this.incrementalRenderer.updateAnalysisCell(lineIndex, modelInfo.displayName, cellResult);
                  unifiedResults[lineIndex].results.push(cellResult);
                }
              } else {
                // Handle sentiment models
                const result = await this.multiModelAnalyzer.analyzeWithModel(text, modelId);
                if (result) {
                  const cellResult = {
                    analyzer: result.analyzer,
                    type: 'sentiment' as const,
                    score: result.score,
                    sentiment: result.sentiment,
                    metadata: result.metadata
                  };

                  this.incrementalRenderer.updateAnalysisCell(lineIndex, modelInfo.displayName, cellResult);
                  unifiedResults[lineIndex].results.push(cellResult);
                }
              }
            } catch (error) {
              console.warn(`Model ${modelInfo.displayName} failed on line ${lineIndex + 1}:`, error);
              const errorResult = {
                analyzer: modelInfo.displayName,
                type: classificationModels.has(modelId) ? 'classification' as const : 'sentiment' as const,
                score: 0,
                sentiment: 'error' as const,
                topClass: 'ERROR',
                confidence: 0,
                metadata: { error: true }
              };

              this.incrementalRenderer.updateAnalysisCell(lineIndex, modelInfo.displayName, errorResult);
              unifiedResults[lineIndex].results.push(errorResult);
            }

            // Small delay for visual effect
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          // DEBUG: Check cache before deciding to unload
          console.log(`🔍 DEBUG: About to handle caching for ${modelInfo.displayName}. keepModelsCached = ${config.keepModelsCached}`);

          // STEP 3: Unload model and clear cache (only if user doesn't want to keep them)
          if (config.keepModelsCached === false) {
            progressCallback?.(`🗑️ Clearing ${modelInfo.displayName} from cache...`, 30 + ((completedAnalyzers + 0.9) / totalAnalyzers) * 70);
            await this.multiModelAnalyzer.unloadSingleModel(modelId);
          } else {
            progressCallback?.(`✅ Keeping ${modelInfo.displayName} cached for future use`, 30 + ((completedAnalyzers + 0.9) / totalAnalyzers) * 70);
            console.log(`🔍 DEBUG: Model ${modelInfo.displayName} should stay cached`);
          }

        } catch (error) {
          console.error(`❌ Failed to process model ${modelInfo.displayName}:`, error);
          // Still try to unload the model if it was partially loaded (only if not keeping cached)
          if (config.keepModelsCached === false) {
            try {
              await this.multiModelAnalyzer.unloadSingleModel(modelId);
            } catch (unloadError) {
              console.warn(`Failed to unload ${modelInfo.displayName}:`, unloadError);
            }
          }
        }

        completedAnalyzers++;
      }
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