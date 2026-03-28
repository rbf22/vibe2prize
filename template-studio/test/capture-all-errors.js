import puppeteer from 'puppeteer';

(async () => {
  console.log('Testing for browser errors...');
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  const errors = [];
  const resourceErrors = [];
  
  // Capture ALL errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.error('CONSOLE ERROR:', msg.text());
    } else if (msg.type() === 'warning') {
      console.warn('CONSOLE WARNING:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error('PAGE ERROR:', error.message);
  });
  
  page.on('requestfailed', request => {
    const failure = request.failure();
    if (failure && failure.errorText !== 'net::ERR_ABORTED') {
      resourceErrors.push(`${request.url()} - ${failure.errorText}`);
      console.error('RESOURCE ERROR:', request.url(), '-', failure.errorText);
    }
  });
  
  try {
    await page.goto('http://localhost:4174/', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check brand dropdown
    const brandOptions = await page.evaluate(() => {
      const select = document.getElementById('brandSelect');
      return select ? select.options.length : 0;
    });
    
    console.log(`\nBrand dropdown has ${brandOptions} options`);
    
    // Report results
    console.log('\n=== ERROR SUMMARY ===');
    if (errors.length > 0) {
      console.log(`❌ ${errors.length} JavaScript/console errors:`);
      errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
    }
    
    if (resourceErrors.length > 0) {
      console.log(`\n❌ ${resourceErrors.length} Resource errors:`);
      resourceErrors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
    }
    
    if (errors.length === 0 && resourceErrors.length === 0 && brandOptions > 0) {
      console.log('\n✅ SUCCESS: No errors and brand dropdown works!');
    } else {
      console.log('\n❌ FAILURE: There are errors that need fixing');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('FATAL ERROR:', error.message);
    process.exit(1);
  }
  
  await browser.close();
})();
