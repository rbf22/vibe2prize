// Regression test for guide positioning issue
// Tests that guides have correct lengths and positions
import puppeteer from 'puppeteer';

async function testGuidePositioning() {
  console.log('=== Guide Positioning Regression Test ===\n');
  
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
    
    // Enable center guides
    await page.evaluate(() => {
      if (window.TemplateStudio?.state) {
        window.TemplateStudio.state.guideSettings.center = true;
        window.TemplateStudio.renderPreview();
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get guide information
    const guideInfo = await page.evaluate(() => {
      const previewGrid = document.getElementById('previewGrid');
      const guideLayer = document.getElementById('guideLayer');
      const verticalGuide = guideLayer.querySelector('.guide-line.vertical.center');
      const horizontalGuide = guideLayer.querySelector('.guide-line.horizontal.center');
      
      if (!verticalGuide || !horizontalGuide) {
        return { error: 'Center guides not found' };
      }
      
      const gridRect = previewGrid.getBoundingClientRect();
      const vRect = verticalGuide.getBoundingClientRect();
      const hRect = horizontalGuide.getBoundingClientRect();
      
      return {
        grid: {
          width: gridRect.width,
          height: gridRect.height,
          centerX: gridRect.left + gridRect.width / 2,
          centerY: gridRect.top + gridRect.height / 2
        },
        verticalGuide: {
          position: vRect.left,
          height: parseInt(verticalGuide.style.height),
          width: parseInt(verticalGuide.style.width)
        },
        horizontalGuide: {
          position: hRect.top,
          width: parseInt(horizontalGuide.style.width),
          height: parseInt(horizontalGuide.style.height)
        }
      };
    });
    
    if (guideInfo.error) {
      console.log('❌ FAILED:', guideInfo.error);
      return false;
    }
    
    console.log('Grid dimensions:', guideInfo.grid);
    console.log('Vertical guide: height=' + guideInfo.verticalGuide.height + ', width=' + guideInfo.verticalGuide.width);
    console.log('Horizontal guide: width=' + guideInfo.horizontalGuide.width + ', height=' + guideInfo.horizontalGuide.height);
    
    // Test 1: Vertical guide should span full height
    const verticalHeightCorrect = guideInfo.verticalGuide.height === guideInfo.grid.height;
    console.log('\nTest 1 - Vertical guide height:');
    console.log(verticalHeightCorrect ? '✅ PASS' : '❌ FAIL', 
      verticalHeightCorrect ? 
      `(height = ${guideInfo.verticalGuide.height})` : 
      `(expected ${guideInfo.grid.height}, got ${guideInfo.verticalGuide.height})`);
    
    // Test 2: Horizontal guide should span full width
    const horizontalWidthCorrect = guideInfo.horizontalGuide.width === guideInfo.grid.width;
    console.log('\nTest 2 - Horizontal guide width:');
    console.log(horizontalWidthCorrect ? '✅ PASS' : '❌ FAIL',
      horizontalWidthCorrect ?
      `(width = ${guideInfo.horizontalGuide.width})` :
      `(expected ${guideInfo.grid.width}, got ${guideInfo.horizontalGuide.width})`);
    
    // Test 3: Both guides should be 1px thick
    const thicknessCorrect = guideInfo.verticalGuide.width === 1 && guideInfo.horizontalGuide.height === 1;
    console.log('\nTest 3 - Guide thickness:');
    console.log(thicknessCorrect ? '✅ PASS' : '❌ FAIL',
      `vertical=${guideInfo.verticalGuide.width}px, horizontal=${guideInfo.horizontalGuide.height}px`);
    
    // Take screenshot for visual verification
    await page.screenshot({ 
      path: '/Users/robert_fenwick/SWE/vibe2prize/template-studio/test/screenshots/guide-positioning.png',
      fullPage: false 
    });
    console.log('\n📸 Screenshot saved: test/screenshots/guide-positioning.png');
    
    const allPassed = verticalHeightCorrect && horizontalWidthCorrect && thicknessCorrect;
    console.log('\n=== Result ===');
    console.log(allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
    
    return allPassed;
    
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testGuidePositioning().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { testGuidePositioning };
