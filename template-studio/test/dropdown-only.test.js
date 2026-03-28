import puppeteer from 'puppeteer';
import { test } from 'node:test';
import assert from 'node:assert';

const TEST_URL = 'http://localhost:4174';

test('brand dropdowns should work', async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  try {
    await page.goto(TEST_URL, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check brand dropdown
    const brandSelect = await page.$('#brandSelect');
    assert(brandSelect, 'Brand dropdown should exist');
    
    // Check variant dropdown
    const variantSelect = await page.$('#brandThemeSelect');
    assert(variantSelect, 'Variant dropdown should exist');
    
    // Change brand
    await brandSelect.select('accenture');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if variants loaded
    const variants = await variantSelect.$$('option');
    assert(variants.length >= 2, 'Should have variants for Accenture');
    
    // Change variant
    await variantSelect.select('light');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check brand label updated
    const brandLabel = await page.$eval('#brandLabel', el => el.textContent);
    console.log('Brand label:', brandLabel);
    assert(brandLabel !== 'Brand Name', 'Brand label should be updated');
    
  } finally {
    await browser.close();
  }
});
