# Sentimentomatic

A comprehensive sentiment analysis platform with **two independent applications**: a legacy Python Flask server and a modern client-side web application. Choose the approach that best fits your needs!

## 📱 Two Applications

### 🆕 **JSApp** - Modern Client-Side Application (Recommended)
### Hosted at [https://sentimentomatic.org](https://sentimentomatic.org)
**Local-first browser analysis using Transformers.js** 

- **🔒 Privacy-First**: All processing happens in your browser - no data sent to servers
- **🌐 Works Offline**: No internet required after initial model download
- **🚀 Modern Stack**: Vue 3 + TypeScript + Vite
- **🤖 Advanced Models**: DistilBERT, RoBERTa, GoEmotions, Jigsaw Toxicity, and more
- **📊 Rich Export**: CSV/JSON/Excel with multiclass analysis support
- **⚡ Real-time**: Streaming analysis with live results
- **🎨 Modern UI**: AG-Grid tables, responsive design

### 🔧 **FlaskApp** - Legacy Python Server (For Older Models)
### Hosted at [https://sentimentomatic.stuartgeiger.com](https://sentimentomatic.stuartgeiger.com)
**Traditional server-based processing with Google Perspective API**

- **🐍 Python/Flask**: Server-side processing
- **🔍 Google Perspective**: Toxicity detection via API (requires key)
- **📚 Classic Models**: VADER, TextBlob sentiment analysis
- **🛡️ ReCaptcha**: Built-in spam protection
- **📋 Simple Interface**: HTML forms with DataTables
- **⚠️ Limitations**: 50 lines max, requires internet connection

## 🎯 Which Should I Use?

| Use Case | Recommended App | Why |
|----------|----------------|-----|
| **Privacy-sensitive analysis** | JSApp | No data leaves your browser |
| **Offline analysis** | JSApp | Works without internet |
| **Modern transformer models** | JSApp | DistilBERT, RoBERTa, GoEmotions |
| **Advanced export features** | JSApp | Multiclass analysis, multiple formats |
| **Legacy Python integration** | FlaskApp | Existing Python workflows |
| **Google Perspective API** | FlaskApp | Requires their toxicity API |

## 🏗️ Architecture

### 🆕 JSApp Architecture (Modern Client-Side)

```
JSApp/
├── src/
│   ├── core/
│   │   ├── analyzers/           # Analysis implementations
│   │   ├── analysis/            # Analysis orchestration
│   │   └── models/              # Model management and caching
│   ├── components/              # Vue 3 components
│   │   ├── InputSection.vue
│   │   ├── ResultsTable/        # AG-Grid table components
│   │   └── ModelSelector/
│   ├── stores/                  # Pinia state management
│   └── utils/                   # Export utilities
├── tests/                       # Playwright E2E tests
└── package.json
```

**JSApp Data Flow**:
1. **Browser-Based**: Everything runs locally using WebAssembly
2. **Model Loading**: Transformers.js downloads and caches models in IndexedDB
3. **Streaming Analysis**: Real-time processing with progress updates
4. **Rich Export**: CSV/JSON/Excel with multiclass column expansion

**JSApp Analysis Types**:
- **Sentiment**: VADER, AFINN, DistilBERT, RoBERTa, Multilingual models
- **Emotion Classification**: GoEmotions (28 emotions)
- **Content Moderation**: Jigsaw Toxicity, various safety models
- **Topic Classification**: News categorization, industry classification

### 🔧 FlaskApp Architecture (Legacy Server-Side)

```
FlaskApp/
├── flaskapp.py              # Main Flask application
├── requirements.txt         # Python dependencies
├── templates/
│   ├── form.html           # Main UI form
│   └── upload.html         # File upload interface
└── static/                 # CSS/JS assets
```

**FlaskApp Data Flow**:
1. **Server Processing**: Text sent to Python Flask server
2. **API Calls**: Google Perspective API for toxicity detection
3. **Library Analysis**: VADER and TextBlob on server
4. **HTML Response**: Results rendered in DataTables

**FlaskApp Analysis Types**:
- **Sentiment**: VADER compound scores, TextBlob polarity/subjectivity
- **Toxicity**: Google Perspective API (requires API key)
- **Limitations**: 50 lines max, 125k characters, requires internet

## 🛠️ Development Setup

### 🆕 JSApp Setup (Recommended)

**Prerequisites**: Node.js 20+, npm

```bash
# Navigate to modern app
cd JSApp

# Install dependencies
npm install

# Start development server
npm run dev
# Opens on http://localhost:3000

# Build for production
npm run build
# Outputs to dist/ directory

# Run tests
npm run test:e2e
```

### 🔧 FlaskApp Setup (Legacy)

**Prerequisites**: Python 3.7+, pip

```bash
# Navigate to Flask app
cd FlaskApp

# Install Python dependencies
pip install -r requirements.txt

# Set up Google Perspective API key (optional)
# Edit flaskapp.py and add your API key to G_API_KEY

# Set up ReCaptcha keys (optional)
# Edit flaskapp.py and add your keys to RECAPTCHA_SITE_KEY and RECAPTCHA_SECRET_KEY

# Run Flask development server
python flaskapp.py
# Opens on http://127.0.0.1:5002
```

**Note**: FlaskApp requires API keys for full functionality. Without them, only VADER and TextBlob analysis will work.

