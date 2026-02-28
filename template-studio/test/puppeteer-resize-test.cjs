const puppeteer = require('puppeteer');
const path = require('path');

async function testResizeBehavior() {
  console.log('🧪 Starting Puppeteer Resize Test...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless mode
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to Template Studio
    const studioUrl = `file://${path.join(__dirname, '../grid-template-studio.html')}`;
    console.log(`📍 Opening: ${studioUrl}`);
    await page.goto(studioUrl);
    
    // Wait for the page to load
    await page.waitForSelector('#productionPreview', { timeout: 10000 });
    console.log('✅ Template Studio loaded');
    
    // Switch to production view
    await page.evaluate(() => {
      document.getElementById('previewWorkbench').setAttribute('data-view', 'production');
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Define the test function
    const resizeTest = async () => {
      return await page.evaluate(async () => {
        return new Promise((resolve) => {
          const prodPanel = document.querySelector('.production-preview-panel');
          const prodContainer = document.querySelector('#productionPreview');
          
          if (!prodPanel || !prodContainer) {
            resolve({ success: false, error: 'Containers not found' });
            return;
          }
          
          const results = {
            initialWidth: prodPanel.clientWidth,
            smallWidth: 0,
            largeWidth: 0,
            success: false
          };
          
          // Make small
          prodPanel.style.width = '400px';
          prodPanel.style.height = '300px';
          
          setTimeout(() => {
            const smallContent = prodContainer.querySelector('div');
            results.smallWidth = smallContent ? smallContent.offsetWidth : 0;
            
            // Make large
            prodPanel.style.width = '800px';
            prodPanel.style.height = '600px';
            
            setTimeout(() => {
              const largeContent = prodContainer.querySelector('div');
              results.largeWidth = largeContent ? largeContent.offsetWidth : 0;
              
              results.success = results.largeWidth > results.smallWidth;
              
              // Restore
              prodPanel.style.width = '';
              prodPanel.style.height = '';
              
              resolve(results);
            }, 300);
          }, 300);
        });
      });
    };
    
    // Run the test
    console.log('\n📏 Running resize test...');
    const results = await resizeTest();
    
    // Display results
    console.log('\n📊 Test Results:');
    console.log(`  Initial container width: ${results.initialWidth}px`);
    console.log(`  Small content width: ${results.smallWidth}px`);
    console.log(`  Large content width: ${results.largeWidth}px`);
    
    if (results.success) {
      console.log('\n✅ SUCCESS: Production renderer resized correctly!');
      console.log(`   Content width increased from ${results.smallWidth}px to ${results.largeWidth}px`);
    } else {
      console.log('\n❌ FAILED: Production renderer did NOT resize');
      console.log(`   Content width stayed at ${results.smallWidth}px (should have increased)`);
    }
    
    // Take a screenshot for verification
    await page.screenshot({ 
      path: 'test-resize-results.png',
      fullPage: false 
    });
    console.log('\n📸 Screenshot saved: test-resize-results.png');
    
    // Keep browser open for 3 seconds to see the result
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testResizeBehavior().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test error:', error);
  process.exit(1);
});
