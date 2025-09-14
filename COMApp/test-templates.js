#!/usr/bin/env node

/**
 * Template and Task Comparison Script
 * Tests different hypothesis templates and classification tasks
 */

import { pipeline, env } from '@huggingface/transformers';

// Configure environment exactly like our app
env.allowRemoteModels = true;
env.useBrowserCache = false;
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.simd = false;
env.backends.onnx.webgl = false;
env.backends.onnx.webgpu = false;

// Use V3 Base as the sweet spot from our previous test
const MODEL = 'Xenova/nli-deberta-v3-base';

// Test different templates for SENTIMENT analysis
const SENTIMENT_TEMPLATES = [
  { name: 'Generic', template: 'This text is {}.' },
  { name: 'Sentiment-Specific', template: 'This text expresses {} sentiment.' },
  { name: 'Sentiment-Alt', template: 'The sentiment of this text is {}.' },
  { name: 'Opinion-Based', template: 'This text has a {} opinion.' },
  { name: 'Feeling-Based', template: 'This text conveys {} feelings.' },
  { name: 'Tone-Based', template: 'The tone of this text is {}.' },
  { name: 'Emotional-State', template: 'This text is emotionally {}.' }
];

const SENTIMENT_LABELS = ['positive', 'negative', 'neutral'];

// Test different task types with their appropriate templates
const TASK_TESTS = [
  {
    name: 'Topic Classification',
    labels: ['politics', 'technology', 'sports', 'entertainment'],
    template: 'This text is about {}.',
    testCases: [
      { text: "The president announced new economic policies today.", expected: 'politics' },
      { text: "Apple released a new iPhone with advanced AI features.", expected: 'technology' },
      { text: "The basketball team won the championship last night.", expected: 'sports' },
      { text: "The new movie broke box office records this weekend.", expected: 'entertainment' }
    ]
  },
  {
    name: 'Content Type',
    labels: ['factual', 'opinion', 'question'],
    template: 'This text is {}.',
    testCases: [
      { text: "Water boils at 100 degrees Celsius.", expected: 'factual' },
      { text: "I think this movie is the best ever made.", expected: 'opinion' },
      { text: "What time does the meeting start?", expected: 'question' },
      { text: "The company was founded in 1995.", expected: 'factual' }
    ]
  },
  {
    name: 'Communication Intent',
    labels: ['informative', 'persuasive', 'entertaining'],
    template: 'This text is meant to be {}.',
    testCases: [
      { text: "Here are the step-by-step instructions for the process.", expected: 'informative' },
      { text: "You should definitely buy this product - it will change your life!", expected: 'persuasive' },
      { text: "Why did the chicken cross the road? To get to the other side!", expected: 'entertaining' },
      { text: "The meeting will be held at 3 PM in room 205.", expected: 'informative' }
    ]
  },
  {
    name: 'Spam Detection',
    labels: ['spam', 'legitimate'],
    template: 'This message is {}.',
    testCases: [
      { text: "URGENT! You've won $1,000,000! Click here NOW!", expected: 'spam' },
      { text: "Your package has been delivered to your front door.", expected: 'legitimate' },
      { text: "Free money! No strings attached! Act now!", expected: 'spam' },
      { text: "Meeting reminder: Don't forget about our 2 PM call.", expected: 'legitimate' }
    ]
  }
];

// Focused sentiment test cases (subset of our 25)
const SENTIMENT_TEST_CASES = [
  // Clearly Positive
  { text: "I absolutely love this product! It's amazing!", expected: 'positive' },
  { text: "THIS IS SO SUPER COOL AND THE BEST EVER!", expected: 'positive' },

  // Clearly Negative
  { text: "I hate this! It's terrible and disappointing.", expected: 'negative' },
  { text: "This is awful and completely frustrating.", expected: 'negative' },

  // Neutral/Factual (the problem cases)
  { text: "The weather today is 72 degrees Fahrenheit.", expected: 'neutral' },
  { text: "The meeting is scheduled for 3 PM in room B.", expected: 'neutral' },
  { text: "Please submit your report by Friday at 5 PM.", expected: 'neutral' },
  { text: "The company was founded in 1995 and has 500 employees.", expected: 'neutral' },

  // Mixed/Tricky
  { text: "The product has good features but also major flaws.", expected: 'neutral' },
  { text: "Yeah, right.", expected: 'negative' }, // Sarcasm test
];

