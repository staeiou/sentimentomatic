/// <reference lib="webworker" />

// Transformers.js Worker - runs models in isolated context
// Terminating this worker completely frees all memory

let transformersModule: any = null;
const loadedPipelines = new Map<string, any>();

// Message handler
self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'LOAD_MODEL':
        await handleLoadModel(payload);
        break;

      case 'RUN_INFERENCE':
        await handleRunInference(payload);
        break;

      case 'DISPOSE_MODEL':
        await handleDisposeModel(payload);
        break;

      case 'DISPOSE_ALL':
        await handleDisposeAll();
        break;

      default:
        self.postMessage({
          type: 'ERROR',
          error: `Unknown message type: ${type}`
        });
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

async function handleLoadModel(payload: {
  modelId: string;
  huggingFaceId: string;
  task?: string;
}) {
  const { modelId, huggingFaceId, task = 'text-classification' } = payload;

  // Load transformers.js if not already loaded
  if (!transformersModule) {
    console.log('[Worker] Loading transformers.js module...');
    const transformersUrl = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.3/dist/transformers.min.js';
    transformersModule = await import(/* @vite-ignore */ transformersUrl);

    const { env } = transformersModule;

    // Configure environment
    env.allowRemoteModels = true;
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    env.backends.onnx.wasm.numThreads = 1;
    env.backends.onnx.wasm.simd = false;
    env.backends.onnx.webgl = false;
    env.backends.onnx.webgpu = false;
    env.useQuantized = true;

    console.log('[Worker] Transformers.js loaded and configured');
  }

  // Check if already loaded
  if (loadedPipelines.has(modelId)) {
    self.postMessage({
      type: 'MODEL_LOADED',
      payload: { modelId, status: 'cached' }
    });
    return;
  }

  // Load the model
  const { pipeline } = transformersModule;

  console.log(`[Worker] Loading model ${modelId} (${huggingFaceId})...`);

  const pipelineInstance = await pipeline(task, huggingFaceId, {
    quantized: true,
    progress_callback: (data: any) => {
      if (data.status === 'downloading' || data.status === 'download') {
        self.postMessage({
          type: 'PROGRESS',
          payload: {
            modelId,
            progress: Math.round(data.progress || 0),
            status: 'downloading'
          }
        });
      }
    }
  });

  loadedPipelines.set(modelId, pipelineInstance);

  self.postMessage({
    type: 'MODEL_LOADED',
    payload: { modelId, status: 'ready' }
  });
}

async function handleRunInference(payload: {
  modelId: string;
  text: string;
}) {
  const { modelId, text } = payload;

  const pipeline = loadedPipelines.get(modelId);
  if (!pipeline) {
    throw new Error(`Model ${modelId} not loaded`);
  }

  // Run inference
  const result = await pipeline(text, {
    top_k: null,  // Return all classes
    return_all_scores: true
  });

  self.postMessage({
    type: 'INFERENCE_RESULT',
    payload: {
      modelId,
      result: Array.isArray(result) ? result : [result]
    }
  });
}

async function handleDisposeModel(payload: { modelId: string }) {
  const { modelId } = payload;

  const pipeline = loadedPipelines.get(modelId);
  if (pipeline) {
    // Dispose the pipeline
    if (typeof pipeline.dispose === 'function') {
      await pipeline.dispose();
    }

    // Clear references
    loadedPipelines.delete(modelId);

    console.log(`[Worker] Disposed model ${modelId}`);

    self.postMessage({
      type: 'MODEL_DISPOSED',
      payload: { modelId }
    });
  }
}

async function handleDisposeAll() {
  console.log('[Worker] Disposing all models...');

  for (const [, pipeline] of loadedPipelines) {
    if (typeof pipeline.dispose === 'function') {
      await pipeline.dispose();
    }
  }

  loadedPipelines.clear();
  transformersModule = null;

  console.log('[Worker] All models disposed');

  self.postMessage({
    type: 'ALL_DISPOSED'
  });
}

// Export for TypeScript
export {};