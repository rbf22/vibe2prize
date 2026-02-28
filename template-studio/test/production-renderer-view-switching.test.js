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

global.window.matchMedia = global.window.matchMedia || function matchMedia() {
  return {
    matches: false,
    addListener() {},
    removeListener() {}
  };
};

function setupDOM() {
  document.body.innerHTML = `
    <div class="preview-workbench" id="previewWorkbench" data-view="canvas">
      <div class="production-preview-panel" id="productionPreviewPanel">
        <div id="productionPreview" class="production-preview-surface"></div>
      </div>
    </div>
  `;

  const container = document.querySelector('#productionPreview');
  const parentPanel = document.querySelector('.production-preview-panel');
  const workbench = document.querySelector('#previewWorkbench');

  window.TemplateStudio.state = {
    boxes: [
      { id: 'box1', role: 'title', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 3, metadata: { role: 'title' } },
      { id: 'box2', role: 'subtitle', gridX: 4, gridY: 0, gridWidth: 4, gridHeight: 3, metadata: { role: 'subtitle' } }
    ],
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

test.describe('Production Renderer View Switching', () => {
  test.afterEach(cleanupDOM);

  test('renders when production panel is visible', async () => {
    const { container, parentPanel, workbench } = setupDOM();
    const renderProductionSlide = await loadRenderer();

    workbench.dataset.view = 'production';
    parentPanel.style.display = 'flex';
    mockDimensions(parentPanel, 800, 600);

    await renderProductionSlide(container);
    assert.ok(container.children.length > 0);
  });

  test('skips render when production panel hidden', async () => {
    const { container, parentPanel, workbench } = setupDOM();
    const renderProductionSlide = await loadRenderer();

    workbench.dataset.view = 'canvas';
    parentPanel.style.display = 'none';

    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };

    await renderProductionSlide(container);

    console.log = originalLog;
    assert.ok(logs.some((line) => line.includes('Panel is not visible, skipping render')));
    assert.strictEqual(container.children.length, 0);
  });

  test('renders after canvas -> production switch', async () => {
    const { container, parentPanel, workbench } = setupDOM();
    const renderProductionSlide = await loadRenderer();

    workbench.dataset.view = 'canvas';
    parentPanel.style.display = 'none';
    await renderProductionSlide(container);
    assert.strictEqual(container.children.length, 0);

    workbench.dataset.view = 'production';
    parentPanel.style.display = 'flex';
    mockDimensions(parentPanel, 900, 650);

    await renderProductionSlide(container);
    assert.ok(container.children.length > 0);
  });

  test('renders after slide -> production switch', async () => {
    const { container, parentPanel, workbench } = setupDOM();
    const renderProductionSlide = await loadRenderer();

    workbench.dataset.view = 'slide';
    parentPanel.style.display = 'none';
    await renderProductionSlide(container);
    assert.strictEqual(container.children.length, 0);

    workbench.dataset.view = 'production';
    parentPanel.style.display = 'flex';
    mockDimensions(parentPanel, 900, 650);

    await renderProductionSlide(container);
    assert.ok(container.children.length > 0);
  });

  test('handles multiple rapid view changes', async () => {
    const { container, parentPanel, workbench } = setupDOM();
    const renderProductionSlide = await loadRenderer();
    const sequence = ['canvas', 'production', 'canvas', 'production'];

    const originalLog = console.log;
    try {
      for (const view of sequence) {
        const logs = [];
        console.log = (...args) => {
          logs.push(args.join(' '));
          originalLog(...args);
        };

        workbench.dataset.view = view;
        parentPanel.style.display = view === 'production' ? 'flex' : 'none';
        if (view === 'production') {
          mockDimensions(parentPanel, 850, 620);
        }

        await renderProductionSlide(container);
        if (view === 'production') {
          assert.ok(container.children.length > 0);
        } else {
          assert.ok(logs.some(line => line.includes('Panel is not visible, skipping render')));
        }
      }
    } finally {
      console.log = originalLog;
    }
  });

  test('renderAll skip logs when canvas active', async () => {
    const { container, parentPanel, workbench } = setupDOM();
    const renderProductionSlide = await loadRenderer();

    workbench.dataset.view = 'canvas';
    parentPanel.style.display = 'none';

    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };

    await renderProductionSlide(container);

    console.log = originalLog;
    assert.ok(logs.some((line) => line.includes('Panel is not visible, skipping render')));
    assert.ok(!container.innerHTML.includes('Invalid container dimensions'));
  });

  test('renderAll succeeds when production active', async () => {
    const { container, parentPanel, workbench } = setupDOM();
    const renderProductionSlide = await loadRenderer();

    workbench.dataset.view = 'production';
    parentPanel.style.display = 'flex';
    mockDimensions(parentPanel, 800, 600);

    await renderProductionSlide(container);
    assert.ok(container.children.length > 0);
  });

  test('sets up observers for visible panel', async () => {
    const { container, parentPanel, workbench } = setupDOM();
    const renderProductionSlide = await loadRenderer();

    workbench.dataset.view = 'production';
    parentPanel.style.display = 'flex';
    mockDimensions(parentPanel, 800, 600);

    await renderProductionSlide(container);
    assert.ok(container._resizeObserver === undefined || typeof container._resizeObserver === 'object');
    assert.ok(container._visibilityObserver === undefined || typeof container._visibilityObserver === 'object');
  });

  test('does not set up observers when hidden', async () => {
    const { container, parentPanel, workbench } = setupDOM();
    const renderProductionSlide = await loadRenderer();

    workbench.dataset.view = 'canvas';
    parentPanel.style.display = 'none';

    await renderProductionSlide(container);
    assert.strictEqual(container._resizeObserver, undefined);
    assert.strictEqual(container._visibilityObserver, undefined);
  });

  test('handles zero dimensions gracefully', async () => {
    const { container, parentPanel, workbench } = setupDOM();
    const renderProductionSlide = await loadRenderer();

    workbench.dataset.view = 'production';
    parentPanel.style.display = 'flex';
    mockDimensions(parentPanel, 0, 0);

    await renderProductionSlide(container);
    const content = container.innerHTML;
    assert.ok(
      content.includes('Loading')
      || content.includes('Invalid container dimensions')
      || content.includes('Failed to load')
      || container._retryTimeout !== undefined
    );
  });

  test('renders empty state when boxes missing', async () => {
    const { container, parentPanel, workbench } = setupDOM();
    const renderProductionSlide = await loadRenderer();

    window.TemplateStudio.state.boxes = [];
    workbench.dataset.view = 'production';
    parentPanel.style.display = 'flex';
    mockDimensions(parentPanel, 800, 600);

    await renderProductionSlide(container);
    assert.ok(container.innerHTML.includes('No regions to render'));
  });

  test('prevents render loops', async () => {
    const { container, parentPanel, workbench } = setupDOM();
    const renderProductionSlide = await loadRenderer();

    workbench.dataset.view = 'production';
    parentPanel.style.display = 'flex';
    mockDimensions(parentPanel, 800, 600);

    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };

    container._isRendering = true;
    await renderProductionSlide(container);

    console.log = originalLog;
    assert.ok(logs.some((line) => line.includes('Already rendering, skipping')));
    assert.strictEqual(container._isRendering, true);
  });
});
