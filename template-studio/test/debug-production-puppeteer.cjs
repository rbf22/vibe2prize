const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const url = require('url');

// Simple HTTP server to avoid CORS issues
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const uri = url.parse(req.url).pathname;
      let filename;
      
      // Handle root path
      if (uri === '/') {
        filename = path.join(__dirname, '..', 'grid-template-studio.html');
      } else if (uri.startsWith('/core/')) {
        // Core modules are in the parent directory
        filename = path.join(__dirname, '..', '..', uri.substring(1));
      } else if (uri.startsWith('/src/') || uri.startsWith('/templates/') || uri.startsWith('/styles/')) {
        // These are in template-studio directory
        filename = path.join(__dirname, '..', uri.substring(1));
      } else {
        // Remove leading slash and join with base directory
        const cleanUri = uri.replace(/^\//, '');
        filename = path.join(__dirname, '..', cleanUri);
      }
      
      // Security check - prevent directory traversal
      const baseDir = path.join(__dirname, '../..');
      if (!filename.startsWith(baseDir)) {
        res.writeHead(403);
        return res.end('Forbidden');
      }
      
      fs.readFile(filename, (err, data) => {
        if (err) {
          console.log(`404: ${uri} -> ${filename}`);
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
      console.log('🌐 HTTP server started on http://localhost:3000');
      resolve(server);
    });
  });
}

async function debugProductionRenderer() {
  console.log('🔍 Debugging Production Renderer with Puppeteer\n');
  
  const server = await startServer();
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging from the page
    page.on('console', msg => {
      console.log('Browser:', msg.text());
    });
    
    page.on('pageerror', error => {
      console.error('Page Error:', error.message);
    });
    
    // Navigate to Template Studio via HTTP
    console.log(`📍 Opening: http://localhost:3000`);
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load
    await page.waitForSelector('#productionPreview', { timeout: 10000 });
    console.log('✅ Template Studio loaded');
    
    // Switch to production view
    console.log('\n🔄 Switching to production view...');
    await page.evaluate(() => {
      document.getElementById('previewWorkbench').setAttribute('data-view', 'production');
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Load and run the debug script
    const debugScript = fs.readFileSync(path.join(__dirname, 'debug-production.js'), 'utf8');
    
    console.log('\n🔧 Running debug script...');
    await page.evaluate(debugScript);
    
    // Wait for debug results
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take a screenshot
    await page.screenshot({ 
      path: 'production-debug-screenshot.png',
      fullPage: false 
    });
    console.log('\n📸 Screenshot saved: production-debug-screenshot.png');
    
    // Keep browser open for inspection
    console.log('\n⏸️  Browser will stay open for 10 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
    server.close();
  }
}

// Run the debug
debugProductionRenderer().then(() => {
  console.log('\n🏁 Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Debug error:', error);
  process.exit(1);
});
