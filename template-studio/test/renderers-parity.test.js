import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { state, resetState } from '../src/state.js';
import { renderSlidePreview } from '../src/canvas/rendered-view.js';
import { renderProductionSlide, cleanupProductionRender, __resetReactCacheForTests } from '../src/canvas/production-renderer.js';
import { applyBrandTheme } from '../src/branding/brands.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const previewCss = fs.readFileSync(path.resolve(__dirname, '../styles/main.css'), 'utf8');

function defineDimensions(element, width = 960, height = 540) {
  Object.defineProperty(element, 'clientWidth', {
    configurable: true,
    value: width
  });
  Object.defineProperty(element, 'clientHeight', {
    configurable: true,
    value: height
  });
  element.getBoundingClientRect = () => ({
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0
  });
}

function snapshotRegions(root) {
  const map = new Map();
  root.querySelectorAll('.slide-preview-region').forEach((region) => {
    const boxId = region.dataset.boxId;
    if (!boxId) {
      return;
    }
    const serializeStyles = (node, props) => {
      if (!node) return '';
      const computed = window.getComputedStyle(node);
      const pieces = props.map((prop) => {
        const value = computed.getPropertyValue(prop).trim();
        return `${prop}: ${value}`;
      });
      const hasValue = pieces.some((piece) => piece.includes(': ') && piece.split(': ')[1].trim().length);
      return hasValue ? pieces.join(';') : '';
    };
    const TYPO_PROPS = ['font-family', 'font-size', 'line-height', 'letter-spacing', 'text-transform', 'font-weight', 'margin', 'color'];
    const TABLE_PROPS = ['font-family', 'font-size', 'line-height', 'text-transform', 'letter-spacing', 'font-weight'];
    const copyNode = region.querySelector('.slide-preview-region-copy');
    const tableNode = region.querySelector('table');
    const headNode = region.querySelector('th');
    const bodyNode = region.querySelector('td');
    const imageNode = region.querySelector('.slide-preview-brand-asset');
    const entry = {
      role: region.dataset.role || 'unknown',
      padding: region.style.padding || '',
      justifyContent: region.style.justifyContent || '',
      alignItems: region.style.alignItems || '',
      copyStyle: serializeStyles(copyNode, TYPO_PROPS),
      tableStyle: serializeStyles(tableNode, TABLE_PROPS),
      tableHeadStyle: serializeStyles(headNode, TABLE_PROPS),
      tableBodyStyle: serializeStyles(bodyNode, TABLE_PROPS),
      imageStyle: serializeStyles(imageNode, ['width', 'height', 'object-fit'])
    };
    map.set(boxId, entry);
  });
  return map;
}

