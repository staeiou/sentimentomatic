# JS Sentimentomatic - Developer Documentation

## Architecture Overview

JS Sentimentomatic is a browser-based sentiment analysis and text classification application that runs entirely client-side using WebAssembly and JavaScript. It combines traditional rule-based sentiment analyzers with modern neural networks via Transformers.js.

## Technology Stack

- **Frontend Framework**: Vanilla TypeScript with Vite
- **ML Runtime**: Transformers.js v3.7.3 (ONNX models via WebAssembly)
- **Rule-Based Analyzers**: AFINN, VADER (via npm packages)
- **Styling**: Custom CSS with compact design
- **Build Tool**: Vite 5.4.19
- **Language**: TypeScript 5.0+

## Core Architecture Flow

### 1. Application Initialization
```
main.ts (SentimentomaticApp)
├── AnalyzerRegistry (manages rule-based analyzers)
├── MultiModelAnalyzer (manages ML models)
├── StreamingAnalysisController (orchestrates analysis)
├── CacheManager (tracks model cache metadata)
└── UI Event Listeners
```

### 2. Model Selection Flow
1. User selects models via checkboxes (any combination of sentiment/classification)
2. `updateAllModelSelections()` clears and re-adds selected models
3. Models are registered with unique IDs and HuggingFace paths
4. No mode switching - all models work independently

### 3. Analysis Pipeline

#### Phase 1: Model Loading
```
User clicks "Analyze Text"
└── analyzeText() [main.ts]
    ├── Show progress log UI
    ├── Scroll to results section
    └── analyzeWithStreaming() [StreamingAnalysisController]
        ├── Initialize rule-based analyzers
        └── Load ML models via MultiModelAnalyzer
            └── For each model:
                ├── Check if already loaded
                ├── Load via ModelManager
                │   ├── Import Transformers.js (cached after first load)
                │   ├── Configure environment settings
                │   ├── Validate model files exist on HuggingFace
                │   └── Create pipeline with appropriate task
                └── Track in cache
```

#### Phase 2: Text Processing
```
For each line of text:
├── Process with rule-based analyzers (AFINN, VADER)
│   └── Get sentiment scores (-1 to +1)
└── Process with ML models
    ├── Sentiment models → analyze() → score + sentiment
    └── Classification models → getAllPredictions() → top class + confidence
```

#### Phase 3: Result Display
```
For each processed line:
└── addUnifiedRow() [IncrementalTableRenderer]
    ├── Create table row with line number and text
    ├── For each result:
    │   ├── Sentiment → display score with color coding
    │   └── Classification → display top class with confidence %
    └── Auto-scroll to show new row
```

## Key Components

### 1. Model Management (`/src/models/`)

#### ModelManager.ts
- Loads and manages Transformers.js pipelines
- Handles ONNX model downloading from HuggingFace CDN
- Configures WebAssembly environment settings
- Implements model caching (reuses Transformers.js module)
- Key configuration:
  ```typescript
  env.allowRemoteModels = true;  // Load from HuggingFace
  env.allowLocalModels = false;  // Don't use local paths
  env.useBrowserCache = false;   // Bypass corrupted cache
  env.useQuantized = true;       // Use smaller quantized models
  ```

#### CacheManager.ts
- Tracks model metadata in localStorage
- Estimates model sizes for cache statistics
- Note: Cannot directly control browser's actual cache
- Provides cache size display and clear functionality

### 2. Analyzers (`/src/analyzers/`)

#### Rule-Based Analyzers
- **AfinnAnalyzer.ts**: Word-based sentiment scoring (-5 to +5)
- **VaderAnalyzer.ts**: Rule-based with emoji support (-1 to +1)

#### MultiModelAnalyzer.ts
- Manages multiple ML models simultaneously
- Loads models serially to avoid memory issues
- CRITICAL: Does NOT unload models between uses (commented out to prevent reload issues)
- Provides unified interface for both sentiment and classification

### 3. Analysis Control (`/src/analysis/`)

#### StreamingAnalysisController.ts
- Main orchestrator for the analysis pipeline
- Handles mixed sentiment and classification models
- Processes text line-by-line with streaming updates
- Determines model type and calls appropriate methods

#### IncrementalTableRenderer.ts
- Creates and updates results table dynamically
- Supports unified display of mixed model types
- Implements auto-scrolling for new rows
- Handles both sentiment scores and classification results

### 4. User Interface (`/src/`)

#### main.ts
- Application entry point and UI controller
- Manages model selection state
- Handles progress logging and status updates
- Coordinates between all components

#### style-compact.css
- Compact design optimized for 1400px viewport
- No internal table scrolling (uses viewport scroll)
- Progress bar with shimmer animation
- Color-coded sentiment results

## Model Configuration

### Supported Models

#### Rule-Based Sentiment
- AFINN: Lexicon-based, 2477 words
- VADER: Rule-based with intensifiers and emoji

#### Neural Sentiment Models
- DistilBERT SST-2: `Xenova/distilbert-base-uncased-finetuned-sst-2-english`
- Twitter RoBERTa: `cardiffnlp/twitter-roberta-base-sentiment-latest`
- Financial DistilRoBERTa: `ProsusAI/finbert`
- Multilingual BERT: `Xenova/bert-base-multilingual-uncased-sentiment`
- Multilingual DistilBERT: `Xenova/distilbert-base-multilingual-cased-sentiments-student`