/**
 * Test a specific template with sentiment cases
 */
async function testSentimentTemplate(templateConfig, classifier) {
  console.log(`\n📝 Testing Template: "${templateConfig.template}" (${templateConfig.name})`);
  console.log('-'.repeat(80));

  const results = [];

  for (let i = 0; i < SENTIMENT_TEST_CASES.length; i++) {
    const testCase = SENTIMENT_TEST_CASES[i];

    try {
      const result = await classifier(
        testCase.text,
        SENTIMENT_LABELS,
        {
          multi_label: false,
          hypothesis_template: templateConfig.template
        }
      );

      const prediction = result.labels[0];
      const confidence = result.scores[0];
      const correct = prediction === testCase.expected;

      results.push({
        text: testCase.text,
        expected: testCase.expected,
        predicted: prediction,
        confidence,
        correct
      });

      const status = correct ? '✓' : '✗';
      const confidenceStr = (confidence * 100).toFixed(1);
      const shortText = testCase.text.length > 50 ? testCase.text.substring(0, 50) + '...' : testCase.text;

      console.log(`${status} ${prediction.padEnd(8)} (${confidenceStr}%) | Expected: ${testCase.expected.padEnd(8)} | "${shortText}"`);

    } catch (error) {
      console.log(`✗ ERROR: ${error.message}`);
      results.push({
        text: testCase.text,
        expected: testCase.expected,
        predicted: 'ERROR',
        confidence: 0,
        correct: false
      });
    }
  }

  const accuracy = (results.filter(r => r.correct).length / results.length * 100).toFixed(1);
  const avgConfidence = (results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length * 100).toFixed(1);

  // Focus on neutral detection specifically
  const neutralCases = results.filter(r => r.expected === 'neutral');
  const neutralAccuracy = neutralCases.length > 0
    ? (neutralCases.filter(r => r.correct).length / neutralCases.length * 100).toFixed(1)
    : 'N/A';

  console.log(`📊 ${templateConfig.name}: ${accuracy}% accuracy, ${avgConfidence}% confidence, ${neutralAccuracy}% neutral detection`);

  return {
    template: templateConfig,
    accuracy: parseFloat(accuracy),
    avgConfidence: parseFloat(avgConfidence),
    neutralAccuracy: neutralCases.length > 0 ? parseFloat(neutralAccuracy) : 0,
    results
  };
}

/**
 * Test a specific task type
 */
async function testTaskType(taskConfig, classifier) {
  console.log(`\n🎯 Testing Task: ${taskConfig.name}`);
  console.log(`📝 Template: "${taskConfig.template}"`);
  console.log(`🏷️  Labels: ${taskConfig.labels.join(', ')}`);
  console.log('-'.repeat(80));

  const results = [];

  for (let i = 0; i < taskConfig.testCases.length; i++) {
    const testCase = taskConfig.testCases[i];

    try {
      const result = await classifier(
        testCase.text,
        taskConfig.labels,
        {
          multi_label: false,
          hypothesis_template: taskConfig.template
        }
      );

      const prediction = result.labels[0];
      const confidence = result.scores[0];
      const correct = prediction === testCase.expected;

      results.push({
        text: testCase.text,
        expected: testCase.expected,
        predicted: prediction,
        confidence,
        correct
      });

      const status = correct ? '✓' : '✗';
      const confidenceStr = (confidence * 100).toFixed(1);

      console.log(`${status} ${prediction.padEnd(12)} (${confidenceStr}%) | Expected: ${testCase.expected.padEnd(12)} | "${testCase.text}"`);

    } catch (error) {
      console.log(`✗ ERROR: ${error.message}`);
      results.push({
        text: testCase.text,
        expected: testCase.expected,
        predicted: 'ERROR',
        confidence: 0,
        correct: false
      });
    }
  }

  const accuracy = (results.filter(r => r.correct).length / results.length * 100).toFixed(1);
  const avgConfidence = (results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length * 100).toFixed(1);

  console.log(`📊 ${taskConfig.name}: ${accuracy}% accuracy, ${avgConfidence}% confidence`);

  return {
    task: taskConfig,
    accuracy: parseFloat(accuracy),
    avgConfidence: parseFloat(avgConfidence),
    results
  };
}

