export interface CacheInfo {
  modelId: string;
  size: number; // bytes
  lastAccessed: number;
  downloadDate: number;
  huggingFaceId: string;
}

export class CacheManager {
  private readonly MAX_CACHE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
  private readonly CACHE_INFO_KEY = 'hf-cache-info';

  /**
   * Get information about all cached models
   */
  async getCacheInfo(): Promise<CacheInfo[]> {
    try {
      const stored = localStorage.getItem(this.CACHE_INFO_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to read cache info:', error);
      return [];
    }
  }

  /**
   * Update cache info for a model
   */
  async updateCacheInfo(modelId: string, huggingFaceId: string, estimatedSize: number): Promise<void> {
    const cacheInfo = await this.getCacheInfo();
    const existing = cacheInfo.find(info => info.modelId === modelId);
    
    if (existing) {
      existing.lastAccessed = Date.now();
    } else {
      cacheInfo.push({
        modelId,
        size: estimatedSize,
        lastAccessed: Date.now(),
        downloadDate: Date.now(),
        huggingFaceId
      });
    }
    
    localStorage.setItem(this.CACHE_INFO_KEY, JSON.stringify(cacheInfo));
  }

  /**
   * Get total cache size
   */
  async getTotalCacheSize(): Promise<number> {
    const cacheInfo = await this.getCacheInfo();
    return cacheInfo.reduce((total, info) => total + info.size, 0);
  }

  /**
   * Check if cache cleanup is needed
   */
  async needsCleanup(): Promise<boolean> {
    const totalSize = await this.getTotalCacheSize();
    return totalSize > this.MAX_CACHE_SIZE;
  }

  /**
   * Clean up old cached models
   */
  async cleanup(): Promise<string[]> {
    const cacheInfo = await this.getCacheInfo();
    const totalSize = await this.getTotalCacheSize();
    
    if (totalSize <= this.MAX_CACHE_SIZE) {
      return [];
    }

    console.log(`🧹 Cache cleanup needed: ${Math.round(totalSize / 1024 / 1024)}MB > ${Math.round(this.MAX_CACHE_SIZE / 1024 / 1024)}MB`);
    
    // Sort by last accessed (oldest first)
    const sortedModels = [...cacheInfo].sort((a, b) => a.lastAccessed - b.lastAccessed);
    
    const removedModels: string[] = [];
    let currentSize = totalSize;
    
    for (const model of sortedModels) {
      if (currentSize <= this.MAX_CACHE_SIZE * 0.8) { // Clean to 80% of limit
        break;
      }
      
      try {
        await this.clearModelCache(model.modelId);
        removedModels.push(model.huggingFaceId);
        currentSize -= model.size;
        console.log(`🗑️ Removed cached model: ${model.huggingFaceId} (${Math.round(model.size / 1024 / 1024)}MB)`);
      } catch (error) {
        console.warn(`Failed to remove cached model ${model.modelId}:`, error);
      }
    }
    
    // Update cache info
    const remainingInfo = cacheInfo.filter(info => !removedModels.includes(info.huggingFaceId));
    localStorage.setItem(this.CACHE_INFO_KEY, JSON.stringify(remainingInfo));
    
    return removedModels;
  }

  /**
   * Clear cache for a specific model
   */
  async clearModelCache(modelId: string): Promise<void> {
    // Clear from cache info
    const cacheInfo = await this.getCacheInfo();
    const filtered = cacheInfo.filter(info => info.modelId !== modelId);
    localStorage.setItem(this.CACHE_INFO_KEY, JSON.stringify(filtered));
    
    // Note: We can't easily clear the actual ONNX model files from transformers.js cache
    // as they're stored in browser's internal cache. This is a limitation.
    // The best we can do is track what we think is cached.
  }

  /**
   * Get cache statistics for display
   */
  async getCacheStats(): Promise<{
    totalSize: number;
    modelCount: number;
    oldestModel?: string;
    newestModel?: string;
  }> {
    const cacheInfo = await this.getCacheInfo();
    const totalSize = cacheInfo.reduce((sum, info) => sum + info.size, 0);
    
    if (cacheInfo.length === 0) {
      return { totalSize: 0, modelCount: 0 };
    }
    
    const sortedByDate = [...cacheInfo].sort((a, b) => a.downloadDate - b.downloadDate);
    
    return {
      totalSize,
      modelCount: cacheInfo.length,
      oldestModel: sortedByDate[0]?.huggingFaceId,
      newestModel: sortedByDate[sortedByDate.length - 1]?.huggingFaceId
    };
  }

  /**
   * Estimate model size based on name/type
   */
  estimateModelSize(huggingFaceId: string): number {
    const id = huggingFaceId.toLowerCase();
    
    // Size estimates in bytes based on typical model sizes
    if (id.includes('distilbert')) {
      return 250 * 1024 * 1024; // 250MB
    } else if (id.includes('roberta-base')) {
      return 500 * 1024 * 1024; // 500MB  
    } else if (id.includes('bert-base-multilingual')) {
      return 680 * 1024 * 1024; // 680MB
    } else if (id.includes('bert-base')) {
      return 440 * 1024 * 1024; // 440MB
    } else if (id.includes('electra')) {
      return 220 * 1024 * 1024; // 220MB
    } else if (id.includes('albert')) {
      return 180 * 1024 * 1024; // 180MB
    } else {
      // Default estimate for unknown models
      return 400 * 1024 * 1024; // 400MB
    }
  }

  /**
   * Clear all cached models
   */
  async clearCache(): Promise<void> {
    // Clear cache info from localStorage
    localStorage.removeItem(this.CACHE_INFO_KEY);
    
    // Note: We can't easily clear the actual ONNX model files from transformers.js cache
    // as they're stored in browser's internal cache. This is a limitation.
    console.log('✅ Cache info cleared from localStorage');
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