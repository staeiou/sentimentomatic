// Try different approaches for the problematic models
import { pipeline } from '@xenova/transformers';

console.log('🔧 Fixing New Models - Different Approaches\n');

async function tryDifferentApproaches() {
  const testText = "I am so fucking angry and hate this!";
  console.log(`📝 Test text: "${testText}"\n`);

  // 1. Try GoEmotions without ONNX suffix (maybe there's a non-ONNX version)
  console.log('🧪 Approach 1: GoEmotions without ONNX');
  try {
    const classifier1 = await pipeline('text-classification', 'SamLowe/roberta-base-go_emotions');
    const result1 = await classifier1(testText);
    console.log('✅ GoEmotions (non-ONNX) worked!');
    console.log('📊 Result:', JSON.stringify(result1, null, 2));
  } catch (error) {
    console.error(`❌ GoEmotions (non-ONNX) failed: ${error.message}`);
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // 2. Try original bias detection model (without protectai prefix)
  console.log('🧪 Approach 2: Try different bias detection models');
  const biasModels = [
    'unitary/toxic-bert',
    'martin-ha/toxic-comment-model',
    'cardiffnlp/twitter-roberta-base-offensive'
  ];

  for (const modelId of biasModels) {
    console.log(`📦 Trying: ${modelId}`);
    try {
      const classifier = await pipeline('text-classification', modelId);
      const result = await classifier(testText);
      console.log(`✅ ${modelId} worked!`);
      console.log('📊 Result:', JSON.stringify(result, null, 2));
      break; // Stop at first working model
    } catch (error) {
      console.error(`❌ ${modelId} failed: ${error.message}`);
    }
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // 3. Try text moderation alternatives
  console.log('🧪 Approach 3: Alternative moderation models');
  const moderationModels = [
    'unitary/toxic-bert',
    'martin-ha/toxic-comment-model'
  ];

  for (const modelId of moderationModels) {
    console.log(`📦 Trying: ${modelId}`);
    try {
      const classifier = await pipeline('text-classification', modelId);
      const result = await classifier(testText);
      console.log(`✅ ${modelId} worked!`);
      console.log('📊 Result:', JSON.stringify(result, null, 2));
      break;
    } catch (error) {
      console.error(`❌ ${modelId} failed: ${error.message}`);
    }
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // 4. Try sentiment models that might have multi-class output
  console.log('🧪 Approach 4: Multi-class sentiment models');
  const multiClassModels = [
    'cardiffnlp/twitter-roberta-base-sentiment-latest',
    'j-hartmann/emotion-english-distilroberta-base',
    'bhadresh-savani/distilbert-base-uncased-emotion'
  ];

  for (const modelId of multiClassModels) {
    console.log(`📦 Trying: ${modelId}`);
    try {
      const classifier = await pipeline('text-classification', modelId);
      const result = await classifier(testText);
      console.log(`✅ ${modelId} worked!`);
      console.log('📊 Result:', JSON.stringify(result, null, 2));
      
      // Analyze the result format
      if (Array.isArray(result) && result.length > 0) {
        const prediction = result[0];
        console.log('📋 Analysis:');
        console.log(`  🏷️  Label: "${prediction.label}"`);
        console.log(`  📊 Score: ${prediction.score}`);
      }
      
    } catch (error) {
      console.error(`❌ ${modelId} failed: ${error.message}`);
    }
    console.log('');
  }
}

tryDifferentApproaches().catch(console.error);