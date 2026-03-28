import puppeteer from 'puppeteer';

(async () => {
  console.log('Testing logo display...');
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:4174/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#brandSelect', { timeout: 5000 });
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const brands = ['default', 'accenture', 'arc'];
  const results = [];
  
  for (const brand of brands) {
    await page.select('#brandSelect', brand);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const logoInfo = await page.evaluate(() => {
      const logo = document.getElementById('brandLogo');
      return {
        src: logo ? logo.src : null,
        hidden: logo ? logo.hidden : null,
        naturalWidth: logo ? logo.naturalWidth : 0,
        naturalHeight: logo ? logo.naturalHeight : 0,
        offsetWidth: logo ? logo.offsetWidth : 0,
        offsetHeight: logo ? logo.offsetHeight : 0
      };
    });
    
    results.push({ brand, ...logoInfo });
  }
  
  console.log('\n=== Logo Test Results ===');
  results.forEach(r => {
    const status = r.naturalWidth > 0 ? '✅' : '❌';
    console.log(`${status} ${r.brand}: src=${r.src ? 'SET' : 'EMPTY'}, naturalWidth=${r.naturalWidth}, hidden=${r.hidden}`);
  });
  
  const allWorking = results.every(r => r.naturalWidth > 0);
  if (allWorking) {
    console.log('\n✅ All logos are working!');
  } else {
    console.log('\n❌ Some logos are not loading');
  }
  
  await browser.close();
})();
