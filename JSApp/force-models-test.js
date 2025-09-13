// Force different configurations to make the problematic models work
import { pipeline, env } from '@xenova/transformers';

console.log('🔧 FORCING Models to Work - Different Configurations\n');

async function forceModelsToWork() {
  // Set environment variables to force fallbacks
  env.allowRemoteModels = true;
  env.allowLocalModels = false;
  
  const testText = "I hate this fucking shit, it's terrible!";
  console.log(`📝 Test text: "${testText}"\n`);

  const problematicModels = [
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

  for (const model of problematicModels) {
    console.log(`🔧 FORCING: ${model.displayName}`);
    console.log(`📦 ID: ${model.huggingFaceId}`);
    console.log('-'.repeat(50));

    // Try multiple approaches
    const approaches = [
      { name: 'Default', config: {} },
      { name: 'Force WASM', config: { device: 'cpu' } },
      { name: 'No Cache', config: { cache_dir: false } },
      { name: 'Force Download', config: { local_files_only: false } }
    ];

    for (const approach of approaches) {
      console.log(`\n🧪 Approach: ${approach.name}`);
      
      try {
        // Force environment settings
        if (approach.name === 'Force WASM') {
          env.backends.onnx.wasm.numThreads = 1;
        }

        const classifier = await pipeline('text-classification', model.huggingFaceId, approach.config);
        const result = await classifier(testText);
        
        console.log(`✅ SUCCESS with ${approach.name}!`);
        console.log('📊 Result:', JSON.stringify(result, null, 2));
        
        if (Array.isArray(result) && result.length > 0) {
          const prediction = result[0];
          console.log('📋 Analysis:');
          console.log(`  🏷️  Label: "${prediction.label}" (${typeof prediction.label})`);
          console.log(`  📊 Score: ${prediction.score} (${typeof prediction.score})`);
          
          // Check for multiple classes
          if (result.length > 1) {
            console.log(`  📊 Multiple classes detected (${result.length} total)`);
            result.slice(0, 3).forEach((r, i) => {
              console.log(`    ${i + 1}. ${r.label}: ${r.score.toFixed(4)}`);
            });
          }
        }
        
        // SUCCESS - break out of approaches loop
        break;
        
      } catch (error) {
        console.error(`❌ ${approach.name} failed: ${error.message.substring(0, 80)}...`);
        
        // Give specific error analysis
        if (error.message.includes('opset 19')) {
          console.error('   → ONNX opset 19 not supported by runtime');
        } else if (error.message.includes('Could not locate file')) {
          console.error('   → Missing model files');
        } else if (error.message.includes('worker')) {
          console.error('   → Web Worker issue');
        } else if (error.message.includes('IR version')) {
          console.error('   → ONNX IR version mismatch');
        }
      }
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  }

  // Try one more approach - see if we can get model info without loading
  console.log('🔍 Alternative: Check model configurations...');
  
  for (const model of problematicModels) {
    console.log(`\n📋 ${model.displayName}:`);
    try {
      // Try to fetch model config directly
      const configUrl = `https://huggingface.co/${model.huggingFaceId}/raw/main/config.json`;
      const response = await fetch(configUrl);
      
      if (response.ok) {
        const config = await response.json();
        console.log(`  ✅ Config found: ${config.model_type || 'unknown'} model`);
        console.log(`  📊 Labels: ${JSON.stringify(config.id2label || config.label2id || 'not found')}`);
      } else {
        console.log(`  ❌ Config not accessible (${response.status})`);
      }
    } catch (error) {
      console.log(`  ❌ Config fetch failed: ${error.message.substring(0, 50)}...`);
    }
  }
}

forceModelsToWork().catch(console.error);