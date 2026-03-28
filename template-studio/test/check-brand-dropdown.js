import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:4174/', { waitUntil: 'networkidle0' });
  
  // Wait a bit more
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check if brand dropdown has options
  const brandOptions = await page.evaluate(() => {
    const select = document.getElementById('brandSelect');
    return select ? select.options.length : 0;
  });
  
  console.log(`Brand dropdown has ${brandOptions} options`);
  
  // Try to manually trigger init
  await page.evaluate(() => {
    if (window.TemplateStudio && window.TemplateStudio.init) {
      console.log('Calling init manually');
      window.TemplateStudio.init();
    }
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check again
  const brandOptionsAfter = await page.evaluate(() => {
    const select = document.getElementById('brandSelect');
    return select ? select.options.length : 0;
  });
  
  console.log(`Brand dropdown has ${brandOptionsAfter} options after manual init`);
  
  await browser.close();
})();
