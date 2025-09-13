// Quick test of just the new models to see which ones actually work
import { pipeline } from '@xenova/transformers';

console.log('🧪 Quick Test - New Models Only\n');

async function testNewModels() {
  const newModels = [
    {
      id: 'go-emotions',
      huggingFaceId: 'SamLowe/roberta-base-go_emotions-onnx',
      displayName: 'RoBERTa GoEmotions'
    }
    // Start with just one to see if any work
  ];

  const quickTests = [
    "I am so happy and excited!",
    "I feel angry and frustrated",
    "This is neutral text"
  ];

  for (const model of newModels) {
    console.log(`🤖 Testing: ${model.displayName}`);
    console.log(`📦 ID: ${model.huggingFaceId}`);
    
    try {
      console.log('📦 Loading model...');
      const classifier = await pipeline('text-classification', model.huggingFaceId);
      console.log('✅ Model loaded!\n');

      for (const [i, text] of quickTests.entries()) {
        console.log(`📝 Test ${i + 1}: "${text}"`);
        const result = await classifier(text);
        console.log('📊 Result:', JSON.stringify(result, null, 2));
        console.log('');
      }

    } catch (error) {
      console.error(`❌ Failed: ${error.message}`);
      if (error.message.includes('Could not locate file')) {
        console.error('   → Model files missing from HuggingFace');
      } else if (error.message.includes('ONNX')) {
        console.error('   → ONNX compatibility issue');
      } else if (error.message.includes('worker')) {
        console.error('   → Worker/threading issue');
      }
    }
    
    console.log('\n' + '-'.repeat(50) + '\n');
  }
}

testNewModels().catch(console.error);