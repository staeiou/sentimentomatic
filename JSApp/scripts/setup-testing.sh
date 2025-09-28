#!/bin/bash

# Setup Playwright testing environment
echo "🚀 Setting up Playwright testing environment..."

# Install npm dependencies
echo "📦 Installing dependencies..."
npm install

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
npx playwright install

# Install system dependencies for browsers (on Linux)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Installing system dependencies..."
    npx playwright install-deps
fi

echo "✅ Setup complete!"
echo ""
echo "🧪 Run tests with:"
echo "  npm run test:model-sizes  # Test all models and log sizes"
echo "  npm run test:e2e          # Run all E2E tests"
echo "  npm run test:debug        # Debug mode with visible browser"
echo "  npm run test:ui           # Interactive UI mode"