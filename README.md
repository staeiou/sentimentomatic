# Sentimentomatic

A comprehensive sentiment analysis web application built with TypeScript and modern web technologies. Analyzes text using multiple sentiment analysis approaches from rule-based algorithms to state-of-the-art transformer models.

## 🚀 Features

- **Multiple Analysis Methods**: VADER, AFINN, and transformer-based models (DistilBERT, RoBERTa, etc.)
- **Real-time Processing**: Streaming analysis with live results display
- **Classification Models**: Emotion detection (GoEmotions), content moderation, topic classification
- **Export Functionality**: CSV and JSON export with proper formatting
- **Client-side Processing**: All analysis runs in the browser using WebAssembly
- **Model Caching**: Intelligent caching system for ML models
- **Responsive UI**: Clean, modern interface optimized for data analysis

## 🏗️ Architecture

### Core Components

```
JSApp/
├── src/
│   ├── analyzers/           # Sentiment analysis implementations
│   │   ├── AfinnAnalyzer.ts
│   │   ├── VaderAnalyzer.ts
│   │   └── TransformersAnalyzer.ts
│   ├── analysis/            # Analysis orchestration
│   │   ├── StreamingAnalysisController.ts
│   │   └── IncrementalTableRenderer.ts
│   ├── models/              # Model management and caching
│   │   ├── ModelManager.ts
│   │   ├── CacheManager.ts
│   │   └── registry.ts
│   └── utils/               # Utilities and helpers
│       ├── exportUtils.ts
│       └── textProcessor.ts
├── index.html               # Main application page
└── package.json
```

### Data Flow

1. **Text Input**: User enters text, line numbering syncs automatically
2. **Model Selection**: Choose from rule-based and ML models
3. **Streaming Analysis**: Each line analyzed progressively
4. **Live Results**: Results appear in real-time table
5. **Export**: Generate CSV/JSON with proper formatting

### Analysis Types

**Sentiment Analysis**:
- **VADER**: Rule-based, optimized for social media (-1 to +1)
- **AFINN**: Word list approach (-5 to +5)
- **DistilBERT**: Transformer model trained on Stanford Sentiment Treebank
- **RoBERTa**: Twitter-optimized transformer model

**Classification**:
- **GoEmotions**: 28 emotion categories (joy, anger, fear, etc.)
- **Content Moderation**: Toxicity and inappropriate content detection
- **Topic Classification**: IPTC news categories, COVID misinformation detection

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd JSApp
npm install
```

### Development Server

```bash
npm run dev
```

Opens development server on `http://localhost:3000`

### Building

```bash
npm run build
```

Outputs optimized build to `dist/` directory.

## 🔧 Configuration

### Adding New Models

1. **Register Model** in `src/models/registry.ts`:

```typescript
export const modelConfigs: Record<string, ModelConfig> = {
  'my-new-model': {
    id: 'my-new-model',
    name: 'My Custom Model',
    type: 'sentiment',
    huggingFaceId: 'username/model-name',
    size: 250,
    description: 'Custom sentiment model'
  }
};
```

2. **Update UI** in `index.html`:

```html
<label><input type="checkbox" id="use-my-new-model"> My Custom Model (250MB)</label>
```

3. **Wire up checkbox** in `src/main.ts`:

```typescript
this.myNewModelCheckbox = document.getElementById('use-my-new-model') as HTMLInputElement;
```

### Model Configuration Options

```typescript
interface ModelConfig {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  type: 'sentiment' | 'classification';
  huggingFaceId: string;         // HuggingFace model ID
  size: number;                  // Model size in MB
  description?: string;          // Optional description
  preprocessing?: PreprocessConfig;
  postprocessing?: PostprocessConfig;
}
```

## 📦 Dependencies

### Core Dependencies

- **@xenova/transformers**: WebAssembly-based transformer models
- **sentiment**: AFINN sentiment analysis
- **vader-sentiment**: VADER sentiment analysis
- **os-browserify**, **path-browserify**: Node.js compatibility shims

### Development Dependencies

- **TypeScript**: Type safety and modern JS features
- **Vite**: Fast build tool and dev server

