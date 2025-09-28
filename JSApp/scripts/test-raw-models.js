#!/usr/bin/env node

import { pipeline } from '@huggingface/transformers';

const DEFAULT_TEXT = `Each line will be analyzed independently and given scores by various models.
THIS IS SO SUPER COOL AND THE BEST EVER! YES!
This means that lines are the units of analysis, no matter how many sentences. AWESOME! 😍
Ugh, I hate hate HATE trying to write examples, it's not fun! I'm not happy!
😢😠😢
Darkness cannot drive out darkness; only light can do that. Hate cannot drive out hate; only love can do that.
There are three kinds of lies: lies, damned lies, and statistics.
Facebook says sorry for shutting down page of French town of Bitche
u can def analyze slang w/ vader, its gr8! text analysis ftw!
Although a double negative in English implies a positive meaning, there is no language in which a double positive implies a negative.
Yeah, right.
Sentiment analysis is the perfect and foolproof method for every research project ever --- NOT!
Your items/lines can be up to 2,500 characters. Just make sure there are no newlines in your units of texts. Note that long texts (more than 250 words) can break VADER, and textblob handles longer texts better.`;

const SAMPLE_TEXTS = DEFAULT_TEXT.split('\n').filter(line => line.trim());

const MODELS = [
  { name: "DistilBERT SST-2", id: "Xenova/distilbert-base-uncased-finetuned-sst-2-english", task: "sentiment-analysis", type: "sentiment" },
  { name: "Twitter RoBERTa", id: "Xenova/twitter-roberta-base-sentiment-latest", task: "sentiment-analysis", type: "sentiment" },
  { name: "Financial DistilRoBERTa", id: "Xenova/finbert", task: "sentiment-analysis", type: "sentiment" },
  { name: "Multilingual DistilBERT", id: "Xenova/distilbert-base-multilingual-cased-sentiments-student", task: "sentiment-analysis", type: "sentiment" },
  { name: "GoEmotions", id: "SamLowe/roberta-base-go_emotions-onnx", task: "text-classification", type: "classification" },
  { name: "KoalaAI Moderation", id: "KoalaAI/Text-Moderation", task: "text-classification", type: "classification" },
  { name: "IPTC News", id: "onnx-community/multilingual-IPTC-news-topic-classifier-ONNX", task: "text-classification", type: "classification" },
  { name: "Language Detection", id: "protectai/xlm-roberta-base-language-detection-onnx", task: "text-classification", type: "classification" },
  { name: "Toxic BERT", id: "Xenova/toxic-bert", task: "text-classification", type: "classification" },
  { name: "Jigsaw Toxicity", id: "minuva/MiniLMv2-toxic-jigsaw-onnx", task: "text-classification", type: "classification" },
  { name: "Industry Classification", id: "sabatale/industry-classification-api-onnx", task: "text-classification", type: "classification" }
];

// Cache loaded models (don't reload every time!)
const modelCache = new Map();

// Setup Node.js polyfills like the app does
global.window = global;
global.document = { createElement: () => ({}) };
global.navigator = { userAgent: 'Node.js' };

// Monkey patch fetch for non-standard model files (copied from ModelManager.ts)
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

async function getOrLoadModel(model) {
  const cacheKey = model.id;
  if (modelCache.has(cacheKey)) {
    return modelCache.get(cacheKey);
  }

  console.log(`Loading ${model.name}...`);
  try {
    const options = model.type === 'classification' ? { top_k: null, return_all_scores: true } : {};
    const classifier = await pipeline(model.task, model.id);
    modelCache.set(cacheKey, classifier);
    console.log(`✅ ${model.name} loaded`);
    return classifier;
  } catch (error) {
    console.log(`❌ ${model.name} failed: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🚀 COMPACT RAW MODEL OUTPUT TEST\n');

  const results = [];

  for (const model of MODELS) {
    console.log(`\n=== ${model.name} ===`);
    const classifier = await getOrLoadModel(model);

    if (!classifier) continue;

    for (const text of SAMPLE_TEXTS) {
      try {
        const options = model.type === 'classification' ? { top_k: null, return_all_scores: true } : {};
        const result = await classifier(text, options);

        console.log(`📝 "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
        console.log(`📊 ${JSON.stringify(result)}\n`);

        results.push({ model: model.name, text, rawOutput: result, success: true });
      } catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
        results.push({ model: model.name, text, error: error.message, success: false });
      }
    }
  }

  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`\n📋 SUMMARY: ${successful} successful, ${failed} failed tests`);
}

main().catch(console.error);