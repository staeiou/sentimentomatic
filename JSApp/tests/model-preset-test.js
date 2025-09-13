import puppeteer from 'puppeteer';

class ModelPresetTester {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async setup() {
    console.log('🚀 Starting model preset tests...');
    
    // Check if server is running
    try {
      const response = await fetch('http://localhost:3000');
      if (!response.ok) throw new Error('Server not responding');
    } catch (error) {
      throw new Error('Server not running on port 3000. Start with: npm run dev');
    }

    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();
    
    // Enhanced console logging
    this.page.on('console', async (msg) => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        console.log(`❌ Console Error: ${text}`);
      } else if (type === 'warn') {
        console.log(`⚠️  Console Warning: ${text}`);
      } else if (text.includes('🤖') || text.includes('📥') || text.includes('✅') || text.includes('❌')) {
        console.log(`📝 ${text}`);
      }
    });

    await this.page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  }

  async testPreset(presetId, presetName) {
    console.log(`\n🧪 Testing ${presetName} preset (${presetId})...`);
    
    try {
      // Select the preset
      await this.page.select('#preset-selector', presetId);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Give time for preset to apply
      
      // Clear and set test text
      await this.page.click('#text-input');
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.type('#text-input', 'This model test is working great!');
      
      // Enable only Transformers.js
      const afinnChecked = await this.page.$eval('#use-afinn', el => el.checked);
      const vaderChecked = await this.page.$eval('#use-vader', el => el.checked);
      const transformersChecked = await this.page.$eval('#use-transformers', el => el.checked);
      
      if (afinnChecked) await this.page.click('#use-afinn');
      if (vaderChecked) await this.page.click('#use-vader');
      if (!transformersChecked) await this.page.click('#use-transformers');
      
      // Start analysis
      console.log(`⏳ Starting analysis with ${presetName}...`);
      await this.page.click('#analyze-btn');
      
      // Wait for results with extended timeout for model download
      const startTime = Date.now();
      try {
        await this.page.waitForSelector('.results-table', { timeout: 180000 }); // 3 minutes
        
        // Check if results actually contain Transformers data
        const resultsText = await this.page.$eval('#results-table', el => el.textContent);
        const processingTime = Date.now() - startTime;
        
        if (resultsText.includes('Transformers.js') && !resultsText.includes('skipping')) {
          console.log(`✅ ${presetName} SUCCESS - Model loaded and analyzed in ${Math.round(processingTime/1000)}s`);
          
          // Log model metadata if available
          if (resultsText.includes('metadata')) {
            console.log(`📊 Results found for ${presetName}`);
          }
          
          return true;
        } else {
          console.log(`❌ ${presetName} FAILED - Results table found but no Transformers.js analysis`);
          console.log(`Results content: ${resultsText.substring(0, 200)}...`);
          return false;
        }
        
      } catch (timeoutError) {
        console.log(`❌ ${presetName} TIMEOUT - Model failed to load within 3 minutes`);
        return false;
      }
      
    } catch (error) {
      console.log(`❌ ${presetName} ERROR: ${error.message}`);
      return false;
    }
  }

  async runAllTests() {
    const presets = [
      { id: 'fast', name: 'Fast & Light (DistilBERT)' },
      { id: 'balanced', name: 'Balanced (RoBERTa)' },
      { id: 'accurate', name: 'High Accuracy (Multilingual BERT)' }
    ];

    const results = {};
    
    for (const preset of presets) {
      results[preset.id] = await this.testPreset(preset.id, preset.name);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    return results;
  }

  async cleanup() {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
  }

  async generateReport(results) {
    console.log('\n📊 MODEL PRESET TEST RESULTS:');
    console.log('=====================================');
    
    const working = [];
    const broken = [];
    
    for (const [presetId, success] of Object.entries(results)) {
      const status = success ? '✅ WORKING' : '❌ BROKEN';
      console.log(`${presetId.toUpperCase().padEnd(12)} ${status}`);
      
      if (success) {
        working.push(presetId);
      } else {
        broken.push(presetId);
      }
    }
    
    console.log('=====================================');
    console.log(`✅ Working models: ${working.length}/${Object.keys(results).length}`);
    
    if (broken.length > 0) {
      console.log(`❌ Broken models: ${broken.join(', ')}`);
      console.log('\n⚠️  RECOMMENDATION: Remove broken models from registry or find working alternatives');
    } else {
      console.log('🎉 All model presets are working!');
    }
  }
}

// Run the tests
async function main() {
  const tester = new ModelPresetTester();
  
  try {
    await tester.setup();
    const results = await tester.runAllTests();
    await tester.generateReport(results);
    
    // Exit with error code if any models failed
    const allWorking = Object.values(results).every(result => result === true);
    process.exit(allWorking ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Test setup failed:', error.message);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

main().catch(console.error);