# JS Sentimentomatic

A modern client-side sentiment analysis web application that compares results from multiple JavaScript sentiment analysis libraries.

## Features

- **Multiple Analyzers**: Compare sentiment analysis from:
  - AFINN (lexicon-based, fast)
  - VADER (social media optimized) 
  - Transformers.js (advanced ML models)

- **Real-time Analysis**: Process text line-by-line with immediate results
- **Interactive UI**: Line-numbered text input with responsive design
- **Export Options**: Export results to CSV or JSON formats
- **Performance Metrics**: Track processing time for each analyzer

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

1. **Enter Text**: Paste your text in the input area, one item per line
2. **Select Analyzers**: Choose which sentiment analysis models to use
3. **Analyze**: Click "Analyze Sentiment" to process your text
4. **Compare Results**: View side-by-side sentiment scores and classifications
5. **Export**: Download results as CSV or JSON

## Analyzer Details

### AFINN
- **Type**: Lexicon-based
- **Speed**: Very fast (~1ms per line)
- **Best for**: General text, reviews, comments
- **Scores**: -5 to +5 sentiment score, comparative score

### VADER
- **Type**: Rule-based lexicon
- **Speed**: Fast (~2ms per line)  
- **Best for**: Social media text, informal language
- **Scores**: Compound (-1 to +1), positive/negative/neutral ratios

### Transformers.js
- **Type**: Machine learning (BERT-based)
- **Speed**: Slower (~100ms per line, faster after model loads)
- **Best for**: Complex text, nuanced sentiment
- **Scores**: POSITIVE/NEGATIVE classification with confidence

## Technical Stack

- **Framework**: Vanilla TypeScript + Vite
- **Sentiment Libraries**: 
  - `sentiment` (AFINN)
  - `vader-sentiment` (VADER)
  - `@xenova/transformers` (ML models)
- **Build**: Vite with automatic code splitting
- **Bundle Size**: ~200KB (core) + ~800KB (ML models, lazy loaded)

## Browser Compatibility

- Modern browsers supporting ES2020
- Progressive loading of ML models
- Graceful fallback if models fail to load

## Development

```bash
# Type checking
npm run build

# Development with hot reload
npm run dev

# Production build
npm run build && npm run preview
```

## Deployment

The built application is static files that can be hosted anywhere:

- GitHub Pages
- Netlify
- Vercel
- Any static hosting service

## Comparison with Python Version

This JavaScript version provides equivalent functionality to the original Python Flask application:

- ✅ AFINN sentiment analysis (equivalent to Python `sentiment`)
- ✅ VADER sentiment analysis (equivalent to Python `vaderSentiment`)
- ✅ Advanced ML models (equivalent to server-side transformers)
- ✅ Line-by-line processing
- ✅ Interactive results table
- ✅ CSV/JSON export
- ✅ Performance metrics
- ✅ Responsive design

**Advantages over Python version:**
- No server required (client-side only)
- Faster startup (no Flask/Python overhead)
- Better privacy (all processing local)
- Instant deployment (static files)
- Real-time progressive results

## License

MIT License - feel free to use and modify for your projects.