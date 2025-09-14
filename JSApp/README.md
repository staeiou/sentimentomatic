# Sentimentomatic JS - Technical Documentation

## Architecture Overview

This is a browser-based sentiment analysis application that runs ML models directly in the browser using WebAssembly. The key architectural decision is **memory-efficient streaming analysis** - we load one model at a time, process ALL lines with it, then optionally unload it before loading the next model.

## Core Processing Pipeline

### 1. Analysis Flow (`StreamingAnalysisController.ts`)

The streaming controller implements a **model-by-model** processing strategy, NOT line-by-line:

```typescript
// CRITICAL: We process ANALYZER BY ANALYZER across all lines
for (const analyzerName of selectedAnalyzers) {
  // Process ALL lines with this analyzer
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const result = await analyzer.analyze(text);
    // Update specific cell in table
    this.incrementalRenderer.updateAnalysisCell(lineIndex, analyzerName, result);
  }
}

// Then process ML models with download-run-clear pattern
for (const modelId of selectedModels) {
  // STEP 1: Download/Load this specific model
  await this.multiModelAnalyzer.initializeSingleModel(modelId);

  // STEP 2: Run this model on ALL lines
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const result = await this.multiModelAnalyzer.analyzeWithModel(text, modelId);
    this.incrementalRenderer.updateAnalysisCell(lineIndex, modelInfo.displayName, result);
  }

  // STEP 3: Optionally unload model (based on keepModelsCached flag)
  if (!config.keepModelsCached) {
    await this.multiModelAnalyzer.unloadSingleModel(modelId);
  }
}
```

**Why this matters**: Loading ML models is expensive (250-680MB each). By processing all text with one model before moving to the next, we avoid thrashing memory with multiple concurrent models.

### 2. Table Rendering Strategy (`IncrementalTableRenderer.ts`)

The renderer uses a **pre-allocated table** approach:

```typescript
initializeTableWithAllText(columns: UnifiedColumn[], texts: string[]): void {
  // Create ALL rows upfront with pending indicators
  texts.map((text, index) => {
    const pendingCells = columns.map(() =>
      '<td class="pending"><span class="pending-dot">⋯</span></td>'
    );
    // Row exists immediately, cells update later
  });
}

updateAnalysisCell(lineIndex: number, columnName: string, result: any): void {
  // Find the specific cell and update ONLY that cell
  const row = this.tbody.querySelector(`tr[data-line-index="${lineIndex}"]`);
  const cell = row.cells[columnIndex + 2]; // +2 for line number and text columns
  // Update cell content based on result type
}
```

**Why this matters**: Users see all their text immediately with visual feedback that analysis is pending. Results stream in cell-by-cell as each model processes each line.

## Model Management Architecture

### 3. Model Loading Pipeline (`ModelManager.ts`)

The ModelManager handles the complex ONNX model loading with several critical patches:

```typescript
async loadModel(modelId: string): Promise<any> {
  // CRITICAL: Monkey-patch fetch to handle non-standard ONNX structures
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const url = args[0] as string;

    // Handle special cases like minuva models with different paths
    if (url.includes('minuva/MiniLMv2-toxic-jigsaw-onnx')) {
      const newUrl = url.replace('/onnx/', '/').replace('model_quantized.onnx', 'model_optimized_quantized.onnx');
      // Fetch from corrected path
    }

    // Track downloads for cache debugging
    downloadedFiles.push({ url, size, timestamp });
  };

  // Load with transformers.js
  const pipeline = await pipeline(task, modelId, {
    quantized: true,
    progress_callback: downloadProgress
  });
}
```

**Key insights**:
- Models are loaded from HuggingFace's CDN
- ONNX files can be in non-standard locations (especially community models)
- We monkey-patch fetch to redirect to correct paths
- Download tracking helps debug cache issues

### 4. Cache Management (`CacheManager.ts`)

The cache system migrated from localStorage metadata to **direct Cache API access**:

