// Test the new @huggingface/transformers v3.5.2 with the problematic models
import { pipeline } from '@huggingface/transformers';

console.log('🚀 Testing NEW @huggingface/transformers v3.5.2\n');

async function testNewTransformers() {
  const testText = "I fucking hate this shit, it's terrible!";
  console.log(`📝 Test text: "${testText}"\n`);

  // The 4 problematic models
  const models = [
    {
      id: 'text-moderation',
      huggingFaceId: 'KoalaAI/Text-Moderation',
      displayName: 'KoalaAI Text Moderation',
      expectedLabels: 'H, H2, HR, OK, S, S3, SH, V, V2'
    },
    {
      id: 'go-emotions',
      huggingFaceId: 'SamLowe/roberta-base-go_emotions-onnx',
      displayName: 'RoBERTa GoEmotions',
      expectedLabels: '28 emotions (anger, joy, fear, etc.)'
    },
    {
      id: 'multigen-bias',
      huggingFaceId: 'seanbenhur/MuLTiGENBiaS',
      displayName: 'MuLTiGENBiaS',
      expectedLabels: 'NOT-GENDER-BIASED, GENDER-BIASED'
    },
    {
      id: 'distilroberta-bias',
      huggingFaceId: 'protectai/distilroberta-bias-onnx',
      displayName: 'DistilRoBERTa Bias Detection',
      expectedLabels: 'BIASED, NEUTRAL'
    }
  ];

  for (const model of models) {
    console.log(`🤖 Testing: ${model.displayName}`);
    console.log(`📦 ID: ${model.huggingFaceId}`);
    console.log(`🎯 Expected: ${model.expectedLabels}`);
    console.log('-'.repeat(60));
    
    try {
      console.log('📦 Loading model with new transformers.js...');
      const classifier = await pipeline('text-classification', model.huggingFaceId);
      console.log('✅ Model loaded successfully!\n');

      console.log(`📝 Analyzing: "${testText}"`);
      const result = await classifier(testText);
      
      console.log('🎉 SUCCESS!');
      console.log('📊 Raw result:', JSON.stringify(result, null, 2));
      
      if (Array.isArray(result) && result.length > 0) {
        console.log('\n📋 Analysis:');
        
        if (result.length === 1) {
          const prediction = result[0];
          console.log(`  🏷️  Label: "${prediction.label}" (${typeof prediction.label})`);
          console.log(`  📊 Score: ${prediction.score} (${typeof prediction.score})`);
        } else {
          console.log(`  📊 Multiple results (${result.length} total):`);
          result.slice(0, 5).forEach((r, i) => {
            console.log(`    ${i + 1}. ${r.label}: ${r.score.toFixed(4)}`);
          });
          if (result.length > 5) {
            console.log(`    ... and ${result.length - 5} more`);
          }
        }
        
        // Determine classification type
        const labels = result.map(r => r.label);
        if (labels.some(l => l.includes('toxic') || l.includes('TOXIC'))) {
          console.log('  🔍 Type: Toxicity/Content Moderation');
        } else if (labels.some(l => l.includes('BIAS') || l.includes('bias'))) {
          console.log('  🔍 Type: Bias Detection');
        } else if (labels.length > 10) {
          console.log('  🔍 Type: Multi-emotion Classification');
        } else if (labels.length > 2) {
          console.log('  🔍 Type: Multi-class Sentiment');
        } else {
          console.log('  🔍 Type: Binary Classification');
        }
      }
      
    } catch (error) {
      console.error(`❌ FAILED: ${error.message}`);
      
      // Analyze error types
      if (error.message.includes('opset 19')) {
        console.error('   → STILL has ONNX opset 19 issue');
      } else if (error.message.includes('Could not locate file')) {
        console.error('   → Missing model files');
      } else if (error.message.includes('IR version')) {
        console.error('   → ONNX IR version mismatch');
      } else if (error.message.includes('worker')) {
        console.error('   → Worker/threading issue');
      } else {
        console.error('   → Unknown error type');
      }
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  }

  console.log('🎯 Testing Complete with NEW Transformers.js!');
}

testNewTransformers().catch(console.error);