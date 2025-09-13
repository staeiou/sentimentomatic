import puppeteer from 'puppeteer';

const MODELS_TO_TEST = [
  { 
    id: '#use-distilbert', 
    name: 'DistilBERT', 
    huggingFaceId: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english' 
  },
  { 
    id: '#use-twitter-roberta', 
    name: 'Twitter RoBERTa', 
    huggingFaceId: 'Xenova/twitter-roberta-base-sentiment-latest' 
  },
  { 
    id: '#use-financial', 
    name: 'Financial DistilRoBERTa', 
    huggingFaceId: 'Xenova/distilroberta-finetuned-financial-news-sentiment-analysis' 
  },
  { 
    id: '#use-multilingual', 
    name: 'Multilingual BERT', 
    huggingFaceId: 'Xenova/bert-base-multilingual-uncased-sentiment' 
  }
];

class ModelVerifier {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async setup() {
    console.log('🔍 Verifying all HuggingFace models work...');
    
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();
    
    this.page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('❌') || text.includes('error') || text.includes('404')) {
        console.log(`⚠️  ${text}`);
      }
    });

    await this.page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  }

  async testModel(model) {
    console.log(`\n🧪 Testing ${model.name}...`);
    
    try {
      // Disable all other models
      await this.page.click('#use-afinn');
      await this.page.click('#use-vader');
      
      for (const otherModel of MODELS_TO_TEST) {
        if (otherModel.id !== model.id) {
          const isChecked = await this.page.$eval(otherModel.id, el => el.checked);
          if (isChecked) await this.page.click(otherModel.id);
        }
      }
      
      // Enable only this model
      const isChecked = await this.page.$eval(model.id, el => el.checked);
      if (!isChecked) await this.page.click(model.id);
      
      // Add test text
      await this.page.click('#text-input');
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.type('#text-input', 'This is a great test message!');
      
      // Run analysis
      await this.page.click('#analyze-btn');
      
      // Wait for results with timeout
      await this.page.waitForSelector('.results-table', { timeout: 180000 });
      
      // Check if results contain this model
      const resultsText = await this.page.$eval('#results-table', el => el.textContent);
      
      if (resultsText.includes(model.name.split(' ')[0])) {
        console.log(`✅ ${model.name} working correctly`);
        return true;
      } else {
        console.log(`❌ ${model.name} failed - no results found`);
        console.log(`Results: ${resultsText.substring(0, 200)}...`);
        return false;
      }
      
    } catch (error) {
      console.log(`❌ ${model.name} failed with error: ${error.message}`);
      return false;
    }
  }

  async cleanup() {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
  }
}

async function main() {
  const verifier = new ModelVerifier();
  
  try {
    await verifier.setup();
    
    const results = {};
    
    for (const model of MODELS_TO_TEST) {
      results[model.name] = await verifier.testModel(model);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n📊 MODEL VERIFICATION RESULTS:');
    console.log('=====================================');
    
    const working = [];
    const broken = [];
    
    for (const [modelName, success] of Object.entries(results)) {
      const status = success ? '✅ WORKING' : '❌ BROKEN';
      console.log(`${modelName.padEnd(20)} ${status}`);
      
      if (success) {
        working.push(modelName);
      } else {
        broken.push(modelName);
      }
    }
    
    console.log('=====================================');
    console.log(`✅ Working: ${working.length}/${MODELS_TO_TEST.length}`);
    
    if (broken.length > 0) {
      console.log(`❌ Broken: ${broken.join(', ')}`);
      process.exit(1);
    } else {
      console.log('🎉 All models verified working!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('💥 Verification failed:', error.message);
    process.exit(1);
  } finally {
    await verifier.cleanup();
  }
}

main().catch(console.error);