### Removed Dependencies

- **@huggingface/transformers**: Replaced with @xenova/transformers (smaller, faster)
- **puppeteer**: Removed testing framework (116 packages saved)

## 🎨 Styling

The application uses a custom CSS framework with:

- **Color Scheme**: Modern flat design with high contrast
- **Typography**: Monospace fonts for data, Arial for UI
- **Responsive Layout**: Flexbox and CSS Grid
- **Fixed Footer**: Full-width footer anchored to viewport bottom

### Key CSS Classes

- `.results-table`: Main data display table
- `.text-cell`: Text content with overflow handling
- `.progress-bar`: Analysis progress visualization
- `.line-numbers`: Synchronized line numbering

## 🚀 Deployment

### GitHub Pages

The project is configured for automatic GitHub Pages deployment:

1. **GitHub Actions**: `.github/workflows/deploy.yml`
2. **Build Process**: TypeScript compilation + Vite bundling
3. **Deployment**: Automatic on push to main branch

### Manual Deployment

```bash
npm run build
# Deploy contents of dist/ directory to web server
```

### Environment Variables

- `NODE_ENV=production`: Enables production optimizations
- Base path automatically set to `/sentimentomatic/` for GitHub Pages

## ⚡ Performance

### Bundle Analysis

- **Main JS**: ~53KB (gzipped: 14KB)
- **Sentiment Core**: ~177KB (gzipped: 61KB) - VADER, AFINN
- **CSS**: ~5KB (gzipped: 1.4KB)
- **Total Initial Load**: ~235KB

### Model Loading

- **Lazy Loading**: Models download only when selected
- **Caching**: IndexedDB storage for model persistence
- **Progress Tracking**: Real-time download progress
- **Error Handling**: Graceful fallbacks for network issues

### Memory Management

- **Streaming Processing**: Lines processed individually
- **Model Cleanup**: Unused models garbage collected
- **Cache Limits**: Configurable cache size limits

## 🧪 Testing

### Manual Testing

```bash
npm run dev
# Test in browser at localhost:3000
```

### Test Cases

1. **Text Input**: Various text lengths, special characters, emojis
2. **Model Selection**: Different combinations of analyzers
3. **Export Functionality**: CSV and JSON format validation
4. **Performance**: Large text files, multiple models
5. **Error Handling**: Network failures, invalid inputs

## 🐛 Troubleshooting

### Common Issues

**Models not loading**:
- Check browser console for network errors
- Verify HuggingFace model IDs in registry
- Clear browser cache and IndexedDB

**Memory issues**:
- Reduce number of concurrent models
- Clear model cache
- Use smaller models for testing

**Build failures**:
- Check TypeScript errors: `npx tsc --noEmit`
- Verify all imports are resolved
- Update dependencies: `npm update`

**Export not working**:
- Ensure analysis completed successfully
- Check browser's download permissions
- Verify CSV/JSON formatting in export utils

### Debug Mode

Enable debug logging:

```typescript
// In browser console
localStorage.setItem('debug', 'sentiment:*');
```

## 🤝 Contributing

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Consistent indentation, semicolons
- **Naming**: camelCase for variables, PascalCase for classes
- **Comments**: JSDoc for public APIs

### Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes with proper TypeScript types
4. Test functionality manually
5. Build successfully: `npm run build`
6. Submit pull request with clear description

### Architecture Guidelines

- **Separation of Concerns**: Keep analyzers, UI, and data management separate
- **Type Safety**: Use TypeScript interfaces for all data structures
- **Error Handling**: Graceful degradation for all failure modes
- **Performance**: Consider memory usage and bundle size impact

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **VADER Sentiment**: C.J. Hutto & Eric Gilbert
- **AFINN**: Finn Årup Nielsen
- **Transformers.js**: Xenova for WebAssembly implementation
- **HuggingFace**: Model hosting and transformer implementations
- **Original Flask App**: R. Stuart Geiger

## 📚 References

- [VADER Sentiment Analysis](https://github.com/cjhutto/vaderSentiment)
- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js)
- [Vite Build Tool](https://vitejs.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)