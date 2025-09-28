// Core types for sentiment analysis
export interface SentimentResult {
  analyzer: string;
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number; // Raw score from analyzer (-1 to +1 for most)
  scores: {
    positive?: number;
    negative?: number;
    neutral?: number;
    compound?: number; // VADER
    comparative?: number; // AFINN
    score?: number; // AFINN raw score
  };
  processingTime: number; // milliseconds
  metadata?: Record<string, any>;
}

export interface SentimentAnalyzer {
  readonly name: string;
  readonly type: 'lexicon' | 'ml';
  analyze(text: string): Promise<SentimentResult | SentimentResult[]>;
  isReady(): boolean;
  initialize?(): Promise<void>;
  cleanup?(): void;
}

export interface AnalysisJob {
  id: string;
  lines: string[];
  analyzers: string[];
  status: 'pending' | 'processing' | 'complete' | 'error';
  results: SentimentResult[];
  startTime: number;
  endTime?: number;
}

export interface ExportData {
  metadata: {
    timestamp: string;
    totalLines: number;
    analyzersUsed: string[];
    processingTime: number;
  };
  results: SentimentResult[];
}