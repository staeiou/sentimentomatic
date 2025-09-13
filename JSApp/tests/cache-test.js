import puppeteer from 'puppeteer';

class CacheTestRunner {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async setup() {
    console.log('🚀 Starting cache management tests...');
    
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
    
    this.page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('🤖') || text.includes('📦') || text.includes('✅') || text.includes('🧹')) {
        console.log(`📝 ${text}`);
      }
    });

    await this.page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  }

  async testMultipleModels() {
    console.log('\n🧪 Testing multiple model selection...');
    
    // Enable multiple models
    await this.page.click('#use-distilbert'); // Already checked
    await this.page.click('#use-twitter-roberta');
    await this.page.click('#use-financial');
    
    // Add test text
    await this.page.click('#text-input');
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('KeyA');
    await this.page.keyboard.up('Control');
    await this.page.type('#text-input', 'This is an amazing financial opportunity!');
    
    // Run analysis
    await this.page.click('#analyze-btn');
    
    // Wait for all models to load and analyze
    await this.page.waitForSelector('.results-table', { timeout: 120000 });
    
    // Check results contain all models
    const resultsText = await this.page.$eval('#results-table', el => el.textContent);
    
    const expectedModels = ['DistilBERT', 'Twitter', 'Financial'];
    const foundModels = expectedModels.filter(model => resultsText.includes(model));
    
    console.log(`✅ Found results from ${foundModels.length}/${expectedModels.length} models: ${foundModels.join(', ')}`);
    
    if (foundModels.length < 2) {
      throw new Error(`Expected at least 2 models, found: ${foundModels.join(', ')}`);
    }
  }

  async testCacheStats() {
    console.log('\n🧪 Testing cache statistics...');
    
    // Check cache stats display
    const cacheText = await this.page.$eval('#cache-stats .cache-size', el => el.textContent);
    console.log(`📊 Cache status: ${cacheText}`);
    
    if (!cacheText.includes('MB') && !cacheText.includes('B')) {
      throw new Error('Cache stats should show size information');
    }
    
    // Test clear cache button exists
    const clearBtn = await this.page.$('#clear-cache');
    if (!clearBtn) {
      throw new Error('Clear cache button not found');
    }
  }

  async testModelSizes() {
    console.log('\n🧪 Testing model size display...');
    
    const models = [
      { id: '#use-distilbert', expectedSize: '250MB' },
      { id: '#use-twitter-roberta', expectedSize: '500MB' },
      { id: '#use-financial', expectedSize: '350MB' },
      { id: '#use-multilingual', expectedSize: '680MB' },
      { id: '#use-multilingual-student', expectedSize: '280MB' }
    ];
    
    for (const model of models) {
      const labelText = await this.page.$eval(`${model.id} + *`, el => el.textContent);
      if (!labelText.includes(model.expectedSize)) {
        throw new Error(`Model ${model.id} should show size ${model.expectedSize}, got: ${labelText}`);
      }
    }
    
    console.log('✅ All model sizes displayed correctly');
  }

  async cleanup() {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
  }
}

async function main() {
  const tester = new CacheTestRunner();
  
  try {
    await tester.setup();
    
    await tester.testModelSizes();
    await tester.testCacheStats();
    await tester.testMultipleModels();
    
    console.log('\n🎉 All cache management tests passed!');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Cache test failed:', error.message);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

main().catch(console.error);