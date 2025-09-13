import { AnalysisStrategy, AnalysisResult } from './AnalysisStrategy';
import { SentimentAnalysisStrategy } from './SentimentAnalysisStrategy';
import { ContentClassificationStrategy } from './ContentClassificationStrategy';
import { IncrementalTableRenderer } from './IncrementalTableRenderer';
import { AnalyzerRegistry } from '../analyzers';
import { MultiModelAnalyzer } from '../analyzers/MultiModelAnalyzer';

export type AnalysisMode = 'sentiment' | 'classification';

export class AnalysisController {
  private currentStrategy: AnalysisStrategy | null = null;
  private incrementalRenderer: IncrementalTableRenderer | null = null;
  private currentMode: AnalysisMode = 'sentiment';

  constructor(
    private analyzerRegistry: AnalyzerRegistry,
    private multiModelAnalyzer: MultiModelAnalyzer,
    private resultsContainer: HTMLElement
  ) {}

  setMode(mode: AnalysisMode): void {
    this.currentMode = mode;
    this.currentStrategy = null; // Will be created when analyze() is called
  }

  getCurrentMode(): AnalysisMode {
    return this.currentMode;
  }

  async analyze(
    lines: string[],
    config: {
      selectedRuleBasedAnalyzers?: string[];
      selectedHuggingFaceModels?: string[];
      selectedClassificationModel?: string;
    },
    progressCallback?: (status: string, progress: number) => void
  ): Promise<AnalysisResult> {
    // Create strategy based on current mode
    this.currentStrategy = this.createStrategy(config);

    // Validate configuration
    const validationError = await this.currentStrategy.validate();
    if (validationError) {
      throw new Error(validationError);
    }

    // Initialize incremental renderer
    this.incrementalRenderer = new IncrementalTableRenderer(this.resultsContainer);
    
    // Initialize table based on mode and config
    if (this.currentMode === 'sentiment') {
      const analyzers = [
        ...(config.selectedRuleBasedAnalyzers || []).map(a => a.toUpperCase()),
        ...(config.selectedHuggingFaceModels || [])
      ];
      this.incrementalRenderer.initializeSentimentTable(analyzers);
    } else {
      // For classification, we'll initialize after getting the first result
    }

    // Create enhanced progress callback that also updates table
    const enhancedProgressCallback = (status: string, progress: number, lineResult?: any) => {
      if (progressCallback) {
        progressCallback(status, progress);
      }
      
      // If we have a line result, add it to the table
      if (lineResult && this.incrementalRenderer) {
        if (this.currentMode === 'sentiment') {
          this.incrementalRenderer.addSentimentRow(lineResult);
        } else if (this.currentMode === 'classification') {
          this.incrementalRenderer.addClassificationRow(lineResult);
        }
      }
    };

    // Perform analysis with enhanced callback
    const result = await this.currentStrategy.analyze(lines, enhancedProgressCallback as any);
    
    // Mark as complete
    if (this.incrementalRenderer) {
      this.incrementalRenderer.complete();
    }

    return result;
  }

  private createStrategy(config: {
    selectedRuleBasedAnalyzers?: string[];
    selectedHuggingFaceModels?: string[];
    selectedClassificationModel?: string;
  }): AnalysisStrategy {
    switch (this.currentMode) {
      case 'sentiment':
        return new SentimentAnalysisStrategy(
          this.analyzerRegistry,
          this.multiModelAnalyzer,
          config.selectedRuleBasedAnalyzers || [],
          config.selectedHuggingFaceModels || []
        );

      case 'classification':
        return new ContentClassificationStrategy(
          this.multiModelAnalyzer,
          config.selectedClassificationModel || ''
        );

      default:
        throw new Error(`Unknown analysis mode: ${this.currentMode}`);
    }
  }

}