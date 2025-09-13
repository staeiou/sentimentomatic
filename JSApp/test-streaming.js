#!/usr/bin/env node

import { AfinnAnalyzer } from './src/analyzers/AfinnAnalyzer.js';
import { VaderAnalyzer } from './src/analyzers/VaderAnalyzer.js';

console.log('🧪 Testing Streaming Updates\n');

const testTexts = [
  "This is absolutely amazing! Best thing ever!",
  "This is terrible and awful.",
  "It's okay, nothing special.",
  "LOVE IT SO MUCH!!!",
  "Worst experience of my life."
];

async function simulateStreaming() {
  const afinn = new AfinnAnalyzer();
  const vader = new VaderAnalyzer();
  
  // Initialize
  await afinn.initialize();
  await vader.initialize();
  
  console.log('Starting streaming analysis...\n');
  
  for (let i = 0; i < testTexts.length; i++) {
    const text = testTexts[i];
    
    console.log(`\n📝 Line ${i + 1}: "${text}"`);
    console.log('Analyzing...');
    
    // Analyze with both
    const afinnResult = await afinn.analyze(text);
    const vaderResult = await vader.analyze(text);
    
    console.log(`  AFINN: ${afinnResult.sentiment.toUpperCase()} (${afinnResult.score.toFixed(3)})`);
    console.log(`  VADER: ${vaderResult.sentiment.toUpperCase()} (${vaderResult.score.toFixed(3)})`);
    
    // Simulate delay between rows
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n✅ Streaming complete!');
}

simulateStreaming().catch(console.error);