/**
 * Main test runner
 */
async function runTemplateTests() {
  console.log('🧪 TEMPLATE AND TASK TYPE TESTING');
  console.log('🤖 Model: ' + MODEL);
  console.log('🎯 Testing different hypothesis templates and classification tasks');
  console.log('=' .repeat(80));

  let classifier;

  try {
    // Load model once
    console.log('⏳ Loading model...');
    classifier = await pipeline(
      'zero-shot-classification',
      MODEL,
      {
        quantized: true,
        progress_callback: (data) => {
          if (data.status === 'downloading' && data.progress && data.progress % 20 === 0) {
            console.log(`  📥 Downloading: ${Math.round(data.progress)}%`);
          }
        }
      }
    );
    console.log('✅ Model loaded successfully');

    // PART 1: Test different sentiment templates
    console.log('\n' + '='.repeat(80));
    console.log('🔍 PART 1: SENTIMENT TEMPLATE COMPARISON');
    console.log('=' .repeat(80));

    const sentimentResults = [];
    for (const template of SENTIMENT_TEMPLATES) {
      const result = await testSentimentTemplate(template, classifier);
      sentimentResults.push(result);
    }

    // PART 2: Test different task types
    console.log('\n' + '='.repeat(80));
    console.log('🔍 PART 2: DIFFERENT TASK TYPES');
    console.log('=' .repeat(80));

    const taskResults = [];
    for (const task of TASK_TESTS) {
      const result = await testTaskType(task, classifier);
      taskResults.push(result);
    }

    // FINAL ANALYSIS
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL TEMPLATE COMPARISON (SENTIMENT)');
    console.log('=' .repeat(80));

    console.log('Template'.padEnd(20) + 'Overall'.padEnd(12) + 'Neutral'.padEnd(12) + 'Avg Conf'.padEnd(12) + 'Status');
    console.log('-'.repeat(70));

    // Sort by neutral detection accuracy
    sentimentResults.sort((a, b) => b.neutralAccuracy - a.neutralAccuracy);

    for (const result of sentimentResults) {
      const overall = `${result.accuracy}%`;
      const neutral = `${result.neutralAccuracy}%`;
      const confidence = `${result.avgConfidence}%`;

      console.log(
        result.template.name.padEnd(20) +
        overall.padEnd(12) +
        neutral.padEnd(12) +
        confidence.padEnd(12) +
        'OK'
      );
    }

    console.log('\n📈 TASK TYPE COMPARISON');
    console.log('-'.repeat(50));

    for (const result of taskResults) {
      console.log(`${result.task.name.padEnd(20)} ${result.accuracy}% accuracy`);
    }

    // Key insights
    console.log('\n🎯 KEY INSIGHTS:');
    console.log(`• Best overall template: ${sentimentResults[0].template.name} (${sentimentResults[0].accuracy}%)`);
    console.log(`• Best neutral detection: ${sentimentResults[0].template.name} (${sentimentResults[0].neutralAccuracy}%)`);
    console.log(`• Worst template: ${sentimentResults[sentimentResults.length - 1].template.name} (${sentimentResults[sentimentResults.length - 1].accuracy}%)`);

    const bestTask = taskResults.reduce((best, current) => current.accuracy > best.accuracy ? current : best);
    console.log(`• Best task type: ${bestTask.task.name} (${bestTask.accuracy}%)`);

  } catch (error) {
    console.error('❌ Testing failed:', error.message);
    console.error(error.stack);
  } finally {
    if (classifier && typeof classifier.dispose === 'function') {
      await classifier.dispose();
    }
  }

  console.log('\n✅ Template and task testing complete!');
}

// Run the tests
runTemplateTests().catch(console.error);