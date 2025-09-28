/**
 * Model compatibility utilities for browser-based inference
 */

export interface CompatibleModel {
  id: string;
  name: string;
  description: string;
  task: 'sentiment-analysis' | 'text-classification' | 'toxicity-detection';
  verified: boolean;
}

export const COMPATIBLE_MODELS: CompatibleModel[] = [
  // Sentiment Analysis Models
  {
    id: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
    name: 'DistilBERT SST-2',
    description: 'Fast sentiment analysis (positive/negative)',
    task: 'sentiment-analysis',
    verified: true
  },
  {
    id: 'Xenova/twitter-roberta-base-sentiment-latest',
    name: 'Twitter RoBERTa',
    description: 'Sentiment analysis optimized for social media',
    task: 'sentiment-analysis',
    verified: true
  },
  {
    id: 'Xenova/distilroberta-finetuned-financial-news-sentiment-analysis',
    name: 'Financial DistilRoBERTa',
    description: 'Sentiment analysis for financial news',
    task: 'sentiment-analysis',
    verified: true
  },
  {
    id: 'Xenova/bert-base-multilingual-uncased-sentiment',
    name: 'Multilingual BERT',
    description: 'Sentiment analysis for multiple languages',
    task: 'sentiment-analysis',
    verified: true
  },
  {
    id: 'Xenova/distilbert-base-multilingual-cased-sentiments-student',
    name: 'Multilingual DistilBERT',
    description: 'Lightweight multilingual sentiment analysis',
    task: 'sentiment-analysis',
    verified: true
  },
  
  // Text Classification Models
  {
    id: 'Xenova/toxic-bert',
    name: 'Toxic BERT',
    description: 'Detects toxic/offensive content',
    task: 'toxicity-detection',
    verified: true
  },
  {
    id: 'Xenova/bert-base-uncased-emotion',
    name: 'Emotion BERT',
    description: 'Classifies emotions (joy, sadness, anger, etc.)',
    task: 'text-classification',
    verified: true
  },
  {
    id: 'Xenova/distilbert-base-uncased-emotion',
    name: 'DistilBERT Emotion',
    description: 'Fast emotion classification',
    task: 'text-classification',
    verified: true
  }
];

/**
 * Check if a model ID is likely to be compatible
 */
export function isLikelyCompatible(modelId: string): boolean {
  // Xenova models are pre-converted to ONNX
  if (modelId.startsWith('Xenova/')) {
    return true;
  }
  
  // Check if it's in our verified list
  return COMPATIBLE_MODELS.some(m => m.id === modelId);
}

/**
 * Get suggestions for compatible models based on task
 */
export function getSuggestedModels(task?: string): CompatibleModel[] {
  if (!task) {
    return COMPATIBLE_MODELS;
  }
  
  return COMPATIBLE_MODELS.filter(m => m.task === task);
}

/**
 * Convert a regular HuggingFace model ID to Xenova version if available
 */
export function getXenovaEquivalent(modelId: string): string | null {
  const modelMap: Record<string, string> = {
    'unitary/toxic-bert': 'Xenova/toxic-bert',
    'distilbert-base-uncased-finetuned-sst-2-english': 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
    'nlptown/bert-base-multilingual-uncased-sentiment': 'Xenova/bert-base-multilingual-uncased-sentiment',
    'cardiffnlp/twitter-roberta-base-sentiment-latest': 'Xenova/twitter-roberta-base-sentiment-latest',
  };
  
  // Check direct mapping
  if (modelMap[modelId]) {
    return modelMap[modelId];
  }
  
  // Check without username prefix
  const modelName = modelId.split('/').pop();
  for (const [key, value] of Object.entries(modelMap)) {
    if (key.endsWith('/' + modelName) || key === modelName) {
      return value;
    }
  }
  
  return null;
}