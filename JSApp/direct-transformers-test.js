// Direct test of Transformers.js to see actual error
console.log('Testing Transformers.js directly...');

async function testTransformers() {
  try {
    console.log('1. Importing @xenova/transformers...');
    const transformersModule = await import('@xenova/transformers');
    console.log('2. Module imported successfully:', Object.keys(transformersModule));
    
    const { pipeline } = transformersModule;
    if (!pipeline) {
      throw new Error('Pipeline function not found in module');
    }
    console.log('3. Pipeline function found');
    
    console.log('4. Creating sentiment analysis pipeline...');
    const sentimentPipeline = await pipeline(
      'sentiment-analysis',
      'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
    );
    console.log('5. Pipeline created successfully');
    
    console.log('6. Testing analysis...');
    const result = await sentimentPipeline('This is a test');
    console.log('7. Analysis result:', result);
    
    console.log('✅ Transformers.js works perfectly!');
    
  } catch (error) {
    console.error('❌ Transformers.js failed:');
    console.error('Error message:', error.message);
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error.constructor.name);
    console.error('Full error:', error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testTransformers();