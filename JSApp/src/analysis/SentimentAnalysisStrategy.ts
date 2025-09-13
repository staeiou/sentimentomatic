import { AnalysisStrategy, AnalysisResult, SentimentResult } from './AnalysisStrategy';
import { AnalyzerRegistry } from '../analyzers';
import { MultiModelAnalyzer } from '../analyzers/MultiModelAnalyzer';

export class SentimentAnalysisStrategy implements AnalysisStrategy {
  constructor(
    private analyzerRegistry: AnalyzerRegistry,
    private multiModelAnalyzer: MultiModelAnalyzer,
    private selectedRuleBasedAnalyzers: string[],
    private selectedHuggingFaceModels: string[]
  ) {}

  async validate(): Promise<string | null> {
    if (this.selectedRuleBasedAnalyzers.length === 0 && this.selectedHuggingFaceModels.length === 0) {
      return 'Please select at least one sentiment analyzer';
    }
    return null;
  }

  async analyze(lines: string[], progressCallback?: (status: string, progress: number, lineResult?: any) => void): Promise<AnalysisResult> {
    const results: SentimentResult[] = [];

    // Initialize rule-based analyzers
    for (const analyzerName of this.selectedRuleBasedAnalyzers) {
      if (!this.analyzerRegistry.isAnalyzerReady(analyzerName)) {
        progressCallback?.(`Initializing ${analyzerName.toUpperCase()}...`, 0);
        await this.analyzerRegistry.initializeAnalyzer(analyzerName);
      }
    }

    // Initialize HuggingFace models
    if (this.selectedHuggingFaceModels.length > 0) {
      progressCallback?.('Initializing neural models...', 0);
      await this.multiModelAnalyzer.initialize((status, progress) => {
        progressCallback?.(status, progress);
      });
    }

    // Process each line
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const text = lines[lineIndex];
      const lineResults: SentimentResult['results'] = [];

      progressCallback?.(`Analyzing line ${lineIndex + 1}/${lines.length}...`, (lineIndex / lines.length) * 100);

      // Run rule-based analyzers
      for (const analyzerName of this.selectedRuleBasedAnalyzers) {
        const analyzer = this.analyzerRegistry.getAnalyzer(analyzerName);
        if (analyzer?.isReady()) {
          try {
            const result = await analyzer.analyze(text);
            if (Array.isArray(result)) {
              lineResults.push(...result.map(r => ({
                analyzer: r.analyzer,
                score: r.score,
                sentiment: r.sentiment,
                metadata: r.metadata
              })));
            } else {
              lineResults.push({
                analyzer: result.analyzer,
                score: result.score,
                sentiment: result.sentiment,
                metadata: result.metadata
              });
            }
          } catch (error) {
            console.warn(`⚠️ ${analyzerName} failed on line ${lineIndex + 1}:`, error);
          }
        }
      }

      // Run HuggingFace models
      if (this.selectedHuggingFaceModels.length > 0) {
        try {
          const hfResults = await this.multiModelAnalyzer.analyze(text);
          for (const result of hfResults) {
            if (result) {
              lineResults.push({
                analyzer: result.analyzer,
                score: result.score,
                sentiment: result.sentiment,
                metadata: result.metadata
              });
            }
          }
        } catch (error) {
          console.warn(`⚠️ HuggingFace models failed on line ${lineIndex + 1}:`, error);
        }
      }

      const lineResult: SentimentResult = {
        lineIndex,
        text,
        results: lineResults
      };
      
      results.push(lineResult);
      
      // Send the line result to the callback for incremental rendering
      progressCallback?.(
        `Analyzed line ${lineIndex + 1}/${lines.length}`,
        ((lineIndex + 1) / lines.length) * 100,
        lineResult
      );
    }

    return {
      type: 'sentiment',
      lines,
      data: results
    };
  }
}