# JSApp - Modern Sentiment Analysis

A privacy-first, client-side sentiment analysis application built with Vue 3 and Transformers.js. All analysis runs locally in your browser using WebAssembly - no data is sent to servers.

## 🚀 Features

- **🔒 Privacy-First**: All processing in-browser, no server communication
- **🌐 Offline Capable**: Works without internet after model downloads
- **🤖 Advanced Models**: DistilBERT, RoBERTa, GoEmotions, Jigsaw Toxicity MiniLMv2
- **📊 Rich Export**: CSV/JSON/Excel with multiclass analysis expansion
- **⚡ Real-time**: Streaming analysis with live progress updates
- **🎨 Modern UI**: AG-Grid tables, Vue 3 reactivity, responsive design

## 🛠️ Quick Start

**Prerequisites**: Node.js 20+, npm

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Opens on http://localhost:3000

# Build for production
npm run build

# Run tests
npm run test:e2e
```

## 🏗️ Architecture

```
src/
├── components/              # Vue 3 components
│   ├── InputSection.vue     # Text input with CodeMirror
│   ├── ModelSelector/       # Model selection checkboxes
│   ├── ResultsTable/        # AG-Grid results display
│   └── Controls/            # Analysis controls
├── core/
│   ├── analyzers/           # Analysis implementations
│   │   ├── VaderAnalyzer.ts
│   │   ├── AfinnAnalyzer.ts
│   │   └── TransformersAnalyzer.ts
│   ├── analysis/            # Analysis orchestration
│   └── models/              # Model management & caching
├── stores/                  # Pinia state management
│   ├── analysisStore.ts     # Analysis state & results
│   └── modelStore.ts        # Model selection & metadata
└── utils/
    └── exportUtils.ts       # CSV/JSON/Excel export logic
```

## 🤖 Supported Models

### Sentiment Analysis
- **VADER**: Rule-based, social media optimized (-1 to +1)
- **AFINN**: Word list approach (-5 to +5)
- **DistilBERT SST-2**: Stanford Sentiment Treebank trained
- **Twitter RoBERTa**: Twitter-optimized transformer
- **Multilingual DistilBERT**: Multi-language support

### Classification Models
- **GoEmotions**: 28 emotion categories (joy, anger, fear, etc.)
- **Jigsaw Toxicity MiniLMv2**: Content moderation and safety
- **Financial DistilRoBERTa**: Financial text sentiment
- **Industry Classification**: Business sector categorization

## 📊 Export Features

### Standard Export
- **CSV/JSON/Excel**: All formats supported
- **Columns**: Line, Text, Model_Score, Model_Sentiment

### Multiclass Export (Classification Models)
When "Export individual class columns" is checked:

```
# Standard columns
GoEmotions_Majority_Prediction, GoEmotions_Majority_Likelihood

# Plus individual class columns
GoEmotions_Class_joy, GoEmotions_Class_anger, GoEmotions_Class_fear, ...
```

Perfect for detailed analysis where you need both summary and breakdown.

## 🔧 Adding New Models

1. **Register in Model Store** (`src/stores/modelStore.ts`):

```typescript
// Add to NEURAL_MODELS array
{
  id: 'my-custom-model',
  name: 'My Custom Model',
  huggingFaceId: 'username/my-model-onnx',
  type: 'sentiment', // or 'classification'
  size: 250, // MB
  description: 'Custom transformer model'
}
```

2. **Add UI Checkbox** (`src/components/ModelSelector/ModelSelector.vue`):

```html
<label class="model-checkbox">
  <input type="checkbox" id="use-my-custom-model" v-model="selectedModels['my-custom-model']">
  My Custom Model (250MB)
</label>
```

**Requirements**:
- Must be ONNX format for browser compatibility
- Include `tokenizer.json` and `config.json`
- Recommend <500MB for good user experience

## 🧪 Testing

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test
npx playwright test export-functionality.spec.ts

# Debug mode (visible browser)
npx playwright test --headed

# Run with custom timeout
npx playwright test --timeout=120000
```

**Test Coverage**:
- Export functionality (CSV/JSON/Excel)
- Multiclass analysis expansion
- Model loading and caching
- Analysis pipeline end-to-end

## ⚡ Performance

### Bundle Size
- **Initial Load**: ~515KB gzipped (JS) + ~40KB (CSS)
- **Models**: 100MB-500MB each (downloaded on-demand)
- **Caching**: IndexedDB persistence, permanent storage

### Memory Management
- **Streaming**: Lines processed individually
- **WebAssembly**: Efficient model execution
- **Cleanup**: Automatic model garbage collection
- **Progressive**: Models load only when selected

## 🐛 Troubleshooting

### Models Not Loading
```bash
# Check browser console for network errors
# Clear IndexedDB cache: DevTools → Application → Storage → IndexedDB
# Verify model IDs in src/stores/modelStore.ts
```

### Memory Issues
```bash
# Disable large models (>300MB) temporarily
# Reload page to clear model memory
# Use Chrome Task Manager to monitor memory usage
```

### Export Issues
```bash
# Wait for analysis completion (button shows "Analyze" again)
# Check browser download permissions
# Try different export format (CSV/JSON/Excel)
# Ensure multiclass models have results before expanding
```

### Build Issues
```bash
# Check TypeScript errors
npx tsc --noEmit

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Update dependencies
npm update
```

## 🚀 Deployment

### Static Hosting (Recommended)
```bash
npm run build
# Deploy dist/ folder to any static host
```

**Compatible Hosts**:
- GitHub Pages
- Netlify
- Vercel
- AWS S3 + CloudFront
- Any static file hosting

### Environment Variables
- `NODE_ENV=production`: Production optimizations
- `VITE_BASE_URL`: Custom base path for deployment

## 🎨 Customization

### Styling
- CSS custom properties in `src/styles/global.css`
- Component-scoped styles in `.vue` files
- AG-Grid theme customization in results components

### UI Components
- **Text Input**: CodeMirror-based with syntax highlighting
- **Results Table**: AG-Grid with sticky columns and smooth scrolling
- **Progress**: Real-time analysis progress with model status
- **Export**: Multi-format support with user-friendly options

## 📦 Key Dependencies

- **@xenova/transformers**: WebAssembly ML models
- **vue**: Reactive UI framework
- **ag-grid-vue3**: Advanced data grids
- **pinia**: State management
- **codemirror**: Text editor
- **vite**: Build tool and dev server
- **playwright**: E2E testing

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Follow TypeScript strict mode
4. Add tests for new functionality
5. Test export functionality: `npm run test:e2e`
6. Build successfully: `npm run build`
7. Submit pull request

## 📄 License

MIT License - see the root LICENSE file for details.