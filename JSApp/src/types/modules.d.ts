// Type declarations for modules without TypeScript definitions

declare module 'sentiment' {
  interface SentimentResult {
    score: number;
    comparative: number;
    calculation: Array<{ [word: string]: number }>;
    tokens: string[];
    words: string[];
    positive: string[];
    negative: string[];
  }

  export default class Sentiment {
    constructor();
    analyze(text: string): SentimentResult;
  }
}

declare module 'vader-sentiment' {
  interface VaderScores {
    compound: number;
    pos: number;
    neg: number;
    neu: number;
  }

  export const SentimentIntensityAnalyzer: {
    polarity_scores(text: string): VaderScores;
  };
}