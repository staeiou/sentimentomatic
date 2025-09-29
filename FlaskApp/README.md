# FlaskApp - Legacy Sentiment Analysis Server

A Python Flask web application for sentiment analysis using traditional server-side processing. Integrates with Google Perspective API for toxicity detection and includes classic sentiment analysis libraries.

## 🔧 Features

- **🐍 Python/Flask**: Traditional server-side processing
- **🔍 Google Perspective API**: Advanced toxicity detection
- **📚 Classic Models**: VADER, TextBlob sentiment analysis
- **🛡️ ReCaptcha Protection**: Built-in spam prevention
- **📋 DataTables UI**: Interactive HTML table results
- **📊 Pandas Export**: Built-in DataFrame to HTML conversion

## ⚠️ Limitations

- **50 lines maximum** per analysis request
- **125,000 characters total** limit per request
- **Internet required** for API calls and processing
- **Server infrastructure** needed for deployment
- **API rate limits** apply (Google Perspective)

## 🛠️ Quick Start

**Prerequisites**: Python 3.7+, pip

```bash
# Install Python dependencies
pip install -r requirements.txt

# Edit API keys in flaskapp.py (see Configuration section)
# G_API_KEY = 'your-google-perspective-api-key'
# RECAPTCHA_SITE_KEY = 'your-recaptcha-site-key'
# RECAPTCHA_SECRET_KEY = 'your-recaptcha-secret-key'

# Run development server
python flaskapp.py
# Opens on http://127.0.0.1:5002
```

## 🏗️ Architecture

```
FlaskApp/
├── flaskapp.py              # Main Flask application
├── requirements.txt         # Python dependencies
├── flaskapp.wsgi           # WSGI configuration for production
├── templates/
│   ├── form.html           # Main analysis form UI
│   └── upload.html         # File upload interface
└── static/                 # CSS, JS, and static assets
    └── style.css           # Application styling
```

## 🔧 Configuration

### Required API Keys

**Google Perspective API** (for toxicity detection):
1. Get API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Perspective Comment Analyzer API
3. Edit `flaskapp.py`:
```python
G_API_KEY = 'your-google-perspective-api-key-here'
```

