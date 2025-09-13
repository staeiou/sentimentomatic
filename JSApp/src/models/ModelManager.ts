import type { ModelConfig, ModelLoadingState, ModelManagerConfig } from './types';
import { getModelConfig } from './registry';

export class ModelManager {
  private loadingStates = new Map<string, ModelLoadingState>();
  private loadedModels = new Map<string, any>();
  private config: ModelManagerConfig;
  private eventListeners = new Map<string, Set<(state: ModelLoadingState) => void>>();
  private transformersModule: any = null; // Cache the transformers module

  constructor(config: Partial<ModelManagerConfig> = {}) {
    this.config = {
      cacheEnabled: true,
      maxCacheSize: 2048, // 2GB
      defaultPreset: 'fast',
      autoDownload: false,
      ...config
    };
  }

  /**
   * Get the current loading state of a model
   */
  getModelState(modelId: string): ModelLoadingState {
    return this.loadingStates.get(modelId) || { status: 'idle' };
  }

  /**
   * Check if a model is ready for use
   */
  isModelReady(modelId: string): boolean {
    return this.getModelState(modelId).status === 'ready';
  }

  /**
   * Get a loaded model instance
   */
  getModel(modelId: string): any | null {
    return this.loadedModels.get(modelId) || null;
  }

  /**
   * Load a model asynchronously
   */
  async loadModel(modelId: string): Promise<any> {
    let modelConfig = getModelConfig(modelId);
    
    // Check for temporary model configs (for custom HuggingFace models)
    if (!modelConfig && (this as any).tempModelConfigs) {
      modelConfig = (this as any).tempModelConfigs.get(modelId);
    }
    
    if (!modelConfig) {
      throw new Error(`Model '${modelId}' not found in registry`);
    }

    // Check if already loaded
    if (this.isModelReady(modelId)) {
      console.log(`✅ ${modelConfig.name} already loaded from cache`);
      return this.getModel(modelId);
    }

    // Check if already loading
    const currentState = this.getModelState(modelId);
    if (currentState.status === 'loading') {
      return this.waitForModel(modelId);
    }

    // Start loading
    this.updateModelState(modelId, { status: 'loading', progress: 0 });

    try {
      const model = await this.loadModelByProvider(modelConfig);
      this.loadedModels.set(modelId, model);
      this.updateModelState(modelId, { status: 'ready', progress: 100 });
      return model;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateModelState(modelId, { 
        status: 'error', 
        error: errorMessage 
      });
      throw error;
    }
  }

