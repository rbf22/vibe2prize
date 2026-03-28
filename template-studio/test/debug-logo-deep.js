import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  
  await page.goto('http://localhost:4174/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#brandSelect', { timeout: 5000 });
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Select Accenture and wait
  await page.select('#brandSelect', 'accenture');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Debug the logo element and snapshot
  const debug = await page.evaluate(() => {
    const logo = document.getElementById('brandLogo');
    const brandSelect = document.getElementById('brandSelect');
    
    // Get snapshot directly
    let snapshot = null;
    try {
      if (window.TemplateStudio && window.TemplateStudio.getBrandSnapshot) {
        snapshot = window.TemplateStudio.getBrandSnapshot(brandSelect.value, 'dark');
      }
    } catch (e) {
      console.error('Snapshot error:', e.message);
    }
    
    return {
      logoSrc: logo ? logo.src : 'NO LOGO ELEMENT',
      logoHidden: logo ? logo.hidden : 'NO LOGO',
      snapshotAssets: snapshot ? snapshot.assets : 'NO SNAPSHOT',
      snapshotLogo: snapshot && snapshot.assets ? snapshot.assets.logo : 'NO LOGO IN SNAPSHOT',
      selectedBrand: brandSelect ? brandSelect.value : 'NO SELECT'
    };
  });
  
  console.log('Debug info:', JSON.stringify(debug, null, 2));
  
  await browser.close();
})();
