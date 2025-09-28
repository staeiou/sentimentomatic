import { test, expect } from '@playwright/test';
import { ModelTestConfig, ModelSizeResult, NetworkRequest, TestUtils } from './types';

// All models to test with their metadata
const MODELS_TO_TEST: ModelTestConfig[] = [
  // Rule-based models (local, no download)
  { id: 'afinn', displayName: 'AFINN', huggingFaceId: 'Rule-based', isRuleBased: true },
  { id: 'vader', displayName: 'VADER', huggingFaceId: 'Rule-based', isRuleBased: true },

  // Neural network sentiment models
  { id: 'distilbert', displayName: 'DistilBERT SST-2', huggingFaceId: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', isRuleBased: false },
  { id: 'twitter-roberta', displayName: 'Twitter RoBERTa', huggingFaceId: 'Xenova/twitter-roberta-base-sentiment-latest', isRuleBased: false },
  { id: 'financial', displayName: 'Financial DistilRoBERTa', huggingFaceId: 'Xenova/finbert', isRuleBased: false },
  { id: 'multilingual', displayName: 'Multilingual BERT', huggingFaceId: 'Xenova/bert-base-multilingual-uncased-sentiment', isRuleBased: false },
  { id: 'multilingual-student', displayName: 'Multilingual DistilBERT', huggingFaceId: 'Xenova/distilbert-base-multilingual-cased-sentiments-student', isRuleBased: false },

  // Classification models
  { id: 'go-emotions', displayName: 'GoEmotions', huggingFaceId: 'SamLowe/roberta-base-go_emotions-onnx', isRuleBased: false },
  { id: 'koala-moderation', displayName: 'KoalaAI Moderation', huggingFaceId: 'KoalaAI/Text-Moderation', isRuleBased: false },
  { id: 'iptc-news', displayName: 'IPTC News', huggingFaceId: 'onnx-community/multilingual-IPTC-news-topic-classifier-ONNX', isRuleBased: false },
  { id: 'language-detection', displayName: 'Language Detection', huggingFaceId: 'protectai/xlm-roberta-base-language-detection-onnx', isRuleBased: false },
  { id: 'intent-classification', displayName: 'Intent Classification', huggingFaceId: 'kousik-2310/intent-classifier-minilm', isRuleBased: false },
  { id: 'toxic-bert', displayName: 'Toxic BERT', huggingFaceId: 'Xenova/toxic-bert', isRuleBased: false },
  { id: 'jigsaw-toxicity', displayName: 'Jigsaw Toxicity', huggingFaceId: 'minuva/MiniLMv2-toxic-jigsaw-onnx', isRuleBased: false },
  { id: 'industry-classification', displayName: 'Industry Classification', huggingFaceId: 'sabatale/industry-classification-api-onnx', isRuleBased: false },
];

test.describe('Model Size Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all caches before each test
    await page.evaluate(async () => {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
        }
      }
      // Clear localStorage too
      localStorage.clear();
    });

    // Navigate to the application
    await page.goto('/');

    // Wait for the page to load
    await expect(page.locator('.app-title')).toBeVisible();
  });

  test('Test all models and log actual sizes', async ({ page }) => {
    const results: ModelSizeResult[] = [];

    console.log('\n🚀 STARTING COMPREHENSIVE MODEL SIZE TESTING');
    console.log('='.repeat(80));

    // Test each model individually
    for (const model of MODELS_TO_TEST) {
      console.log(`\n🧪 Testing ${model.displayName} (${model.huggingFaceId})`);

      if (model.isRuleBased) {
        console.log(`   ⚡ Rule-based model - no download required`);
        results.push({
          modelId: model.id,
          displayName: model.displayName,
          huggingFaceId: model.huggingFaceId,
          files: [],
          totalSize: 0,
          totalSizeFormatted: '0 B (local rule-based)'
        });
        continue;
      }

      // Clear cache before testing this model
      await TestUtils.clearAllCaches(page);

      // Clear all model selections first
      await page.click('#clear-models-btn');
      await page.waitForTimeout(500);

      // Select only this model
      const checkboxId = `#use-${model.id}`;
      await page.check(checkboxId);

      // Ensure the analyze button is visible and clickable
      await expect(page.locator('#analyze-btn')).toBeVisible();

      // Monitor network requests to track downloads
      const networkRequests: NetworkRequest[] = [];

      page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('huggingface.co') && url.includes(model.huggingFaceId)) {
          try {
            const contentLength = response.headers()['content-length'];
            const size = contentLength ? parseInt(contentLength) : 0;
            if (size > 0) {
              networkRequests.push({ url, size });
              console.log(`   📥 Downloaded: ${url.split('/').pop()} (${TestUtils.formatBytes(size)})`);
            }
          } catch (error) {
            console.log(`   ❌ Failed to get size for: ${url}`);
          }
        }
      });

      try {
        // Click analyze button
        await page.click('#analyze-btn');

        // Wait for download confirmation modal if it appears
        const confirmModal = page.locator('.download-modal');
        if (await confirmModal.isVisible({ timeout: 2000 })) {
          console.log(`   📋 Download confirmation appeared`);
          await page.click('.download-modal .btn-primary'); // Confirm download
        }

        // Wait for analysis to complete (look for completion indicators)
        await TestUtils.waitForAnalysisComplete(page, 120000);

        console.log(`   ✅ Analysis completed`);

        // Give cache time to write
        await page.waitForTimeout(3000);

        // Check actual cache contents
        const cacheData = await TestUtils.getCacheContents(page, model.huggingFaceId);

        const formattedFiles = cacheData.files.map(file => ({
          ...file,
          sizeFormatted: TestUtils.formatBytes(file.size)
        }));

        const result: ModelSizeResult = {
          modelId: model.id,
          displayName: model.displayName,
          huggingFaceId: model.huggingFaceId,
          files: formattedFiles,
          totalSize: cacheData.totalSize,
          totalSizeFormatted: TestUtils.formatBytes(cacheData.totalSize)
        };

        results.push(result);

        // Log detailed results for this model
        console.log(`   📊 Cache contains ${cacheData.files.length} files:`);
        for (const file of formattedFiles) {
          const filename = file.url.split('/').pop();
          console.log(`      📁 ${filename} - ${file.sizeFormatted}`);
        }
        console.log(`   🎯 Total size: ${result.totalSizeFormatted}`);

      } catch (error) {
        console.log(`   ❌ Failed to test ${model.displayName}: ${error}`);
        results.push({
          modelId: model.id,
          displayName: model.displayName,
          huggingFaceId: model.huggingFaceId,
          files: [],
          totalSize: 0,
          totalSizeFormatted: 'FAILED'
        });
      }

      // Small delay between models
      await page.waitForTimeout(1000);
    }

    // Generate comprehensive report
    console.log('\n📋 COMPREHENSIVE MODEL SIZE REPORT');
    console.log('='.repeat(80));

    // Summary table
    console.log('\n📊 SUMMARY TABLE:');
    console.log('Model Name'.padEnd(30) + 'HuggingFace ID'.padEnd(40) + 'Size'.padEnd(15) + 'Files');
    console.log('-'.repeat(95));

    let totalSizeAllModels = 0;
    let totalDownloadableModels = 0;

    for (const result of results) {
      if (!result.displayName.includes('AFINN') && !result.displayName.includes('VADER')) {
        totalSizeAllModels += result.totalSize;
        totalDownloadableModels++;
      }

      const name = result.displayName.length > 28 ? result.displayName.substring(0, 25) + '...' : result.displayName;
      const hfId = result.huggingFaceId.length > 38 ? result.huggingFaceId.substring(0, 35) + '...' : result.huggingFaceId;

      console.log(
        name.padEnd(30) +
        hfId.padEnd(40) +
        result.totalSizeFormatted.padEnd(15) +
        result.files.length.toString()
      );
    }

    console.log('-'.repeat(95));
    console.log(`TOTAL (${totalDownloadableModels} models):`.padEnd(70) + TestUtils.formatBytes(totalSizeAllModels).padEnd(15) + `${results.reduce((sum, r) => sum + r.files.length, 0)} files`);

    // Detailed breakdown
    console.log('\n🔍 DETAILED BREAKDOWN:');

    for (const result of results) {
      if (result.totalSize === 0 && !result.totalSizeFormatted.includes('rule-based')) continue;

      console.log(`\n${result.displayName} (${result.huggingFaceId}):`);
      console.log(`  📦 Total Size: ${result.totalSizeFormatted}`);
      console.log(`  📁 Files: ${result.files.length}`);

      if (result.files.length > 0) {
        for (const file of result.files) {
          const filename = file.url.split('/').pop() || 'unknown';
          console.log(`    • ${filename}: ${file.sizeFormatted}`);
        }
      }
    }

    // Size categories
    console.log('\n📈 SIZE CATEGORIES:');
    const small = results.filter(r => r.totalSize > 0 && r.totalSize < 100 * 1024 * 1024); // < 100MB
    const medium = results.filter(r => r.totalSize >= 100 * 1024 * 1024 && r.totalSize < 400 * 1024 * 1024); // 100MB - 400MB
    const large = results.filter(r => r.totalSize >= 400 * 1024 * 1024); // > 400MB

    console.log(`Small (< 100MB): ${small.length} models - ${small.map(r => r.displayName).join(', ')}`);
    console.log(`Medium (100-400MB): ${medium.length} models - ${medium.map(r => r.displayName).join(', ')}`);
    console.log(`Large (> 400MB): ${large.length} models - ${large.map(r => r.displayName).join(', ')}`);

    console.log('\n🎯 TEST COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));

    // Verify we got data for most models
    const successfulTests = results.filter(r => r.totalSize > 0 || r.totalSizeFormatted.includes('rule-based'));
    expect(successfulTests.length).toBeGreaterThanOrEqual(MODELS_TO_TEST.length * 0.8); // At least 80% success rate
  });

  test('Verify cache stats display updates', async ({ page }) => {
    console.log('\n🧪 Testing cache stats display reactivity');

    // Select a model and run analysis
    await page.check('#use-distilbert');
    await page.click('#analyze-btn');

    // Handle download confirmation if it appears
    const confirmModal = page.locator('.download-modal');
    if (await confirmModal.isVisible({ timeout: 2000 })) {
      await page.click('.download-modal .btn-primary');
    }

    // Wait for analysis to complete
    await TestUtils.waitForAnalysisComplete(page, 120000);

    // Wait for cache stats to update
    await page.waitForTimeout(5000);

    // Check that cache stats show non-zero size
    const cacheStatsText = await page.textContent('.cache-size');
    console.log(`   📊 Cache stats display: ${cacheStatsText}`);

    expect(cacheStatsText).not.toContain('0.0 MB');
    expect(cacheStatsText).toContain('MB used');

    // Test clear cache functionality
    await page.click('#clear-cache');

    // Wait for clear to complete
    await page.waitForTimeout(3000);

    // Verify cache stats reset to zero
    const clearedCacheStatsText = await page.textContent('.cache-size');
    console.log(`   🧹 After clear cache: ${clearedCacheStatsText}`);

    expect(clearedCacheStatsText).toContain('0.0 MB used');

    console.log('   ✅ Cache stats display reactivity test passed!');
  });
});