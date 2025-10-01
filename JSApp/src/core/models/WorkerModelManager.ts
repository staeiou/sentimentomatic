/**
 * WorkerModelManager - Runs transformers.js models in a web worker
 *
 * CRITICAL BENEFIT: When the worker is terminated, ALL memory is freed
 * This solves the WASM memory limitation where memory can only grow
 */

export interface WorkerMessage {
  type: string;
  payload?: any;
  error?: string;
}

export class WorkerModelManager {
  private worker: Worker | null = null;
  private messageHandlers = new Map<string, (payload: any) => void>();
  private pendingRequests = new Map<string, { resolve: Function, reject: Function }>();
  private requestIdCounter = 0;

  /**
   * Initialize a new worker
   * Call this at the start of analysis
   */
  async initializeWorker(): Promise<void> {
    if (this.worker) {
      console.warn('⚠️ Worker already initialized, terminating old one...');
      await this.terminateWorker();
    }

    console.log('🚀 Initializing new transformers.js worker...');

    // Create the worker
    this.worker = new Worker(
      new URL('../workers/transformers.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Set up message handler
    this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      this.handleWorkerMessage(event.data);
    };

    this.worker.onerror = (error) => {
      console.error('❌ Worker error:', error);
      // Reject all pending requests
      for (const [, { reject }] of this.pendingRequests) {
        reject(error);
      }
      this.pendingRequests.clear();
      // Also clear all message handlers to prevent memory leaks
      this.messageHandlers.clear();
    };

    console.log('✅ Worker initialized');
  }

  /**
   * Terminate the worker completely
   * This FULLY FREES all memory used by models
   */
  async terminateWorker(): Promise<void> {
    if (!this.worker) {
      return;
    }

    console.log('🛑 Terminating worker to free all memory...');

    // Clear all pending requests
    for (const [, { reject }] of this.pendingRequests) {
      reject(new Error('Worker terminated'));
    }
    this.pendingRequests.clear();

    // Terminate the worker
    this.worker.terminate();
    this.worker = null;

    console.log('✅ Worker terminated - ALL MEMORY FREED');
  }

  /**
   * Load a model in the worker
   */
  async loadModel(modelId: string, huggingFaceId: string, task?: string): Promise<void> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    return new Promise((resolve, reject) => {
      const requestId = `load-${modelId}-${this.requestIdCounter++}`;

      // Set up response handler
      this.pendingRequests.set(requestId, { resolve, reject });

      // Add message handler for this specific model load with unique key
      const handlerKey = `MODEL_LOADED_${requestId}`;
      this.messageHandlers.set(handlerKey, (payload) => {
        if (payload.modelId === modelId) {
          const pending = this.pendingRequests.get(requestId);
          if (pending) {
            this.pendingRequests.delete(requestId);
            this.messageHandlers.delete(handlerKey); // Clean up handler after use
            pending.resolve();
          }
        }
      });

      // Send message to worker
      this.worker!.postMessage({
        type: 'LOAD_MODEL',
        payload: { modelId, huggingFaceId, task }
      });

      // Add timeout to prevent hanging
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          this.messageHandlers.delete(handlerKey);
          reject(new Error(`Model load timeout for ${modelId}`));
        }
      }, 180000); // 180 second timeout for model loading
    });
  }

  /**
   * Run inference on a model
   */
  async runInference(modelId: string, text: string): Promise<any[]> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    return new Promise((resolve, reject) => {
      const requestId = `inference-${modelId}-${this.requestIdCounter++}`;

      // Set up response handler
      this.pendingRequests.set(requestId, { resolve, reject });

      // Add one-time message handler for this inference with unique key
      const handlerKey = `INFERENCE_RESULT_${requestId}`;
      const handler = (payload: any) => {
        if (payload.modelId === modelId) {
          const pending = this.pendingRequests.get(requestId);
          if (pending) {
            this.pendingRequests.delete(requestId);
            this.messageHandlers.delete(handlerKey); // Clean up handler after use
            pending.resolve(payload.result);
          }
        }
      };

      this.messageHandlers.set(handlerKey, handler);

      // Send message to worker
      this.worker!.postMessage({
        type: 'RUN_INFERENCE',
        payload: { modelId, text }
      });

      // Add timeout to prevent hanging
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          this.messageHandlers.delete(handlerKey);
          reject(new Error(`Inference timeout for ${modelId}`));
        }
      }, 120000); // 120 second timeout for inference
    });
  }

  /**
   * Dispose a specific model in the worker
   */
  async disposeModel(modelId: string): Promise<void> {
    if (!this.worker) {
      return; // Worker already terminated
    }

    return new Promise((resolve) => {
      // Set up response handler
      this.messageHandlers.set('MODEL_DISPOSED', (payload) => {
        if (payload.modelId === modelId) {
          this.messageHandlers.delete('MODEL_DISPOSED');
          resolve();
        }
      });

      // Send message to worker
      this.worker!.postMessage({
        type: 'DISPOSE_MODEL',
        payload: { modelId }
      });

      // Resolve after timeout even if no response
      setTimeout(resolve, 1000);
    });
  }

  /**
   * Dispose all models in the worker
   */
  async disposeAll(): Promise<void> {
    if (!this.worker) {
      return; // Worker already terminated
    }

    return new Promise((resolve) => {
      // Set up response handler
      this.messageHandlers.set('ALL_DISPOSED', () => {
        this.messageHandlers.delete('ALL_DISPOSED');
        resolve();
      });

      // Send message to worker
      this.worker!.postMessage({
        type: 'DISPOSE_ALL'
      });

      // Resolve after timeout even if no response
      setTimeout(resolve, 1000);
    });
  }

  /**
   * Check if worker is active
   */
  isWorkerActive(): boolean {
    return this.worker !== null;
  }

  /**
   * Handle messages from worker
   */
  private handleWorkerMessage(message: WorkerMessage) {
    // Handle progress messages
    if (message.type === 'PROGRESS') {
      console.log(`📊 Worker progress:`, message.payload);
      return;
    }

    // Handle errors
    if (message.type === 'ERROR') {
      console.error('❌ Worker error:', message.error);
      // Reject all pending requests and clean up handlers
      for (const [requestId, pending] of this.pendingRequests) {
        this.pendingRequests.delete(requestId);
        pending.reject(new Error(message.error || 'Unknown error'));
      }
      // Clear all message handlers on error
      this.messageHandlers.clear();
      return;
    }

    // Handle specific message types - check all handlers that match the pattern
    for (const [key, handler] of this.messageHandlers) {
      if (key.startsWith(message.type)) {
        handler(message.payload);
      }
    }

    // Also check for exact match (for backward compatibility)
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message.payload);
    }
  }
}

// Singleton instance
let workerManagerInstance: WorkerModelManager | null = null;

/**
 * Get the singleton WorkerModelManager instance
 */
export function getWorkerModelManager(): WorkerModelManager {
  if (!workerManagerInstance) {
    workerManagerInstance = new WorkerModelManager();
  }
  return workerManagerInstance;
}

/**
 * Force create a new WorkerModelManager (useful for cleanup)
 */
export function resetWorkerModelManager(): WorkerModelManager {
  if (workerManagerInstance) {
    workerManagerInstance.terminateWorker();
  }
  workerManagerInstance = new WorkerModelManager();
  return workerManagerInstance;
}