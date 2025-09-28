import { test, expect } from '@playwright/test';

test('Get actual size of one model', async ({ page }) => {
  console.log('\n🚀 TESTING ONE MODEL FOR SIZE DATA');

  // Go to the app
  console.log('🔄 Navigating to app...');
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('✅ Page loaded');

  // Take screenshot for debugging
  await page.screenshot({ path: 'debug-screenshot.png' });
  console.log('📸 Screenshot saved');

  // Wait for app to load - check for analyze button instead of title
  console.log('⏳ Waiting for analyze button...');
  await page.waitForSelector('#analyze-btn', { timeout: 10000 });
  console.log('✅ Analyze button found');

  // Clear all selections and select just DistilBERT
  console.log('🔄 Clearing model selections...');
  await page.locator('#clear-models-btn').click({ force: true, timeout: 5000 });
  console.log('✅ Cleared selections');
  await page.waitForTimeout(500);
  console.log('🔄 Selecting DistilBERT...');
  await page.check('#use-distilbert');
  console.log('✅ DistilBERT selected');

  // Monitor network requests
  const downloads: Array<{url: string, size: number}> = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('huggingface.co') && url.includes('distilbert')) {
      const contentLength = response.headers()['content-length'];
      const size = contentLength ? parseInt(contentLength) : 0;
      if (size > 0) {
        downloads.push({ url, size });
        const filename = url.split('/').pop();
        const sizeKB = (size / 1024).toFixed(1);
        console.log(`📥 Downloaded: ${filename} (${sizeKB} KB)`);
      }
    }
  });

  // Run analysis - force click if element is not stable
  await page.waitForTimeout(2000); // Let page fully stabilize
  await page.locator('#analyze-btn').click({ force: true });

  // Handle download confirmation if it appears
  const confirmModal = page.locator('.download-modal');
  if (await confirmModal.isVisible({ timeout: 3000 })) {
    console.log('📋 Download confirmation appeared');
    await page.click('.download-modal .btn-primary');
  }

  // Wait for completion
  await page.waitForFunction(
    () => {
      const status = document.querySelector('#progress-status');
      return status && status.textContent?.includes('complete');
    },
    { timeout: 180000 }
  );

  console.log('✅ Analysis completed');

  // Wait for cache to write
  await page.waitForTimeout(5000);

  // Get actual cache data
  const cacheData = await page.evaluate(async () => {
    if (!('caches' in window)) return { files: [], totalSize: 0 };

    const cache = await caches.open('transformers-cache');
    const requests = await cache.keys();

    const files = [];
    let totalSize = 0;

    for (const request of requests) {
      if (request.url.includes('distilbert')) {
        const response = await cache.match(request);
        if (response) {
          let size = 0;
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            size = parseInt(contentLength);
          } else {
            const blob = await response.blob();
            size = blob.size;
          }
          files.push({ url: request.url, size });
          totalSize += size;
        }
      }
    }

    return { files, totalSize };
  });

  // Report results
  console.log(`\n📊 DISTILBERT CACHE RESULTS:`);
  console.log(`Files in cache: ${cacheData.files.length}`);
  for (const file of cacheData.files) {
    const filename = file.url.split('/').pop();
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    console.log(`  📁 ${filename}: ${sizeMB} MB`);
  }
  const totalMB = (cacheData.totalSize / 1024 / 1024).toFixed(1);
  console.log(`🎯 TOTAL SIZE: ${totalMB} MB`);

  // Network vs Cache comparison
  const networkTotal = downloads.reduce((sum, d) => sum + d.size, 0);
  const networkMB = (networkTotal / 1024 / 1024).toFixed(1);
  console.log(`🌐 Network downloads: ${networkMB} MB`);
  console.log(`💾 Cache storage: ${totalMB} MB`);

  expect(cacheData.totalSize).toBeGreaterThan(0);
});