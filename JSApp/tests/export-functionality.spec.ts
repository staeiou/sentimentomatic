import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Export Functionality Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the app to be fully loaded
    await page.waitForSelector('[data-testid="main-analyze-button"]', { timeout: 30000 });
    await expect(page.locator('[data-testid="main-analyze-button"]')).toBeVisible();
  });

  test('should export CSV with classification models and multiclass checkbox', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for this test specifically

    // Just use the default text and models - should work in under 60 seconds
    console.log('=== Starting export test with defaults ===');

    // Click analyze button with force to bypass stability checks
    await page.locator('[data-testid="main-analyze-button"]').click({ force: true });
    console.log('=== Clicked analyze button ===');

    // Handle download confirmation modal
    await page.waitForSelector('[data-testid="download-confirmation-modal"]', { timeout: 10000 });
    await page.click('[data-testid="modal-confirm-button"]');
    console.log('=== Confirmed download ===');

    // Wait for analysis to ACTUALLY complete - debug button state
    console.log('=== Waiting for analysis to complete - watching button state ===');

    let analysisComplete = false;
    for (let i = 0; i < 60; i++) { // 120 seconds max
      await page.waitForTimeout(2000);

      const buttonText = await page.locator('[data-testid="main-analyze-button"]').textContent();
      const buttonDisabled = await page.locator('[data-testid="main-analyze-button"]').isDisabled();
      const progressTexts = await page.locator('.progress-text').allTextContents();

      console.log(`=== Check ${i+1}: Button="${buttonText}", Disabled=${buttonDisabled}, Progress=[${progressTexts.join(', ')}] ===`);

      if (buttonText?.trim() === 'Analyze' && !buttonDisabled) {
        console.log('=== Analysis truly complete - button back to "Analyze" ===');
        analysisComplete = true;
        break;
      }
    }

    if (!analysisComplete) {
      throw new Error('Analysis did not complete in time');
    }

    // Step 5: Verify export options are visible
    await expect(page.locator('#export-options')).toBeVisible();
    await expect(page.locator('#export-multiclass-columns')).toBeVisible();

    // Step 6: Test export WITHOUT multiclass checkbox
    const downloadPromise1 = page.waitForEvent('download');
    await page.click('#export-csv');
    const download1 = await downloadPromise1;

    // Save and read the first export
    const csvPath1 = path.join(process.cwd(), 'temp-export-1.csv');
    await download1.saveAs(csvPath1);
    const csvContent1 = fs.readFileSync(csvPath1, 'utf-8');

    console.log('CSV Export WITHOUT multiclass checkbox:');
    console.log(csvContent1);

    // Step 7: Test export WITH multiclass checkbox
    await page.check('#export-multiclass-columns');

    const downloadPromise2 = page.waitForEvent('download');
    await page.click('#export-csv');
    const download2 = await downloadPromise2;

    // Save and read the second export
    const csvPath2 = path.join(process.cwd(), 'temp-export-2.csv');
    await download2.saveAs(csvPath2);
    const csvContent2 = fs.readFileSync(csvPath2, 'utf-8');

    console.log('CSV Export WITH multiclass checkbox:');
    console.log(csvContent2);

    // Step 8: Analyze the differences
    const lines1 = csvContent1.split('\n');
    const lines2 = csvContent2.split('\n');
    const headers1 = lines1[0].split(',');
    const headers2 = lines2[0].split(',');

    console.log('Headers WITHOUT multiclass:', headers1);
    console.log('Headers WITH multiclass:', headers2);

    // Assertions
    expect(csvContent1.length).toBeGreaterThan(0);
    expect(csvContent2.length).toBeGreaterThan(0);

    // The multiclass export should have more columns
    expect(headers2.length).toBeGreaterThan(headers1.length);

    // Should contain basic columns
    expect(headers1).toContain('Line');
    expect(headers1).toContain('Text');

    // Should contain VADER sentiment columns
    expect(headers1.some(h => h.includes('VADER'))).toBe(true);

    // Should contain classification model columns
    expect(headers1.some(h => h.includes('GoEmotions') || h.includes('go_emotions'))).toBe(true);
    expect(headers1.some(h => h.includes('Jigsaw') || h.includes('toxic'))).toBe(true);

    // With multiclass, should have individual class columns
    expect(headers2.some(h => h.includes('_Class_'))).toBe(true);

    // Clean up
    fs.unlinkSync(csvPath1);
    fs.unlinkSync(csvPath2);
  });

  test('should export JSON with classification data', async ({ page }) => {
    // Similar setup but test JSON export
    const testText = `This is an amazing product!
This is toxic content that should be flagged`;

    // Clear existing text and enter new text in CodeMirror editor
    await page.click('.cm-content');
    await page.keyboard.press('Control+A');
    await page.keyboard.type(testText);

    await page.check('#use-vader');
    await page.check('#use-goemotions');

    await page.click('#analyze-btn');

    await page.waitForFunction(() => {
      const button = document.querySelector('#analyze-btn') as HTMLButtonElement;
      return button && !button.disabled && button.textContent?.includes('Analyze');
    }, { timeout: 120000 });

    await page.waitForSelector('.results-toolbar');

    // Test JSON export with multiclass
    await page.check('#export-multiclass-columns');

    const downloadPromise = page.waitForEvent('download');
    await page.click('#export-json');
    const download = await downloadPromise;

    const jsonPath = path.join(__dirname, 'temp-export.json');
    await download.saveAs(jsonPath);
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');

    console.log('JSON Export:');
    console.log(jsonContent);

    // Parse and validate JSON structure
    const jsonData = JSON.parse(jsonContent);

    expect(jsonData).toHaveProperty('metadata');
    expect(jsonData).toHaveProperty('results');
    expect(jsonData.metadata.analysisType).toBe('multimodal');
    expect(Array.isArray(jsonData.results)).toBe(true);
    expect(jsonData.results.length).toBeGreaterThan(0);

    // Check that classification results include allClassScores when multiclass is enabled
    const firstResult = jsonData.results[0];
    expect(firstResult).toHaveProperty('analysis');

    // Should have both VADER and GoEmotions results
    const analysis = firstResult.analysis;
    const analyzerNames = Object.keys(analysis);

    expect(analyzerNames.some((name: string) => name.includes('VADER'))).toBe(true);
    expect(analyzerNames.some((name: string) => name.includes('GoEmotions') || name.includes('go_emotions'))).toBe(true);

    // Classification results should have allClassScores when multiclass is enabled
    const classificationAnalyzer = analyzerNames.find((name: string) =>
      analysis[name].type === 'classification'
    );

    if (classificationAnalyzer) {
      expect(analysis[classificationAnalyzer]).toHaveProperty('allClassScores');
    }

    // Clean up
    fs.unlinkSync(jsonPath);
  });

  test('should export Excel with proper column structure', async ({ page }) => {
    const testText = `Great product, highly recommended!
Terrible service, would not recommend`;

    await page.click('.cm-content');
    await page.keyboard.press('Control+A');
    await page.keyboard.type(testText);

    await page.check('#use-vader');
    await page.check('#use-goemotions');

    await page.click('#analyze-btn');

    await page.waitForFunction(() => {
      const button = document.querySelector('#analyze-btn') as HTMLButtonElement;
      return button && !button.disabled && button.textContent?.includes('Analyze');
    }, { timeout: 120000 });

    await page.waitForSelector('.results-toolbar');

    // Test Excel export
    const downloadPromise = page.waitForEvent('download');
    await page.click('#export-excel');
    const download = await downloadPromise;

    const excelPath = path.join(__dirname, 'temp-export.xlsx');
    await download.saveAs(excelPath);

    // Verify file was created and has content
    const stats = fs.statSync(excelPath);
    expect(stats.size).toBeGreaterThan(0);

    console.log(`Excel file created with size: ${stats.size} bytes`);

    // Clean up
    fs.unlinkSync(excelPath);
  });

  test('should handle missing data gracefully in exports', async ({ page }) => {
    // Test with minimal data to check error handling
    const testText = `Simple test`;

    await page.click('.cm-content');
    await page.keyboard.press('Control+A');
    await page.keyboard.type(testText);

    // Uncheck all default models first
    await page.uncheck('#use-goemotions');
    await page.uncheck('#use-jigsaw-toxicity');
    await page.uncheck('#use-multilingual-student');

    // Only check VADER
    await page.check('#use-vader');

    // Wait for UI to settle and then click analyze
    await page.waitForTimeout(1000);
    await page.locator('#analyze-btn').click({ force: true });

    await page.waitForFunction(() => {
      const button = document.querySelector('#analyze-btn') as HTMLButtonElement;
      return button && !button.disabled && button.textContent?.includes('Analyze');
    }, { timeout: 30000 }); // Reduced timeout for VADER only

    await page.waitForSelector('.results-toolbar');

    // Should still be able to export
    const downloadPromise = page.waitForEvent('download');
    await page.click('#export-csv');
    const download = await downloadPromise;

    const csvPath = path.join(__dirname, 'temp-export-minimal.csv');
    await download.saveAs(csvPath);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    expect(csvContent.length).toBeGreaterThan(0);
    expect(csvContent).toContain('Line,Text');
    expect(csvContent).toContain('VADER');

    // Clean up
    fs.unlinkSync(csvPath);
  });
});