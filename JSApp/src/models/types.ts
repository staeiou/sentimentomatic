export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  provider: 'transformers' | 'local' | 'api';
  size: string;
  speed: 'fast' | 'medium' | 'slow';
  accuracy: 'good' | 'better' | 'best';
  languages: string[];
  huggingFaceId?: string;
  apiEndpoint?: string;
  localPath?: string;
  metadata: {
    parameters?: string;
    architecture?: string;
    trainingData?: string;
    license?: string;
  };
}

export interface AnalyzerPreset {
  id: string;
  name: string;
  description: string;
  models: {
    transformers?: string; // model ID
    // Future analyzers can be added here
  };
  performance: {
    speed: 'fast' | 'medium' | 'slow';
    accuracy: 'good' | 'better' | 'best';
    resourceUsage: 'low' | 'medium' | 'high';
  };
}

export interface ModelLoadingState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  progress?: number;
  error?: string;
  downloadedSize?: number;
  totalSize?: number;
}

export interface ModelManagerConfig {
  cacheEnabled: boolean;
  maxCacheSize: number; // MB
  defaultPreset: string;
  autoDownload: boolean;
}