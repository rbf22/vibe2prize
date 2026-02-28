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
        // Templates are in the parent's parent directory
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

async function testAndFixProductionRenderer() {
  console.log('🔧 Testing and Fixing Production Renderer\n');
  
  const server = await startServer();
  const browser = await puppeteer.launch({ headless: false });
  
  try {
    const page = await browser.newPage();
    
    // Capture all console output
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      if (text.includes('error') || text.includes('Error') || text.includes('failed')) {
        console.error('❌', text);
      } else if (text.includes('✅')) {
        console.log('✅', text);
      } else {
        console.log('  ', text);
      }
    });
    
    page.on('pageerror', error => {
      console.error('💥 Page Error:', error.message);
      logs.push('ERROR: ' + error.message);
    });
    
    // Navigate to the page
    await page.goto('http://localhost:3000');
    
    // Wait for initial load
    await page.waitForSelector('#productionPreview', { timeout: 10000 });
    
    // Switch to production view
    await page.evaluate(() => {
      document.getElementById('previewWorkbench').setAttribute('data-view', 'production');
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if TemplateStudio loaded properly
    const studioStatus = await page.evaluate(() => {
      return {
        hasTemplateStudio: !!window.TemplateStudio,
        hasRenderProductionSlide: !!(window.TemplateStudio && window.TemplateStudio.renderProductionSlide),
        availableMethods: window.TemplateStudio ? Object.keys(window.TemplateStudio).filter(k => typeof window.TemplateStudio[k] === 'function') : []
      };
    });
    
    console.log('\n📊 TemplateStudio Status:');
    console.log('  Has TemplateStudio:', studioStatus.hasTemplateStudio);
    console.log('  Has renderProductionSlide:', studioStatus.hasRenderProductionSlide);
    console.log('  Available methods:', studioStatus.availableMethods);
    
    if (!studioStatus.hasRenderProductionSlide) {
      console.log('\n🔧 Attempting to fix production renderer...');
      
      // Try to manually load the production renderer
      await page.evaluate(() => {
        const script = document.createElement('script');
        script.type = 'module';
        script.textContent = `
          import { renderProductionSlide } from './src/canvas/production-renderer.js';
          if (window.TemplateStudio) {
            window.TemplateStudio.renderProductionSlide = renderProductionSlide;
            console.log('✅ Production renderer manually loaded');
          }
        `;
        document.head.appendChild(script);
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check again
      const hasRenderer = await page.evaluate(() => !!(window.TemplateStudio && window.TemplateStudio.renderProductionSlide));
      console.log('  After fix - Has renderProductionSlide:', hasRenderer);
    }
    
    // Try to render
    console.log('\n🎨 Attempting to render...');
    const renderResult = await page.evaluate(() => {
      const container = document.querySelector('#productionPreview');
      if (!container) return { success: false, error: 'Container not found' };
      
      try {
        if (window.TemplateStudio && window.TemplateStudio.renderProductionSlide) {
          window.TemplateStudio.renderProductionSlide(container);
          return { success: true };
        } else {
          return { success: false, error: 'renderProductionSlide not available' };
        }
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    console.log('  Render result:', renderResult);
    
    // Check what was rendered
    await new Promise(resolve => setTimeout(resolve, 1000));
    const contentInfo = await page.evaluate(() => {
      const container = document.querySelector('#productionPreview');
      return {
        childrenCount: container.children.length,
        innerHTML: container.innerHTML.substring(0, 200) + '...',
        firstChildTag: container.firstElementChild?.tagName,
        firstChildDimensions: container.firstElementChild ? {
          width: container.firstElementChild.offsetWidth,
          height: container.firstElementChild.offsetHeight
        } : null
      };
    });
    
    console.log('\n📦 Content Info:');
    console.log('  Children count:', contentInfo.childrenCount);
    console.log('  First child:', contentInfo.firstChildTag);
    console.log('  Dimensions:', contentInfo.firstChildDimensions);
    
    // Take screenshot
    await page.screenshot({ path: 'production-renderer-result.png' });
    console.log('\n📸 Screenshot saved: production-renderer-result.png');
    
    // Test resize
    console.log('\n📏 Testing resize...');
    await page.evaluate(() => {
      const panel = document.querySelector('.production-preview-panel');
      panel.style.width = '600px';
      panel.style.height = '450px';
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const afterResize = await page.evaluate(() => {
      const container = document.querySelector('#productionPreview');
      const child = container.firstElementChild;
      return child ? {
        width: child.offsetWidth,
        height: child.offsetHeight
      } : null;
    });
    
    console.log('  After resize dimensions:', afterResize);
    
    console.log('\n✅ Test completed! Check the screenshot.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
    server.close();
  }
}

// Run the test
testAndFixProductionRenderer().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
