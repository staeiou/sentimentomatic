#!/usr/bin/env node

/**
 * Zero-Shot Classification Model Testing Script
 * Uses the same transformers.js stack and configuration as the browser app
 */

import { pipeline, env } from '@huggingface/transformers';

// Configure environment exactly like our browser app
env.allowRemoteModels = true;
env.useBrowserCache = false; // Use regular cache for Node
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.simd = false;
env.backends.onnx.webgl = false;
env.backends.onnx.webgpu = false;

// Models to test (same as our dropdown)
const MODELS = [
  { id: 'Xenova/nli-deberta-v3-xsmall', name: 'XSmall', size: '~45MB' },
  { id: 'Xenova/nli-deberta-base', name: 'Base', size: '~280MB' },
  { id: 'Xenova/nli-deberta-v3-base', name: 'V3 Base', size: '~360MB' },
  { id: 'Xenova/nli-deberta-v3-large', name: 'V3 Large', size: '~560MB' }
];

// Labels (same as our app)
const LABELS = ['positive', 'negative', 'neutral'];
const TEMPLATE = 'This text is {}.';

// 25 Test Cases - Diverse sentiment scenarios with expected outcomes
const TEST_CASES = [
  // Clearly Positive
  { text: "I absolutely love this product! It's amazing and exceeded all my expectations!", expected: 'positive', confidence: 'high' },
  { text: "THIS IS SO SUPER COOL AND THE BEST EVER! YES!", expected: 'positive', confidence: 'high' },
  { text: "What a wonderful day! I'm feeling fantastic and everything is perfect.", expected: 'positive', confidence: 'high' },
  { text: "Brilliant work! Outstanding performance and incredible results.", expected: 'positive', confidence: 'high' },
  { text: "I'm thrilled with the outcome. Great job everyone!", expected: 'positive', confidence: 'medium' },

  // Clearly Negative
  { text: "I hate hate HATE trying to write examples, it's not fun! I'm not happy!", expected: 'negative', confidence: 'high' },
  { text: "This is terrible, awful, and completely disappointing. Worst experience ever.", expected: 'negative', confidence: 'high' },
  { text: "Ugh, this is so frustrating and annoying. I can't stand it anymore!", expected: 'negative', confidence: 'high' },
  { text: "Complete waste of time and money. Horrible quality and poor service.", expected: 'negative', confidence: 'high' },
  { text: "I'm really disappointed and upset about this situation.", expected: 'negative', confidence: 'medium' },

  // Neutral/Factual
  { text: "The weather today is 72 degrees Fahrenheit with partly cloudy skies.", expected: 'neutral', confidence: 'high' },
  { text: "The meeting is scheduled for 3 PM in conference room B.", expected: 'neutral', confidence: 'high' },
  { text: "Please submit your report by Friday at 5 PM.", expected: 'neutral', confidence: 'high' },
  { text: "The company was founded in 1995 and has 500 employees.", expected: 'neutral', confidence: 'high' },
  { text: "Each line will be analyzed independently and given scores by various models.", expected: 'neutral', confidence: 'medium' },

  // Mixed/Complex
  { text: "The product has some good features but also several major flaws.", expected: 'neutral', confidence: 'medium' },
  { text: "I'm happy about the promotion but sad to leave my current team.", expected: 'neutral', confidence: 'low' },
  { text: "Great idea, but the execution could be better.", expected: 'neutral', confidence: 'low' },

  // Sarcasm/Irony (tricky cases)
  { text: "Yeah, right.", expected: 'negative', confidence: 'low' },
  { text: "Sentiment analysis is the perfect and foolproof method for every research project ever --- NOT!", expected: 'negative', confidence: 'medium' },

  // Quotes/Literary
  { text: "Darkness cannot drive out darkness; only light can do that. Hate cannot drive out hate; only love can do that.", expected: 'positive', confidence: 'medium' },
  { text: "Although a double negative in English implies a positive meaning, there is no language in which a double positive implies a negative.", expected: 'neutral', confidence: 'low' },
  { text: "There are three kinds of lies: lies, damned lies, and statistics.", expected: 'neutral', confidence: 'low' },

  // Internet/Slang
  { text: "u can def analyze slang w/ vader, its gr8! text analysis ftw!", expected: 'positive', confidence: 'low' },
  { text: "😢😠😢", expected: 'negative', confidence: 'medium' }
];

/**
 * Test a single model with all test cases
 */
