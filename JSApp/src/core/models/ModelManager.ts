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

    // Load and cache transformers.js module (only once for performance).
    // v3.7.3 bundles ORT 1.22.0-dev which crashes on WebKit due to a JSEP/WASM
    // JIT bug (onnxruntime #26827) and OOM on iPadOS 17 (#22086).  The ORT
    // breakage starts at 1.21 — v3.1.1 bundles ORT 1.20.1, the last pre-1.21
    // release and the last confirmed working on WebKit 26.  ORT 1.20.1 also
    // supports opset 19 so all models load.  numThreads=1 is critical per
    // transformers.js #1242 ("JSC not doing well with multi-threaded WASM").
    if (!this.transformersModule) {
      const onWebKit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Edg|OPR|Chromium/.test(navigator.userAgent);
      const transformersUrl = onWebKit
        ? 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.1/dist/transformers.min.js'
        : 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.3/dist/transformers.min.js';
      console.log(`🔧 Loading Transformers.js (${onWebKit ? 'v3.1.1 ORT-1.20.1 WebKit-safe' : 'v3.7.3'})...`);
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
    // CRITICAL: Enable browser caching for persistence
    env.useBrowserCache = true;
    env.backends.onnx.wasm.numThreads = 1;
    env.backends.onnx.wasm.simd = false;
    env.useQuantized = true;
    env.backends.onnx.webgl = false;
    env.backends.onnx.webgpu = false;
    
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
    
    // Monkey-patch fetch to redirect ONNX files for models with non-standard structures AND monitor downloads
    const originalFetch = window.fetch;
    const downloadedFiles: {url: string, size: number, timestamp: number}[] = [];

    window.fetch = async (...args) => {
      const url = args[0] as string;

      // Log all transformers.js related requests
      if (typeof url === 'string' && url.includes('huggingface.co') && url.includes(modelId)) {
        console.log(`🌐 NETWORK: Fetching ${url}`);
      }

      // Handle ONNX file redirects for models with non-standard file structures
      if (typeof url === 'string' && url.includes('.onnx')) {
        console.log(`🔍 ONNX request detected: ${url}`);

        // Language Detection: protectai model - redirect from /onnx/ to root
        if (url.includes('protectai/xlm-roberta-base-language-detection-onnx')) {
          if (url.includes('/onnx/model_quantized.onnx')) {
            const newUrl = url.replace('/onnx/model_quantized.onnx', '/model_quantized.onnx');
            console.log(`🔀 Redirecting protectai ONNX: /onnx/ → root level`);
            return originalFetch(newUrl, args[1] as RequestInit);
          }
          if (url.includes('/onnx/model.onnx')) {
            const newUrl = url.replace('/onnx/model.onnx', '/model.onnx');
            console.log(`🔀 Redirecting protectai ONNX: /onnx/ → root level`);
            return originalFetch(newUrl, args[1] as RequestInit);
          }
          if (url.includes('/onnx/model_optimized.onnx')) {
            const newUrl = url.replace('/onnx/model_optimized.onnx', '/model_optimized.onnx');
            console.log(`🔀 Redirecting protectai ONNX: /onnx/ → root level`);
            return originalFetch(newUrl, args[1] as RequestInit);
          }
        }

        // Jigsaw Toxicity: minuva model - NUCLEAR OPTION
        if (url.includes('minuva/MiniLMv2-toxic-jigsaw-onnx')) {
          // ANY request for an ONNX file gets the one file that exists
          const actualFile = 'https://huggingface.co/minuva/MiniLMv2-toxic-jigsaw-onnx/resolve/main/model_optimized_quantized.onnx';
          console.log(`🔀 NUCLEAR REDIRECT - minuva ANY ONNX → model_optimized_quantized.onnx`);

          // Fetch the actual file but return it AS IF it was the requested file
          const response = await originalFetch(actualFile, args[1] as RequestInit);

          // Clone the response and override the URL property to match what was requested
          const fakeResponse = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });

          // Override the url property to match the original request
          Object.defineProperty(fakeResponse, 'url', {
            value: url,
            writable: false
          });

          return fakeResponse;
        }

        // Personal Info Detection: might have non-standard structure
        if (url.includes('onnx-community/piiranha-v1-detect-personal-information-ONNX')) {
          // Log but don't redirect - this model seems to work with standard structure
          console.log(`✓ Personal Info Detection ONNX request (standard structure)`);
        }

        // Industry Classification: has proper /onnx/ structure
        if (url.includes('sabatale/industry-classification-api-onnx')) {
          // Log but don't redirect - this model has the correct structure
          console.log(`✓ Industry Classification ONNX request (standard structure)`);
        }

        // Intent Classification: has proper /onnx/ structure
        if (url.includes('kousik-2310/intent-classifier-minilm')) {
          // Log but don't redirect - this model has the correct structure
          console.log(`✓ Intent Classification ONNX request (standard structure)`);
        }
      }

      // Debug logging for config files
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

      // Execute the original fetch
      const response = await originalFetch(...args);

      // Track successful downloads for this model
      if (typeof url === 'string' && url.includes('huggingface.co') && url.includes(modelId) && response.ok) {
        const contentLength = response.headers.get('content-length');
        const size = contentLength ? parseInt(contentLength) : 0;
        const timestamp = Date.now();

        downloadedFiles.push({ url, size, timestamp });
        console.log(`✅ DOWNLOADED: ${url} (${size} bytes)`);
      }

      return response;
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

      // COMPREHENSIVE DEBUG: Monitor cache status after model loading
      setTimeout(async () => {
        try {
          console.log(`🔍 COMPREHENSIVE CACHE DEBUG for ${config.name} (${config.huggingFaceId})`);
          console.log(`🔍 ================================`);

          // Report downloaded files
          console.log(`🌐 Downloaded ${downloadedFiles.length} files for this model:`);
          downloadedFiles.forEach(file => {
            const sizeKB = (file.size / 1024).toFixed(1);
            console.log(`  📁 ${file.url} (${sizeKB} KB)`);
          });
          const totalSize = downloadedFiles.reduce((sum, file) => sum + file.size, 0);
          console.log(`🌐 Total downloaded: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

          if ('caches' in window) {
            const cacheNames = await caches.keys();
            console.log(`🔍 Available caches:`, cacheNames);

            // Focus on transformers-cache specifically
            if (cacheNames.includes('transformers-cache')) {
              const cache = await caches.open('transformers-cache');
              const keys = await cache.keys();
              console.log(`🔍 transformers-cache now has ${keys.length} files total`);

              // Filter to only this model's files
              const modelFiles = keys.filter(req => req.url.includes(config.huggingFaceId || ''));
              console.log(`🔍 Files for ${config.huggingFaceId}: ${modelFiles.length}`);

              if (modelFiles.length > 0) {
                console.log(`🔍 Model files cached:`, modelFiles.map(k => k.url));

                // Test cache detection logic
                const cacheManager = new (await import('../models/CacheManager')).CacheManager();
                const isDetected = await cacheManager.isModelActuallyCached(config.huggingFaceId || '');
                console.log(`🔍 Cache detection result: ${isDetected ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
              } else {
                console.log(`❌ No files found for ${config.huggingFaceId} in transformers-cache`);
              }
            } else {
              console.log(`❌ transformers-cache not found in available caches`);
            }
          } else {
            console.log(`❌ Cache API not available`);
          }

          console.log(`🔍 ================================`);
        } catch (debugError) {
          console.warn('Comprehensive debug check failed:', debugError);
        }
      }, 2500); // Check cache 2.5 seconds after loading (after other delays)

    } catch (error: any) {
      restoreFetch(); // Restore original fetch on error

      // Try different recovery strategies based on error type
      const errorMsg = error.message || String(error);

      if (errorMsg.includes('IR version')) {
        // ONNX Runtime version mismatch - try non-quantized
        console.log(`🔄 Retrying without quantization due to IR version mismatch...`);
        pipelineOptions.quantized = false;
        model = await pipeline(task, modelId, pipelineOptions);
        console.log(`✅ ${config.name} loaded successfully (non-quantized)`);
      } else if (errorMsg.includes('Could not locate file') && errorMsg.includes('model_quantized.onnx')) {
        // Quantized model not found - try non-quantized
        console.log(`🔄 Quantized model not found, trying non-quantized...`);
        pipelineOptions.quantized = false;

        // HACK: For minuva model, transformers.js is broken and still requests model_quantized even with quantized: false
        // So we need to keep our monkey patch active for the retry
        if (modelId.includes('minuva/MiniLMv2-toxic-jigsaw-onnx')) {
          console.log(`⚠️ minuva model requires special handling - keeping redirect active`);
        }

        try {
          model = await pipeline(task, modelId, pipelineOptions);
          console.log(`✅ ${config.name} loaded successfully (non-quantized fallback)`);
        } catch (fallbackError: any) {
          const fallbackMsg = fallbackError.message || String(fallbackError);

          // If it's STILL looking for model_quantized with quantized: false, that's a transformers.js bug
          if (fallbackMsg.includes('model_quantized.onnx') && !pipelineOptions.quantized) {
            console.error(`❌ BUG: transformers.js requested model_quantized.onnx even with quantized: false!`);
            console.error(`❌ This model (${config.name}) has a non-standard ONNX file structure that transformers.js cannot handle`);
          }

          console.error(`❌ Failed to load ${config.name} with both quantized and non-quantized attempts`);
          console.error(`❌ Original error: ${errorMsg}`);
          console.error(`❌ Fallback error: ${fallbackMsg}`);
          throw error; // Throw original error
        }
      } else if (errorMsg.includes('tokenizer')) {
        // Tokenizer issue - provide helpful context
        console.error(`❌ Tokenizer error for ${config.name}: ${errorMsg}`);
        console.error(`💡 This model may require special tokenizer configuration`);
        throw error;
      } else {
        // Unknown error - log details for debugging
        console.error(`❌ Failed to load ${config.name}: ${errorMsg}`);
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

    // Define model-specific ONNX file locations
    let onnxFiles: string[] = [];

    if (modelId === 'protectai/xlm-roberta-base-language-detection-onnx') {
      // protectai has ONNX files at root level
      onnxFiles = [
        'model_quantized.onnx',
        'model_optimized.onnx',
        'model.onnx'
      ];
    } else if (modelId === 'minuva/MiniLMv2-toxic-jigsaw-onnx') {
      // minuva has non-standard filename
      onnxFiles = [
        'model_optimized_quantized.onnx'
      ];
    } else if (modelId === 'kousik-2310/intent-classifier-minilm') {
      // intent classifier might have multiple variants
      onnxFiles = [
        'onnx/model_quantized.onnx',
        'onnx/model.onnx',
        'model_quantized.onnx',
        'model.onnx'
      ];
    } else {
      // Default check for standard ONNX locations
      onnxFiles = [
        'onnx/model_quantized.onnx',
        'onnx/model.onnx',
        'model_quantized.onnx',
        'model.onnx'
      ];
    }

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

    // Check for ONNX files with model-specific paths
    let foundOnnx = false;
    let foundOnnxFile = '';
    for (const file of onnxFiles) {
      const url = `${baseUrl}/${file}`;
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          console.log(`✅ Found ONNX model: ${file}`);
          foundOnnx = true;
          foundOnnxFile = file;
          break;
        } else {
          console.log(`⚠️ ONNX file ${file} not found (${response.status})`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to check ONNX file ${file}:`, error instanceof Error ? error.message : String(error));
      }
    }

    console.log(`📊 File validation summary: ${configFilesFound}/${requiredFiles.length} config files, ONNX: ${foundOnnx ? `found (${foundOnnxFile})` : 'missing'}`);

    if (!foundOnnx) {
      console.warn(`⚠️ No ONNX files found. Model may need conversion or may not work in browser.`);
      console.warn(`⚠️ Checked locations: ${onnxFiles.join(', ')}`);
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
   * NOTE: Due to WebAssembly limitations, memory can only be marked as reusable, not actually freed.
   * To truly free memory, the page must be reloaded.
   */
  async unloadModel(modelId: string): Promise<void> {
    // Get the pipeline object before deleting
    const pipeline = this.loadedModels.get(modelId);

    if (pipeline) {
      // Call the built-in dispose() method on the pipeline
      // This marks memory as reusable (doesn't actually free it due to WASM limitations)
      if (typeof pipeline.dispose === 'function') {
        try {
          await pipeline.dispose();
          console.log(`♻️ Disposed pipeline for model: ${modelId} (memory marked as reusable)`);
        } catch (error) {
          console.warn(`⚠️ Failed to dispose pipeline for ${modelId}:`, error);
        }
      }

      // Also try to dispose the session if it exists (for ONNX runtime)
      if (pipeline.session && typeof pipeline.session.release === 'function') {
        try {
          await pipeline.session.release();
          console.log(`♻️ Released ONNX session for: ${modelId}`);
        } catch (error) {
          console.warn(`⚠️ Failed to release session for ${modelId}:`, error);
        }
      }

      // Dispose model if it has a separate dispose method
      if (pipeline.model && typeof pipeline.model.dispose === 'function') {
        try {
          await pipeline.model.dispose();
          console.log(`♻️ Disposed model tensors for: ${modelId}`);
        } catch (error) {
          console.warn(`⚠️ Failed to dispose model tensors for ${modelId}:`, error);
        }
      }

      // Clear tokenizer if it exists
      if (pipeline.tokenizer && typeof pipeline.tokenizer.dispose === 'function') {
        try {
          await pipeline.tokenizer.dispose();
        } catch (error) {
          // Ignore tokenizer disposal errors
        }
      }

      // Nullify all references to help garbage collection
      Object.keys(pipeline).forEach(key => {
        pipeline[key] = null;
      });
    }

    // Remove from maps
    this.loadedModels.delete(modelId);
    this.loadingStates.delete(modelId);

    // Remove from temp configs if present
    if ((this as any).tempModelConfigs) {
      (this as any).tempModelConfigs.delete(modelId);
    }

    // Force garbage collection hint (non-standard but helps in some browsers)
    if (typeof (globalThis as any).gc === 'function') {
      try {
        (globalThis as any).gc();
        console.log(`🧹 Triggered garbage collection after unloading ${modelId}`);
      } catch (error) {
        // Ignore GC errors
      }
    }

    console.log(`🗑️ Model unloaded: ${modelId} (Note: WASM memory can only grow, page reload required to fully free memory)`);
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