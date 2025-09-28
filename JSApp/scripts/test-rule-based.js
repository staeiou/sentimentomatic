#!/usr/bin/env node

import Sentiment from 'sentiment';
import { SentimentIntensityAnalyzer } from 'vader-sentiment';

const TEST_TEXTS = [
  "I love this product, it's amazing!",
  "I hate this, it's terrible!",
  "This is okay, nothing special.",
  "😢😠😢"
];

console.log('=' .repeat(50));
console.log('AFINN ANALYZER');
console.log('=' .repeat(50));

const afinn = new Sentiment();
for (const text of TEST_TEXTS) {
  const result = afinn.analyze(text);
  console.log(`\nText: "${text}"`);
  console.log('Raw output:', JSON.stringify(result, null, 2));
  console.log('Key values:');
  console.log('  - score (sum):', result.score);
  console.log('  - comparative (avg per word):', result.comparative);
  console.log('  - positive words:', result.positive);
  console.log('  - negative words:', result.negative);
}

console.log('\n' + '=' .repeat(50));
console.log('VADER ANALYZER');
console.log('=' .repeat(50));

for (const text of TEST_TEXTS) {
  const scores = SentimentIntensityAnalyzer.polarity_scores(text);
  console.log(`\nText: "${text}"`);
  console.log('Raw output:', JSON.stringify(scores, null, 2));
  console.log('Key values:');
  console.log('  - compound (-1 to +1):', scores.compound);
  console.log('  - positive:', scores.pos);
  console.log('  - negative:', scores.neg);
  console.log('  - neutral:', scores.neu);

  // Show how VADER determines sentiment
  let sentiment;
  if (scores.compound >= 0.05) sentiment = 'POSITIVE';
  else if (scores.compound <= -0.05) sentiment = 'NEGATIVE';
  else sentiment = 'NEUTRAL';
  console.log('  - derived sentiment:', sentiment);
}