#!/usr/bin/env node

// Quick test to verify our fixes work properly

const TEST_TEXT = "I love this product, it's amazing!";

// Test cases for different model outputs
const TEST_OUTPUTS = {
  sentiment: [
    { label: "POSITIVE", score: 0.99 },
    { label: "NEGATIVE", score: 0.01 }
  ],
  multiLabel: [
    { label: "joy", score: 0.8 },
    { label: "admiration", score: 0.7 },
    { label: "love", score: 0.3 },
    { label: "neutral", score: 0.1 }
  ],
  moderation: [
    { label: "OK", score: 0.95 },
    { label: "S", score: 0.02 },
    { label: "H", score: 0.01 }
  ],
  language: [
    { label: "en", score: 0.99 },
    { label: "es", score: 0.005 },
    { label: "fr", score: 0.005 }
  ]
};

// Our new detectModelType function
function detectModelType(output) {
  if (!output || output.length === 0) return 'multi-class';

  const labels = output.map(o => o.label.toLowerCase());

  // Check for sentiment models (binary or ternary)
  if (output.length <= 3 &&
      (labels.some(l => l.includes('pos') || l.includes('neg')) ||
       labels.includes('neutral'))) {
    return 'sentiment';
  }

  // Check for emotion models
  const emotionLabels = ['joy', 'anger', 'fear', 'sadness', 'love', 'surprise',
                        'admiration', 'approval', 'annoyance', 'gratitude'];
  if (labels.some(l => emotionLabels.includes(l))) {
    return 'multi-label';
  }

  // Check for toxicity models
  const toxicityLabels = ['toxic', 'severe_toxic', 'obscene', 'threat',
                         'insult', 'identity_hate'];
  if (labels.some(l => toxicityLabels.some(tox => l.includes(tox)))) {
    return 'multi-label';
  }

  // Check for moderation models
  if (labels.some(l => ['ok', 's', 'h', 'v', 'hr', 'sh', 's3', 'h2', 'v2'].includes(l))) {
    return 'moderation';
  }

  // Language detection (2-letter codes)
  if (labels.every(l => l.length === 2 || l.length === 3)) {
    return 'multi-class';
  }

  return 'multi-class';
}

// Test the detection
console.log('Testing Model Type Detection:');
console.log('============================\n');

for (const [name, output] of Object.entries(TEST_OUTPUTS)) {
  const detected = detectModelType(output);
  console.log(`Test: ${name}`);
  console.log(`Output: ${JSON.stringify(output[0])}`);
  console.log(`Detected type: ${detected}`);
  console.log(`Expected: ${name === 'sentiment' ? 'sentiment' :
                          name === 'multiLabel' ? 'multi-label' :
                          name === 'moderation' ? 'moderation' : 'multi-class'}`);
  console.log(`✅ ${detected === (name === 'sentiment' ? 'sentiment' :
                                  name === 'multiLabel' ? 'multi-label' :
                                  name === 'moderation' ? 'moderation' : 'multi-class') ? 'PASS' : 'FAIL'}\n`);
}

// Test score handling
console.log('\nTesting Score Handling:');
console.log('======================\n');

function processResult(output, modelType) {
  const prediction = output.reduce((max, current) => current.score > max.score ? current : max);
  let displayScore = prediction.score;
  let displayLabel = prediction.label;
  let sentiment = null;

  switch (modelType) {
    case 'sentiment':
      const label = prediction.label.toLowerCase();
      if (label.includes('pos')) sentiment = 'positive';
      else if (label.includes('neg')) sentiment = 'negative';
      else sentiment = 'neutral';
      displayLabel = sentiment;
      break;

    case 'multi-label':
      const significant = output.filter(p => p.score > 0.1);
      if (significant.length > 1) {
        displayLabel = prediction.label + '+';
      }
      break;

    case 'moderation':
      const koalaMap = {
        'S': 'Sexual', 'H': 'Hate', 'V': 'Violence',
        'OK': 'Safe'
      };
      displayLabel = koalaMap[prediction.label] || prediction.label;
      sentiment = prediction.label === 'OK' ? 'positive' : 'negative';
      break;
  }

  return { displayLabel, displayScore, sentiment };
}

// Test sentiment model (should NOT convert to -1)
const sentimentResult = processResult(TEST_OUTPUTS.sentiment, 'sentiment');
console.log('Sentiment Model:');
console.log(`  Label: ${sentimentResult.displayLabel}`);
console.log(`  Score: ${sentimentResult.displayScore}`);
console.log(`  ✅ Score is 0-1: ${sentimentResult.displayScore >= 0 && sentimentResult.displayScore <= 1}`);
console.log();

// Test multi-label model (should show + indicator)
const multiLabelResult = processResult(TEST_OUTPUTS.multiLabel, 'multi-label');
console.log('Multi-Label Model:');
console.log(`  Label: ${multiLabelResult.displayLabel}`);
console.log(`  Score: ${multiLabelResult.displayScore}`);
console.log(`  ✅ Has + indicator: ${multiLabelResult.displayLabel.includes('+')}`);
console.log();

// Test moderation model (should map labels)
const moderationResult = processResult(TEST_OUTPUTS.moderation, 'moderation');
console.log('Moderation Model:');
console.log(`  Label: ${moderationResult.displayLabel}`);
console.log(`  Score: ${moderationResult.displayScore}`);
console.log(`  ✅ Label mapped: ${moderationResult.displayLabel === 'Safe'}`);

console.log('\n✅ All tests complete!');