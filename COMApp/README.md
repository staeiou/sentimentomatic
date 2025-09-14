# Classifier-O-Matic

Zero-shot text classification in your browser using Natural Language Inference (NLI) models. No servers, no training data, no API keys - just labels and text.

## Features

- **Zero-shot classification**: Classify text without training data using NLI-based inference
- **Browser-based**: Runs entirely in your browser using WebAssembly (WASM)
- **Privacy-first**: No data leaves your device - all processing is local
- **Custom labels**: Define your own categories with flexible hypothesis templates
- **Multi-label support**: Allow texts to have multiple labels above threshold
- **Streaming results**: Real-time row-by-row updates as classification progresses
- **Pre-tested corpora**: Built-in test datasets with proven templates
- **Export results**: Download as CSV or JSON

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Test model performance
npm run test:models

# Test template effectiveness
npm run test:templates
```

Open http://localhost:3001 in your browser.

## Available Models

The application supports multiple DeBERTa v3 NLI models from Hugging Face, with both quantized (int8) and full precision (fp32) options:

| Model | Parameters | Download Size | Accuracy* | Load Time | Recommended For |
|-------|------------|---------------|-----------|-----------|-----------------|
| **XSmall** | ~22M | ~45MB | 52% | 1.2s | Quick demos, low bandwidth |
| **Base** | ~140M | ~280MB | 60% | 14.4s | Legacy compatibility |
| **V3 Base** ⭐ | ~180M | ~360MB | 64% | 18.8s | **Best balance** |
| **V3 Large** | ~434M | ~560MB int8 | 68% | 44.5s | High accuracy |
| **V3 Large MNLI+** 🔥 | ~434M | ~643MB int8 | Expected 70%+ | ~50s | **Best accuracy** |
| **V3 Large MNLI+ Full** ⚠️ | ~434M | ~1.74GB fp32 | Expected 72%+ | ~80s | Research/benchmark |

*Accuracy measured on 25-case sentiment test suite with "This text is {}" template

### Special Model: DeBERTa-v3-large-mnli-fever-anli-ling-wanli

The MNLI+ model (by MoritzLaurer) is trained on multiple datasets:
- **MNLI**: Multi-Genre Natural Language Inference
- **FEVER**: Fact Extraction and VERification
- **ANLI**: Adversarial NLI
- **LingNLI**: Linguistic NLI
- **WANLI**: Worker-AI Natural Language Inference

This broader training should provide better generalization and accuracy, especially for:
- Complex reasoning tasks
- Fact-checking scenarios
- Edge cases and adversarial inputs

## How It Works

### Core Technology: Natural Language Inference (NLI)

The app leverages NLI models trained on millions of premise-hypothesis pairs. Instead of traditional classification, it:

1. Converts each label into a hypothesis using a template
2. Treats your text as the premise
3. Calculates entailment probability for each hypothesis
4. Returns normalized scores across all labels

### Processing Pipeline

1. **Text Input** → Character-based chunking (1440 chars/~480 tokens per chunk)
2. **Template Application** → Hypothesis generation for each label
3. **NLI Inference** → DeBERTa model calculates entailment scores
4. **Score Mapping** → Pipeline returns labels in confidence order
5. **Alignment** → Scores mapped back to original label order
6. **Display** → Streaming row-by-row updates with animations

## Template System

### Critical Discovery: Template Impact

Our extensive testing revealed template choice dramatically affects accuracy:

| Template | Overall Accuracy | Neutral Detection | Use Case |
|----------|-----------------|-------------------|----------|
| `"This text is {}."` | 50% | 20% | ❌ Avoid - biased |
| `"This text is emotionally {}."` | **90%** | **100%** | ✅ Sentiment |
| `"This text is about {}."` | Variable | N/A | Topics |
| `"This message is {}."` | 50% | Poor | Spam (needs work) |

### Why Templates Matter

The NLI model evaluates semantic entailment between premise and hypothesis. Poor templates create ambiguous hypotheses that confuse the model:
- `"This text is neutral."` → Ambiguous (neutral what?)
- `"This text is emotionally neutral."` → Clear semantic relationship

## Technical Architecture

### Transformers.js Configuration

```javascript
// From src/nli/ZeroShotClassifier.ts
env.allowRemoteModels = true;    // Download from Hugging Face
env.useBrowserCache = true;      // Cache models in browser
env.backends.onnx.wasm.numThreads = 1;    // Single-threaded for stability
env.backends.onnx.wasm.simd = false;      // Disabled for compatibility
env.backends.onnx.webgl = false;          // WASM-only
env.backends.onnx.webgpu = false;         // WASM-only