  /**
   * Load model based on provider type
   */
  private async loadModelByProvider(config: ModelConfig): Promise<any> {
    switch (config.provider) {
      case 'transformers':
        return this.loadTransformersModel(config);
      case 'local':
        return this.loadLocalModel(config);
      case 'api':
        return this.loadApiModel(config);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  /**
   * Load a Transformers.js model
   */
  private async loadTransformersModel(config: ModelConfig): Promise<any> {
    if (!config.huggingFaceId) {
      throw new Error('HuggingFace ID required for transformers models');
    }

    console.log(`🤖 Loading ${config.name} from HuggingFace...`);
    console.log(`📍 Original Model ID: ${config.huggingFaceId}`);
    
    // Clean the model ID to avoid URL doubling and formatting issues
    let modelId = config.huggingFaceId.trim();
    
    // Handle various input formats
    if (modelId.startsWith('https://huggingface.co/')) {
      modelId = modelId.replace('https://huggingface.co/', '');
      console.log(`🧹 Stripped URL prefix from model ID`);
    }
    if (modelId.startsWith('http://huggingface.co/')) {
      modelId = modelId.replace('http://huggingface.co/', '');
      console.log(`🧹 Stripped HTTP URL prefix from model ID`);
    }
    if (modelId.startsWith('huggingface.co/')) {
      modelId = modelId.replace('huggingface.co/', '');
      console.log(`🧹 Stripped domain from model ID`);
    }
    // Remove trailing slash if present
    if (modelId.endsWith('/')) {
      modelId = modelId.slice(0, -1);
      console.log(`🧹 Stripped trailing slash from model ID`);
    }
    
    // Validate model ID format
    if (!modelId.includes('/')) {
      throw new Error(`Invalid model ID format: "${modelId}". Expected format: "username/model-name"`);
    }
    
    console.log(`📍 Final Model ID: ${modelId}`);
    
    // Check if model has required ONNX files
    await this.validateModelFiles(modelId);

    // Setup browser environment once
    this.setupBrowserEnvironment();

    // Load and cache transformers.js module (only once for performance)
    if (!this.transformersModule) {
      console.log(`🔧 Loading Transformers.js for the first time...`);
      const transformersUrl = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.3/dist/transformers.min.js';
      this.transformersModule = await import(/* @vite-ignore */ transformersUrl);
    }
    
    const { pipeline, env } = this.transformersModule;
    if (!pipeline || !env) {
      throw new Error('Pipeline or env not available from transformers.js');
    }
    
    // Configure environment each time (in case it gets modified)
    console.log(`🔧 Configuring Transformers.js environment...`);
    env.allowRemoteModels = true;
    env.allowLocalModels = false;
    // Try to force cache bypass
    env.cacheDir = null;
    env.useBrowserCache = false;
    env.backends.onnx.wasm.numThreads = 1;
    env.backends.onnx.wasm.simd = false;
    env.backends.onnx.webgl = false;
    env.backends.onnx.webgpu = false;
    env.useQuantized = true;
    
    // Debug the actual CDN URL being used
    console.log(`🔧 Environment remoteHost: ${env.remoteHost}`);
    console.log(`🔧 Environment remotePathTemplate: ${env.remotePathTemplate}`);
    console.log(`🔧 Environment allowRemoteModels: ${env.allowRemoteModels}`);
    console.log(`🔧 Environment allowLocalModels: ${env.allowLocalModels}`);
    console.log(`🔧 Environment cacheDir: ${env.cacheDir}`);
    console.log(`🔧 Environment useBrowserCache: ${env.useBrowserCache}`);
    console.log(`🔧 Environment useCache: ${env.useCache}`);

    // Try to force model conversion if ONNX files are missing
    console.log(`🚀 Attempting to create pipeline for ${modelId}...`);
    
    // Check model type and determine appropriate task
    const isXenovaModel = modelId.startsWith('Xenova/');
    
    // Determine the correct task based on model ID
    let knownTasks = ['text-classification', 'sentiment-analysis'];
    if (modelId.includes('go_emotions') || modelId.includes('GoEmotions')) {
      // GoEmotions is specifically a text-classification model
      knownTasks = ['text-classification'];
    } else if (modelId.includes('moderation') || modelId.includes('IPTC') || modelId.includes('COVID')) {
      // Classification models
      knownTasks = ['text-classification'];
    } else if (modelId.includes('sentiment') || modelId.includes('sst') || modelId.includes('imdb')) {
      // Sentiment models
      knownTasks = ['sentiment-analysis', 'text-classification'];
    }
    
    console.log(`🔍 Model type detection: ${isXenovaModel ? 'Xenova/ONNX model' : 'Standard model'}`);

    // Create pipeline with progress tracking
    const task = knownTasks[0]; // Use the primary task for this model type
    console.log(`🎯 Using ${task} task for ${modelId}...`);
    
    // Monkey-patch fetch to see what's being requested
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0] as string;
      if (url?.includes('tokenizer.json') || url?.includes('config.json')) {
        console.log(`🔍 Fetching: ${url}`);
        const response = await originalFetch(...args);
        const clonedResponse = response.clone();
        try {
          const text = await clonedResponse.text();
          if (text.startsWith('<') || text.startsWith('<!')) {
            console.error(`❌ Got HTML instead of JSON from: ${url}`);
            console.error(`First 200 chars: ${text.substring(0, 200)}`);
          }
        } catch (e) {
          console.error(`Failed to inspect response from ${url}`, e);
        }
        return response;
      }
      return originalFetch(...args);
    };
    
    const pipelineOptions = {
      quantized: true, // Always try quantized first
      progress_callback: (data: any) => {
        // Don't log progress events to reduce spam
        if (data.status === 'progress') return;
        
        if (data.status === 'downloading' || data.status === 'download') {
          const progress = Math.round(data.progress || 0);
          this.updateModelState(config.id, { 
            status: 'loading', 
            progress,
            downloadedSize: data.loaded,
            totalSize: data.total
          });
          console.log(`📥 Downloading ${config.name}: ${data.file || 'unknown file'}`);
        } else if (data.status === 'done') {
          console.log(`✅ ${config.name}: ${data.file || 'file'} ready`);
        } else if (data.status === 'error') {
          console.error(`❌ Error loading ${data.file}:`, data);
        }
      }
    };
    
    // Restore original fetch after pipeline creation
    const restoreFetch = () => { window.fetch = originalFetch; };
    
    let model;
    try {
      model = await pipeline(task, modelId, pipelineOptions);
      console.log(`✅ ${config.name} loaded successfully with ${task} task`);
    } catch (error: any) {
      restoreFetch(); // Restore original fetch on error
      // If quantized fails, try non-quantized
      if (error.message?.includes('IR version')) {
        console.log(`🔄 Retrying without quantization...`);
        pipelineOptions.quantized = false;
        model = await pipeline(task, modelId, pipelineOptions);
        console.log(`✅ ${config.name} loaded successfully (non-quantized)`);
      } else {
        throw error;
      }
    } finally {
      restoreFetch(); // Always restore original fetch
    }
    
    if (!model) {
      throw new Error(`Failed to load model "${modelId}"`);
    }
    return model;
  }

