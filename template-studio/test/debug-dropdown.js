import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  await page.goto('http://localhost:4174', { waitUntil: 'networkidle0' });
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Check if brand dropdown exists and has options
  const brandSelect = await page.$('#brandSelect');
  if (brandSelect) {
    const options = await brandSelect.$$('option');
    console.log(`Brand dropdown has ${options.length} options`);
    
    for (let i = 0; i < options.length; i++) {
      const value = await options[i].evaluate(el => el.value);
      const text = await options[i].evaluate(el => el.textContent);
      console.log(`  Option ${i}: value="${value}", text="${text}"`);
    }
  } else {
    console.log('Brand dropdown not found!');
  }
  
  await browser.close();
})();
