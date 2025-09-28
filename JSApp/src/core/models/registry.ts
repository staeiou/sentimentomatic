import type { ModelConfig, AnalyzerPreset } from './types';

export const MODEL_REGISTRY: Record<string, ModelConfig> = {
  'distilbert-sst2': {
    id: 'distilbert-sst2',
    name: 'DistilBERT SST-2',
    description: 'Fast and accurate sentiment analysis model',
    provider: 'transformers',
    size: '250MB',
    speed: 'fast',
    accuracy: 'good',
    languages: ['en'],
    huggingFaceId: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
    metadata: {
      parameters: '66M',
      architecture: 'DistilBERT',
      trainingData: 'Stanford Sentiment Treebank v2',
      license: 'Apache 2.0'
    }
  },
  
  'twitter-roberta': {
    id: 'twitter-roberta',
    name: 'Twitter RoBERTa',
    description: 'RoBERTa fine-tuned on Twitter sentiment data',
    provider: 'transformers',
    size: '500MB',
    speed: 'medium',
    accuracy: 'better',
    languages: ['en'],
    huggingFaceId: 'Xenova/twitter-roberta-base-sentiment-latest',
    metadata: {
      parameters: '125M',
      architecture: 'RoBERTa',
      trainingData: 'Twitter sentiment data',
      license: 'MIT'
    }
  },
  
  'financial-sentiment': {
    id: 'financial-sentiment',
    name: 'Financial DistilRoBERTa',
    description: 'Specialized sentiment analysis for financial news',
    provider: 'transformers',
    size: '350MB',
    speed: 'medium',
    accuracy: 'better',
    languages: ['en'],
    huggingFaceId: 'Xenova/finbert',
    metadata: {
      parameters: '82M',
      architecture: 'DistilRoBERTa',
      trainingData: 'Financial news sentiment data',
      license: 'Apache 2.0'
    }
  },
  
  'multilingual-sentiment': {
    id: 'multilingual-sentiment',
    name: 'Multilingual BERT',
    description: 'Sentiment analysis for multiple languages',
    provider: 'transformers',
    size: '680MB',
    speed: 'slow',
    accuracy: 'best',
    languages: ['en', 'es', 'fr', 'de', 'it', 'pt'],
    huggingFaceId: 'Xenova/bert-base-multilingual-uncased-sentiment',
    metadata: {
      parameters: '110M',
      architecture: 'BERT',
      trainingData: 'Multilingual product reviews',
      license: 'Apache 2.0'
    }
  },
  
  'multilingual-student': {
    id: 'multilingual-student',
    name: 'Multilingual DistilBERT',
    description: 'Compact multilingual sentiment model',
    provider: 'transformers',
    size: '280MB',
    speed: 'fast',
    accuracy: 'good',
    languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl'],
    huggingFaceId: 'Xenova/distilbert-base-multilingual-cased-sentiments-student',
    metadata: {
      parameters: '68M',
      architecture: 'DistilBERT',
      trainingData: 'Multilingual sentiment data',
      license: 'Apache 2.0'
    }
  }
};

export const ANALYZER_PRESETS: Record<string, AnalyzerPreset> = {
  'fast': {
    id: 'fast',
    name: 'Fast & Light',
    description: 'Quick analysis with minimal resource usage',
    models: {
      transformers: 'distilbert-sst2'
    },
    performance: {
      speed: 'fast',
      accuracy: 'good',
      resourceUsage: 'low'
    }
  },
  
  'balanced': {
    id: 'balanced',
    name: 'Specialized',
    description: 'Financial domain specialized model',
    models: {
      transformers: 'financial-sentiment'
    },
    performance: {
      speed: 'medium',
      accuracy: 'better',
      resourceUsage: 'medium'
    }
  },
  
  'accurate': {
    id: 'accurate',
    name: 'High Accuracy',
    description: 'Best accuracy, slower processing',
    models: {
      transformers: 'multilingual-sentiment'
    },
    performance: {
      speed: 'slow',
      accuracy: 'best',
      resourceUsage: 'high'
    }
  }
};

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return MODEL_REGISTRY[modelId];
}

export function getPreset(presetId: string): AnalyzerPreset | undefined {
  return ANALYZER_PRESETS[presetId];
}

export function getAllModels(): ModelConfig[] {
  return Object.values(MODEL_REGISTRY);
}

export function getAllPresets(): AnalyzerPreset[] {
  return Object.values(ANALYZER_PRESETS);
}

export function getModelsByProvider(provider: ModelConfig['provider']): ModelConfig[] {
  return getAllModels().filter(model => model.provider === provider);
}