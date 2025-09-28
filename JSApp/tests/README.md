# E2E Model Size Testing

This directory contains Playwright end-to-end tests for systematically testing all sentiment analysis models and logging their actual download sizes.

## Setup

1. Install dependencies:
```bash
npm install
npx playwright install
```

2. Make sure the dev server is running (or let Playwright start it automatically):
```bash
npm run dev
```

## Running Tests

### Test All Models and Log Sizes
This is the main test that systematically tests each model and logs detailed size information:

```bash
npm run test:model-sizes
```

### All E2E Tests
```bash
npm run test:e2e
```

### Debug Mode (with browser visible)
```bash
npm run test:debug
```

### Interactive UI Mode
```bash
npm run test:ui
```

## What the Test Does

The `model-sizes.spec.ts` test:

1. **Tests Each Model Individually**: Clears cache, selects one model, runs analysis
2. **Monitors Downloads**: Tracks network requests and file sizes during download
3. **Inspects Browser Cache**: Checks the actual `transformers-cache` contents after download
4. **Logs Detailed Results**: Shows file-by-file breakdown of what gets cached
5. **Generates Summary Report**: Creates comprehensive size analysis

## Expected Output

The test will generate detailed console output like:

```
🚀 STARTING COMPREHENSIVE MODEL SIZE TESTING
================================================================================

🧪 Testing DistilBERT SST-2 (Xenova/distilbert-base-uncased-finetuned-sst-2-english)
   📥 Downloaded: config.json (1.2 KB)
   📥 Downloaded: tokenizer.json (466.6 KB)
   📥 Downloaded: model_quantized.onnx (255.8 MB)
   ✅ Analysis completed
   📊 Cache contains 3 files:
      📁 config.json - 1.2 KB
      📁 tokenizer.json - 466.6 KB
      📁 model_quantized.onnx - 255.8 MB
   🎯 Total size: 256.3 MB

📋 COMPREHENSIVE MODEL SIZE REPORT
================================================================================

📊 SUMMARY TABLE:
Model Name                    HuggingFace ID                          Size           Files
-----------------------------------------------------------------------------------------------
DistilBERT SST-2             Xenova/distilbert-base-uncased...      256.3 MB       3
Twitter RoBERTa              Xenova/twitter-roberta-base-sent...     501.2 MB       3
...

TOTAL (12 models):                                                  3.2 GB         45 files
```

## Benefits

- **Real Size Data**: Get actual download sizes instead of estimates
- **Cache Validation**: Verify cache system is working correctly
- **Performance Baseline**: Understand bandwidth requirements
- **Model Comparison**: Compare sizes across different model types
- **Regression Testing**: Catch cache system regressions