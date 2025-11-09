# E2E Tests

This directory contains Playwright end-to-end tests for the JSApp sentiment analysis application.

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

### Run Specific Test
```bash
npx playwright test export-functionality.spec.ts
```

## Available Tests

### `export-functionality.spec.ts` ✅ **Working**
Tests the core export functionality of the application:

1. **Full Analysis Pipeline**: Uses default text and models, waits for complete analysis
2. **CSV Export Testing**: Tests both standard and multiclass export modes
3. **Multiclass Column Expansion**: Verifies that classification models export both:
   - `ModelName_Majority_Prediction` + `ModelName_Majority_Likelihood` (summary)
   - `ModelName_Class_[emotion1]`, `ModelName_Class_[emotion2]`, etc. (detailed breakdown)
4. **Real Model Testing**: Tests with actual models (VADER, DistilBERT, GoEmotions, Jigsaw Toxicity MiniLMv2)
5. **Proper Timing**: Waits for analysis completion before testing exports

**Expected Output**:
- Tests pass with real model analysis (takes ~45 seconds)
- Console shows analysis progress: VADER → DistilBERT → GoEmotions → Jigsaw Toxicity MiniLMv2
- Validates CSV structure with actual sentiment and classification results

### `types.ts`
TypeScript type definitions for test utilities and data structures.

## Test Features

- **Real Analysis**: Tests run actual ML models (not mocked)
- **Accessibility Selectors**: Uses `data-testid` attributes for reliable element selection
- **Modal Handling**: Properly handles download confirmation dialogs
- **Progress Monitoring**: Watches analysis progress to ensure completion
- **File Validation**: Downloads and validates actual CSV export files
- **Headless Mode**: Runs efficiently without visible browser windows

## Adding New Tests

When adding new tests:

1. **Use proper selectors**: Prefer `data-testid` attributes over CSS classes
2. **Handle async operations**: Wait for analysis completion before assertions
3. **Test real functionality**: Don't mock the core analysis pipeline
4. **Include cleanup**: Remove any test files created during testing
5. **Set appropriate timeouts**: ML models can take 30-60 seconds to load and run

## Troubleshooting

**Tests timing out**:
- Increase test timeout: `test.setTimeout(120000)`
- Check that dev server is running on correct port
- Ensure models can download (check network connection)

**Modal not appearing**:
- Verify download confirmation modal selectors
- Check that models are properly detected as needing download

**Export files not generated**:
- Ensure analysis completes before testing exports
- Check browser download permissions in test environment
- Verify export button selectors are correct