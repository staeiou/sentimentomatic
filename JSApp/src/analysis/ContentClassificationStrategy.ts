import { AnalysisStrategy, AnalysisResult, ClassificationResult } from './AnalysisStrategy';
import { MultiModelAnalyzer } from '../analyzers/MultiModelAnalyzer';

export class ContentClassificationStrategy implements AnalysisStrategy {
  constructor(
    private multiModelAnalyzer: MultiModelAnalyzer,
    private selectedModelId: string
  ) {}

  async validate(): Promise<string | null> {
    if (!this.selectedModelId) {
      return 'Please select a classification model';
    }
    
    if (!this.multiModelAnalyzer.hasEnabledModels()) {
      return 'Selected classification model is not available';
    }
    
    return null;
  }

  async analyze(lines: string[], progressCallback?: (status: string, progress: number) => void): Promise<AnalysisResult> {
    const results: ClassificationResult[] = [];

    // Initialize the selected model
    progressCallback?.('Initializing classification model...', 0);
    await this.multiModelAnalyzer.initialize(progressCallback);

    // Get the model info
    const enabledModels = Array.from(this.multiModelAnalyzer.getEnabledModels());
    if (enabledModels.length === 0) {
      throw new Error('No classification model available');
    }
    
    const model = enabledModels[0]; // Should be only one in classification mode

    // Process each line
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const text = lines[lineIndex];
      
      progressCallback?.(`Classifying line ${lineIndex + 1}/${lines.length}...`, (lineIndex / lines.length) * 100);

      try {
        // Get all predictions from the model (not just top one)
        const [modelId, modelInfo] = model;
        const predictions = await this.multiModelAnalyzer.getAllPredictions(text, modelId);
        
        if (predictions && predictions.length > 0) {
          // Convert to classification result format
          const allClasses: { [className: string]: number } = {};
          predictions.forEach(pred => {
            allClasses[pred.label] = pred.score;
          });

          // Find top class
          const topPrediction = predictions.reduce((max, current) => 
            current.score > max.score ? current : max
          );

          results.push({
            lineIndex,
            text,
            model: modelInfo.displayName,
            allClasses,
            topClass: topPrediction.label,
            confidence: topPrediction.score
          });
        } else {
          // Fallback if no predictions
          results.push({
            lineIndex,
            text,
            model: modelInfo.displayName,
            allClasses: { 'ERROR': 0 },
            topClass: 'ERROR',
            confidence: 0
          });
        }
      } catch (error) {
        console.warn(`⚠️ Classification failed on line ${lineIndex + 1}:`, error);
        const [, modelInfo] = model;
        results.push({
          lineIndex,
          text,
          model: modelInfo.displayName,
          allClasses: { 'ERROR': 0 },
          topClass: 'ERROR',
          confidence: 0
        });
      }
    }

    return {
      type: 'classification',
      lines,
      data: results
    };
  }
}