/// <reference lib="webworker" />

// Transformers.js Worker - runs models in isolated context
// Terminating this worker completely frees all memory

let transformersModule: any = null;
let onWebKit = false;
const loadedPipelines = new Map<string, any>();

// Detect WebKit Safari (macOS, iPadOS, iOS).
// iPadOS 13+ mimics a Mac UA, so we can't distinguish it from macOS Safari —
// but that's fine: v3.7.3 crashes on macOS Safari too (transformers.js #1242).
// Chrome/Firefox/Edge on iPadOS report CriOS/FxiOS/EdgiOS (not Chrome/Edg),
// so they are NOT excluded by the desktop-browser filter and correctly use
// the WebKit-safe path.
function isWebKitSafari(): boolean {
  const ua = self.navigator.userAgent;
  return /AppleWebKit/.test(ua) && !/Chrome|Edg|OPR|Chromium/.test(ua);
}

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
    // v3.7.3 bundles onnxruntime-web 1.22.0-dev which triggers an infinite loop
    // in WebKit's WASM JIT on iPadOS 26 (onnxruntime #26827) and OOM on iPadOS 17
    // (onnxruntime #22086).  The breakage starts at ORT 1.21 — confirmed by
    // mapping every @huggingface/transformers release to its bundled ORT version.
    //
    // v3.1.1 bundles onnxruntime-web 1.20.1: the last release before 1.21, and
    // the last one confirmed working on WebKit 26 per onnxruntime #26827.
    // ORT 1.20.1 also supports opset 19 (added in 1.17), so all models work.
    // It's still v3 so subfolder/dtype pipeline options work natively.
    //
    // numThreads=1 is critical: transformers.js #1242 identified "JSC not doing
    // well with multi-threaded WASM" as the root cause of iOS crashes.
    onWebKit = isWebKitSafari();
    const vendorBase = new URL('../vendor/', import.meta.url).href;
    const vendorTransformersUrl = onWebKit
      ? `${vendorBase}transformers/3.1.1/transformers.min.js`
      : `${vendorBase}transformers/3.7.3/transformers.min.js`;
    const cdnTransformersUrl = onWebKit
      ? 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.1/dist/transformers.min.js'
      : 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.3/dist/transformers.min.js';
    const ortVersion = onWebKit ? '1.20.1' : '1.22.0-dev.20250409-89f8206ba4';
    const vendorOrtBase = `${vendorBase}onnxruntime-web/${ortVersion}/dist/`;
    const cdnOrtBase = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ortVersion}/dist/`;

    let transformersUrl = vendorTransformersUrl;
    let ortBase = vendorOrtBase;
    try {
      console.log(`[Worker] Loading transformers.js from vendor (${onWebKit ? 'v3.1.1 ORT-1.20.1 WebKit-safe' : 'v3.7.3'})...`);
      transformersModule = await import(/* @vite-ignore */ transformersUrl);
    } catch (error) {
      transformersUrl = cdnTransformersUrl;
      ortBase = cdnOrtBase;
      console.warn('[Worker] Vendor transformers.js not found, falling back to CDN:', error);
      transformersModule = await import(/* @vite-ignore */ transformersUrl);
    }

    const { env } = transformersModule;

    // Configure environment
    env.allowRemoteModels = true;
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    env.backends.onnx.wasm.numThreads = 1;
    env.backends.onnx.wasm.simd = false;
    env.backends.onnx.webgl = false;
    env.backends.onnx.webgpu = false;
    env.backends.onnx.wasm.wasmPaths = ortBase;
    env.useQuantized = true;

    console.log(`[Worker] Transformers.js loaded and configured (ORT ${onWebKit ? '1.20.1' : '1.22.0-dev'})`);
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

  // Special handling for models with non-standard file structures
  let modelPath = huggingFaceId;
  let options: any = {
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
  };

  // Handle models with non-standard ONNX file locations
  // These models have their ONNX files in root directory, not in /onnx/ subdirectory
  if (huggingFaceId === 'protectai/xlm-roberta-base-language-detection-onnx') {
    // This model has files in root, not in /onnx/
    // File is model_quantized.onnx
    options.subfolder = '';  // Override the default 'onnx' subfolder
    options.model_file_name = 'model';  // Base name without _quantized
    options.dtype = 'q8';  // This will add _quantized suffix to make model_quantized.onnx
    console.log(`[Worker] Overriding subfolder to root for ${huggingFaceId}`);
  } else if (huggingFaceId === 'minuva/MiniLMv2-toxic-jigsaw-onnx') {
    // This model has files in root with different naming
    // File is actually model_optimized_quantized.onnx (not model_quantized.onnx)
    options.subfolder = '';  // Override the default 'onnx' subfolder
    options.model_file_name = 'model_optimized';  // Base name without _quantized
    options.dtype = 'q8';  // This will add _quantized suffix to make model_optimized_quantized.onnx
    console.log(`[Worker] Overriding subfolder and filename for ${huggingFaceId}`);
  }

  // Safety-net fetch redirects for non-standard ONNX file layouts on WebKit.
  // v3.1.1 should handle subfolder/dtype natively; these are a no-op if it does.
  const needsFetchRedirect = onWebKit && (
    huggingFaceId === 'minuva/MiniLMv2-toxic-jigsaw-onnx' ||
    huggingFaceId === 'protectai/xlm-roberta-base-language-detection-onnx'
  );
  const origFetch = needsFetchRedirect ? self.fetch : null;
  if (origFetch) {
    (self as any).fetch = (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : '';

      // Jigsaw: actual file is model_optimized_quantized.onnx at root level
      if (url.includes('minuva/MiniLMv2-toxic-jigsaw-onnx') && url.includes('.onnx')) {
        console.log('[Worker] Redirecting Jigsaw ONNX → model_optimized_quantized.onnx');
        return origFetch('https://huggingface.co/minuva/MiniLMv2-toxic-jigsaw-onnx/resolve/main/model_optimized_quantized.onnx', init);
      }

      // protectai: ONNX files are at root, not in /onnx/ subdirectory
      if (url.includes('protectai/xlm-roberta-base-language-detection-onnx') && url.includes('/onnx/')) {
        const newUrl = url.replace('/onnx/', '/');
        console.log(`[Worker] Redirecting protectai ONNX: /onnx/ → root`);
        return origFetch(newUrl, init);
      }

      return origFetch(input, init);
    };
  }

  let pipelineInstance: any;
  try {
    pipelineInstance = await pipeline(task, modelPath, options);
  } finally {
    if (origFetch) (self as any).fetch = origFetch;
  }

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