**ReCaptcha** (for spam protection):
1. Get keys from [Google ReCaptcha](https://www.google.com/recaptcha/)
2. Edit `flaskapp.py`:
```python
app.config.update(
    RECAPTCHA_SITE_KEY="your-site-key-here",
    RECAPTCHA_SECRET_KEY="your-secret-key-here"
)
```

### Optional Configuration

**Without API Keys**: App will still work with VADER and TextBlob analysis only. Perspective API and ReCaptcha will be disabled.

**Port Configuration**:
```python
# Edit the last line in flaskapp.py
app.run(debug=False, host="127.0.0.1", port=5002, threaded=True)
```

## 📊 Analysis Methods

### VADER Sentiment
- **Range**: -1.0 (negative) to +1.0 (positive)
- **Optimized for**: Social media text, informal language
- **Speed**: Very fast (rule-based)
- **Always available**: No API key required

### TextBlob Sentiment
- **Polarity**: -1.0 (negative) to +1.0 (positive)
- **Subjectivity**: 0.0 (objective) to +1.0 (subjective)
- **Good for**: General text analysis
- **Always available**: No API key required

### Google Perspective API
- **Range**: 0.0 (not toxic) to +1.0 (toxic)
- **Advanced**: Machine learning-based toxicity detection
- **Limitations**: Requires API key, rate limits, character limits
- **Languages**: Primarily English

## 🚀 Deployment

### Development
```bash
python flaskapp.py
```

### Production (WSGI)

**Using Gunicorn**:
```bash
pip install gunicorn
gunicorn --bind 0.0.0.0:5002 flaskapp:app
```

**Using uWSGI**:
```bash
pip install uwsgi
uwsgi --http :5002 --wsgi-file flaskapp.py --callable app
```

**Apache/Nginx**: Use the included `flaskapp.wsgi` file with mod_wsgi or proxy configuration.

### Environment Variables
```bash
export FLASK_ENV=production
export GOOGLE_API_KEY=your-key-here
export RECAPTCHA_SITE_KEY=your-key-here
export RECAPTCHA_SECRET_KEY=your-key-here
```

## 📦 Dependencies

**Core Flask Dependencies**:
- `flask`: Web framework
- `flask_recaptcha`: ReCaptcha integration
- `pandas==0.24.2`: Data manipulation (specific version for compatibility)

**Analysis Libraries**:
- `vadersentiment==3.3.2`: VADER sentiment analysis
- `textblob`: Natural language processing
- `sentimental`: Additional sentiment tools

**API Integration**:
- `google-api-python-client`: Perspective API access
- `requests==2.24.0`: HTTP requests

**Utilities**:
- `html_sanitizer==1.9.1`: Input sanitization
- `nltk==3.5`: Natural language toolkit
- `numpy`: Numerical computing

## 🛡️ Security Features

### Input Sanitization
```python
# Automatic HTML sanitization
sanitizer = Sanitizer({
    "tags": {"a", "hr", "br", "b", "li", "p"},
    "keep_typographic_whitespace": True,
    "whitespace": {}
})
```

### Rate Limiting
- **ReCaptcha**: Prevents automated abuse
- **Content limits**: 50 lines, 125k characters
- **Request size**: 256KB maximum

### Error Handling
- **API failures**: Graceful degradation when Perspective API unavailable
- **Long text**: Automatic truncation with warnings
- **Invalid input**: User-friendly error messages

## 🧪 Testing

### Manual Testing
1. Start the development server: `python flaskapp.py`
2. Navigate to `http://127.0.0.1:5002`
3. Test with various text inputs:
   - Short positive text: "I love this!"
   - Short negative text: "This is terrible!"
   - Long text (test limits)
   - Text with special characters

### API Testing
```python
# Test Perspective API integration
import requests

# Test with your API key
response = requests.post('http://127.0.0.1:5002', data={
    'text1': 'You are stupid and ugly!',
    'papi': 'on'  # Enable Perspective API
})
```

## 🐛 Troubleshooting

### API Key Issues
```bash
# Perspective API errors
- Verify API key is correct in flaskapp.py
- Check Google Cloud Console for API quotas
- Ensure Perspective Comment Analyzer API is enabled
- Check billing is set up for Google Cloud project

# ReCaptcha errors
- Verify site key and secret key match your domain
- Check ReCaptcha admin console for request logs
- Ensure keys are for correct ReCaptcha version (v2)
```

### Server Issues
```bash
# Port already in use
lsof -i :5002
# Kill process using the port

# Python dependency issues
pip install --upgrade -r requirements.txt

# Permission errors (Linux/Mac)
sudo python flaskapp.py  # Not recommended for production
```

### Character Limit Errors
- **Per line**: 2,500 characters (Perspective API limit)
- **Total text**: 125,000 characters
- **Total lines**: 50 lines maximum

## 🔄 Migration to JSApp

**Consider migrating to JSApp if you need**:
- Privacy-first processing (no server required)
- Modern transformer models (DistilBERT, RoBERTa)
- Advanced export features (multiclass analysis)
- Offline capability
- No API key management

**FlaskApp advantages**:
- Google Perspective API access (most accurate toxicity detection)
- Python ecosystem integration
- Server-side processing for sensitive environments
- Established production deployment patterns

## 🤝 Contributing

This is the **legacy application**. For new features, please consider contributing to the **JSApp** instead, which is actively maintained.

For FlaskApp fixes:
1. Focus on security and stability improvements
2. API integration bug fixes
3. Documentation improvements
4. Python 3.x compatibility

## 📄 License

MIT License - see the root LICENSE file for details.