## 🔧 Configuration (JSApp)

### Adding New Transformer Models

JSApp supports any ONNX model from HuggingFace. To add a new model:

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

3. **Model Requirements**:
- Must be ONNX format for browser compatibility
- Should include `tokenizer.json` and `config.json`
- Size recommendations: <500MB for good UX

### Export Configuration

**Multiclass Export**: When enabled, classification models export both:
- `ModelName_Majority_Prediction` + `ModelName_Majority_Likelihood` (summary)
- `ModelName_Class_[class1]`, `ModelName_Class_[class2]`, etc. (all classes)

## 📦 Dependencies

### 🆕 JSApp Dependencies

**Core**:
- **@xenova/transformers**: WebAssembly-based transformer models
- **Vue 3**: Modern reactive framework
- **ag-grid-vue3**: Advanced data grid for results display
- **pinia**: State management
- **sentiment**, **vader-sentiment**: Rule-based analysis

**Development**:
- **TypeScript**: Type safety
- **Vite**: Fast build tool and dev server
- **Playwright**: E2E testing framework

### 🔧 FlaskApp Dependencies

**Core**:
- **Flask**: Python web framework
- **vaderSentiment**: VADER sentiment analysis
- **textblob**: TextBlob sentiment analysis
- **pandas**: Data manipulation
- **google-api-python-client**: Perspective API access

**UI**:
- **DataTables**: Interactive HTML tables
- **ReCaptcha**: Spam protection

## 🚀 Deployment

### 🆕 JSApp Deployment (Static)

**GitHub Pages** (Automatic):
```bash
# Configured in .github/workflows/deploy.yml
# Deploys automatically on push to main branch
```

**Manual Deployment**:
```bash
cd JSApp
npm run build
# Deploy contents of dist/ directory to any static host
```

**Hosting Options**: GitHub Pages, Netlify, Vercel, AWS S3, any static file host

### 🔧 FlaskApp Deployment (Server Required)

**Development**:
```bash
cd FlaskApp
python flaskapp.py
```

**Production**: Use WSGI server (Gunicorn, uWSGI) with reverse proxy (Nginx)

**Requirements**: Python server environment, API key configuration

## ⚡ Performance

### 🆕 JSApp Performance
- **Initial Load**: ~515KB gzipped (JS) + ~40KB (CSS)
- **Model Loading**: On-demand download (100MB-500MB per model)
- **Caching**: IndexedDB persistence, models cached permanently
- **Processing**: Real-time streaming analysis with progress updates
- **Memory**: Efficient WebAssembly execution, model cleanup

### 🔧 FlaskApp Performance
- **Server-side**: Processing limited by Python/Flask performance
- **API Limits**: Google Perspective API rate limits apply
- **Concurrent Users**: Limited by server resources
- **Response Time**: Network latency + server processing time

## 🧪 Testing

### 🆕 JSApp Testing

```bash
cd JSApp

# Run E2E tests
npm run test:e2e

# Run specific test
npx playwright test export-functionality.spec.ts

# Debug mode (visible browser)
npx playwright test --headed
```

**Test Coverage**: Export functionality, model loading, analysis pipeline

### 🔧 FlaskApp Testing
- **Manual testing**: Use web interface
- **API testing**: Test with various text inputs and API configurations

## 🐛 Troubleshooting

### 🆕 JSApp Issues

**Models not loading**:
- Check browser console for network errors
- Clear IndexedDB cache: DevTools → Application → Storage
- Verify model IDs in `src/stores/modelStore.ts`

**Memory issues**:
- Disable large models (>300MB)
- Reload page to clear model memory
- Use Chrome Task Manager to monitor memory

**Export issues**:
- Wait for analysis to complete (button shows "Analyze" again)
- Check browser download permissions
- Try different export format (CSV/JSON/Excel)

### 🔧 FlaskApp Issues

**API errors**:
- Verify Google Perspective API key in `flaskapp.py`
- Check ReCaptcha configuration
- Ensure Python dependencies installed

**Server issues**:
- Check Flask logs for errors
- Verify port 5002 is available
- Test with smaller text inputs

## 🤝 Contributing

Contributions welcome! Please focus on the **JSApp** for new features as it's the actively maintained codebase.

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Test with: `cd JSApp && npm run test:e2e`
4. Build successfully: `npm run build`
5. Submit pull request

## 📄 License

MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

### JSApp (Modern)
- **Transformers.js**: Xenova for WebAssembly ML
- **Vue 3**: Evan You and the Vue team
- **AG-Grid**: Advanced data grid components
- **HuggingFace**: Model hosting and ecosystem

### FlaskApp (Legacy)
- **Original Implementation**: R. Stuart Geiger
- **VADER Sentiment**: C.J. Hutto & Eric Gilbert
- **Google Perspective API**: Jigsaw team
- **TextBlob**: Steven Loria

## 📚 References

- 🆕 **JSApp**: [Transformers.js](https://huggingface.co/docs/transformers.js) | [Vue 3](https://vuejs.org) | [Vite](https://vitejs.dev)
- 🔧 **FlaskApp**: [VADER](https://github.com/cjhutto/vaderSentiment) | [Perspective API](https://perspectiveapi.com) | [Flask](https://flask.palletsprojects.com)
