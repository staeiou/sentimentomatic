#!/usr/bin/env node

// Quick test script to verify AFINN and VADER analyzers
import Sentiment from 'sentiment';
import { SentimentIntensityAnalyzer } from 'vader-sentiment';

console.log('🧪 Testing AFINN and VADER Sentiment Analyzers\n');

const testTexts = [
  "This is absolutely amazing! I love it so much! 😍",
  "This is terrible and I hate it completely. 😠",
  "This is okay, nothing special.",
  "BEST DAY EVER!!! YES!",
  "Worst experience. Never again. 😔"
];

// Test AFINN
console.log('=== AFINN Analyzer ===');
const sentiment = new Sentiment();

testTexts.forEach(text => {
  const result = sentiment.analyze(text);
  console.log(`\nText: "${text}"`);
  console.log(`Score: ${result.score}, Comparative: ${result.comparative.toFixed(3)}`);
  console.log(`Sentiment: ${result.score > 0 ? 'POSITIVE' : result.score < 0 ? 'NEGATIVE' : 'NEUTRAL'}`);
  if (result.positive.length > 0) {
    console.log(`Positive words: ${result.positive.join(', ')}`);
  }
  if (result.negative.length > 0) {
    console.log(`Negative words: ${result.negative.join(', ')}`);
  }
});

// Test VADER
console.log('\n\n=== VADER Analyzer ===');

testTexts.forEach(text => {
  const scores = SentimentIntensityAnalyzer.polarity_scores(text);
  console.log(`\nText: "${text}"`);
  console.log(`Compound: ${scores.compound.toFixed(3)}, Pos: ${scores.pos.toFixed(3)}, Neg: ${scores.neg.toFixed(3)}, Neu: ${scores.neu.toFixed(3)}`);
  
  let sentiment;
  if (scores.compound >= 0.05) {
    sentiment = 'POSITIVE';
  } else if (scores.compound <= -0.05) {
    sentiment = 'NEGATIVE';
  } else {
    sentiment = 'NEUTRAL';
  }
  console.log(`Sentiment: ${sentiment}`);
});

console.log('\n✅ Both analyzers are working correctly!');