  /**
   * Validate that model has required ONNX files
   */
  private async validateModelFiles(modelId: string): Promise<void> {
    const baseUrl = `https://huggingface.co/${modelId}/resolve/main`;
    const requiredFiles = [
      'config.json',
      'tokenizer.json',
      'tokenizer_config.json'
    ];
    
    const onnxFiles = [
      'onnx/model.onnx',
      'onnx/model_quantized.onnx',
      'model.onnx'
    ];

    console.log(`🔍 Checking model files for ${modelId}...`);

    // Check config files
    let configFilesFound = 0;
    for (const file of requiredFiles) {
      const url = `${baseUrl}/${file}`;
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          console.log(`✅ Found ${file}`);
          configFilesFound++;
        } else {
          console.warn(`⚠️ Missing ${file} (${response.status})`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to check ${file}:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Check for ONNX files
    let foundOnnx = false;
    for (const file of onnxFiles) {
      const url = `${baseUrl}/${file}`;
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          console.log(`✅ Found ONNX model: ${file}`);
          foundOnnx = true;
          break;
        } else {
          console.log(`⚠️ ONNX file ${file} not found (${response.status})`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to check ONNX file ${file}:`, error instanceof Error ? error.message : String(error));
      }
    }

    console.log(`📊 File validation summary: ${configFilesFound}/${requiredFiles.length} config files, ONNX: ${foundOnnx ? 'found' : 'missing'}`);
    
    if (!foundOnnx) {
      console.warn(`⚠️ No ONNX files found. Model may need conversion or may not work in browser.`);
    }
  }

  /**
   * Placeholder for local model loading
   */
  private async loadLocalModel(_config: ModelConfig): Promise<any> {
    throw new Error('Local model loading not implemented yet');
  }

  /**
   * Placeholder for API model loading
   */
  private async loadApiModel(_config: ModelConfig): Promise<any> {
    throw new Error('API model loading not implemented yet');
  }

  /**
   * Wait for a model that's currently loading
   */
  private async waitForModel(modelId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const checkState = () => {
        const state = this.getModelState(modelId);
        if (state.status === 'ready') {
          resolve(this.getModel(modelId));
        } else if (state.status === 'error') {
          reject(new Error(state.error || 'Model loading failed'));
        } else {
          setTimeout(checkState, 100);
        }
      };
      checkState();
    });
  }

  /**
   * Update model loading state and notify listeners
   */
  private updateModelState(modelId: string, state: Partial<ModelLoadingState>): void {
    const currentState = this.getModelState(modelId);
    const newState = { ...currentState, ...state };
    this.loadingStates.set(modelId, newState);

    // Notify listeners
    const listeners = this.eventListeners.get(modelId);
    if (listeners) {
      listeners.forEach(listener => listener(newState));
    }
  }

  /**
   * Subscribe to model loading state changes
   */
  onModelStateChange(modelId: string, callback: (state: ModelLoadingState) => void): () => void {
    if (!this.eventListeners.has(modelId)) {
      this.eventListeners.set(modelId, new Set());
    }
    
    const listeners = this.eventListeners.get(modelId)!;
    listeners.add(callback);

    // Return unsubscribe function
    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(modelId);
      }
    };
  }

  /**
   * Unload a model to free memory
   */
  unloadModel(modelId: string): void {
    this.loadedModels.delete(modelId);
    this.loadingStates.delete(modelId);
    console.log(`🗑️ Unloaded model: ${modelId}`);
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): { loadedModels: number; totalMemoryMB: number } {
    return {
      loadedModels: this.loadedModels.size,
      totalMemoryMB: 0 // TODO: Implement actual memory calculation
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): ModelManagerConfig {
    return this.config;
  }

  /**
   * Setup browser environment for ONNX Runtime Web
   */
  private setupBrowserEnvironment(): void {
    if (typeof window === 'undefined') return;
    
    const w = window as any;
    
    w.global = globalThis;
    w.process = w.process || {
      env: { NODE_ENV: 'production' },
      nextTick: (fn: Function) => setTimeout(fn, 0),
      version: '18.0.0'
    };
    
    w.Buffer = w.Buffer || {
      isBuffer: () => false,
      from: (data: any) => new Uint8Array(data),
      alloc: (size: number) => new Uint8Array(size)
    };
    
    w.module = w.module || { exports: {} };
    w.exports = w.exports || {};
    w.__dirname = w.__dirname || '/';
    w.__filename = w.__filename || '/index.js';
  }
}