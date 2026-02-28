import test from 'node:test';
import assert from 'node:assert';
import puppeteer from 'puppeteer';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import url, { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_PORT = 3000;

async function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const uri = url.parse(req.url).pathname || '/';
      let filename;
      if (uri === '/') {
        filename = path.join(__dirname, '..', 'grid-template-studio.html');
      } else if (uri.startsWith('/core/') || uri.startsWith('/templates/')) {
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
        res.end('Forbidden');
        return;
      }

      fs.readFile(filename, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('File not found');
          return;
        }

        const ext = path.extname(filename);
        const contentType = ext === '.js'
          ? 'application/javascript'
          : ext === '.css'
            ? 'text/css'
            : ext === '.json'
              ? 'application/json'
              : 'text/html';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });

    srv.listen(SERVER_PORT, () => resolve(srv));
  });
}

async function ensureStudioReady(page) {
  await page.goto(`http://localhost:${SERVER_PORT}`);
  await page.waitForFunction(() => window.TemplateStudio && window.TemplateStudio.state, { timeout: 10000 });

  await page.evaluate(() => {
    if (window.TemplateStudio.state.boxes.length === 0) {
      window.TemplateStudio.addNewRegion();
      window.TemplateStudio.addNewRegion();
    }
  });
}

async function hasProductionContent(page) {
  return page.evaluate(() => {
    const container = document.querySelector('#productionPreview');
    return container.children.length > 0
      && !container.innerHTML.includes('Invalid')
      && !container.innerHTML.includes('Loading');
  });
}

async function switchToView(page, view, waitMs = 200) {
  await page.click(`[data-preview-view="${view}"]`);
  await waitForDelay(page, waitMs);
}

async function waitForDelay(page, ms = 100) {
  if (typeof page.waitForTimeout === 'function') {
    await page.waitForTimeout(ms);
  } else {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

test.describe('Production Renderer Integration Tests', () => {
  let server;
  let browser;
  let page;

  test.before(async () => {
    server = await startServer();
  });

  test.after(async () => {
    if (server) {
      server.close();
      server = null;
    }
  });

  test.beforeEach(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    if (browser) {
      await browser.close();
      browser = null;
    }
  });

  test('renders production view on initial load', async () => {
    await ensureStudioReady(page);
    await switchToView(page, 'production', 300);
    assert.strictEqual(await hasProductionContent(page), true);
  });

  test('handles canvas -> production -> canvas -> production switches', async () => {
    await ensureStudioReady(page);

    await switchToView(page, 'production', 300);
    assert.strictEqual(await hasProductionContent(page), true);

    await switchToView(page, 'canvas');
    await page.evaluate(() => window.TemplateStudio.addNewRegion());
    await waitForDelay(page, 200);

    await switchToView(page, 'production', 300);
    assert.strictEqual(await hasProductionContent(page), true);

    await switchToView(page, 'canvas');
    await page.evaluate(() => {
      if (window.TemplateStudio.state.selectedBoxId) {
        window.TemplateStudio.deleteSelectedRegion();
      }
    });
    await waitForDelay(page, 200);

    await switchToView(page, 'production', 300);
    assert.strictEqual(await hasProductionContent(page), true);
  });

  test('handles slide -> production switches', async () => {
    await ensureStudioReady(page);
    await switchToView(page, 'slide');
    await page.evaluate(() => window.TemplateStudio.addNewRegion());
    await waitForDelay(page, 200);
    await switchToView(page, 'production', 300);
    assert.strictEqual(await hasProductionContent(page), true);
  });

  test('handles rapid view switches', async () => {
    await ensureStudioReady(page);

    for (let i = 0; i < 3; i += 1) {
      await switchToView(page, 'canvas', 50);
      await switchToView(page, 'production', 200);
      assert.strictEqual(await hasProductionContent(page), true);

      await switchToView(page, 'slide', 50);
      await switchToView(page, 'production', 200);
      assert.strictEqual(await hasProductionContent(page), true);
    }
  });

  test('skips render when panel hidden', async () => {
    await ensureStudioReady(page);
    await switchToView(page, 'canvas');

    const logs = [];
    const listener = (msg) => {
      if (msg.text().includes('Panel is not visible, skipping render')) {
        logs.push(msg.text());
      }
    };
    page.on('console', listener);

    await page.evaluate(() => {
      window.TemplateStudio.renderProductionSlide(document.querySelector('#productionPreview'));
    });
    await waitForDelay(page, 100);

    assert.ok(logs.length > 0, 'Should log skip message');
    const childrenCount = await page.evaluate(() => document.querySelector('#productionPreview').children.length);
    assert.strictEqual(childrenCount, 0);

    page.off('console', listener);
  });

  test('resizes when container dimensions change', async () => {
    await ensureStudioReady(page);
    await switchToView(page, 'production', 300);

    const getDimensions = async () => page.evaluate(() => {
      const child = document.querySelector('#productionPreview')?.firstElementChild;
      return { width: child?.offsetWidth || 0, height: child?.offsetHeight || 0 };
    });

    const initial = await getDimensions();

    await page.evaluate(() => {
      const panel = document.querySelector('.production-preview-panel');
      panel.style.width = '600px';
      panel.style.height = '400px';
    });
    await waitForDelay(page, 200);

    const updated = await getDimensions();
    assert.notStrictEqual(updated.width, initial.width);
    assert.notStrictEqual(updated.height, initial.height);
  });
});
