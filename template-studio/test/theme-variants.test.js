import puppeteer from 'puppeteer';
import { test } from 'node:test';
import assert from 'node:assert';

const TEST_URL = 'http://localhost:4174';

test('theme variants should work correctly', async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text());
  });
  
  page.on('pageerror', error => {
    console.error('PAGE ERROR:', error.message);
  });
  
  try {
    await page.goto(TEST_URL, { waitUntil: 'networkidle0' });
    
    // Wait 3 seconds for everything to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Click Accenture theme
    const themeCards = await page.$$('#themeGallery .theme-card');
    let accentureCard = null;
    
    for (const card of themeCards) {
      const name = await card.evaluate(el => el.querySelector('.theme-name').textContent);
      if (name.includes('Accenture')) {
        accentureCard = card;
        break;
      }
    }
    
    assert(accentureCard, 'Accenture theme card not found');
    await accentureCard.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if brand dropdown updated
    const brandSelect = await page.$('#brandSelect');
    const brandValue = await brandSelect.evaluate(el => el.value);
    assert.strictEqual(brandValue, 'accenture', 'Brand should be accenture');
    
    // Check if theme dropdown has variants
    const themeSelect = await page.$('#brandThemeSelect');
    const themeOptions = await themeSelect.$$('option');
    console.log(`Found ${themeOptions.length} theme variants`);
    
    assert(themeOptions.length >= 2, 'Should have at least 2 variants for Accenture');
    
    // Get variant names
    const variantNames = [];
    for (const option of themeOptions) {
      const text = await option.evaluate(el => el.textContent);
      variantNames.push(text);
    }
    console.log('Available variants:', variantNames);
    
    // Switch between variants
    for (let i = 0; i < themeOptions.length; i++) {
      const optionValue = await themeOptions[i].evaluate(el => el.value);
      await themeSelect.select(optionValue);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const selectedVariant = await themeSelect.evaluate(el => el.value);
      console.log(`Selected variant: ${selectedVariant}`);
      
      // Check if CSS variables are applied
      const bgColor = await page.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        return style.getPropertyValue('--bg');
      });
      
      console.log(`Background color for ${selectedVariant}:`, bgColor);
      assert(bgColor && bgColor.length > 0, 'CSS variables should be applied');
    }
    
    // Test brand dropdown change
    await brandSelect.select('default');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newBrandValue = await brandSelect.evaluate(el => el.value);
    assert.strictEqual(newBrandValue, 'default', 'Brand should change to default');
    
    // Check if variants updated for default brand
    const newThemeOptions = await themeSelect.$$('option');
    console.log(`Found ${newThemeOptions.length} variants for default brand`);
    
  } finally {
    await browser.close();
  }
});
