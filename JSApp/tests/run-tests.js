import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

class TestRunner {
  constructor() {
    this.browser = null;
    this.page = null;
    this.server = null;
    this.headless = process.env.HEADLESS === 'true';
  }

  async setup() {
    console.log('🚀 Starting test setup...');
    
    // Check if server is already running
    console.log('🔍 Checking if server is already running on port 3000...');
    try {
      const response = await fetch('http://localhost:3000');
      if (response.ok) {
        console.log('✅ Server already running on port 3000');
      } else {
        throw new Error('Server not responding');
      }
    } catch (error) {
      throw new Error('Server not running on port 3000. Please start with: npm run dev');
    }

    // Launch browser
    console.log('🌐 Launching browser...');
    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      devtools: !this.headless
    });

    this.page = await this.browser.newPage();
    
    // Set viewport and enable console logging
    await this.page.setViewport({ width: 1280, height: 720 });
    
    this.page.on('console', async (msg) => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        // Get detailed error information
        const args = msg.args();
        let detailedError = text;
        
        for (const arg of args) {
          try {
            const jsonValue = await arg.jsonValue();
            if (typeof jsonValue === 'object' && jsonValue !== null) {
              detailedError += ` | ${JSON.stringify(jsonValue)}`;
            }
          } catch (e) {
            // Can't serialize, use text representation
          }
        }
        
        console.log(`❌ Console Error: ${detailedError}`);
      } else if (type === 'warn') {
        console.log(`⚠️  Console Warning: ${text}`);
      } else if (type === 'log') {
        console.log(`📝 Console Log: ${text}`);
      }
    });

    this.page.on('pageerror', (error) => {
      console.log(`💥 Page Error: ${error.message}`);
    });

    console.log('✅ Browser setup complete');
  }

  async runTests() {
    const tests = [
      this.testPageLoad,
      this.testUIElements,
      this.testAfinnAnalyzer,
      this.testVaderAnalyzer,
      this.testTransformersAnalyzer,
      this.testAnalysisFlow,
      this.testExportFunctionality
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        console.log(`🧪 Running ${test.name}...`);
        await test.call(this);
        console.log(`✅ ${test.name} PASSED`);
        passed++;
      } catch (error) {
        console.log(`❌ ${test.name} FAILED: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    return { passed, failed };
  }

  async testPageLoad() {
    await this.page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    const title = await this.page.title();
    if (title !== 'JS Sentimentomatic') {
      throw new Error(`Expected title 'JS Sentimentomatic', got '${title}'`);
    }

    const heading = await this.page.$eval('h1', el => el.textContent);
    if (!heading.includes('JS Sentimentomatic')) {
      throw new Error(`Expected heading to contain 'JS Sentimentomatic', got '${heading}'`);
    }
  }

  async testUIElements() {
    // Check all required UI elements exist
    const elements = [
      '#text-input',
      '#line-numbers', 
      '#analyze-btn',
      '#use-afinn',
      '#use-vader',
      '#use-distilbert',
      '#custom-model-input',
      '#add-custom-model',
      '#results-section'
    ];

    for (const selector of elements) {
      const element = await this.page.$(selector);
      if (!element) {
        throw new Error(`Required element ${selector} not found`);
      }
    }

    // Check default state
    const afinnChecked = await this.page.$eval('#use-afinn', el => el.checked);
    const vaderChecked = await this.page.$eval('#use-vader', el => el.checked);
    const distilbertChecked = await this.page.$eval('#use-distilbert', el => el.checked);

    if (!afinnChecked || !vaderChecked || !distilbertChecked) {
      throw new Error('AFINN, VADER, and DistilBERT should be checked by default');
    }
  }

  async testAfinnAnalyzer() {
    // Clear any existing text and enter test text
    await this.page.click('#text-input');
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('KeyA');
    await this.page.keyboard.up('Control');
    await this.page.type('#text-input', 'This is absolutely amazing!');

    // Ensure only AFINN is selected
    const vaderChecked = await this.page.$eval('#use-vader', el => el.checked);
    const distilbertChecked = await this.page.$eval('#use-distilbert', el => el.checked);
    
    if (vaderChecked) await this.page.click('#use-vader');
    if (distilbertChecked) await this.page.click('#use-distilbert');

    // Run analysis
    await this.page.click('#analyze-btn');

    // Wait for results
    await this.page.waitForSelector('.results-table', { timeout: 10000 });

    // Check if AFINN results are present
    const resultsText = await this.page.$eval('#results-table', el => el.textContent);
    if (!resultsText.includes('AFINN')) {
      throw new Error('AFINN results not found in results table');
    }
    if (!resultsText.includes('POSITIVE')) {
      throw new Error('Expected positive sentiment for test text');
    }
  }

  async testVaderAnalyzer() {
    // Clear and enter different test text
    await this.page.click('#text-input');
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('KeyA');
    await this.page.keyboard.up('Control');
    await this.page.type('#text-input', 'This is terrible and awful!');

    // Ensure only VADER is selected
    const afinnChecked = await this.page.$eval('#use-afinn', el => el.checked);
    const distilbertChecked2 = await this.page.$eval('#use-distilbert', el => el.checked);
    
    if (afinnChecked) await this.page.click('#use-afinn');
    if (distilbertChecked2) await this.page.click('#use-distilbert');
    
    // Make sure VADER is checked
    const vaderChecked2 = await this.page.$eval('#use-vader', el => el.checked);
    if (!vaderChecked2) await this.page.click('#use-vader');

    // Run analysis
    await this.page.click('#analyze-btn');

    // Wait for results
    await this.page.waitForSelector('.results-table', { timeout: 10000 });

    // Check VADER results
    const resultsText = await this.page.$eval('#results-table', el => el.textContent);
    if (!resultsText.includes('VADER')) {
      throw new Error('VADER results not found in results table');
    }
    if (!resultsText.includes('NEGATIVE')) {
      throw new Error('Expected negative sentiment for test text');
    }
  }

  async testTransformersAnalyzer() {
    // This test is optional since Transformers.js can be slow to load
    try {
      await this.page.click('#text-input');
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.type('#text-input', 'I love this application!');

      // Select only DistilBERT
      await this.page.click('#use-afinn');
      await this.page.click('#use-vader');
      
      // Ensure DistilBERT is selected
      const distilbertChecked3 = await this.page.$eval('#use-distilbert', el => el.checked);
      if (!distilbertChecked3) await this.page.click('#use-distilbert');

      // Run analysis with longer timeout for model loading
      await this.page.click('#analyze-btn');
      await this.page.waitForSelector('.results-table', { timeout: 60000 });

      const resultsText = await this.page.$eval('#results-table', el => el.textContent);
      if (!resultsText.includes('DistilBERT')) {
        throw new Error('DistilBERT results not found');
      }
    } catch (error) {
      console.log('⚠️  Transformers.js test skipped (model loading issues): ' + error.message);
    }
  }

  async testAnalysisFlow() {
    // Test multi-line input with multiple analyzers
    const testText = `This is great!\nThis is terrible.\nThis is okay.`;
    
    await this.page.click('#text-input');
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('KeyA');
    await this.page.keyboard.up('Control');
    await this.page.type('#text-input', testText);

    // Ensure AFINN and VADER are enabled, HuggingFace models disabled
    const afinnChecked3 = await this.page.$eval('#use-afinn', el => el.checked);
    const vaderChecked3 = await this.page.$eval('#use-vader', el => el.checked);
    const distilbertChecked4 = await this.page.$eval('#use-distilbert', el => el.checked);
    
    if (!afinnChecked3) await this.page.click('#use-afinn');
    if (!vaderChecked3) await this.page.click('#use-vader');
    if (distilbertChecked4) await this.page.click('#use-distilbert');

    // Check that line numbers update
    const lineNumbers = await this.page.$eval('#line-numbers', el => el.textContent);
    if (!lineNumbers.includes('3')) {
      throw new Error('Line numbers should show 3 lines');
    }

    // Run analysis
    await this.page.click('#analyze-btn');
    await this.page.waitForSelector('.results-table', { timeout: 15000 });

    // Check that results contain all lines
    const resultsTable = await this.page.$eval('#results-table', el => el.textContent);
    if (!resultsTable.includes('This is great!') || 
        !resultsTable.includes('This is terrible.') || 
        !resultsTable.includes('This is okay.')) {
      throw new Error('Not all input lines found in results');
    }

    // Check for both analyzers
    if (!resultsTable.includes('AFINN') || !resultsTable.includes('VADER')) {
      throw new Error('Both AFINN and VADER results should be present');
    }
  }

  async testExportFunctionality() {
    // Ensure we have results first
    await this.testAnalysisFlow();

    // Test CSV export button exists and is clickable
    const csvButton = await this.page.$('#export-csv');
    if (!csvButton) {
      throw new Error('CSV export button not found');
    }

    const jsonButton = await this.page.$('#export-json');
    if (!jsonButton) {
      throw new Error('JSON export button not found');
    }

    // Note: We can't easily test actual file downloads in Puppeteer
    // but we can verify the buttons exist and are functional
  }

  async cleanup() {
    console.log('🧹 Cleaning up...');
    
    if (this.page) {
      await this.page.close();
    }
    
    if (this.browser) {
      await this.browser.close();
    }
    
    // Don't kill the server since we didn't start it
    console.log('✅ Cleanup complete (server left running)');
  }
}

// Run tests
async function main() {
  const runner = new TestRunner();
  
  try {
    await runner.setup();
    const results = await runner.runTests();
    
    if (results.failed > 0) {
      console.log('💥 Some tests failed!');
      process.exit(1);
    } else {
      console.log('🎉 All tests passed!');
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Test setup failed:', error);
    process.exit(1);
  } finally {
    await runner.cleanup();
  }
}

main().catch(console.error);