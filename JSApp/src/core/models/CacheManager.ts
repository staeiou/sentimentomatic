export class CacheManager {
  // localStorage cache metadata removed - now using browser cache directly

  // localStorage cache metadata methods removed - we now use real browser cache directly

  // Cache cleanup methods removed - browser manages cache automatically

  /**
   * Get cache statistics for display - computed directly from actual browser cache
   */
  async getCacheStats(): Promise<{
    totalSize: number;
    modelCount: number;
    oldestModel?: string;
    newestModel?: string;
  }> {
    try {
      // Check if Cache API is available
      if (!('caches' in window)) {
        console.log('📊 Cache API not available, returning zero stats');
        return { totalSize: 0, modelCount: 0 };
      }

      // Get actual cache contents
      const cache = await caches.open('transformers-cache');
      const requests = await cache.keys();

      if (requests.length === 0) {
        console.log('📊 transformers-cache is empty');
        return { totalSize: 0, modelCount: 0 };
      }

      console.log(`📊 Found ${requests.length} files in transformers-cache`);

      // Calculate real size from actual cached responses
      let totalSize = 0;
      const modelUrls = new Set<string>(); // Track unique models

      // Safari optimization: Skip size calculation if too many files
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const skipSizeCalc = isSafari && requests.length > 50;

      if (skipSizeCalc) {
        console.log('📊 Safari optimization: Estimating cache size instead of calculating');
        // Just count models, estimate size
        for (const request of requests) {
          const url = request.url;
          const modelMatch = url.match(/huggingface\.co\/([^\/]+\/[^\/]+)/);
          if (modelMatch) {
            modelUrls.add(modelMatch[1]);
          }
        }
        // Estimate 150MB per model (rough average)
        totalSize = modelUrls.size * 150 * 1024 * 1024;
      } else {
        // Full size calculation for non-Safari or small caches
        for (const request of requests) {
          try {
            const response = await cache.match(request);
            if (response) {
              // Try to get size from Content-Length header
              const contentLength = response.headers.get('content-length');
              if (contentLength) {
                totalSize += parseInt(contentLength);
              } else if (!isSafari) {
                // Only read blob on non-Safari browsers
                const blob = await response.blob();
                totalSize += blob.size;
              }

              // Extract model name from URL for counting unique models
              const url = request.url;
              const modelMatch = url.match(/huggingface\.co\/([^\/]+\/[^\/]+)/);
              if (modelMatch) {
                modelUrls.add(modelMatch[1]);
              }
            }
          } catch (error) {
            console.warn(`Failed to get size for ${request.url}:`, error);
          }
        }
      }

      const result = {
        totalSize,
        modelCount: modelUrls.size,
        // Note: We can't easily determine oldest/newest from cache API alone
        // The Cache API doesn't preserve timestamps
      };

      console.log(`📊 Real cache stats: ${this.formatSize(totalSize)} across ${modelUrls.size} models`);
      return result;

    } catch (error) {
      console.warn('Failed to get real cache stats:', error);
      // If cache API fails, return zero stats
      return { totalSize: 0, modelCount: 0 };
    }
  }

  /**
   * Estimate model size based on actual cache measurements
   */
  estimateModelSize(huggingFaceId: string): number {
    // Size estimates in MB based on ACTUAL cached sizes
    const sizeMap: { [key: string]: number } = {
      'Xenova/distilbert-base-uncased-finetuned-sst-2-english': 65,
      'Xenova/twitter-roberta-base-sentiment-latest': 122,
      'Xenova/finbert': 106,
      'Xenova/distilbert-base-multilingual-cased-sentiments-student': 132,
      'SamLowe/roberta-base-go_emotions-onnx': 122,
      'KoalaAI/Text-Moderation': 140,
      'onnx-community/multilingual-IPTC-news-topic-classifier-ONNX': 553,
      'protectai/xlm-roberta-base-language-detection-onnx': 282,
      'Xenova/toxic-bert': 106,
      'minuva/MiniLMv2-toxic-jigsaw-onnx': 22,
      'sabatale/industry-classification-api-onnx': 106
    };

    // Return exact size if we have it
    if (sizeMap[huggingFaceId]) {
      return sizeMap[huggingFaceId];
    }

    // Otherwise estimate based on model type
    const id = huggingFaceId.toLowerCase();
    if (id.includes('minilm')) {
      return 23; // Small models like MiniLM
    } else if (id.includes('distilbert')) {
      return 100; // Average of distilbert models
    } else if (id.includes('roberta')) {
      return 122; // Average of roberta models
    } else if (id.includes('bert')) {
      return 130; // Average of BERT models
    } else {
      // Default estimate for unknown models
      return 100;
    }
  }

  /**
   * Batch check multiple models for cache status - FAST for Safari
   * Opens cache once and checks all models IN PARALLEL
   */
  async batchCheckModelsInCache(huggingFaceIds: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()

    try {
      // Check if Cache API is available
      if (!('caches' in window)) {
        huggingFaceIds.forEach(id => results.set(id, false))
        return results
      }

      console.time('Cache batch check')

      // Open cache ONCE for all checks
      const cache = await caches.open('transformers-cache')

      // Check each model IN PARALLEL - just the main ONNX weight file
      await Promise.all(huggingFaceIds.map(async (huggingFaceId) => {
        // CRITICAL: Check for ACTUAL files that get cached (after redirects in ModelManager)
        let mainModelUrls: string[] = []

        // Special cases based on ModelManager redirects
        if (huggingFaceId === 'protectai/xlm-roberta-base-language-detection-onnx') {
          // protectai stores at ROOT level (not in /onnx/)
          mainModelUrls = [
            `https://huggingface.co/${huggingFaceId}/resolve/main/model_quantized.onnx`,
            `https://huggingface.co/${huggingFaceId}/resolve/main/model.onnx`
          ]
        } else if (huggingFaceId === 'minuva/MiniLMv2-toxic-jigsaw-onnx') {
          // minuva has special filename
          mainModelUrls = [
            `https://huggingface.co/${huggingFaceId}/resolve/main/model_optimized_quantized.onnx`
          ]
        } else {
          // Standard models in /onnx/ directory
          mainModelUrls = [
            `https://huggingface.co/${huggingFaceId}/resolve/main/onnx/model_quantized.onnx`,
            `https://huggingface.co/${huggingFaceId}/resolve/main/onnx/model.onnx`
          ]
        }

        // Check for ANY of these URLs (just need one to confirm cached)
        for (const url of mainModelUrls) {
          try {
            const cachedResponse = await cache.match(url)
            if (cachedResponse) {
              console.log(`✅ ${huggingFaceId} cached`)
              results.set(huggingFaceId, true)
              return
            }
          } catch (e) {
            // Ignore individual match errors
          }
        }

        console.log(`❌ ${huggingFaceId} not cached`)
        results.set(huggingFaceId, false)
      }))

      console.timeEnd('Cache batch check')
      return results

    } catch (error) {
      console.warn('Failed batch cache check:', error)
      huggingFaceIds.forEach(id => results.set(id, false))
      return results
    }
  }

  /**
   * Check if a specific model is actually cached in transformers-cache
   */
  async isModelActuallyCached(huggingFaceId: string): Promise<boolean> {
    try {
      // Check if Cache API is available
      if (!('caches' in window)) {
        return false;
      }

      // Transformers.js uses 'transformers-cache' by default
      const cache = await caches.open('transformers-cache');

      // Core files that MUST be cached for a model to be considered ready
      const coreFiles = [
        // Essential config files (at least one must be present)
        `https://huggingface.co/${huggingFaceId}/resolve/main/config.json`,
        `https://huggingface.co/${huggingFaceId}/resolve/main/tokenizer_config.json`
      ];

      // ONNX model files that could be cached (at least one must be present)
      const onnxFiles = [
        // Standard ONNX locations (quantized preferred)
        `https://huggingface.co/${huggingFaceId}/resolve/main/onnx/model_quantized.onnx`,
        `https://huggingface.co/${huggingFaceId}/resolve/main/onnx/model.onnx`,
        `https://huggingface.co/${huggingFaceId}/resolve/main/model_quantized.onnx`,
        `https://huggingface.co/${huggingFaceId}/resolve/main/model.onnx`,

        // Special cases for non-standard model structures
        `https://huggingface.co/${huggingFaceId}/resolve/main/model_optimized_quantized.onnx`, // minuva models
        `https://huggingface.co/${huggingFaceId}/resolve/main/model_optimized.onnx`,

        // Multi-part models
        `https://huggingface.co/${huggingFaceId}/resolve/main/onnx/encoder_model.onnx`,
        `https://huggingface.co/${huggingFaceId}/resolve/main/onnx/decoder_model.onnx`,
        `https://huggingface.co/${huggingFaceId}/resolve/main/onnx/decoder_model_merged.onnx`
      ];

      // Check for at least one core config file
      let hasConfigFile = false;
      for (const url of coreFiles) {
        const cachedResponse = await cache.match(url);
        if (cachedResponse) {
          console.log(`✅ Found cached config file: ${url}`);
          hasConfigFile = true;
          break;
        }
      }

      if (!hasConfigFile) {
        console.log(`❌ No config files found in cache for ${huggingFaceId}`);
        return false;
      }

      // Check for at least one ONNX model file
      let hasOnnxFile = false;
      for (const url of onnxFiles) {
        const cachedResponse = await cache.match(url);
        if (cachedResponse) {
          console.log(`✅ Found cached ONNX file: ${url}`);
          hasOnnxFile = true;
          break;
        }
      }

      if (!hasOnnxFile) {
        console.log(`❌ No ONNX files found in cache for ${huggingFaceId}`);
        return false;
      }

      console.log(`✅ Model ${huggingFaceId} is properly cached (has both config and ONNX files)`);
      return true;

    } catch (error) {
      console.warn('Failed to check transformers-cache:', error);
      return false;
    }
  }

  // updateModelCacheStatus removed - no longer needed since we read cache directly

  /**
   * List all files in transformers-cache for debugging
   */
  async debugListCachedFiles(): Promise<string[]> {
    try {
      if (!('caches' in window)) {
        return [];
      }

      const cache = await caches.open('transformers-cache');
      const keys = await cache.keys();
      const urls = keys.map(req => req.url);

      console.log(`📋 Found ${urls.length} files in transformers-cache:`, urls);
      return urls;
    } catch (error) {
      console.warn('Failed to list cached files:', error);
      return [];
    }
  }

  /**
   * Clear cache for a specific model
   */
  async clearModelCache(huggingFaceId: string): Promise<void> {
    try {
      if (!('caches' in window)) {
        console.log('Cache API not available');
        return;
      }

      const cache = await caches.open('transformers-cache');

      // Get all cached requests
      const requests = await cache.keys();

      // Delete all entries that match this model's huggingFaceId
      for (const request of requests) {
        if (request.url.includes(huggingFaceId)) {
          await cache.delete(request);
          console.log(`🗑️ Deleted cached file: ${request.url}`);
        }
      }

      console.log(`✅ Cleared cache for model: ${huggingFaceId}`);
    } catch (error) {
      console.warn(`Failed to clear cache for model ${huggingFaceId}:`, error);
    }
  }

  /**
   * Clear all cached models from browser Cache API
   */
  async clearCache(): Promise<void> {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log('Available caches:', cacheNames);

        // Clear transformers-related caches
        for (const cacheName of cacheNames) {
          if (cacheName.includes('transformers') ||
              cacheName.includes('huggingface') ||
              cacheName.includes('onnx')) {
            await caches.delete(cacheName);
            console.log(`🗑️ Cleared cache: ${cacheName}`);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to clear browser cache:', error);
    }

    console.log('✅ Browser cache cleared');
  }

  /**
   * Format bytes for display
   */
  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}