#### Classification Models
- GoEmotions (28 emotions): `SamLowe/roberta-base-go_emotions-onnx`
- KoalaAI Moderation (9 classes): `KoalaAI/Text-Moderation`
- IPTC News Topics (21 topics): `onnx-community/multilingual-IPTC-news-topic-classifier-ONNX`
- COVID Misinformation: `spencer-gable-cook/COVID-19_Misinformation_Detector`
- IMDB Sentiment: `pitangent-ds/distilbert-base-imdb`

### Model Task Mapping
Models are automatically assigned tasks based on their type:
- GoEmotions, Moderation, IPTC, COVID → `text-classification`
- Sentiment models → `sentiment-analysis` or `text-classification`

## Critical Implementation Details

### 1. Transformers.js Module Caching
The Transformers.js module is loaded ONCE and cached to prevent:
- Multiple concurrent imports causing conflicts
- Duplicate file downloads
- State corruption between models

### 2. Model Memory Management
Models are kept in memory after loading:
- Line 486-489 in MultiModelAnalyzer.ts is COMMENTED OUT
- Prevents constant reloading between text lines
- Trade-off: Higher memory usage for better performance

### 3. Browser Cache Issues
Setting `env.useBrowserCache = false` prevents corrupted cache issues:
- Browser cache can get corrupted during development
- Symptoms: JSON.parse errors even though files are valid
- Solution: Bypass cache or clear site data in DevTools

### 4. Progress Feedback
Two-level progress system:
1. Model loading progress (shown in progress log)
2. Line-by-line analysis (shown via streaming table rows)

### 5. Error Handling
- JSON parse errors usually indicate corrupted cache or wrong file format
- IR version errors trigger fallback to non-quantized models
- Failed models don't block other models from loading

## Development Workflow

### Building
```bash
npm install
npm run dev   # Development server
npm run build # Production build
```

### Debugging Model Issues
1. Check browser console for fetch URLs
2. Verify files exist: `curl -I https://huggingface.co/[model]/resolve/main/tokenizer.json`
3. Clear browser cache if getting HTML instead of JSON
4. Check Network tab for actual responses

### Common Issues & Solutions

#### Models fail with JSON.parse error
- **Cause**: Corrupted browser cache or model files moved
- **Solution**: Clear site data in DevTools, use incognito mode

#### Models reload on every line
- **Cause**: MultiModelAnalyzer unloading models after use
- **Solution**: Keep line 486-489 commented out

#### Table doesn't scroll properly
- **Cause**: Internal table scroll instead of viewport scroll
- **Solution**: Remove max-height from .incremental-table-container

#### Clear cache does nothing
- **Cause**: Event listener not attached or button reference lost
- **Solution**: Ensure clearCacheBtn is properly initialized and listener attached

## Performance Considerations

### Memory Usage
- Each model uses 200-700MB of memory
- Models stay loaded for entire session
- Browser may slow down with many models loaded

### Loading Time
- First model load downloads from HuggingFace CDN
- Subsequent uses should load from browser cache
- Network speed affects initial load significantly

### Optimization Tips
- Load fewer models for faster analysis
- Use quantized models (smaller, faster)
- Process fewer lines at once for better responsiveness

## Future Improvements

### Potential Enhancements
1. WebGPU acceleration for faster inference
2. Model unloading strategy for memory management
3. Web Workers for non-blocking analysis
4. Progressive Web App for offline use
5. Custom model upload support

### Known Limitations
1. Cannot directly control browser's ONNX cache
2. Memory usage grows with each loaded model
3. Some models may not be fully compatible with Transformers.js
4. Large texts can cause performance issues

## Testing

### Manual Test Checklist
- [ ] All rule-based analyzers load and produce scores
- [ ] ML models download and initialize properly
- [ ] Mixed model selection works (sentiment + classification)
- [ ] Results stream in row-by-row
- [ ] Auto-scroll follows new results
- [ ] Clear cache updates size display
- [ ] Export functions work (CSV/JSON)
- [ ] Progress log shows model loading status

### Browser Compatibility
- Chrome 90+ (recommended)
- Firefox 90+
- Safari 16.4+
- Edge 90+

Note: Requires WebAssembly and modern JavaScript support

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │ Text Input   │  │Model Select │  │ Results Table│  │
│  └──────────────┘  └─────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      main.ts                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │         SentimentomaticApp Controller            │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────┐
│AnalyzerRegistry│  │MultiModelAnalyzer│  │CacheManager │
│              │  │                  │  │             │
│ ┌──────────┐ │  │ ┌──────────────┐│  │             │
│ │  AFINN   │ │  │ │ ModelManager ││  │ localStorage│
│ └──────────┘ │  │ └──────────────┘│  │   metadata  │
│ ┌──────────┐ │  │        │        │  │             │
│ │  VADER   │ │  │        ▼        │  │             │
│ └──────────┘ │  │ ┌──────────────┐│  │             │
└──────────────┘  │ │Transformers.js││  └──────────────┘
                  │ │   (ONNX/WASM) ││
                  │ └──────────────┘│
                  └──────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│           StreamingAnalysisController                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │    Orchestrates analysis and streaming updates   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│            IncrementalTableRenderer                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │    Unified table for mixed model results         │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## License

This project uses various open-source models and libraries. Please check individual model licenses on HuggingFace.