export interface AnalysisResult {
  type: 'sentiment' | 'classification';
  lines: string[];
  data: SentimentResult[] | ClassificationResult[];
}

export interface UnifiedAnalysisResult {
  lineIndex: number;
  text: string;
  results: Array<{
    analyzer: string;
    type: 'sentiment' | 'classification';
    score?: number;
    sentiment?: string;
    topClass?: string;
    confidence?: number;
    allClasses?: {[key: string]: number};
    metadata?: any;
  }>;
}

export interface MultiModalAnalysisResult {
  type: 'multimodal';
  lines: string[];
  data: UnifiedAnalysisResult[];
  columns: Array<{name: string, type: 'sentiment' | 'classification', modelId?: string}>;
}

export interface SentimentResult {
  lineIndex: number;
  text: string;
  results: Array<{
    analyzer: string;
    score: number; // -1 to +1
    sentiment: 'positive' | 'negative' | 'neutral';
    metadata?: any;
  }>;
}

export interface ClassificationResult {
  lineIndex: number;
  text: string;
  model: string;
  allClasses: { [className: string]: number };
  topClass: string;
  confidence: number;
}

export interface AnalysisStrategy {
  validate(): Promise<string | null>; // null = valid, string = error message
  analyze(lines: string[], progressCallback?: (status: string, progress: number) => void): Promise<AnalysisResult>;
}