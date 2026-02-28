const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const url = require('url');

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
  console.log('🧪 Testing View Switching with renderAll() calls\n');
  
  const server = await startServer();
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null
  });
  
  try {
    const page = await browser.newPage();
    
    // Capture console output
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Production render:') || 
          text.includes('skipping render') ||
          text.includes('✅') ||
          text.includes('❌')) {
        console.log('  ', text);
      }
    });
    
    await page.goto('http://localhost:3000');
    await page.waitForSelector('#productionPreview');
    
    // Wait for TemplateStudio to load
    await page.waitForFunction(() => window.TemplateStudio && window.TemplateStudio.state, { timeout: 10000 });
    
    // Ensure we have regions
    await page.evaluate(() => {
      if (window.TemplateStudio.state.boxes.length === 0) {
        window.TemplateStudio.addNewRegion();
        window.TemplateStudio.addNewRegion();
      }
    });
    
    // Test 1: Initial production render
    console.log('\n1. Initial production render...');
    await page.click('[data-preview-view="production"]');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let hasContent = await page.evaluate(() => {
      const container = document.querySelector('#productionPreview');
      return container.children.length > 0 && !container.innerHTML.includes('Invalid');
    });
    console.log('   Initial render:', hasContent ? '✅ SUCCESS' : '❌ FAILED');
    
    // Test 2: Switch to canvas (this triggers renderAll)
    console.log('\n2. Switch to canvas...');
    await page.click('[data-preview-view="canvas"]');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Add a region to trigger renderAll
    await page.evaluate(() => {
      window.TemplateStudio.addNewRegion();
    });
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Test 3: Switch back to production
    console.log('\n3. Switch back to production...');
    await page.click('[data-preview-view="production"]');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    hasContent = await page.evaluate(() => {
      const container = document.querySelector('#productionPreview');
      return container.children.length > 0 && !container.innerHTML.includes('Invalid');
    });
    console.log('   After canvas switch:', hasContent ? '✅ SUCCESS' : '❌ FAILED');
    
    // Test 4: Switch to slide and back
    console.log('\n4. Switch to slide...');
    await page.click('[data-preview-view="slide"]');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Delete region to trigger renderAll
    await page.evaluate(() => {
      if (window.TemplateStudio.state.selectedBoxId) {
        window.TemplateStudio.deleteSelectedRegion();
      }
    });
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log('\n5. Switch back to production again...');
    await page.click('[data-preview-view="production"]');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    hasContent = await page.evaluate(() => {
      const container = document.querySelector('#productionPreview');
      return container.children.length > 0 && !container.innerHTML.includes('Invalid');
    });
    console.log('   After slide switch:', hasContent ? '✅ SUCCESS' : '❌ FAILED');
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
    server.close();
  }
}

testViewSwitching();
