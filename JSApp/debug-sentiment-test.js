#!/usr/bin/env node

// Manual test script to debug sentiment analysis classes
import { AnalyzerRegistry } from './src/analyzers/index.js';
import { MultiModelAnalyzer } from './src/analyzers/MultiModelAnalyzer.js';

console.log('🧪 Starting Sentiment Analysis Debug Tests...\n');

async function testAnalyzers() {
  try {
    // Initialize analyzer registry
    const analyzerRegistry = new AnalyzerRegistry();
    const multiModelAnalyzer = new MultiModelAnalyzer(analyzerRegistry.getModelManager());

    // Test texts
    const testTexts = [
      "FUCK YOU AND DIE I HATE YOU GODDAMNED MOTHERFUCKERS",
      "I LOVE YOU AND I LOVE THIS! IT IS THE BEST EVER! I AM SO HAPPY!"
    ];

    console.log('📋 Test Texts:');
    testTexts.forEach((text, i) => {
      console.log(`${i + 1}. "${text}"`);
    });
    console.log('\n');

    // Test AFINN
    console.log('🔍 Testing AFINN...');
    try {
      await analyzerRegistry.initializeAnalyzer('afinn');
      const afinnAnalyzer = analyzerRegistry.getAnalyzer('afinn');
      
      for (const [i, text] of testTexts.entries()) {
        const result = await afinnAnalyzer.analyze(text);
        console.log(`AFINN Text ${i + 1}:`, {
          score: result.score,
          sentiment: result.sentiment,
          rawScores: result.scores,
          metadata: result.metadata
        });
      }
    } catch (error) {
      console.error('❌ AFINN test failed:', error.message);
    }

    console.log('\n');

    // Test VADER
    console.log('🔍 Testing VADER...');
    try {
      await analyzerRegistry.initializeAnalyzer('vader');
      const vaderAnalyzer = analyzerRegistry.getAnalyzer('vader');
      
      for (const [i, text] of testTexts.entries()) {
        const result = await vaderAnalyzer.analyze(text);
        console.log(`VADER Text ${i + 1}:`, {
          score: result.score,
          sentiment: result.sentiment,
          rawScores: result.scores,
          metadata: result.metadata
        });
      }
    } catch (error) {
      console.error('❌ VADER test failed:', error.message);
    }

    console.log('\n');

    // Test MultiModel with Multilingual BERT specifically
    console.log('🔍 Testing Multilingual BERT...');
    try {
      // Add only Multilingual BERT for focused testing
      multiModelAnalyzer.addModel(
        'multilingual-bert-test',
        'Xenova/bert-base-multilingual-uncased-sentiment',
        'Multilingual BERT (Debug)'
      );

      // Initialize the model
      await multiModelAnalyzer.initialize((status, progress) => {
        console.log(`Init: ${status} (${progress}%)`);
      });

      // Test analysis
      for (const [i, text] of testTexts.entries()) {
        console.log(`\n📝 Analyzing Text ${i + 1} with Multilingual BERT...`);
        const result = await multiModelAnalyzer.analyzeWithModel(
          text, 
          'multilingual-bert-test',
          (status, progress) => {
            console.log(`Analysis: ${status} (${progress}%)`);
          }
        );

        if (result) {
          console.log(`Multilingual BERT Text ${i + 1} Result:`, {
            score: result.score,
            sentiment: result.sentiment,
            rawScores: result.scores,
            metadata: result.metadata
          });
        } else {
          console.log(`❌ No result returned for Text ${i + 1}`);
        }
      }

    } catch (error) {
      console.error('❌ Multilingual BERT test failed:', error);
      console.error('Stack trace:', error.stack);
    }

    console.log('\n');

    // Test a working HuggingFace model for comparison
    console.log('🔍 Testing DistilBERT for comparison...');
    try {
      multiModelAnalyzer.addModel(
        'distilbert-test',
        'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
        'DistilBERT SST-2 (Debug)'
      );

      for (const [i, text] of testTexts.entries()) {
        console.log(`\n📝 Analyzing Text ${i + 1} with DistilBERT...`);
        const result = await multiModelAnalyzer.analyzeWithModel(
          text, 
          'distilbert-test'
        );

        if (result) {
          console.log(`DistilBERT Text ${i + 1} Result:`, {
            score: result.score,
            sentiment: result.sentiment,
            rawScores: result.scores,
            metadata: result.metadata
          });
        } else {
          console.log(`❌ No result returned for Text ${i + 1}`);
        }
      }

    } catch (error) {
      console.error('❌ DistilBERT test failed:', error);
    }

  } catch (error) {
    console.error('💥 Test setup failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the tests
testAnalyzers().then(() => {
  console.log('\n✅ Debug tests completed!');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Debug tests failed:', error);
  process.exit(1);
});