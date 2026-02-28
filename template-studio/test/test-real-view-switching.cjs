const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const url = require('url');

// Simple HTTP server
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const uri = url.parse(req.url).pathname;
      let filename;
      
      if (uri === '/') {
        filename = path.join(__dirname, '..', 'grid-template-studio.html');
      } else if (uri.startsWith('/core/')) {
        filename = path.join(__dirname, '..', '..', uri.substring(1));
      } else if (uri.startsWith('/templates/')) {
        filename = path.join(__dirname, '..', '..', uri.substring(1));
      } else if (uri.startsWith('/src/') || uri.startsWith('/styles/') || uri.startsWith('/test/')) {
        filename = path.join(__dirname, '..', uri.substring(1));
      } else {
        const cleanUri = uri.replace(/^\//, '');
        filename = path.join(__dirname, '..', cleanUri);
      }
      
      const baseDir = path.join(__dirname, '../..');
      if (!filename.startsWith(baseDir)) {
        res.writeHead(403);
        return res.end('Forbidden');
      }
      
      fs.readFile(filename, (err, data) => {
        if (err) {
          res.writeHead(404);
          return res.end('File not found');
        }
        
        const ext = path.extname(filename);
        let contentType = 'text/html';
        
        if (ext === '.js') contentType = 'application/javascript';
        else if (ext === '.css') contentType = 'text/css';
        else if (ext === '.json') contentType = 'application/json';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });
    
    server.listen(3000, () => {
      console.log('🌐 Server started on http://localhost:3000');
      resolve(server);
    });
  });
}

async function testRealViewSwitching() {
  console.log('🧪 Testing Real View Switching with Button Clicks\n');
  
  const server = await startServer();
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null
  });
  
  try {
    const page = await browser.newPage();
    
    // Capture all console output
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      
      // Filter for relevant messages
      if (text.includes('Production render:') || 
          text.includes('Retry') ||
          text.includes('Loading') ||
          text.includes('✅') || 
          text.includes('❌') ||
          text.includes('dimensions')) {
        console.log('  ', text);
      }
    });
    
    page.on('pageerror', error => {
      console.error('💥 Page Error:', error.message);
    });
    
    // Navigate to the page
    await page.goto('http://localhost:3000');
    await page.waitForSelector('#productionPreview', { timeout: 10000 });
    
    // Ensure we have regions
    await page.evaluate(() => {
      if (window.TemplateStudio.state.boxes.length === 0) {
        window.TemplateStudio.addNewRegion();
        window.TemplateStudio.addNewRegion();
      }
    });
    
    // Test 1: Initial production view
    console.log('\n1. Testing initial production view (button click)...');
    await page.click('[data-preview-view="production"]');
    await new Promise(resolve => setTimeout(resolve, 200));
    
    let hasContent = await page.evaluate(() => {
      const container = document.querySelector('#productionPreview');
      return container.children.length > 0 && container.children[0].offsetWidth > 0;
    });
    
    console.log('   Initial production render:', hasContent ? '✅ SUCCESS' : '❌ FAILED');
    
    // Test 2: Switch to canvas
    console.log('\n2. Switching to canvas view...');
    await page.click('[data-preview-view="canvas"]');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Test 3: Switch back to production (this is where the bug occurs)
    console.log('\n3. Switching back to production view (button click)...');
    await page.click('[data-preview-view="production"]');
    
    // Check at multiple intervals
    const checkStates = [];
    
    for (let ms of [0, 50, 100, 200, 500]) {
      await new Promise(resolve => setTimeout(resolve, ms));
      
      const state = await page.evaluate(() => {
        const container = document.querySelector('#productionPreview');
        const panel = document.querySelector('.production-preview-panel');
        return {
          hasContent: container.children.length > 0,
          contentWidth: container.children.length > 0 ? container.children[0].offsetWidth : 0,
          contentHeight: container.children.length > 0 ? container.children[0].offsetHeight : 0,
          panelWidth: panel.clientWidth,
          panelHeight: panel.clientHeight,
          innerHTML: container.innerHTML.substring(0, 100),
          view: document.getElementById('previewWorkbench').dataset.view
        };
      });
      
      checkStates.push({ ms, ...state });
      console.log(`   After ${ms}ms: ${state.hasContent ? '✅' : '❌'} - Content: ${state.contentWidth}x${state.contentHeight}, Panel: ${state.panelWidth}x${state.panelHeight}`);
    }
    
    // Check if retry mechanism worked
    const retryLogs = logs.filter(log => log.includes('Retry'));
    if (retryLogs.length > 0) {
      console.log('\n   Retry attempts detected:');
      retryLogs.slice(-3).forEach(log => console.log('     ', log));
    }
    
    // Test 4: Multiple rapid switches
    console.log('\n4. Testing multiple rapid switches...');
    for (let i = 0; i < 3; i++) {
      await page.click('[data-preview-view="canvas"]');
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await page.click('[data-preview-view="production"]');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      hasContent = await page.evaluate(() => {
        const container = document.querySelector('#productionPreview');
        return container.children.length > 0 && container.children[0].offsetWidth > 0;
      });
      
      console.log(`   Switch ${i + 1}:`, hasContent ? '✅' : '❌');
    }
    
    // Final state
    const finalState = await page.evaluate(() => {
      const container = document.querySelector('#productionPreview');
      return {
        childrenCount: container.children.length,
        innerHTML: container.innerHTML,
        hasResizeObserver: !!container._resizeObserver,
        panelDisplay: window.getComputedStyle(document.querySelector('.production-preview-panel')).display
      };
    });
    
    console.log('\n📊 Final State:');
    console.log('   Children count:', finalState.childrenCount);
    console.log('   Has ResizeObserver:', finalState.hasResizeObserver);
    console.log('   Panel display:', finalState.panelDisplay);
    
    if (!finalState.childrenCount || finalState.innerHTML.includes('Loading') || finalState.innerHTML.includes('Failed')) {
      console.log('   Inner HTML:', finalState.innerHTML);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'real-view-switching-test.png' });
    console.log('\n📸 Screenshot saved: real-view-switching-test.png');
    
    // Keep browser open for 3 seconds for visual inspection
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
    server.close();
  }
}

// Run the test
testRealViewSwitching().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
