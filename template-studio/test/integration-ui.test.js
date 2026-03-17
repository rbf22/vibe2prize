import assert from 'node:assert';
import { describe, it, beforeEach, afterEach } from 'node:test';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;
import * as path from 'node:path';
import * as fs from 'node:fs';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.join(__dirname, '..', '..');
const HTML_PATH = path.join(ROOT, 'template-studio', 'grid-template-studio.html');

describe('Grid Template Studio Integration', () => {
  let dom;
  let window;
  let document;

  beforeEach(async () => {
    const html = fs.readFileSync(HTML_PATH, 'utf8');
    const virtualConsole = new jsdom.VirtualConsole().sendTo(console);
    dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: `file://${HTML_PATH}`,
      virtualConsole
    });
    window = dom.window;
    document = window.document;

    // Mock Canvas and other APIs not in JSDOM
    if (!window.HTMLCanvasElement.prototype.getContext) {
      window.HTMLCanvasElement.prototype.getContext = () => ({
        fillRect: () => {},
        clearRect: () => {},
        getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: () => {},
        createImageData: () => ({ data: new Uint8ClampedArray(0) }),
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {},
        arc: () => {},
        closePath: () => {},
      });
    }

    // Wait for scripts to load and app to initialize (with a timeout)
    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log('Final state check before timeout:', {
            hasTemplateStudio: !!window.TemplateStudio,
            initialized: window.TemplateStudio?.__initialized,
            initComposer: typeof window.initComposer
          });
          reject(new Error('Initialization timed out'));
        }, 5000);
        const check = () => {
            if (window.TemplateStudio && window.TemplateStudio.__initialized) {
                clearTimeout(timeout);
                resolve();
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    });
  });

  afterEach(() => {
    if (dom) {
      dom.window.close();
    }
  });

  it('should initialize successfully', () => {
    assert.ok(window.TemplateStudio, 'TemplateStudio global should be defined');
    assert.ok(window.TemplateStudio.__initialized, 'TemplateStudio should be initialized');
    assert.ok(typeof window.initComposer === 'function', 'initComposer should be defined');
  });

  it('should switch tabs correctly', () => {
    const designTab = document.getElementById('designTab');
    const composeTab = document.getElementById('composeTab');
    const designView = document.getElementById('designView');
    const composerView = document.getElementById('composerView');

    assert.strictEqual(designTab.classList.contains('active'), true);
    assert.strictEqual(composeTab.classList.contains('active'), false);
    assert.strictEqual(designView.style.display, 'flex');
    assert.strictEqual(composerView.style.display, 'none');

    // Click composer tab
    composeTab.click();

    assert.strictEqual(designTab.classList.contains('active'), false);
    assert.strictEqual(composeTab.classList.contains('active'), true);
    assert.strictEqual(designView.style.display, 'none');
    assert.strictEqual(composerView.style.display, 'grid');
  });

  it('should update grid columns state on input change', () => {
    const columnCountInput = document.getElementById('columnCount');

    columnCountInput.value = '50';
    columnCountInput.dispatchEvent(new window.Event('input'));

    assert.strictEqual(window.TemplateStudio.state.columns, 50);
  });

  it('should update grid rows state on input change', () => {
    const rowCountInput = document.getElementById('rowCount');

    rowCountInput.value = '30';
    rowCountInput.dispatchEvent(new window.Event('input'));

    assert.strictEqual(window.TemplateStudio.state.rows, 30);
  });
});
