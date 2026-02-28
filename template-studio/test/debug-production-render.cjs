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

async function debugProductionRender() {
  console.log('🔍 Debugging Production Render\n');
  
  const server = await startServer();
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null
  });
  
  try {
    const page = await browser.newPage();
    
    // Capture console output
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      
      // Show relevant logs
      if (text.includes('Production render:') || 
          text.includes('state') ||
          text.includes('boxes') ||
          text.includes('Error') ||
          text.includes('Result:') ||
          text.includes('✅') ||
          text.includes('❌') ||
          text.includes('⚠️')) {
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
    
    // Switch to production view
    console.log('\n1. Switching to production view...');
    await page.click('[data-preview-view="production"]');
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Run debug test
    console.log('\n2. Running debug test...');
    const debugResult = await page.evaluate(() => {
      const container = document.querySelector('#productionPreview');
      const panel = document.querySelector('.production-preview-panel');
      
      // Check state
      const stateCheck = {
        hasTemplateStudio: !!window.TemplateStudio,
        hasState: !!(window.TemplateStudio && window.TemplateStudio.state),
        canvasWidth: window.TemplateStudio?.state?.canvasWidth,
        canvasHeight: window.TemplateStudio?.state?.canvasHeight,
        boxesCount: window.TemplateStudio?.state?.boxes?.length
      };
      
      // Clear and force render
      container.innerHTML = '';
      window.TemplateStudio.renderProductionSlide(container);
      
      return stateCheck;
    });
    
    console.log('State check:', debugResult);
    
    // Wait for render
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check result
    const renderResult = await page.evaluate(() => {
      const container = document.querySelector('#productionPreview');
      const result = {
        childrenCount: container.children.length,
        innerHTML: container.innerHTML.substring(0, 300),
        hasError: container.innerHTML.includes('Error: Invalid state'),
        hasNoRegions: container.innerHTML.includes('No regions'),
        hasLoading: container.innerHTML.includes('Loading')
      };
      
      if (container.children.length > 0) {
        const child = container.children[0];
        result.firstChildTag = child.tagName;
        result.firstChildDimensions = {
          width: child.offsetWidth,
          height: child.offsetHeight
        };
        
        // Check for text content
        const textElements = child.querySelectorAll('h1, h2, h3, p, span, div');
        const textContent = [];
        textElements.forEach(el => {
          const text = el.textContent.trim();
          if (text && !text.includes('Lorem') && text.length > 5) {
            textContent.push(text.substring(0, 50));
          }
        });
        result.textContent = textContent;
      }
      
      return result;
    });
    
    console.log('\nRender result:');
    console.log('  Children count:', renderResult.childrenCount);
    console.log('  First child:', renderResult.firstChildTag);
    console.log('  Dimensions:', renderResult.firstChildDimensions);
    console.log('  Has error:', renderResult.hasError);
    console.log('  Has "No regions":', renderResult.hasNoRegions);
    console.log('  Has "Loading":', renderResult.hasLoading);
    console.log('  Text content found:', renderResult.textContent ? renderResult.textContent.length : 0);
    
    if (renderResult.textContent && renderResult.textContent.length > 0) {
      console.log('  Text samples:', renderResult.textContent.slice(0, 3));
    }
    
    // Take screenshot
    await page.screenshot({ path: 'production-debug-result.png' });
    console.log('\n📸 Screenshot saved: production-debug-result.png');
    
    // Keep browser open for inspection
    console.log('\n⏸️  Browser will stay open for 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
    server.close();
  }
}

// Run the debug
debugProductionRender().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
