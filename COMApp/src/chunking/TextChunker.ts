export interface ChunkConfig {
  maxChars: number;  // Approximate character limit (roughly 3 chars per token)
  overlap: number;   // Overlap between chunks (0-1, e.g., 0.5 = 50% overlap)
}

export interface TextChunk {
  text: string;
  index: number;
  start: number;
  end: number;
}

export class TextChunker {
  private config: ChunkConfig;

  constructor(config?: Partial<ChunkConfig>) {
    // Default: ~480 tokens (1440 chars) with 50% overlap
    // Conservative to stay under 512 token limit
    this.config = {
      maxChars: 1440,  // ~480 tokens (3 chars per token estimate)
      overlap: 0.5,
      ...config
    };
  }

  /**
   * Chunk text into overlapping segments
   * For MVP: Simple character-based chunking
   * TODO: Upgrade to proper tokenizer-based chunking
   */
  chunkText(text: string): TextChunk[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // For short texts, return as single chunk
    if (text.length <= this.config.maxChars) {
      return [{
        text: text.trim(),
        index: 0,
        start: 0,
        end: text.length
      }];
    }

    const chunks: TextChunk[] = [];
    const stride = Math.floor(this.config.maxChars * (1 - this.config.overlap));
    let position = 0;
    let chunkIndex = 0;

    while (position < text.length) {
      const endPosition = Math.min(position + this.config.maxChars, text.length);
      let chunkText = text.substring(position, endPosition);

      // Try to break at sentence boundaries if possible
      if (endPosition < text.length) {
        const lastPeriod = chunkText.lastIndexOf('.');
        const lastQuestion = chunkText.lastIndexOf('?');
        const lastExclaim = chunkText.lastIndexOf('!');
        const lastNewline = chunkText.lastIndexOf('\n');

        const lastSentenceBoundary = Math.max(
          lastPeriod,
          lastQuestion,
          lastExclaim,
          lastNewline
        );

        // Only break at sentence boundary if it's not too far back
        if (lastSentenceBoundary > chunkText.length * 0.5) {
          chunkText = chunkText.substring(0, lastSentenceBoundary + 1);
        }
      }

      chunks.push({
        text: chunkText.trim(),
        index: chunkIndex,
        start: position,
        end: position + chunkText.length
      });

      position += stride;
      chunkIndex++;

      // Prevent infinite loop
      if (chunkIndex > 100) {
        console.warn('Too many chunks, breaking to prevent infinite loop');
        break;
      }
    }

    return chunks;
  }

  /**
   * Aggregate scores from multiple chunks
   * Uses logit averaging for better probability combination
   */
  aggregateScores(chunkScores: number[][]): number[] {
    if (chunkScores.length === 0) {
      return [];
    }

    const numLabels = chunkScores[0].length;
    const aggregated = new Array(numLabels).fill(0);

    // Convert to logits, average, then convert back
    for (let labelIdx = 0; labelIdx < numLabels; labelIdx++) {
      const logits = chunkScores.map(scores => {
        const score = Math.max(0.0001, Math.min(0.9999, scores[labelIdx]));
        return Math.log(score / (1 - score));
      });

      const avgLogit = logits.reduce((a, b) => a + b, 0) / logits.length;
      aggregated[labelIdx] = 1 / (1 + Math.exp(-avgLogit));
    }

    return aggregated;
  }

  /**
   * Simple aggregation using max score
   * Alternative to logit averaging
   */
  aggregateScoresMax(chunkScores: number[][]): number[] {
    if (chunkScores.length === 0) {
      return [];
    }

    const numLabels = chunkScores[0].length;
    const aggregated = new Array(numLabels).fill(0);

    for (let labelIdx = 0; labelIdx < numLabels; labelIdx++) {
      aggregated[labelIdx] = Math.max(...chunkScores.map(scores => scores[labelIdx]));
    }

    return aggregated;
  }

  /**
   * Simple aggregation using mean score
   * Alternative to logit averaging
   */
  aggregateScoresMean(chunkScores: number[][]): number[] {
    if (chunkScores.length === 0) {
      return [];
    }

    const numLabels = chunkScores[0].length;
    const aggregated = new Array(numLabels).fill(0);

    for (let labelIdx = 0; labelIdx < numLabels; labelIdx++) {
      const sum = chunkScores.reduce((acc, scores) => acc + scores[labelIdx], 0);
      aggregated[labelIdx] = sum / chunkScores.length;
    }

    return aggregated;
  }

  /**
   * Estimate token count from character count
   * Rough approximation: ~3-4 characters per token for English
   */
  estimateTokenCount(text: string): number {
    // More accurate: count words and multiply by 1.3
    const words = text.split(/\s+/).length;
    return Math.ceil(words * 1.3);
  }

  /**
   * Check if text needs chunking
   */
  needsChunking(text: string): boolean {
    return text.length > this.config.maxChars;
  }

  /**
   * Get configuration
   */
  getConfig(): ChunkConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ChunkConfig>): void {
    this.config = { ...this.config, ...config };
  }
}