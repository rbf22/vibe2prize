// Comprehensive guide debugging test
import puppeteer from 'puppeteer';

async function debugGuides() {
  console.log('=== Debug Guide Rendering ===\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    args: ['--disable-web-security']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    // Enable console logging from the page
    page.on('console', msg => {
      if (msg.text().includes('[renderGuides]') || msg.text().includes('[renderPreview]')) {
        console.log('PAGE:', msg.text());
      }
    });
    
    await page.goto('file:///Users/robert_fenwick/SWE/vibe2prize/template-studio/grid-template-studio.html');
    await page.waitForFunction(() => window.TemplateStudio, { timeout: 10000 });
    
    // Go to canvas designer
    await page.click('#designTab');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check initial state
    const initialState = await page.evaluate(() => {
      const grid = document.getElementById('previewGrid');
      const guideLayer = document.getElementById('guideLayer');
      
      return {
        guideLayerExists: !!guideLayer,
        gridExists: !!grid,
        guideSettings: window.TemplateStudio?.state?.guideSettings,
        gridRect: grid ? grid.getBoundingClientRect() : null,
        guideLayerRect: guideLayer ? guideLayer.getBoundingClientRect() : null,
        guideLayerContent: guideLayer ? guideLayer.innerHTML : null
      };
    });
    
    console.log('Initial state:', initialState);
    
    // Force enable center guides
    await page.evaluate(() => {
      if (window.TemplateStudio?.state) {
        window.TemplateStudio.state.guideSettings.center = true;
        console.log('Center guides enabled');
      }
    });
    
    // Force render
    await page.evaluate(() => {
      const grid = document.getElementById('previewGrid');
      const guideLayer = document.getElementById('guideLayer');
      if (window.TemplateStudio?.renderGuides && guideLayer && grid) {
        console.log('Force calling renderGuides...');
        window.TemplateStudio.renderGuides(guideLayer, grid);
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check after render
    const afterRender = await page.evaluate(() => {
      const guideLayer = document.getElementById('guideLayer');
      const centerGuides = guideLayer ? guideLayer.querySelectorAll('.guide-line.center') : [];
      
      return {
        guideLayerContent: guideLayer ? guideLayer.innerHTML : null,
        centerGuideCount: centerGuides.length,
        allGuides: guideLayer ? Array.from(guideLayer.querySelectorAll('.guide-line')).map(g => ({
          classes: g.className,
          style: {
            left: g.style.left,
            top: g.style.top,
            width: g.style.width,
            height: g.style.height,
            background: g.style.background,
            opacity: g.style.opacity
          }
        })) : []
      };
    });
    
    console.log('\nAfter render:');
    console.log('Center guide count:', afterRender.centerGuideCount);
    console.log('All guides:', afterRender.allGuides);
    console.log('Guide layer HTML:', afterRender.guideLayerContent);
    
    // Take screenshot
    await page.screenshot({ 
      path: '/Users/robert_fenwick/SWE/vibe2prize/template-studio/test/screenshots/guide-debug.png',
      fullPage: false 
    });
    
    return afterRender.centerGuideCount > 0;
    
  } catch (error) {
    console.error('Debug failed:', error);
    return false;
  } finally {
    await browser.close();
  }
}

debugGuides();
