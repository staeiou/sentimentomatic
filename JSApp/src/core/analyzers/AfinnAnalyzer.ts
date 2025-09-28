import type { SentimentAnalyzer, SentimentResult } from '../../types/types';

export class AfinnAnalyzer implements SentimentAnalyzer {
  readonly name = 'AFINN';
  readonly type = 'lexicon' as const;
  
  private sentiment: any = null;
  private ready = false;

  constructor() {
    this.initialize();
  }

  async initialize(): Promise<void> {
    try {
      const { default: Sentiment } = await import('sentiment');
      this.sentiment = new Sentiment();
      this.ready = true;
    } catch (error) {
      console.error('Failed to initialize AFINN analyzer:', error);
      throw error;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  async analyze(text: string): Promise<SentimentResult> {
    if (!this.isReady()) {
      throw new Error('AFINN analyzer not ready');
    }

    const startTime = performance.now();
    const result = this.sentiment.analyze(text);
    const processingTime = performance.now() - startTime;

    // Determine sentiment based on score
    let sentiment: 'positive' | 'negative' | 'neutral';
    if (result.score > 0) {
      sentiment = 'positive';
    } else if (result.score < 0) {
      sentiment = 'negative';
    } else {
      sentiment = 'neutral';
    }

    return {
      analyzer: this.name,
      text,
      sentiment,
      score: result.comparative, // Raw comparative score
      scores: {
        score: result.score,
        comparative: result.comparative,
        positive: result.positive?.length || 0,
        negative: result.negative?.length || 0
      },
      processingTime,
      metadata: {
        tokens: result.tokens,
        words: result.words,
        positiveWords: result.positive,
        negativeWords: result.negative,
        calculation: result.calculation,
        fullRawOutput: result,  // Store complete raw output
        topLabel: sentiment,    // For consistent display
        topScore: result.comparative  // The comparative score
      }
    };
  }
}