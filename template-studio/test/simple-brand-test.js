import puppeteer from 'puppeteer';

(async () => {
  console.log('Testing brand dropdown without headless...');
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  const errors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  
  try {
    await page.goto('http://localhost:4174/', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const brandOptions = await page.evaluate(() => {
      const select = document.getElementById('brandSelect');
      return select ? select.options.length : 0;
    });
    
    console.log(`Brand dropdown has ${brandOptions} options`);
    
    if (errors.length > 0) {
      console.log('\nStill have errors:');
      errors.slice(0, 3).forEach(e => console.log(' -', e));
    }
    
    if (brandOptions > 0 && errors.filter(e => e.includes('Brand')).length === 0) {
      console.log('\n✅ Brand dropdown works without brand errors!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
})();
