import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:4174/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#brandSelect', { timeout: 5000 });
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check logo visibility
  const logoInfo = await page.evaluate(() => {
    const logo = document.getElementById('brandLogo');
    const style = logo ? window.getComputedStyle(logo) : null;
    
    return {
      exists: !!logo,
      src: logo ? logo.src : null,
      display: style ? style.display : null,
      visibility: style ? style.visibility : null,
      opacity: style ? style.opacity : null,
      hidden: logo ? logo.hidden : null,
      offsetWidth: logo ? logo.offsetWidth : 0,
      offsetHeight: logo ? logo.offsetHeight : 0,
      naturalWidth: logo ? logo.naturalWidth : 0,
      naturalHeight: logo ? logo.naturalHeight : 0
    };
  });
  
  console.log('Logo visibility info:', logoInfo);
  
  // Try Accenture brand
  await page.select('#brandSelect', 'accenture');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const accentureLogoInfo = await page.evaluate(() => {
    const logo = document.getElementById('brandLogo');
    return {
      src: logo ? logo.src : null,
      offsetWidth: logo ? logo.offsetWidth : 0,
      naturalWidth: logo ? logo.naturalWidth : 0
    };
  });
  
  console.log('Accenture logo info:', accentureLogoInfo);
  
  await browser.close();
})();
