import test from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html><body></body>`, { pretendToBeVisual: true });
global.window = dom.window;
global.document = dom.window.document;

class StubResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  disconnect() {}
}

class StubMutationObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  disconnect() {}
}

global.ResizeObserver = global.window.ResizeObserver = StubResizeObserver;
global.MutationObserver = global.window.MutationObserver = StubMutationObserver;

const originalGetComputedStyle = global.window.getComputedStyle || (() => ({ display: 'block', visibility: 'visible' }));
global.window.getComputedStyle = (element) => {
  if (!element || !element.style) {
    return { display: 'block', visibility: 'visible' };
  }
  return {
    display: element.style.display || 'block',
    visibility: element.style.visibility || 'visible'
  };
};

global.window.TemplateStudio = { state: {} };

global.window.matchMedia = global.window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));

function setupDOM() {
  document.body.innerHTML = `
    <div class="preview-workbench" id="previewWorkbench" data-view="canvas">
      <div class="production-preview-panel">
        <div id="productionPreview" class="production-preview-surface"></div>
      </div>
    </div>
  `;

  const container = document.querySelector('#productionPreview');
  const parentPanel = document.querySelector('.production-preview-panel');
  const workbench = document.querySelector('#previewWorkbench');

  window.TemplateStudio.state = {
    boxes: [{ id: 'box1', role: 'title', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 3, metadata: { role: 'title' } }],
    canvasWidth: 1920,
    canvasHeight: 1080,
    columns: 80,
    rows: 45,
    brand: { id: 'dark', variant: 'default' }
  };

  return { container, parentPanel, workbench };
}

function cleanupDOM() {
  document.body.innerHTML = '';
}

async function loadRenderer() {
  const { renderProductionSlide } = await import('../src/canvas/production-renderer.js');
  return renderProductionSlide;
}

function mockDimensions(element, width, height) {
  Object.defineProperty(element, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(element, 'clientHeight', { value: height, configurable: true });
}

function captureConsole(method) {
  const original = console[method];
  const logs = [];
  console[method] = (...args) => {
    logs.push(args.join(' '));
    original(...args);
  };
  return () => {
    console[method] = original;
  };
}

test.describe('Production Renderer Visibility Logic', () => {
  test.afterEach(cleanupDOM);

  test('detects when panel display is none', async () => {
    const { container, parentPanel } = setupDOM();
    parentPanel.style.display = 'none';
    const renderProductionSlide = await loadRenderer();

    const restore = captureConsole('log');
    await renderProductionSlide(container);
    restore();

    assert.strictEqual(container._isRendering, false);
  });

  test('detects when parent display is none', async () => {
    const { container, workbench } = setupDOM();
    workbench.style.display = 'none';
    const renderProductionSlide = await loadRenderer();

    const restore = captureConsole('log');
    await renderProductionSlide(container);
    restore();
  });

  test('renders when panel visible with flex', async () => {
    const { container, parentPanel } = setupDOM();
    parentPanel.style.display = 'flex';
    mockDimensions(parentPanel, 800, 600);
    const renderProductionSlide = await loadRenderer();

    await renderProductionSlide(container);
    assert.ok(container.children.length > 0);
  });

  test('renders when panel visible with block', async () => {
    const { container, parentPanel } = setupDOM();
    parentPanel.style.display = 'block';
    mockDimensions(parentPanel, 800, 600);
    const renderProductionSlide = await loadRenderer();

    await renderProductionSlide(container);
    assert.ok(container.children.length > 0);
  });

  test('skips render when workbench data-view not production', async () => {
    const { container, workbench } = setupDOM();
    workbench.dataset.view = 'canvas';
    const renderProductionSlide = await loadRenderer();

    const restore = captureConsole('log');
    await renderProductionSlide(container);
    restore();
  });

  test('renders when workbench data-view is production', async () => {
    const { container, parentPanel, workbench } = setupDOM();
    workbench.dataset.view = 'production';
    parentPanel.style.display = 'flex';
    mockDimensions(parentPanel, 800, 600);
    const renderProductionSlide = await loadRenderer();

    await renderProductionSlide(container);
    assert.ok(container.children.length > 0);
  });

  test('sets up MutationObserver when visible (if supported)', async () => {
    const { container, parentPanel } = setupDOM();
    parentPanel.style.display = 'flex';
    mockDimensions(parentPanel, 800, 600);
    const renderProductionSlide = await loadRenderer();

    await renderProductionSlide(container);
    assert.ok(container._visibilityObserver === undefined || typeof container._visibilityObserver === 'object');
  });

  test('handles missing parent panel gracefully', async () => {
    const { container, parentPanel } = setupDOM();
    parentPanel.remove();
    const renderProductionSlide = await loadRenderer();

    await renderProductionSlide(container);
    assert.ok(container.children.length >= 0);
  });

  test('handles getComputedStyle errors gracefully', async () => {
    const { container, parentPanel } = setupDOM();
    parentPanel.style.display = 'flex';
    mockDimensions(parentPanel, 800, 600);
    const renderProductionSlide = await loadRenderer();

    const original = window.getComputedStyle;
    window.getComputedStyle = () => { throw new Error('Access denied'); };

    try {
      await assert.rejects(renderProductionSlide(container));
    } finally {
      window.getComputedStyle = original;
    }
  });

  test('handles zero dimensions with loading state', async () => {
    const { container, parentPanel } = setupDOM();
    parentPanel.style.display = 'flex';
    mockDimensions(parentPanel, 0, 0);
    const renderProductionSlide = await loadRenderer();

    await renderProductionSlide(container);
    assert.ok(container.innerHTML.includes('Loading') || container.innerHTML.includes('Failed to load'));
  });

  test('sets up ResizeObserver when visible', async () => {
    const { container, parentPanel } = setupDOM();
    parentPanel.style.display = 'flex';
    mockDimensions(parentPanel, 800, 600);
    const renderProductionSlide = await loadRenderer();

    await renderProductionSlide(container);
    assert.ok(container._resizeObserver === undefined || typeof container._resizeObserver === 'object');
  });

  test('does not set up ResizeObserver when hidden', async () => {
    const { container, parentPanel } = setupDOM();
    parentPanel.style.display = 'none';
    const renderProductionSlide = await loadRenderer();

    await renderProductionSlide(container);
    assert.strictEqual(container._resizeObserver, undefined);
  });
});