```typescript
async isModelActuallyCached(huggingFaceId: string): Promise<boolean> {
  const cache = await caches.open('transformers-cache');

  // Must have BOTH config AND model files
  const coreFiles = [
    `https://huggingface.co/${huggingFaceId}/resolve/main/config.json`,
    `https://huggingface.co/${huggingFaceId}/resolve/main/tokenizer_config.json`
  ];

  const onnxFiles = [
    `https://huggingface.co/${huggingFaceId}/resolve/main/onnx/model_quantized.onnx`,
    `https://huggingface.co/${huggingFaceId}/resolve/main/model_quantized.onnx`,
    // ... multiple possible locations
  ];

  // Check for at least one config AND one ONNX file
  const hasConfig = await this.checkAnyFilesCached(cache, coreFiles);
  const hasModel = await this.checkAnyFilesCached(cache, onnxFiles);

  return hasConfig && hasModel;
}
```

**Critical details**:
- transformers.js uses 'transformers-cache' by default
- Models consist of multiple files (config, tokenizer, ONNX weights)
- We check actual cache contents, not metadata
- Browser manages eviction automatically

## Multi-Model Analyzer Deep Dive

### 5. Classification Handling (`MultiModelAnalyzer.ts`)

The analyzer handles various model output formats with extensive fallbacks:

```typescript
async analyzeWithModel(text: string, modelId: string): Promise<SentimentResult | null> {
  const result = await pipeline(text, {
    top_k: null,  // Get ALL classes
    return_all_scores: true
  });

  // Handle different output formats
  if (prediction.label) {
    // Standard case: POSITIVE/NEGATIVE
    if (label.includes('pos')) { /* ... */ }

    // Star ratings: "3 stars" -> score conversion
    const starMatch = prediction.label.match(/(\d+)\s*stars?/i);
    if (starMatch) {
      const stars = parseInt(starMatch[1]);
      score = (stars - 3) / 2; // Convert 1-5 to -1 to +1
    }

    // KoalaAI codes: 'S' -> 'Sexual', 'H' -> 'Hate'
    if (model.huggingFaceId.includes('KoalaAI')) {
      const koalaLabelMap = { 'S': 'Sexual', 'H': 'Hate', /* ... */ };
      const mappedLabel = koalaLabelMap[prediction.label];
    }

    // Numeric indices: 0-4 -> 1-5 stars
    const numericLabel = parseInt(prediction.label);
    if (!isNaN(numericLabel) && numericLabel >= 0 && numericLabel <= 4) {
      const stars = numericLabel + 1;
    }
  }

  // FAILED PARSING - return null, not fake data
  if (!parseable) return null;
}
```

**Why this complexity**: Each model returns different formats. We handle sentiment (pos/neg), star ratings (1-5), content moderation codes, emotion labels, and numeric indices. Failing to parse returns null, not 0.000.

### 6. Download Confirmation System

Before analysis, we show exactly what will be downloaded:

```typescript
async getModelDownloadInfo(selectedModelIds: string[]): Promise<Info[]> {
  for (const modelId of selectedModelIds) {
    // Check ACTUAL browser cache, not metadata
    const isCached = await this.cacheManager.isModelActuallyCached(modelInfo.huggingFaceId);

    models.push({
      name: modelInfo.displayName,
      size: this.cacheManager.estimateModelSize(modelInfo.huggingFaceId),
      cached: isCached  // Real cache status
    });
  }
}

// Show dialog with cached vs. non-cached models
IncrementalTableRenderer.showDownloadConfirmation(models);
```

## Critical Implementation Details

### 7. Memory Management Strategy

```typescript
// config.keepModelsCached controls the behavior
if (config.keepModelsCached === false) {
  // After processing all lines with a model:
  await this.multiModelAnalyzer.unloadSingleModel(modelId);
  // This calls:
  this.modelManager.unloadModel(modelId);  // Clears from memory
  this.loadedPipelines.delete(modelId);    // Removes reference
  // Cache stays in browser for next session
}
```

**Trade-offs**:
- `keepModelsCached=true`: Fast re-analysis, high memory usage
- `keepModelsCached=false`: Slow re-analysis, low memory usage
- Cache always persists in browser (until manually cleared)

### 8. Progress Tracking

Progress is calculated based on MODEL completion, not line completion:

```typescript
const totalAnalyzers = selectedAnalyzers.length + selectedModels.length;
let completedAnalyzers = 0;

// After each analyzer completes ALL lines:
completedAnalyzers++;
const progress = (completedAnalyzers / totalAnalyzers) * 100;
progressCallback(`Completed ${analyzerName}`, progress);
```

### 9. Export System

Exports handle the unified format with mixed sentiment/classification:

```typescript
// CSV: Different columns for different result types
columns.forEach(col => {
  if (col.type === 'sentiment') {
    header.push(`${col.name}_Score`, `${col.name}_Sentiment`);
  } else if (col.type === 'classification') {
    header.push(`${col.name}_Prediction`, `${col.name}_Likelihood`);
  }
});

