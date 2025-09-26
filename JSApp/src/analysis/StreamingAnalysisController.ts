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

  /**
   * Clear all loaded models to free memory (keeps results intact)
   */
  async clearAllModels(): Promise<void> {
    // Clear all models from MultiModelAnalyzer
    const modelIds = this.multiModelAnalyzer.getEnabledModelIds();
    for (const modelId of modelIds) {
      try {
        await this.multiModelAnalyzer.unloadSingleModel(modelId);
      } catch (error) {
        console.warn(`Failed to unload model ${modelId}:`, error);
      }
    }

    console.log('🧹 Cleared all models from memory (results preserved)');
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

    // Initialize worker at the start if using worker mode
    await this.multiModelAnalyzer.initializeWorker();

    // Helper function to determine if a model result is classification
    const isClassificationResult = (metadata: any): boolean => {
      // Check model type in metadata
      if (metadata?.modelType) {
        return metadata.modelType !== 'sentiment';
      }
      // Fallback: if there are multiple classes in fullRawOutput, it's classification
      if (metadata?.fullRawOutput && Array.isArray(metadata.fullRawOutput)) {
        return metadata.fullRawOutput.length > 3; // More than 3 classes = classification
      }
      return false;
    };

    // Initialize unified results storage - use proper type
    const unifiedResults: UnifiedAnalysisResult[] = [];
    
    // Build list of all columns with their types
    const columns: Array<{name: string, type: 'sentiment' | 'classification', modelId?: string}> = [];
    
    // Add rule-based analyzers (all sentiment)
    for (const analyzer of selectedAnalyzers) {
      columns.push({ name: analyzer.toUpperCase(), type: 'sentiment' });
    }
    
    // Add ML models (type will be determined dynamically during analysis)
    for (const modelId of selectedModels) {
      const modelInfo = this.multiModelAnalyzer.getEnabledModels().get(modelId);
      const displayName = modelInfo ? modelInfo.displayName : modelId;
      // Default to sentiment, will be updated based on actual results
      columns.push({ name: displayName, type: 'sentiment', modelId });
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
              // Use analyzeWithModel for everything - it now handles all model types
              const result = await this.multiModelAnalyzer.analyzeWithModel(text, modelId);
              if (result) {
                // Determine if this is a classification or sentiment model from metadata
                const isClassification = isClassificationResult(result.metadata);

                if (isClassification) {
                  // Handle as classification model
                  const cellResult = {
                    analyzer: result.analyzer,
                    type: 'classification' as const,
                    topClass: result.metadata?.topLabel || result.metadata?.rawPrediction?.label || 'Unknown',
                    confidence: result.score, // Already 0-1 from our fix
                    allClasses: result.metadata?.fullRawOutput?.reduce((acc: any, pred: any) => {
                      acc[pred.label] = pred.score;
                      return acc;
                    }, {}) || {},
                    metadata: result.metadata
                  };

                  this.incrementalRenderer.updateAnalysisCell(lineIndex, modelInfo.displayName, cellResult);
                  unifiedResults[lineIndex].results.push(cellResult);
                } else {
                  // Handle as sentiment model
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
              // Default to sentiment type for errors
              const errorResult = {
                analyzer: modelInfo.displayName,
                type: 'sentiment' as const,
                score: 0,
                sentiment: 'neutral' as const, // Fix: use valid sentiment value
                topClass: 'ERROR',
                confidence: 0,
                metadata: { error: true, errorMessage: String(error) }
              };

              this.incrementalRenderer.updateAnalysisCell(lineIndex, modelInfo.displayName, errorResult);
              unifiedResults[lineIndex].results.push(errorResult);
            }

            // Small delay for visual effect
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          // STEP 3: ALWAYS unload model to free memory after processing all rows
          // Only keep cached if explicitly requested AND it's not the last model
          const shouldKeepCached = config.keepModelsCached === true;

          if (shouldKeepCached) {
            progressCallback?.(`✅ Keeping ${modelInfo.displayName} cached for future use`, 30 + ((completedAnalyzers + 0.9) / totalAnalyzers) * 70);
            console.log(`📦 Model ${modelInfo.displayName} kept in memory (user requested)`);
          } else {
            // Default behavior: ALWAYS unload to free memory
            progressCallback?.(`🗑️ Unloading ${modelInfo.displayName} to free memory...`, 30 + ((completedAnalyzers + 0.9) / totalAnalyzers) * 70);
            await this.multiModelAnalyzer.unloadSingleModel(modelId);
            console.log(`✅ Model ${modelInfo.displayName} unloaded to free ${modelInfo.displayName} memory`);
          }

        } catch (error) {
          console.error(`❌ Failed to process model ${modelInfo.displayName}:`, error);
          // ALWAYS unload the model on error to free memory
          try {
            await this.multiModelAnalyzer.unloadSingleModel(modelId);
            console.log(`🗑️ Unloaded ${modelInfo.displayName} after error to free memory`);
          } catch (unloadError) {
            console.warn(`⚠️ Failed to unload ${modelInfo.displayName}:`, unloadError);
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

    // CRITICAL: Terminate worker to COMPLETELY FREE ALL MEMORY
    // This is the ONLY way to truly free WASM memory
    if (!config.keepModelsCached) {
      console.log('💥 TERMINATING WORKER TO FREE ALL MEMORY...');
      await this.multiModelAnalyzer.terminateWorker();

      // Also unload non-worker models if any
      await this.multiModelAnalyzer.unloadAllModels();

      console.log('✅ ALL MEMORY FREED - Worker terminated and models unloaded');
    }
  }

  // Removed analyzeClassificationWithStreaming - all models are handled together now
}