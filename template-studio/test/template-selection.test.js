import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testTemplateSelection() {
  console.log('Starting template selection test...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
  });
  
  try {
    const page = await browser.newPage();
    
    // Start the dev server first
    console.log('Starting dev server...');
    const { spawn } = await import('child_process');
    const server = spawn('npm', ['run', 'dev'], {
      cwd: join(__dirname, '..'),
      stdio: 'pipe'
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Navigate to the template studio
    await page.goto('http://localhost:4174', { waitUntil: 'networkidle0' });
    
    // Wait for the page to load
    await page.waitForSelector('#templateGallery', { timeout: 10000 });
    console.log('Template gallery loaded');
    
    // Wait for templates to be loaded (check for actual template content)
    await page.waitForFunction(() => {
      const cards = document.querySelectorAll('.template-card.default');
      return cards.length > 0 && cards[0].querySelector('.template-thumb canvas');
    }, { timeout: 15000 });
    
    console.log('Templates loaded');
    
    // Get the first template card
    const firstCard = await page.$('.template-card.default');
    
    if (!firstCard) {
      console.error('No template cards found');
      return;
    }
    
    // Check if it has the selected class initially
    let hasSelectedClass = await page.evaluate(card => {
      return card.classList.contains('selected');
    }, firstCard);
    
    console.log('First card initially selected:', hasSelectedClass);
    
    // Get the computed border style
    let borderStyle = await page.evaluate(card => {
      const style = window.getComputedStyle(card);
      return {
        border: style.border,
        borderColor: style.borderColor,
        borderWidth: style.borderWidth,
        borderStyle: style.borderStyle,
        backgroundColor: style.backgroundColor
      };
    }, firstCard);
    
    console.log('Initial border style:', borderStyle);
    
    // Check if the border color is teal (var(--primary) should be #81f0c8)
    const isTealBorder = await page.evaluate(card => {
      const style = window.getComputedStyle(card);
      const borderColor = style.borderColor;
      console.log('Border color:', borderColor);
      // Convert rgb to hex for comparison
      if (borderColor.startsWith('rgb')) {
        const values = borderColor.match(/\d+/g);
        if (values && values.length >= 3) {
          const r = parseInt(values[0]);
          const g = parseInt(values[1]);
          const b = parseInt(values[2]);
          // Teal color #81f0c8 = rgb(129, 240, 200)
          return r === 129 && g === 240 && b === 200;
        }
      }
      return false;
    }, firstCard);
    
    console.log('Has teal border:', isTealBorder);
    
    // Test clicking on another template
    const cards = await page.$$('.template-card.default');
    if (cards.length > 1) {
      console.log('Clicking second template...');
      await page.evaluate(card => card.click(), cards[1]);
      
      // Wait a bit for the update
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check second card
      const secondCardSelected = await page.evaluate(card => {
        return card.classList.contains('selected');
      }, cards[1]);
      
      console.log('Second card selected after click:', secondCardSelected);
      
      // Check first card is no longer selected
      hasSelectedClass = await page.evaluate(card => {
        return card.classList.contains('selected');
      }, firstCard);
      
      console.log('First card still selected:', hasSelectedClass);
      
      // Get border style of second card
      const secondBorderStyle = await page.evaluate(card => {
        const style = window.getComputedStyle(card);
        return {
          border: style.border,
          borderColor: style.borderColor,
          borderWidth: style.borderWidth,
          borderStyle: style.borderStyle
        };
      }, cards[1]);
      
      console.log('Second card border style:', secondBorderStyle);
    }
    
    // Take a screenshot for visual verification
    await page.screenshot({ 
      path: 'template-selection-test.png',
      fullPage: false 
    });
    console.log('Screenshot saved as template-selection-test.png');
    
    // Close server
    server.kill();
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
}

testTemplateSelection();