describe('Preview vs Production renderer parity', () => {
  let dom;
  let previewContainer;
  let productionContainer;

  beforeEach(() => {
    dom = new JSDOM(`<!DOCTYPE html><div id="preview"></div><div id="production"></div>`, {
      pretendToBeVisual: true,
      resources: 'usable'
    });
    global.window = dom.window;
    global.document = dom.window.document;
    global.HTMLElement = dom.window.HTMLElement;
    global.SVGElement = dom.window.SVGElement;
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    global.MutationObserver = class {
      observe() {}
      disconnect() {}
    };
    previewContainer = document.getElementById('preview');
    productionContainer = document.getElementById('production');
    defineDimensions(previewContainer);
    defineDimensions(productionContainer);

    const styleTag = document.createElement('style');
    styleTag.textContent = previewCss;
    document.head.appendChild(styleTag);

    // Force production renderer to use fallback path so markup lives in DOM synchronously
    if (global.window.React) {
      delete global.window.React;
    }
    if (global.window.ReactDOM) {
      delete global.window.ReactDOM;
    }
    if (typeof __resetReactCacheForTests === 'function') {
      __resetReactCacheForTests();
    }

    resetState();
    state.canvasWidth = 1920;
    state.canvasHeight = 1080;
    state.columns = 80;
    state.rows = 45;
    state.brand = { id: 'default', variant: 'dark' };
    state.metadata = {};
    applyBrandTheme(state.brand.id, state.brand.variant);

    const sampleBoxes = [
      {
        id: 'region-title',
        role: 'primary-title',
        gridX: 0,
        gridY: 0,
        gridWidth: 40,
        gridHeight: 6,
        metadata: { role: 'primary-title' }
      },
      {
        id: 'region-table',
        role: 'data-table',
        gridX: 0,
        gridY: 6,
        gridWidth: 40,
        gridHeight: 12,
        metadata: {
          role: 'data-table',
          previewTable: {
            columns: ['Column A', 'Column B'],
            rows: [
              ['Alpha', 'Beta'],
              ['Gamma', 'Delta']
            ]
          }
        }
      },
      {
        id: 'region-logo',
        role: 'logo',
        gridX: 42,
        gridY: 0,
        gridWidth: 12,
        gridHeight: 8,
        metadata: { role: 'logo', inputType: 'image' }
      },
      {
        id: 'region-footer',
        role: 'footer',
        gridX: 0,
        gridY: 38,
        gridWidth: 80,
        gridHeight: 7,
        metadata: { role: 'footer' }
      }
    ];

    state.boxes = sampleBoxes;
    sampleBoxes.forEach((box) => {
      state.metadata[box.id] = box.metadata;
    });
  });

  afterEach(() => {
    cleanupProductionRender(productionContainer);
    dom.window.close();
  });

  test('regions maintain matching padding, typography, and asset sizing', async () => {
    renderSlidePreview(previewContainer);
    await renderProductionSlide(productionContainer);
    const previewRegions = snapshotRegions(previewContainer);
    const productionRegions = snapshotRegions(productionContainer);
    assert.strictEqual(previewRegions.size, productionRegions.size, 'Region count mismatch between renderers');
    previewRegions.forEach((previewData, boxId) => {
      const prodData = productionRegions.get(boxId);
      assert(prodData, `Missing region ${boxId} in production renderer`);
      assert.strictEqual(prodData.role, previewData.role, `Role mismatch for ${boxId}`);
      assert.strictEqual(prodData.padding, previewData.padding, `Padding mismatch for ${boxId}`);
      assert.strictEqual(prodData.justifyContent, previewData.justifyContent, `justify-content mismatch for ${boxId}`);
      assert.strictEqual(prodData.alignItems, previewData.alignItems, `align-items mismatch for ${boxId}`);
      if (previewData.copyStyle || prodData.copyStyle) {
        assert.strictEqual(prodData.copyStyle, previewData.copyStyle, `Typography style mismatch for ${boxId}`);
      }
      if (previewData.tableStyle || prodData.tableStyle) {
        assert.strictEqual(prodData.tableStyle, previewData.tableStyle, `Table style mismatch for ${boxId}`);
        assert.strictEqual(prodData.tableHeadStyle, previewData.tableHeadStyle, `Table head style mismatch for ${boxId}`);
        assert.strictEqual(prodData.tableBodyStyle, previewData.tableBodyStyle, `Table body style mismatch for ${boxId}`);
      }
      if (previewData.imageStyle || prodData.imageStyle) {
        assert.strictEqual(prodData.imageStyle, previewData.imageStyle, `Brand asset style mismatch for ${boxId}`);
      }
    });
  });

  test('logo regions have zero padding to preserve full height', async () => {
    renderSlidePreview(previewContainer);
    await renderProductionSlide(productionContainer);
    const previewLogo = previewContainer.querySelector('[data-role="logo"]');
    assert(previewLogo, 'Preview logo region should exist');
    assert.strictEqual(previewLogo.style.padding, '0px', 'Preview logo region should not apply padding');

    const productionLogo = productionContainer.querySelector('[data-role="logo"]');
    assert(productionLogo, 'Production logo region should exist');
    const productionStyle = productionLogo.getAttribute('style') || '';
    assert(
      productionStyle.includes('padding: 0px'),
      `Production logo region padding should be 0px. Received style: ${productionStyle}`
    );
  });

  test('logo region keeps a 1px transparent preview border for layout parity', async () => {
    renderSlidePreview(previewContainer);
    await renderProductionSlide(productionContainer);

    const previewLogo = previewContainer.querySelector('[data-role="logo"]');
    assert(previewLogo, 'Preview logo region should exist');
    const previewStyles = window.getComputedStyle(previewLogo);
    assert.strictEqual(
      previewStyles.getPropertyValue('border-top-width'),
      '1px',
      'Preview logo region must keep a 1px border so removing it fails tests'
    );

    const productionLogo = productionContainer.querySelector('[data-role="logo"]');
    assert(productionLogo, 'Production logo region should exist');
    const productionStyles = window.getComputedStyle(productionLogo);
    assert.strictEqual(
      productionStyles.getPropertyValue('border-top-width'),
      '0px',
      'Production logo region should remain visually borderless'
    );
  });

  test('logo region maintains matching bounds between preview and production', async () => {
    renderSlidePreview(previewContainer);
    await renderProductionSlide(productionContainer);

    const previewLogo = previewContainer.querySelector('[data-role="logo"]');
    assert(previewLogo, 'Preview logo region should exist');
    const productionLogo = productionContainer.querySelector('[data-role="logo"]');
    assert(productionLogo, 'Production logo region should exist');

    const previewRect = previewLogo.getBoundingClientRect();
    const productionRect = productionLogo.getBoundingClientRect();

    const deltas = {
      left: Math.abs(previewRect.left - productionRect.left),
      top: Math.abs(previewRect.top - productionRect.top),
      width: Math.abs(previewRect.width - productionRect.width),
      height: Math.abs(previewRect.height - productionRect.height)
    };

    console.info('logo region bounds', {
      preview: { left: previewRect.left, top: previewRect.top, width: previewRect.width, height: previewRect.height },
      production: { left: productionRect.left, top: productionRect.top, width: productionRect.width, height: productionRect.height },
      deltas
    });

    assert(
      deltas.left <= 1 && deltas.top <= 1 && deltas.width <= 1 && deltas.height <= 1,
      `Logo region bounds mismatch: ${JSON.stringify(deltas)}`
    );
  });

  test('reports preview vs production board dimensions', async () => {
    renderSlidePreview(previewContainer);
    await renderProductionSlide(productionContainer);

    const previewBoard = previewContainer.querySelector('.slide-preview-grid');
    assert(previewBoard, 'Preview board should exist');
    const productionBoard = productionContainer.firstElementChild;
    assert(productionBoard, 'Production board should exist');

    const parseDimension = (node, prop) => {
      if (!node) return 0;
      const styleAttr = node.getAttribute('style') || '';
      const regex = new RegExp(`${prop}\\s*:\\s*([^;]+)`);
      const match = styleAttr.match(regex);
      if (!match) return 0;
      const value = parseFloat(match[1]);
      return Number.isFinite(value) ? value : 0;
    };

    const previewDimensions = {
      width: parseDimension(previewBoard, 'width'),
      height: parseDimension(previewBoard, 'height')
    };

    const productionDimensions = {
      width: parseDimension(productionBoard, 'width'),
      height: parseDimension(productionBoard, 'height')
    };

    console.info('Renderer board dimensions (px):', {
      preview: previewDimensions,
      production: productionDimensions
    });

    const widthDelta = Math.abs(previewDimensions.width - productionDimensions.width);
    const heightDelta = Math.abs(previewDimensions.height - productionDimensions.height);

    assert(
      widthDelta <= 1 && heightDelta <= 1,
      `Board dimension mismatch. Preview ${previewDimensions.width}x${previewDimensions.height} vs Production ${productionDimensions.width}x${productionDimensions.height}`
    );
  });

  test('region-title maintains matching left/width bounds', async () => {
    renderSlidePreview(previewContainer);
    await renderProductionSlide(productionContainer);

    const previewRegion = previewContainer.querySelector('[data-box-id="region-title"]');
    assert(previewRegion, 'Preview region-title must exist');
    const productionRegion = productionContainer.querySelector('[data-box-id="region-title"]');
    assert(productionRegion, 'Production region-title must exist');

    const previewRect = previewRegion.getBoundingClientRect();
    const productionRect = productionRegion.getBoundingClientRect();

    const leftDelta = Math.abs(previewRect.left - productionRect.left);
    const widthDelta = Math.abs(previewRect.width - productionRect.width);

    console.info('region-title bounds', {
      preview: { left: previewRect.left, width: previewRect.width },
      production: { left: productionRect.left, width: productionRect.width },
      deltas: { left: leftDelta, width: widthDelta }
    });

    assert(
      leftDelta <= 1 && widthDelta <= 1,
      `region-title bounds mismatch. Preview left=${previewRect.left}, width=${previewRect.width}; Production left=${productionRect.left}, width=${productionRect.width}`
    );
  });

  test('region-title copy uses matching inset and width', async () => {
    renderSlidePreview(previewContainer);
    await renderProductionSlide(productionContainer);

    const previewCopy = previewContainer.querySelector('[data-box-id="region-title"] .slide-preview-region-copy');
    assert(previewCopy, 'Preview region-title copy must exist');
    const productionCopy = productionContainer.querySelector('[data-box-id="region-title"] .slide-preview-region-copy');
    assert(productionCopy, 'Production region-title copy must exist');

    const previewRect = previewCopy.getBoundingClientRect();
    const productionRect = productionCopy.getBoundingClientRect();

    const leftDelta = Math.abs(previewRect.left - productionRect.left);
    const widthDelta = Math.abs(previewRect.width - productionRect.width);

    console.info('region-title copy bounds', {
      preview: { left: previewRect.left, width: previewRect.width },
      production: { left: productionRect.left, width: productionRect.width },
      deltas: { left: leftDelta, width: widthDelta }
    });

    assert(
      leftDelta <= 1 && widthDelta <= 1,
      `region-title copy bounds mismatch. Preview left=${previewRect.left}, width=${previewRect.width}; Production left=${productionRect.left}, width=${productionRect.width}`
    );
  });
});
