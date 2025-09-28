// Shared types for E2E testing

export interface ModelTestConfig {
  id: string;
  displayName: string;
  huggingFaceId: string;
  isRuleBased: boolean;
}

export interface ModelSizeResult {
  modelId: string;
  displayName: string;
  huggingFaceId: string;
  files: ModelFile[];
  totalSize: number;
  totalSizeFormatted: string;
}

export interface ModelFile {
  url: string;
  size: number;
  sizeFormatted: string;
}

export interface NetworkRequest {
  url: string;
  size: number;
}

export interface CacheData {
  files: Array<{
    url: string;
    size: number;
  }>;
  totalSize: number;
}

// Test utilities
export class TestUtils {
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  static async waitForAnalysisComplete(page: any, timeoutMs: number = 120000) {
    await page.waitForFunction(
      () => {
        const progressStatus = document.querySelector('#progress-status');
        return progressStatus && progressStatus.textContent?.includes('complete');
      },
      { timeout: timeoutMs }
    );
  }

  static async clearAllCaches(page: any) {
    await page.evaluate(async () => {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
        }
      }
      localStorage.clear();
    });
  }

  static async getCacheContents(page: any, modelHuggingFaceId: string): Promise<CacheData> {
    return await page.evaluate(async (modelHuggingFaceId: string) => {
      if (!('caches' in window)) {
        return { files: [], totalSize: 0 };
      }

      try {
        const cache = await caches.open('transformers-cache');
        const requests = await cache.keys();

        const files = [];
        let totalSize = 0;

        for (const request of requests) {
          if (request.url.includes(modelHuggingFaceId)) {
            const response = await cache.match(request);
            if (response) {
              let size = 0;
              const contentLength = response.headers.get('content-length');
              if (contentLength) {
                size = parseInt(contentLength);
              } else {
                const blob = await response.blob();
                size = blob.size;
              }

              files.push({
                url: request.url,
                size: size
              });
              totalSize += size;
            }
          }
        }

        return { files, totalSize };
      } catch (error) {
        console.error('Cache check failed:', error);
        return { files: [], totalSize: 0 };
      }
    }, modelHuggingFaceId);
  }
}