async function testModel(modelConfig) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${modelConfig.name} (${modelConfig.size})`);
  console.log(`Model: ${modelConfig.id}`);
  console.log(`${'='.repeat(60)}`);

  let classifier;
  const results = [];

  try {
    // Load model
    console.log('Loading model...');
    const startTime = Date.now();

    classifier = await pipeline(
      'zero-shot-classification',
      modelConfig.id,
      {
        quantized: true,
        progress_callback: (data) => {
          if (data.status === 'downloading' || data.status === 'download') {
            const progress = Math.round(data.progress || 0);
            if (progress % 20 === 0) { // Only show every 20%
              console.log(`  Downloading: ${progress}%`);
            }
          }
        }
      }
    );

    const loadTime = Date.now() - startTime;
    console.log(`Model loaded in ${(loadTime / 1000).toFixed(1)}s\n`);

    // Test each case
    for (let i = 0; i < TEST_CASES.length; i++) {
      const testCase = TEST_CASES[i];

      try {
        const result = await classifier(
          testCase.text,
          LABELS,
          {
            multi_label: false,
            hypothesis_template: TEMPLATE
          }
        );

        // Extract results
        const prediction = result.labels[0];
        const confidence = result.scores[0];
        const allScores = {};

        result.labels.forEach((label, idx) => {
          allScores[label] = result.scores[idx];
        });

        const testResult = {
          case: i + 1,
          text: testCase.text.length > 60 ? testCase.text.substring(0, 60) + '...' : testCase.text,
          expected: testCase.expected,
          predicted: prediction,
          confidence: confidence,
          correct: prediction === testCase.expected,
          scores: allScores
        };

        results.push(testResult);

        // Print result
        const status = testResult.correct ? '✓' : '✗';
        const confidenceStr = (confidence * 100).toFixed(1);
        const caseNum = (i + 1).toString().padStart(2, ' ');
        console.log(`${status} Case ${caseNum}: ${prediction.padEnd(8)} (${confidenceStr}%) | Expected: ${testCase.expected.padEnd(8)} | "${testResult.text}"`);

      } catch (error) {
        const caseNum = (i + 1).toString().padStart(2, ' ');
        console.log(`✗ Case ${caseNum}: ERROR - ${error.message}`);
        results.push({
          case: i + 1,
          text: testCase.text,
          expected: testCase.expected,
          predicted: 'ERROR',
          confidence: 0,
          correct: false,
          error: error.message
        });
      }
    }

    // Summary
    const correct = results.filter(r => r.correct).length;
    const accuracy = (correct / results.length * 100).toFixed(1);
    const avgConfidence = (results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length * 100).toFixed(1);

    console.log(`\nSummary for ${modelConfig.name}:`);
    console.log(`  Accuracy: ${correct}/${results.length} (${accuracy}%)`);
    console.log(`  Avg Confidence: ${avgConfidence}%`);
    console.log(`  Load Time: ${(loadTime / 1000).toFixed(1)}s`);

    return {
      model: modelConfig,
      results,
      accuracy: parseFloat(accuracy),
      avgConfidence: parseFloat(avgConfidence),
      loadTime: loadTime
    };

  } catch (error) {
    console.error(`Failed to test ${modelConfig.name}:`, error.message);
    return {
      model: modelConfig,
      results: [],
      accuracy: 0,
      avgConfidence: 0,
      loadTime: 0,
      error: error.message
    };
  } finally {
    // Clean up
    if (classifier && typeof classifier.dispose === 'function') {
      await classifier.dispose();
    }
  }
}

/**
 * Run tests on all models
 */
async function runAllTests() {
  console.log('🧪 Zero-Shot Classification Model Testing');
  console.log('📋 Testing 25 sentiment cases across 4 model sizes');
  console.log(`🏷️  Labels: ${LABELS.join(', ')}`);
  console.log(`📝 Template: "${TEMPLATE}"`);

  const allResults = [];

  for (const model of MODELS) {
    const result = await testModel(model);
    allResults.push(result);
  }

  // Final comparison
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 FINAL COMPARISON');
  console.log(`${'='.repeat(80)}`);

  console.log('Model'.padEnd(12) + 'Accuracy'.padEnd(12) + 'Avg Conf'.padEnd(12) + 'Load Time'.padEnd(12) + 'Status');
  console.log('-'.repeat(60));

  for (const result of allResults) {
    const accuracy = `${result.accuracy}%`;
    const confidence = `${result.avgConfidence}%`;
    const loadTime = `${(result.loadTime / 1000).toFixed(1)}s`;
    const status = result.error ? `ERROR` : 'OK';

    console.log(
      result.model.name.padEnd(12) +
      accuracy.padEnd(12) +
      confidence.padEnd(12) +
      loadTime.padEnd(12) +
      status
    );
  }

  // Find problematic cases (where multiple models disagree)
  console.log(`\n🔍 DISAGREEMENT ANALYSIS:`);
  for (let i = 0; i < TEST_CASES.length; i++) {
    const predictions = allResults
      .filter(r => r.results[i] && !r.results[i].error)
      .map(r => r.results[i].predicted);

    const uniquePredictions = [...new Set(predictions)];

    if (uniquePredictions.length > 1) {
      const case_num = i + 1;
      const text = TEST_CASES[i].text.substring(0, 50) + '...';
      const expected = TEST_CASES[i].expected;

      console.log(`\nCase ${case_num} (Expected: ${expected}): "${text}"`);
      allResults.forEach(result => {
        if (result.results[i] && !result.results[i].error) {
          const pred = result.results[i].predicted;
          const conf = (result.results[i].confidence * 100).toFixed(1);
          console.log(`  ${result.model.name}: ${pred} (${conf}%)`);
        }
      });
    }
  }

  console.log(`\n✅ Testing complete!`);
}

// Run the tests
runAllTests().catch(console.error);