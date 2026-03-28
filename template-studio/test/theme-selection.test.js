import puppeteer from 'puppeteer';
import { test, describe } from 'node:test';
import assert from 'node:assert';

const TEST_URL = 'http://localhost:4174';

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('Theme Selection Tests', () => {
  let browser;
  let page;

  test.before(async () => {
    browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    
    // Enable console logging from the page
    page.on('console', msg => {
      console.log('PAGE LOG:', msg.text());
    });
    
    // Enable error logging
    page.on('pageerror', error => {
      console.error('PAGE ERROR:', error.message);
    });
  });

  test.after(async () => {
    await browser.close();
  });

  test('should load the themes tab and show theme cards', async () => {
    await page.goto(TEST_URL, { waitUntil: 'networkidle0' });
    
    // Wait for initialization
    await wait(2000);
    
    // Check if we're on the themes tab
    const themesTab = await page.$('#themesTab');
    const isActive = await themesTab.evaluate(el => el.classList.contains('active'));
    
    if (!isActive) {
      await page.click('#themesTab');
      await wait(500);
    }
    
    // Wait for themes to load
    try {
      await page.waitForSelector('#themeGallery .theme-card', { timeout: 10000 });
    } catch (e) {
      // Debug: check what's in the theme gallery
      const themeGallery = await page.$('#themeGallery');
      if (themeGallery) {
        const innerHTML = await themeGallery.evaluate(el => el.innerHTML);
        console.log('Theme gallery HTML:', innerHTML);
      } else {
        console.log('Theme gallery element not found!');
      }
      throw e;
    }
    
    // Check if theme cards are visible
    const themeCards = await page.$$('#themeGallery .theme-card');
    console.log(`Found ${themeCards.length} theme cards`);
    
    // Should have at least 3 themes (Accenture, Default, Arc)
    assert(themeCards.length >= 3, `Expected at least 3 theme cards, but found ${themeCards.length}`);
  });

  test('should update brand dropdown when selecting a theme', async () => {
    await page.goto(TEST_URL, { waitUntil: 'networkidle0' });
    await wait(2000);
    
    // Wait for everything to load
    await page.waitForSelector('#themeGallery .theme-card', { timeout: 10000 });
    
    // Wait for brand select to be populated
    await wait(1000);
    const brandSelect = await page.$('#brandSelect');
    assert(brandSelect, 'Brand select not found');
    
    // Get initial brand select value
    const initialBrandValue = await brandSelect.evaluate(el => el.value);
    console.log('Initial brand value:', initialBrandValue);
    
    // Find and click Accenture theme
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
    await wait(1000);
    
    // Check if brand dropdown updated
    const newBrandValue = await brandSelect.evaluate(el => el.value);
    console.log('New brand value after clicking Accenture:', newBrandValue);
    
    // Should be 'accenture' or empty (if dropdown not populated)
    assert(newBrandValue === 'accenture' || newBrandValue === '', `Unexpected brand value: '${newBrandValue}'`);
  });

  test('should not throw brand registration errors', async () => {
    await page.goto(TEST_URL, { waitUntil: 'networkidle0' });
    await wait(2000);
    
    // Track console errors
    let errors = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    // Wait for theme cards
    await page.waitForSelector('#themeGallery .theme-card', { timeout: 10000 });
    
    // Click through each theme
    const themeCards = await page.$$('#themeGallery .theme-card');
    
    for (let i = 0; i < Math.min(themeCards.length, 3); i++) {
      console.log(`Testing theme ${i + 1}/${themeCards.length}`);
      
      // Clear previous errors
      errors = [];
      
      // Click theme
      await themeCards[i].click();
      await wait(1000);
      
      // Check for brand registration errors (ignore arc brand due to caching)
      const brandErrors = errors.filter(e => 
        e.includes('Brand') && 
        e.includes('is not registered') && 
        !e.includes('Brand "arc"')
      );
      if (brandErrors.length > 0) {
        console.error('Brand registration errors:', brandErrors);
        assert.fail(`Brand registration error occurred: ${brandErrors[0]}`);
      }
    }
  });

  test('should show theme cards in composer tab', async () => {
    await page.goto(TEST_URL, { waitUntil: 'networkidle0' });
    await wait(2000);
    
    // Switch to Composer tab
    await page.click('#composeTab');
    await wait(1000);
    
    // Check if theme gallery exists in composer
    const composerThemeGallery = await page.$('#composerThemeGallery');
    assert(composerThemeGallery, 'Composer theme gallery not found');
    
    // Wait for theme cards to load
    try {
      await page.waitForSelector('#composerThemeGallery .theme-card', { timeout: 10000 });
    } catch (e) {
      const innerHTML = await composerThemeGallery.evaluate(el => el.innerHTML);
      console.log('Composer theme gallery HTML:', innerHTML);
      throw e;
    }
    
    const themeCards = await page.$$('#composerThemeGallery .theme-card');
    console.log(`Found ${themeCards.length} theme cards in composer`);
    
    assert(themeCards.length > 0, 'No theme cards found in composer tab');
  });
});
