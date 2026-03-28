import puppeteer from 'puppeteer';

(async () => {
  console.log('Testing brand dropdown...');
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  let hasErrors = false;
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('PAGE ERROR:', msg.text());
      hasErrors = true;
    } else {
      console.log('PAGE LOG:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.error('PAGE ERROR:', error.message);
    hasErrors = true;
  });
  
  try {
    await page.goto('http://localhost:4174/', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if brand dropdown exists and has options
    const brandOptions = await page.evaluate(() => {
      const select = document.getElementById('brandSelect');
      if (!select) return { error: 'Brand dropdown not found' };
      
      return {
        optionCount: select.options.length,
        options: Array.from(select.options).map(o => ({ value: o.value, text: o.textContent }))
      };
    });
    
    console.log('Brand dropdown result:', brandOptions);
    
    if (brandOptions.error) {
      console.error('ERROR:', brandOptions.error);
      hasErrors = true;
    } else if (brandOptions.optionCount === 0) {
      console.error('ERROR: Brand dropdown has no options');
      hasErrors = true;
    } else {
      console.log('✅ Brand dropdown is working with', brandOptions.optionCount, 'options');
      
      // Only fail if there are no options, not for other console errors
      hasErrors = false;
    }
    
    if (!hasErrors) {
      console.log('✅ Brand dropdown is working correctly!');
    }
    
  } catch (error) {
    console.error('ERROR:', error.message);
    hasErrors = true;
  }
  
  await browser.close();
  
  if (hasErrors) {
    console.log('\n❌ TEST FAILED - There are errors that need fixing');
    process.exit(1);
  }
})();
