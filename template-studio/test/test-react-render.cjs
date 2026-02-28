// Quick test to check React render issue
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
          res.end('File not found: ' + uri); 
          return; 
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
    server.listen(3000, () => resolve(server));
  });
}

async function testReactRender() {
  console.log('🔍 Testing React Render Issue\n');
  const server = await startServer();
  const browser = await puppeteer.launch({ headless: false });
  
  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('  ', msg.text()));
    
    await page.goto('http://localhost:3000');
    await page.waitForSelector('#productionPreview');
    
    // Add regions if needed
    await page.evaluate(() => {
      if (window.TemplateStudio.state.boxes.length === 0) {
        window.TemplateStudio.addNewRegion();
        window.TemplateStudio.addNewRegion();
      }
    });
    
    // Switch to production
    await page.click('[data-preview-view="production"]');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check React render result
    const result = await page.evaluate(() => {
      const container = document.querySelector('#productionPreview');
      return {
        children: container.children.length,
        innerHTML: container.innerHTML.substring(0, 200),
        hasRoot: !!container._productionRoot,
        isRendering: container._isRendering
      };
    });
    
    console.log('\nResult:', result);
    
    await page.screenshot({ path: 'react-render-test.png' });
    console.log('\n📸 Screenshot saved');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
    server.close();
  }
}

testReactRender();
