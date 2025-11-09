#!/usr/bin/env node

import { pipeline } from '@huggingface/transformers';

const MODELS_TO_TEST = [
  { name: "Language Detection", id: "protectai/xlm-roberta-base-language-detection-onnx", task: "text-classification" },
  { name: "Toxic BERT", id: "Xenova/toxic-bert", task: "text-classification" },
  { name: "Jigsaw Toxicity MiniLMv2", id: "minuva/MiniLMv2-toxic-jigsaw-onnx", task: "text-classification" },
  { name: "Industry Classification", id: "sabatale/industry-classification-api-onnx", task: "text-classification" }
];

const TEST_TEXT = "I love this product, it's amazing!";

// Setup Node.js polyfills
global.window = global;
global.document = { createElement: () => ({}) };
global.navigator = { userAgent: 'Node.js' };

// Monkey patch fetch for non-standard model files
const originalFetch = global.fetch;
global.fetch = async (...args) => {
  const url = args[0];

  if (typeof url === 'string' && url.includes('.onnx')) {
    // protectai: redirect from /onnx/ to root
    if (url.includes('protectai/xlm-roberta-base-language-detection-onnx')) {
      if (url.includes('/onnx/model_quantized.onnx')) {
        const newUrl = url.replace('/onnx/model_quantized.onnx', '/model_quantized.onnx');
        return originalFetch(newUrl, args[1]);
      }
      if (url.includes('/onnx/model.onnx')) {
        const newUrl = url.replace('/onnx/model.onnx', '/model.onnx');
        return originalFetch(newUrl, args[1]);
      }
    }

    // minuva: nuclear redirect to the one file that exists
    if (url.includes('minuva/MiniLMv2-toxic-jigsaw-onnx')) {
      const actualFile = 'https://huggingface.co/minuva/MiniLMv2-toxic-jigsaw-onnx/resolve/main/model_optimized_quantized.onnx';
      const response = await originalFetch(actualFile, args[1]);
      const fakeResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
      Object.defineProperty(fakeResponse, 'url', { value: url, writable: false });
      return fakeResponse;
    }
  }

  return originalFetch(...args);
};

async function testModel(model) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing: ${model.name}`);
  console.log(`Model ID: ${model.id}`);
  console.log(`${'='.repeat(50)}`);

  try {
    const classifier = await pipeline(model.task, model.id);

    // Test 1: Default (top prediction only)
    console.log('\n1. DEFAULT OUTPUT (no options):');
    const defaultResult = await classifier(TEST_TEXT);
    console.log(JSON.stringify(defaultResult, null, 2));

    // Test 2: With top_k=null
    console.log('\n2. WITH top_k: null:');
    const allResults = await classifier(TEST_TEXT, { top_k: null });
    console.log(JSON.stringify(allResults, null, 2));
    console.log(`Total classes returned: ${Array.isArray(allResults) ? allResults.length : 1}`);

    // Test 3: With return_all_scores
    console.log('\n3. WITH return_all_scores: true:');
    const allScores = await classifier(TEST_TEXT, { return_all_scores: true });
    console.log(JSON.stringify(allScores, null, 2));

    // Test 4: With both options
    console.log('\n4. WITH BOTH top_k: null AND return_all_scores: true:');
    const both = await classifier(TEST_TEXT, { top_k: null, return_all_scores: true });
    console.log(JSON.stringify(both, null, 2));
    console.log(`Total classes returned: ${Array.isArray(both) ? both.length : 1}`);

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function main() {
  for (const model of MODELS_TO_TEST) {
    await testModel(model);
  }
}

main().catch(console.error);