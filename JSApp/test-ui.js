import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture all logs
  page.on('console', msg => console.log(`CONSOLE [${msg.type()}]:`, msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:3002');
  await page.waitForTimeout(3000);

  console.log('\n=== UI ELEMENT CHECK ===');
  console.log('App container:', await page.locator('.app-container').count() > 0);
  console.log('Neon sign:', await page.locator('.neon-sign').count() > 0);
  console.log('Title text:', await page.locator('.title-main').textContent());
  console.log('Instructions card:', await page.locator('.instructions-card').count() > 0);
  console.log('Privacy banner:', await page.locator('.privacy-banner').count() > 0);
  console.log('Text input exists:', await page.locator('#text-input').count() > 0);
  console.log('Models grid:', await page.locator('.models-grid').count() > 0);
  console.log('Analyze button exists:', await page.locator('#analyze-btn').count() > 0);

  console.log('\n=== MODAL TESTS ===');

  // Test Sample Datasets modal
  try {
    console.log('Testing Sample Datasets modal...');
    await page.click('#sample-datasets-btn');
    await page.waitForTimeout(1000);
    const modalVisible = await page.locator('#sample-datasets-modal').isVisible();
    console.log('Sample Datasets modal visible:', modalVisible);
    if (modalVisible) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  } catch (e) {
    console.log('Sample Datasets modal ERROR:', e.message);
  }

  // Test Template Generator modal
  try {
    console.log('Testing Template Generator modal...');
    await page.click('#template-generator-btn');
    await page.waitForTimeout(1000);
    const modalVisible = await page.locator('.template-generator-overlay').isVisible();
    console.log('Template Generator modal visible:', modalVisible);
    if (modalVisible) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  } catch (e) {
    console.log('Template Generator modal ERROR:', e.message);
  }

  // Test File Import modal
  try {
    console.log('Testing File Import modal...');
    await page.click('#import-file-btn');
    await page.waitForTimeout(1000);
    const modalVisible = await page.locator('#file-upload-modal').isVisible();
    console.log('File Import modal visible:', modalVisible);
    if (modalVisible) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  } catch (e) {
    console.log('File Import modal ERROR:', e.message);
  }

  console.log('\n=== ANALYSIS TEST ===');
  try {
    // Check if analyze works
    await page.fill('#text-input .cm-editor .cm-line', 'This is a test');
    await page.click('#analyze-btn');
    console.log('Analysis started...');
    await page.waitForTimeout(5000);

    const resultsVisible = await page.locator('#results-section').isVisible();
    console.log('Results section visible:', resultsVisible);
  } catch (e) {
    console.log('Analysis ERROR:', e.message);
  }

  await page.screenshot({ path: 'ui-test.png', fullPage: true });
  console.log('\nScreenshot saved as ui-test.png');

  await browser.close();
})();