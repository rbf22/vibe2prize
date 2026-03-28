import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  
  try {
    await page.goto('http://localhost:4174/', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#brandSelect', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check logo src
    const logoInfo = await page.evaluate(() => {
      const logo = document.getElementById('brandLogo');
      return {
        exists: !!logo,
        src: logo ? logo.src : null,
        hidden: logo ? logo.hidden : null,
        hasAttribute: logo ? logo.hasAttribute('src') : null
      };
    });
    
    console.log('Logo info:', logoInfo);
    
    // Change brand to trigger update
    await page.select('#brandSelect', 'accenture');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check logo again
    const logoInfoAfter = await page.evaluate(() => {
      const logo = document.getElementById('brandLogo');
      return {
        exists: !!logo,
        src: logo ? logo.src : null,
        hidden: logo ? logo.hidden : null
      };
    });
    
    console.log('Logo info after brand change:', logoInfoAfter);
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
})();
