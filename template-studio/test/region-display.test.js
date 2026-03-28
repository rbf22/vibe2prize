// Regression test for region display issue
// Tests that regions are visible without requiring guide toggle
import puppeteer from 'puppeteer';

async function testRegionDisplay() {
  console.log('=== Region Display Regression Test ===\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    args: ['--disable-web-security']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    await page.goto('file:///Users/robert_fenwick/SWE/vibe2prize/template-studio/grid-template-studio.html');
    await page.waitForFunction(() => window.TemplateStudio, { timeout: 10000 });
    
    // Go to canvas designer
    await page.click('#designTab');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 1: Check if regions are visible initially
    console.log('Test 1 - Initial region visibility...');
    const initialRegions = await page.evaluate(() => {
      const gridBlocks = document.querySelectorAll('.grid-block');
      const previewGrid = document.getElementById('previewGrid');
      
      return {
        count: gridBlocks.length,
        gridExists: !!previewGrid,
        gridRect: previewGrid ? previewGrid.getBoundingClientRect() : null,
        regions: Array.from(gridBlocks).map(block => ({
          id: block.className,
          style: {
            display: window.getComputedStyle(block).display,
            opacity: window.getComputedStyle(block).opacity,
            visibility: window.getComputedStyle(block).visibility,
            background: window.getComputedStyle(block).background
          },
          rect: block.getBoundingClientRect()
        }))
      };
    });
    
    console.log('Initial regions found:', initialRegions.count);
    console.log('Grid exists:', initialRegions.gridExists);
    
    if (initialRegions.count === 0) {
      console.log('❌ No regions found initially - this indicates the bug');
      
      // Test 2: Check if regions appear after guide toggle
      console.log('\nTest 2 - Region visibility after guide toggle...');
      
      // Toggle halves guide
      await page.evaluate(() => {
        if (window.TemplateStudio?.state) {
          window.TemplateStudio.state.guideSettings.halves = true;
          window.TemplateStudio.renderPreview();
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const regionsAfterGuide = await page.evaluate(() => {
        const gridBlocks = document.querySelectorAll('.grid-block');
        return {
          count: gridBlocks.length,
          regions: Array.from(gridBlocks).map(block => ({
            id: block.className,
            style: {
              display: window.getComputedStyle(block).display,
              opacity: window.getComputedStyle(block).opacity,
              visibility: window.getComputedStyle(block).visibility
            }
          }))
        };
      });
      
      console.log('Regions after guide toggle:', regionsAfterGuide.count);
      
      if (regionsAfterGuide.count > 0) {
        console.log('❌ BUG CONFIRMED: Regions only appear after guide toggle');
        console.log('   This should not happen - regions should be visible immediately');
      } else {
        console.log('ℹ️  No regions even after guide toggle - might be a different issue');
      }
    } else {
      console.log('✅ Regions are visible initially');
      
      // Check if regions are actually visible (not just in DOM)
      const actuallyVisible = initialRegions.regions.some(r => 
        r.style.display !== 'none' && 
        r.style.opacity !== '0' && 
        r.style.visibility !== 'hidden' &&
        r.rect.width > 0 && 
        r.rect.height > 0
      );
      
      if (actuallyVisible) {
        console.log('✅ Regions are actually visible (not just in DOM)');
      } else {
        console.log('⚠️  Regions are in DOM but not visible');
      }
    }
    
    // Test 3: Check if boxes exist in state
    console.log('\nTest 3 - State verification...');
    const stateInfo = await page.evaluate(() => {
      return {
        boxesCount: window.TemplateStudio?.state?.boxes?.length || 0,
        boxes: window.TemplateStudio?.state?.boxes || [],
        _boxesInitialized: window.TemplateStudio?.state?._boxesInitialized || false
      };
    });
    
    console.log('Boxes in state:', stateInfo.boxesCount);
    console.log('Boxes initialized:', stateInfo._boxesInitialized);
    
    if (stateInfo.boxesCount === 0) {
      console.log('❌ No boxes in state - this explains why no regions are rendered');
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: '/Users/robert_fenwick/SWE/vibe2prize/template-studio/test/screenshots/region-display.png',
      fullPage: false 
    });
    console.log('\n📸 Screenshot saved: test/screenshots/region-display.png');
    
    // Summary
    const bugPresent = initialRegions.count === 0 && stateInfo.boxesCount > 0;
    console.log('\n=== Result ===');
    console.log(bugPresent ? '❌ BUG CONFIRMED: Regions require guide toggle to appear' : '✅ No bug detected');
    
    return !bugPresent;
    
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testRegionDisplay().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { testRegionDisplay };
