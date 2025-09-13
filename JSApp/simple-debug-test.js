// Simple test to debug sentiment analysis using the actual npm packages
import { pipeline } from '@xenova/transformers';

console.log('🧪 Testing Multilingual BERT directly...\n');

async function testMultilingualBERT() {
  try {
    console.log('📦 Loading Multilingual BERT model...');
    
    // Create pipeline for the problematic model
    const classifier = await pipeline(
      'sentiment-analysis', 
      'Xenova/bert-base-multilingual-uncased-sentiment'
    );
    
    console.log('✅ Model loaded successfully!\n');

    // Test texts
    const testTexts = [
      "FUCK YOU AND DIE I HATE YOU GODDAMNED MOTHERFUCKERS",
      "I LOVE YOU AND I LOVE THIS! IT IS THE BEST EVER! I AM SO HAPPY!",
      "This is okay I guess.",
      "Terrible product, worst ever!",
      "Amazing product, love it!"
    ];

    console.log('📋 Testing with various texts:\n');

    for (const [i, text] of testTexts.entries()) {
      console.log(`🔍 Text ${i + 1}: "${text}"`);
      
      try {
        const result = await classifier(text);
        console.log('📊 Raw result:', result);
        
        // Examine the structure
        if (Array.isArray(result)) {
          console.log('📊 Result is array, first element:', result[0]);
          const prediction = result[0];
          
          console.log('📋 Prediction details:');
          console.log('  - label:', prediction.label);
          console.log('  - score:', prediction.score);
          console.log('  - label type:', typeof prediction.label);
          
          // Try to parse label as number (if it's a class index)
          const numericLabel = parseInt(prediction.label);
          if (!isNaN(numericLabel)) {
            console.log('  - numeric label:', numericLabel);
            console.log('  - stars (label + 1):', numericLabel + 1);
            console.log('  - converted score ((stars - 3) / 2):', ((numericLabel + 1) - 3) / 2);
          }
        } else {
          console.log('📊 Result is object:', result);
        }
        
        console.log('---\n');
        
      } catch (error) {
        console.error(`❌ Error analyzing text ${i + 1}:`, error.message);
      }
    }

  } catch (error) {
    console.error('💥 Failed to load model:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Test DistilBERT for comparison
async function testDistilBERT() {
  try {
    console.log('\n🔍 Testing DistilBERT for comparison...');
    
    const classifier = await pipeline(
      'sentiment-analysis', 
      'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
    );
    
    console.log('✅ DistilBERT loaded!\n');

    const testText = "I LOVE YOU AND I LOVE THIS! IT IS THE BEST EVER!";
    console.log(`🔍 Testing: "${testText}"`);
    
    const result = await classifier(testText);
    console.log('📊 DistilBERT result:', result);
    
  } catch (error) {
    console.error('❌ DistilBERT test failed:', error.message);
  }
}

// Run tests
async function runTests() {
  await testMultilingualBERT();
  await testDistilBERT();
  console.log('\n✅ All tests completed!');
}

runTests().catch(console.error);