// JSON: Structured with metadata
{
  metadata: { timestamp, analysisType: 'multimodal', analyzers },
  results: [
    {
      line: 1,
      text: "...",
      analysis: {
        "VADER": { type: 'sentiment', score: 0.5, sentiment: 'positive' },
        "GoEmotions": { type: 'classification', prediction: 'joy', likelihood: 0.8 }
      }
    }
  ]
}
```

## State Management

### 10. Application State (`main.ts`)

The main app coordinates everything through explicit state:

```typescript
class SentimentomaticApp {
  // Core objects
  private analyzerRegistry: AnalyzerRegistry;     // Rule-based analyzers
  private multiModelAnalyzer: MultiModelAnalyzer; // ML models
  private analysisController: StreamingAnalysisController;
  private cacheManager: CacheManager;

  // UI state
  private currentResult: MultiModalAnalysisResult | null = null;
  private editorView: EditorView;  // CodeMirror instance

  // Model selections (15 checkboxes)
  private useAfinnCheckbox: HTMLInputElement;
  private useVaderCheckbox: HTMLInputElement;
  // ... 13 more
}
```

**Key flow**:
1. User checks models -> `updateAllModelSelections()`
2. Updates `multiModelAnalyzer` enabled models
3. Shows download size via `updateDownloadSizeDisplay()`
4. Analyze -> `analyzeText()` -> `StreamingAnalysisController`
5. Results stored in `currentResult` for export

## Performance Optimizations

### 11. Critical Performance Decisions

1. **Serial Model Loading**: Load one model, process all text, unload, repeat
   - Avoids memory pressure from concurrent models
   - Trade-off: Slower total time, better memory usage

2. **Browser Caching**: `env.useBrowserCache = true`
   - Models persist across sessions
   - ~2GB of cache for all models
   - Browser handles eviction

3. **Quantized Models**: Always prefer quantized ONNX
   - 4x smaller than full precision
   - Minimal accuracy loss
   - Faster inference

4. **Table Pre-allocation**: Create all DOM nodes upfront
   - Avoids reflow during updates
   - Smooth streaming appearance

## Debugging Tools

### 12. Cache Debug Modal

Shows raw cache contents for debugging:

```typescript
async showCacheDebugModal(): Promise<void> {
  // List ALL cache entries
  const cacheNames = await caches.keys();
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    // Show every cached URL
  }

  // Check specific model detection
  for (const modelId of selectedModels) {
    const isCached = await this.cacheManager.isModelActuallyCached(modelInfo.huggingFaceId);
    // Show detection result
  }
}
```

## Adding New Models - The Real Process

### 13. Steps to Add a Model

1. **Find the ONNX version** (must be quantized for browser):
   ```bash
   # Check if Xenova has it
   https://huggingface.co/Xenova/MODEL_NAME

   # Or check onnx-community
   https://huggingface.co/onnx-community/MODEL_NAME
   ```

2. **Add to main.ts mappings**:
   ```typescript
   const allModelMappings = [
     {
       checkbox: this.newModelCheckbox,
       id: 'unique-id',
       hfId: 'Xenova/actual-model-name', // MUST be ONNX
       name: 'Display Name'
     }
   ];
   ```

3. **Add checkbox to index.html**:
   ```html
   <label class="model-option">
     <input type="checkbox" id="use-new-model">
     <a href="https://huggingface.co/Xenova/model">Model Name</a>
     <span class="model-size">350MB</span>
   </label>
   ```

4. **Handle output format** in `MultiModelAnalyzer.analyzeWithModel()`:
   ```typescript
   if (model.displayName.includes('YourModel')) {
     // Parse the specific output format
   }
   ```

5. **Test loading**:
   - Open DevTools Network tab
   - Check model loads from correct URL
   - Verify cache detection works
   - Test output parsing

## Common Failure Modes

1. **Model won't load**: Wrong HuggingFace ID or not ONNX format
2. **Parse errors**: Model output format not handled
3. **Cache not detected**: Files in wrong cache or incomplete
4. **Memory crashes**: Too many models loaded concurrently
5. **Slow analysis**: Models not quantized or WebGL disabled

## Architecture Decisions & Trade-offs

- **Why streaming?** Better UX than waiting for all models
- **Why one model at a time?** Browser memory limits (~4GB)
- **Why browser cache?** Persistence without backend
- **Why ONNX?** Only format that runs in browser efficiently
- **Why quantized?** 4x size reduction, minimal accuracy loss
- **Why CodeMirror?** Handles large text better than textarea
- **Why Vite?** Fast HMR, good WASM support

This is a complex system pretending to be simple. The complexity is in handling diverse model formats, managing memory constraints, and providing a smooth UX despite running GB-scale models in a browser.