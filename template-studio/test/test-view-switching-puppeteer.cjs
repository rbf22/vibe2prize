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

async function testViewSwitching() {
  console.log('🧪 Testing View Switching Fix\n');
  
  const server = await startServer();
  const browser = await puppeteer.launch({ headless: false });
  
  try {
    const page = await browser.newPage();
    
    // Capture console output
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Production render:') || text.includes('✅') || text.includes('❌')) {
        console.log('  ', text);
      }
    });
    
    page.on('pageerror', error => {
      console.error('💥 Page Error:', error.message);
    });
    
    // Navigate to the page
    await page.goto('http://localhost:3000');
    await page.waitForSelector('#productionPreview', { timeout: 10000 });
    
    // Test 1: Initial production view
    console.log('\n1. Testing initial production view...');
    await page.evaluate(() => {
      document.getElementById('previewWorkbench').setAttribute('data-view', 'production');
    });
    await new Promise(resolve => setTimeout(resolve, 200));
    
    let hasContent = await page.evaluate(() => {
      const container = document.querySelector('#productionPreview');
      return container.children.length > 0 && container.children[0].offsetWidth > 0;
    });
    
    console.log('   Initial production render:', hasContent ? '✅ SUCCESS' : '❌ FAILED');
    
    // Test 2: Switch to canvas
    console.log('\n2. Switching to canvas view...');
    await page.evaluate(() => {
      document.getElementById('previewWorkbench').setAttribute('data-view', 'canvas');
    });
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Test 3: Switch back to production
    console.log('\n3. Switching back to production view...');
    await page.evaluate(() => {
      document.getElementById('previewWorkbench').setAttribute('data-view', 'production');
    });
    
    // Check immediately
    await new Promise(resolve => setTimeout(resolve, 50));
    hasContent = await page.evaluate(() => {
      const container = document.querySelector('#productionPreview');
      return container.children.length > 0 && container.children[0].offsetWidth > 0;
    });
    console.log('   After 50ms:', hasContent ? '✅ Rendered' : '⏳ Loading...');
    
    // Check after full delay
    await new Promise(resolve => setTimeout(resolve, 150));
    hasContent = await page.evaluate(() => {
      const container = document.querySelector('#productionPreview');
      return container.children.length > 0 && container.children[0].offsetWidth > 0;
    });
    console.log('   After 200ms total:', hasContent ? '✅ SUCCESS' : '❌ FAILED');
    
    // Test 4: Multiple rapid switches
    console.log('\n4. Testing multiple rapid switches...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        document.getElementById('previewWorkbench').setAttribute('data-view', 'canvas');
      });
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await page.evaluate(() => {
        document.getElementById('previewWorkbench').setAttribute('data-view', 'production');
      });
      await new Promise(resolve => setTimeout(resolve, 150));
      
      hasContent = await page.evaluate(() => {
        const container = document.querySelector('#productionPreview');
        return container.children.length > 0 && container.children[0].offsetWidth > 0;
      });
      console.log(`   Switch ${i + 1}:`, hasContent ? '✅' : '❌');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'view-switching-test.png' });
    console.log('\n📸 Screenshot saved: view-switching-test.png');
    
    console.log('\n✅ View switching test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
    server.close();
  }
}

// Run the test
testViewSwitching().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
