import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  
  await page.goto('http://localhost:4174/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#brandSelect', { timeout: 5000 });
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Manually trigger brand panel update
  const result = await page.evaluate(() => {
    const brandSelect = document.getElementById('brandSelect');
    const brandLogo = document.getElementById('brandLogo');
    
    // Get current brand snapshot
    if (window.TemplateStudio && window.TemplateStudio.getBrandSnapshot) {
      const snapshot = window.TemplateStudio.getBrandSnapshot(brandSelect.value, 'dark');
      console.log('Brand snapshot:', snapshot);
      
      if (snapshot && snapshot.assets && snapshot.assets.logo) {
        const logoSrc = snapshot.assets.logo['dark'] || snapshot.assets.logo['light'];
        console.log('Logo src:', logoSrc);
        
        if (brandLogo && logoSrc) {
          brandLogo.src = logoSrc;
          brandLogo.hidden = false;
          return { success: true, src: logoSrc };
        }
      }
    }
    
    return { success: false };
  });
  
  console.log('Manual update result:', result);
  
  // Wait a bit and check again
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const finalLogoInfo = await page.evaluate(() => {
    const logo = document.getElementById('brandLogo');
    return {
      src: logo ? logo.src : null,
      hidden: logo ? logo.hidden : null,
      naturalWidth: logo ? logo.naturalWidth : 0
    };
  });
  
  console.log('Final logo info:', finalLogoInfo);
  
  await browser.close();
})();
