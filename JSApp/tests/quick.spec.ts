import { test } from '@playwright/test';

test('Quick model size test', async ({ page }) => {
  // Just navigate and immediately check cache
  await page.goto('http://localhost:3000');

  // Wait for page to be ready
  await page.waitForTimeout(2000);

  // Select DistilBERT
  const checkboxResult = await page.evaluate(() => {
    const checkbox = document.querySelector('#use-distilbert') as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = true;
      return `✅ Checkbox found and checked: ${checkbox.checked}`;
    }
    return '❌ Checkbox NOT FOUND';
  });
  console.log(checkboxResult);

  // Type text into CodeMirror using Playwright
  await page.click('.cm-content');
  await page.type('.cm-content', 'I love this product');
  await page.keyboard.press('Enter');
  await page.type('.cm-content', 'I hate this service');
  await page.keyboard.press('Enter');
  await page.type('.cm-content', 'This is okay');

  const editorContent = await page.evaluate(() => {
    const cmContent = document.querySelector('.cm-content') as HTMLElement;
    return cmContent ? cmContent.innerText : 'NO CONTENT';
  });
  console.log(`✅ Text in editor: "${editorContent}"`);


  // Click analyze
  const analyzeResult = await page.evaluate(() => {
    const btn = document.querySelector('#analyze-btn') as HTMLButtonElement;
    if (btn) {
      btn.click();
      return `✅ Analyze button clicked, disabled: ${btn.disabled}`;
    }
    return '❌ Analyze button NOT FOUND';
  });
  console.log(analyzeResult);

  // Wait for download modal and confirm
  await page.waitForTimeout(1000);
  const modalResult = await page.evaluate(() => {
    const modal = document.querySelector('.download-modal');
    const confirmBtn = document.querySelector('.download-modal .btn-primary') as HTMLButtonElement;
    if (modal) {
      if (confirmBtn) {
        confirmBtn.click();
        return '✅ Download modal found and confirmed';
      }
      return '⚠️ Modal found but no confirm button';
    }
    return '❌ No download modal found';
  });
  console.log(modalResult);

  console.log('🔄 Waiting for model download...');

  // Monitor actual downloads
  let downloadCount = 0;
  let totalBytes = 0;
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('huggingface.co')) {
      const size = parseInt(response.headers()['content-length'] || '0');
      if (size > 0) {
        downloadCount++;
        totalBytes += size;
        console.log(`📥 Downloaded: ${url.split('/').pop()} - ${(size/1024/1024).toFixed(2)} MB`);
      }
    }
  });

  // Check progress status periodically
  let lastStatus = '';
  for (let i = 0; i < 60; i++) {
    const statusInfo = await page.evaluate(() => {
      const status = document.querySelector('#progress-status');
      const progressBar = document.querySelector('#progress-bar');
      return {
        exists: !!status,
        text: status?.textContent || 'NO STATUS ELEMENT',
        progressExists: !!progressBar
      };
    });

    if (statusInfo.text !== lastStatus) {
      console.log(`📊 Status: ${statusInfo.text}`);
      lastStatus = statusInfo.text;
    }

    if (statusInfo.text.includes('complete')) {
      console.log('✅ Analysis completed!');
      break;
    }

    await page.waitForTimeout(1000);
  }

  console.log(`\n📊 RESULTS:`);
  console.log(`Files downloaded: ${downloadCount}`);
  console.log(`Total size: ${(totalBytes/1024/1024).toFixed(2)} MB`);

  // Check actual cache
  const cacheData = await page.evaluate(async () => {
    const cache = await caches.open('transformers-cache');
    const keys = await cache.keys();
    let totalSize = 0;
    for (const key of keys) {
      const response = await cache.match(key);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
    return { fileCount: keys.length, totalSize };
  });

  console.log(`\n💾 CACHE STATUS:`);
  console.log(`Files in cache: ${cacheData.fileCount}`);
  console.log(`Cache size: ${(cacheData.totalSize/1024/1024).toFixed(2)} MB`);
});