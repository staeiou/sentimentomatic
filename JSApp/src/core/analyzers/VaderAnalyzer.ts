import type { SentimentAnalyzer, SentimentResult } from '../../types/types';

export class VaderAnalyzer implements SentimentAnalyzer {
  readonly name = 'VADER';
  readonly type = 'lexicon' as const;
  
  private analyzer: any = null;
  private ready = false;

  constructor() {
    this.initialize();
  }

  async initialize(): Promise<void> {
    try {
      const { SentimentIntensityAnalyzer } = await import('vader-sentiment');
      this.analyzer = SentimentIntensityAnalyzer;
      this.ready = true;
    } catch (error) {
      console.error('Failed to initialize VADER analyzer:', error);
      throw error;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  async analyze(text: string): Promise<SentimentResult> {
    if (!this.isReady()) {
      throw new Error('VADER analyzer not ready');
    }

    const startTime = performance.now();
    const scores = this.analyzer.polarity_scores(text);
    const processingTime = performance.now() - startTime;

    // Determine sentiment based on compound score
    // VADER thresholds: >= 0.05 positive, <= -0.05 negative, else neutral
    let sentiment: 'positive' | 'negative' | 'neutral';
    if (scores.compound >= 0.05) {
      sentiment = 'positive';
    } else if (scores.compound <= -0.05) {
      sentiment = 'negative';
    } else {
      sentiment = 'neutral';
    }

    return {
      analyzer: this.name,
      text,
      sentiment,
      score: scores.compound, // Raw compound score (-1 to +1)
      scores: {
        compound: scores.compound,
        positive: scores.pos,
        negative: scores.neg,
        neutral: scores.neu
      },
      processingTime,
      metadata: {
        thresholds: {
          positive: '>=0.05',
          negative: '<=-0.05',
          neutral: '-0.05 to 0.05'
        },
        fullRawOutput: scores,  // Store complete raw output
        topLabel: sentiment,    // For consistent display
        topScore: scores.compound  // The compound score
      }
    };
  }
}