// ClassifierConfig supports both quantized and full precision
interface ClassifierConfig {
  modelId: string;
  quantized: boolean;  // true for int8, false for fp32
  // ... other config
}
```

### Text Chunking Strategy

```javascript
// From src/chunking/TextChunker.ts
maxChars: 1440    // ~480 tokens (3 chars/token estimate)
overlap: 0.5      // 50% overlap between chunks
maxChunks: 100    // Safety limit to prevent infinite loops
```

**Aggregation Method**: Logit averaging
```javascript
// Convert probabilities to logits
logit = Math.log(score / (1 - score))
// Average logits across chunks
avgLogit = mean(logits)
// Convert back to probability
probability = 1 / (1 + Math.exp(-avgLogit))
```

### Streaming Implementation

The UI implements true streaming updates using `requestAnimationFrame`:

1. **Pre-allocation**: All table rows created with pending state
2. **Sequential Processing**: One text classified at a time
3. **DOM Yielding**: Control returned to browser between texts
4. **Visual Feedback**: Fade-in animations and progress indicators

```javascript
// From src/main.ts
requestAnimationFrame(() => {
  processNextText(index + 1);  // Process next after DOM update
});
```

## Built-in Test Corpora

### Available Datasets

| Corpus | Labels | Template | Accuracy |
|--------|--------|----------|----------|
| **Mixed Sentiment** | positive, negative, neutral | `"This text is emotionally {}."` | 90% |
| **Topic Classification** | politics, technology, sports, entertainment | `"This text is about {}."` | 100% |
| **Content Type** | factual, opinion, question | `"This text is {}."` | 100% |
| **Communication Intent** | informative, persuasive, entertaining | `"This text is meant to be {}."` | 75% |
| **Spam Detection** | promotional spam, normal message | `"This is a {} email."` | 50%* |

*Spam detection remains challenging due to template limitations

### Test Results Summary

From `npm run test:templates` on V3 Base model:
- **Best performing**: Topic Classification (100% accuracy)
- **Most improved**: Sentiment with emotional template (40% → 90%)
- **Challenging**: Spam detection (needs specialized template)

## Component Architecture

```
/src
  /labels
    LabelManager.ts       # Dynamic label CRUD, localStorage persistence

  /chunking
    TextChunker.ts        # Character-based chunking, logit aggregation

  /nli
    ZeroShotClassifier.ts # Transformers.js pipeline wrapper, score mapping fix

  /ui
    StreamingResultsRenderer.ts # Real-time DOM updates, row animations

  /utils
    exportUtils.ts        # CSV/JSON export with metadata

  main.ts                 # Orchestration, streaming control flow
  TestCorpora.ts          # 6 pre-tested datasets with optimal templates
```

### Key Implementation Details

#### Label-Score Alignment Bug Fix
The pipeline returns labels in confidence order, not input order. Fixed by mapping:
```javascript
// Map scores back to original label order
aggregatedScores = labelNames.map(label => {
  const idx = result.labels.indexOf(label);
  return idx >= 0 ? result.scores[idx] : 0;
});
```

#### Memory Management
- Models loaded on-demand via dynamic import
- Optional caching controlled by user
- Automatic cleanup after classification if caching disabled

#### Browser Compatibility Requirements
- SharedArrayBuffer support (CORS headers required)
- WebAssembly support
- ~4GB memory recommended for Large model

## Vite Configuration

```javascript
// From vite.config.ts
optimizeDeps: {
  exclude: ['@huggingface/transformers'],  // Prevent pre-bundling
  force: true
},
server: {
  headers: {
    'Cross-Origin-Embedder-Policy': 'credentialless',
    'Cross-Origin-Opener-Policy': 'same-origin',
  }
}
```

## Performance Characteristics

### Model Loading (First Run)
- XSmall: ~45MB download, 1.2s load
- V3 Base: ~360MB download, 18.8s load
- V3 Large: ~560MB download, 44.5s load

### Classification Speed
- Single text: 100-500ms per classification
- Batch of 10: ~2-5 seconds with streaming updates
- Chunked text: Linear with chunk count

### Browser Cache
Models cached using Browser Cache API - subsequent loads are near-instant.

## Testing Suite

### Model Performance Testing (`test-models.js`)
- 25 diverse sentiment test cases
- Tests all 4 model sizes
- Measures accuracy, confidence, load time
- Identifies model disagreements

### Template Testing (`test-templates.js`)
- 7 sentiment templates compared
- 4 task types evaluated
- Neutral detection analysis
- Discovers 90% accuracy with emotional template

## Current Limitations

1. **Character-based chunking** - Not token-aware, can split words
2. **English-only** - Models are English-optimized
3. **Template sensitivity** - Accuracy heavily template-dependent
4. **Spam detection** - Only 50% accuracy with current approach
5. **Memory usage** - Large model requires ~4GB browser tab limit
6. **WASM-only** - WebGPU disabled for stability

## Production Build

```bash
npm run build
```

Generates:
- `dist/index.html` - Entry point
- `dist/assets/index-*.js` - Application (~24KB gzipped)
- `dist/assets/transformers.web-*.js` - Transformers.js (~231KB gzipped)
- `dist/assets/ort-wasm-*.wasm` - ONNX Runtime (~21MB)

## Dependencies

### Core
- `@huggingface/transformers@3.0.2` - ML inference in browser
- Models download from Hugging Face CDN on first use

### Development
- `vite@5.0.8` - Build tool with HMR
- `typescript@5.2.2` - Type safety

## Future Enhancements

### Verified Possible
- [ ] Token-based chunking using transformers.js tokenizer
- [ ] WebWorker processing to prevent UI blocking
- [ ] IndexedDB for larger model caching
- [ ] Ensemble multiple templates for better accuracy

### Requires Investigation
- [ ] WebGPU support (currently causes crashes)
- [ ] Multilingual models (need testing)
- [ ] Custom ONNX model loading
- [ ] Streaming model downloads

## License

MIT - Use freely for any purpose

## Credits

Built with:
- [Transformers.js](https://github.com/xenova/transformers.js) v3.0.2
- [DeBERTa v3 Models](https://huggingface.co/microsoft/deberta-v3-base) via [Xenova's ONNX ports](https://huggingface.co/Xenova)
- Architecture patterns from Sentimentomatic
- Extensive testing revealing template criticality

## Technical Support

### Common Issues

**Q: Everything classifies as first label**
A: Fixed in latest version - was label/score alignment bug

**Q: Poor neutral detection**
A: Use `"This text is emotionally {}."` template - achieves 100% neutral detection

**Q: Slow first load**
A: Models download once and cache. Use XSmall for demos, V3 Base for production

**Q: Browser crashes**
A: Likely memory issue with Large model. Use V3 Base instead

### Debug Mode

Open browser console to see:
- Template being used
- Labels passed to pipeline
- Scores returned from model
- Chunking decisions