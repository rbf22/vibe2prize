import puppeteer from 'puppeteer';
import { test } from 'node:test';
import assert from 'node:assert';

const TEST_URL = 'http://localhost:4174';

test('themes should load', async () => {
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
    
    // Check if theme gallery exists
    const themeGallery = await page.$('#themeGallery');
    assert(themeGallery, 'Theme gallery not found');
    
    // Check what's inside
    const innerHTML = await themeGallery.evaluate(el => el.innerHTML);
    console.log('Theme gallery content:', innerHTML.substring(0, 200));
    
    // Check if theme cards exist
    const themeCards = await page.$$('#themeGallery .theme-card');
    console.log(`Found ${themeCards.length} theme cards`);
    
    if (themeCards.length > 0) {
      const firstCard = themeCards[0];
      const name = await firstCard.evaluate(el => el.querySelector('.theme-name')?.textContent);
      console.log('First theme name:', name);
    }
    
  } finally {
    await browser.close();
  }
});
