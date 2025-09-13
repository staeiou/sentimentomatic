// Comprehensive test of all HuggingFace models to see their output formats
import { pipeline } from '@xenova/transformers';

console.log('🧪 Comprehensive Model Testing - All HuggingFace Models\n');

async function testAllModels() {
  // All the models from the JSApp + additional models to test
  const models = [
    {
      id: 'distilbert',
      huggingFaceId: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      displayName: 'DistilBERT SST-2'
    },
    {
      id: 'twitter-roberta',
      huggingFaceId: 'Xenova/twitter-roberta-base-sentiment-latest',
      displayName: 'Twitter RoBERTa'
    },
    {
      id: 'financial',
      huggingFaceId: 'Xenova/distilroberta-finetuned-financial-news-sentiment-analysis',
      displayName: 'Financial DistilRoBERTa'
    },
    {
      id: 'multilingual',
      huggingFaceId: 'Xenova/bert-base-multilingual-uncased-sentiment',
      displayName: 'Multilingual BERT'
    },
    {
      id: 'multilingual-student',
      huggingFaceId: 'Xenova/distilbert-base-multilingual-cased-sentiments-student',
      displayName: 'Multilingual DistilBERT'
    },
    // NEW MODELS TO TEST
    {
      id: 'text-moderation',
      huggingFaceId: 'KoalaAI/Text-Moderation',
      displayName: 'KoalaAI Text Moderation'
    },
    {
      id: 'go-emotions',
      huggingFaceId: 'SamLowe/roberta-base-go_emotions-onnx',
      displayName: 'RoBERTa GoEmotions'
    },
    {
      id: 'multigen-bias',
      huggingFaceId: 'seanbenhur/MuLTiGENBiaS',
      displayName: 'MuLTiGENBiaS'
    },
    {
      id: 'distilroberta-bias',
      huggingFaceId: 'protectai/distilroberta-bias-onnx',
      displayName: 'DistilRoBERTa Bias Detection'
    }
  ];

  // Test texts - variety of sentiments and lengths
  const testTexts = [
    "FUCK YOU AND DIE I HATE YOU GODDAMNED MOTHERFUCKERS",
    "I LOVE YOU AND I LOVE THIS! IT IS THE BEST EVER! I AM SO HAPPY!",
    "This is okay I guess.",
    "Terrible product, worst ever!",
    "Amazing product, love it!",
    "The weather is nice today.",
    "I feel sad and disappointed.",
    "Absolutely fantastic experience!",
    "It's fine, nothing special.",
    "😍😍😍 BEST EVER! ❤️❤️❤️",
    "😢😠😢 So angry and upset!!!",
    "The stock market crashed today, investors are worried.",
    "Quarterly earnings exceeded expectations by 15%.",
    "This movie is neither good nor bad, just mediocre."
  ];

  console.log('📋 Test Texts:');
  testTexts.forEach((text, i) => {
    console.log(`${i + 1}. "${text}"`);
  });
  console.log('\n' + '='.repeat(80) + '\n');

  // Test each model
  for (const model of models) {
    console.log(`🤖 Testing Model: ${model.displayName}`);
    console.log(`📦 HuggingFace ID: ${model.huggingFaceId}`);
    console.log('-'.repeat(60));
    
    try {
      // Load the model
      console.log('📦 Loading model...');
      const classifier = await pipeline('sentiment-analysis', model.huggingFaceId);
      console.log('✅ Model loaded successfully!\n');

      // Test each text
      for (const [textIndex, text] of testTexts.entries()) {
        console.log(`📝 Text ${textIndex + 1}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
        
        try {
          const result = await classifier(text);
          console.log('📊 Raw result:', JSON.stringify(result, null, 2));
          
          // Analyze the structure
          if (Array.isArray(result) && result.length > 0) {
            const prediction = result[0];
            console.log('📋 Analysis:');
            console.log(`  🏷️  Label: "${prediction.label}" (type: ${typeof prediction.label})`);
            console.log(`  📊 Score/Confidence: ${prediction.score} (type: ${typeof prediction.score})`);
            
            // Check for additional properties
            const extraProps = Object.keys(prediction).filter(key => !['label', 'score'].includes(key));
            if (extraProps.length > 0) {
              console.log(`  ➕ Extra properties: ${extraProps.join(', ')}`);
              extraProps.forEach(prop => {
                console.log(`     ${prop}: ${prediction[prop]}`);
              });
            }
            
            // Try to categorize the output format
            if (prediction.label?.toLowerCase().includes('pos') || prediction.label?.toLowerCase().includes('neg')) {
              console.log('  🔍 Format: POSITIVE/NEGATIVE binary classification');
            } else if (prediction.label?.match(/\d+\s*stars?/i)) {
              const stars = parseInt(prediction.label.match(/(\d+)/)[1]);
              console.log(`  🔍 Format: Star rating (${stars} stars)`);
            } else if (!isNaN(parseInt(prediction.label))) {
              console.log(`  🔍 Format: Numeric class (${prediction.label})`);
            } else {
              console.log(`  🔍 Format: Unknown - "${prediction.label}"`);
            }
            
          } else {
            console.log('⚠️  Unexpected result format (not array or empty)');
          }
          
        } catch (error) {
          console.error(`❌ Error analyzing text: ${error.message}`);
        }
        
        console.log(''); // Blank line between texts
      }

    } catch (error) {
      console.error(`💥 Failed to load model ${model.displayName}:`, error.message);
      if (error.message.includes('fetch')) {
        console.error('   Might be a network/download issue');
      } else if (error.message.includes('memory') || error.message.includes('ENOSPC')) {
        console.error('   Might be a memory/disk space issue');
      }
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  }

  console.log('🎯 Test Summary Complete!');
  console.log('\n📝 Key things to look for:');
  console.log('1. Label formats (POSITIVE/NEGATIVE, star ratings, numeric classes, etc.)');
  console.log('2. Score meanings (confidence, probability, etc.)');
  console.log('3. Additional properties beyond label/score');
  console.log('4. Consistent patterns across similar inputs');
  console.log('5. How each model handles edge cases');
}

// Run the comprehensive test
testAllModels().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});