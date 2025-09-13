// Test models that are KNOWN to work with Transformers.js (from Xenova namespace)
import { pipeline } from '@xenova/transformers';

console.log('🎯 Testing WORKING Transformers.js Compatible Models\n');

async function testWorkingModels() {
  // Models that should actually work (from Xenova namespace = Transformers.js compatible)
  const workingModels = [
    {
      id: 'emotion-roberta',
      huggingFaceId: 'Xenova/j-hartmann_emotion-english-distilroberta-base',
      displayName: 'Emotion RoBERTa'
    },
    {
      id: 'toxic-bert',
      huggingFaceId: 'Xenova/toxic-bert',
      displayName: 'Toxic BERT'
    },
    {
      id: 'roberta-emotions',
      huggingFaceId: 'Xenova/roberta-base-go_emotions',
      displayName: 'RoBERTa GoEmotions'
    }
  ];

  const testTexts = [
    "I am so fucking angry and hate this!",
    "I love this so much, it makes me happy!",
    "This is just neutral boring text.",
    "😡 You're such an idiot! Go kill yourself!",
    "😍 This is absolutely amazing and wonderful!"
  ];

  console.log('📋 Test Texts:');
  testTexts.forEach((text, i) => {
    console.log(`${i + 1}. "${text}"`);
  });
  console.log('\n' + '='.repeat(60) + '\n');

  for (const model of workingModels) {
    console.log(`🤖 Testing: ${model.displayName}`);
    console.log(`📦 ID: ${model.huggingFaceId}`);
    console.log('-'.repeat(40));
    
    try {
      console.log('📦 Loading model...');
      const classifier = await pipeline('text-classification', model.huggingFaceId);
      console.log('✅ Model loaded successfully!\n');

      for (const [i, text] of testTexts.entries()) {
        console.log(`📝 Text ${i + 1}: "${text}"`);
        
        try {
          const result = await classifier(text);
          console.log('📊 Raw result:', JSON.stringify(result, null, 2));
          
          // Analyze structure
          if (Array.isArray(result) && result.length > 0) {
            const prediction = result[0];
            console.log('📋 Analysis:');
            console.log(`  🏷️  Label: "${prediction.label}" (${typeof prediction.label})`);
            console.log(`  📊 Score: ${prediction.score} (${typeof prediction.score})`);
            
            // Look for emotion/toxicity patterns
            if (prediction.label.includes('anger') || prediction.label.includes('angry')) {
              console.log('  🔍 Type: Emotion detection (anger)');
            } else if (prediction.label.includes('joy') || prediction.label.includes('happy')) {
              console.log('  🔍 Type: Emotion detection (joy)');
            } else if (prediction.label.includes('toxic') || prediction.label.includes('TOXIC')) {
              console.log('  🔍 Type: Toxicity detection');
            } else if (prediction.label.includes('pos') || prediction.label.includes('neg')) {
              console.log('  🔍 Type: Sentiment classification');
            } else {
              console.log(`  🔍 Type: Multi-class (${prediction.label})`);
            }
          }
          
        } catch (error) {
          console.error(`❌ Error analyzing text: ${error.message}`);
        }
        
        console.log('');
      }

    } catch (error) {
      console.error(`💥 Failed to load ${model.displayName}: ${error.message}`);
      
      // Try to give helpful info about why it failed
      if (error.message.includes('Could not locate file')) {
        console.error('   → Model files missing - not Transformers.js compatible');
      } else if (error.message.includes('ONNX')) {
        console.error('   → ONNX compatibility issue');
      }
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  }

  console.log('🎯 Testing Complete!');
}

testWorkingModels().catch(console.error);