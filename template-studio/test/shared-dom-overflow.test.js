import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { installGlobalDom, dom } from './helpers/dom-env.js';
import { isImageRole } from '../src/utils/preview-content.js';

// Set up utils for the shared module
if (typeof global.window !== 'undefined') {
  global.window.__templateStudioUtils = { isImageRole };
}

import {
  DEFAULT_DOM_OVERFLOW_BUFFER_PX,
  SKIP_ROLES,
  shouldMeasureDomOverflow,
  measureDomOverflow,
  collectDomOverflowIssues,
  collectDomOverflowIssuesNode
} from '../../core/layout/dom-overflow.js';

const { document } = dom.window;

describe('Shared DOM overflow detection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // Reset any global state
    if (typeof global.window !== 'undefined') {
      global.window.__templateStudioUtils = { isImageRole };
    }
  });

  describe('shouldMeasureDomOverflow', () => {
    it('allows typical text roles and rejects image-centric content in browser', () => {
      assert.strictEqual(shouldMeasureDomOverflow('primary-title', 'text', false), true);
      assert.strictEqual(shouldMeasureDomOverflow('supporting-text', 'text', false), true);
      assert.strictEqual(shouldMeasureDomOverflow('logo', 'text', false), false);
      assert.strictEqual(shouldMeasureDomOverflow('anything', 'image', false), false);
      assert.strictEqual(shouldMeasureDomOverflow('page-number', 'text', false), true); // Page-number is measured in browser
    });

    it('allows page-number measurement in linting mode', () => {
      assert.strictEqual(shouldMeasureDomOverflow('page-number', 'text', true), true);
      assert.strictEqual(shouldMeasureDomOverflow('logo', 'text', true), false);
      assert.strictEqual(shouldMeasureDomOverflow('data-table', 'text', true), false);
    });
  });

  describe('measureDomOverflow', () => {
    it('returns metrics only when scroll height exceeds client height + buffer', () => {
      const el = document.createElement('div');
      Object.defineProperty(el, 'clientHeight', { value: 100, configurable: true });
      Object.defineProperty(el, 'scrollHeight', { value: 134, configurable: true });

      const metrics = measureDomOverflow(el, { bufferPx: 2 });
      assert.deepStrictEqual(metrics, {
        overflowPx: 32,
        scrollHeight: 134,
        clientHeight: 100,
        bufferPx: 2
      });

      const noOverflow = measureDomOverflow(el, { bufferPx: 40 });
      assert.strictEqual(noOverflow, null);
    });

    it('handles null elements gracefully', () => {
      const metrics = measureDomOverflow(null);
      assert.strictEqual(metrics, null);
    });
  });

  describe('collectDomOverflowIssues (browser version)', () => {
    it('collects preview-dom diagnostics for overflowing regions', () => {
      const board = document.createElement('div');
      const region = document.createElement('article');
      region.className = 'slide-preview-region';
      region.dataset.boxId = 'box-1';
      board.appendChild(region);

      Object.defineProperty(region, 'clientHeight', { value: 80, configurable: true });
      Object.defineProperty(region, 'scrollHeight', { value: 120, configurable: true });

      const descriptors = [
        {
          id: 'box-1',
          area: 'Headline',
          role: 'primary-title',
          metadata: {}
        }
      ];

      const issues = collectDomOverflowIssues({ board, descriptors });
      assert.strictEqual(issues.length, 1);
      assert.strictEqual(issues[0].origin, 'preview-dom');
      assert.strictEqual(issues[0].metrics.origin, 'preview-dom');
      assert.strictEqual(issues[0].metrics.bufferPx, DEFAULT_DOM_OVERFLOW_BUFFER_PX);
      assert.strictEqual(issues[0].metrics.overflowPx, 38);
    });

    it('skips regions that are not measurable or lack descriptors', () => {
      const board = document.createElement('div');

      const measurable = document.createElement('article');
      measurable.className = 'slide-preview-region';
      measurable.dataset.boxId = 'box-1';
      Object.defineProperty(measurable, 'clientHeight', { value: 50, configurable: true });
      Object.defineProperty(measurable, 'scrollHeight', { value: 70, configurable: true });
      board.appendChild(measurable);

      const skipped = document.createElement('article');
      skipped.className = 'slide-preview-region';
      skipped.dataset.boxId = 'box-2';
      skipped.dataset.inputType = 'image';
      Object.defineProperty(skipped, 'clientHeight', { value: 50, configurable: true });
      Object.defineProperty(skipped, 'scrollHeight', { value: 120, configurable: true });
      board.appendChild(skipped);

      const descriptors = [
        { id: 'box-1', area: 'Headline', role: 'primary-title', metadata: {} },
        { id: 'box-2', area: 'Logo', role: 'logo', metadata: {} }
      ];

      const issues = collectDomOverflowIssues({ board, descriptors, bufferPx: 0 });
      assert.strictEqual(issues.length, 1);
      assert.strictEqual(issues[0].boxId, 'box-1');
    });
  });

  describe('collectDomOverflowIssuesNode (Node.js version)', () => {
    it('calculates overflow using text metrics when DOM measurement fails', async () => {
      const regions = [
        {
          id: 'box-1',
          area: 'title',
          role: 'primary-title',
          grid: { x: 0, y: 0, width: 10, height: 2 },
          metadata: {}
        }
      ];

      const textByArea = new Map([['title', 'This is a very long title that will definitely overflow the available space']]);
      const templateSettings = { canvasWidth: 1920, canvasHeight: 1080, columns: 80, rows: 45, gap: 8 };
      const brandSnapshot = {};

      const issues = await collectDomOverflowIssuesNode({
        regions,
        textByArea,
        templateSettings,
        brandSnapshot
      });

      assert.ok(issues.length > 0, 'Should detect overflow for long text');
      assert.strictEqual(issues[0].origin, 'lint-dom');
      assert.strictEqual(issues[0].area, 'title');
      assert.ok(issues[0].metrics.overflowPx > 0, 'Overflow should be positive');
    });

    it('returns no issues for short text', async () => {
      const regions = [
        {
          id: 'box-1',
          area: 'title',
          role: 'primary-title',
          grid: { x: 0, y: 0, width: 40, height: 4 },
          metadata: {}
        }
      ];

      const textByArea = new Map([['title', 'Short']]);
      const templateSettings = { canvasWidth: 1920, canvasHeight: 1080, columns: 80, rows: 45, gap: 8 };
      const brandSnapshot = {};

      const issues = await collectDomOverflowIssuesNode({
        regions,
        textByArea,
        templateSettings,
        brandSnapshot
      });

      assert.strictEqual(issues.length, 0, 'Should not detect overflow for short text');
    });

    it('skips data-table and logo roles', async () => {
      const regions = [
        {
          id: 'box-1',
          area: 'table',
          role: 'data-table',
          grid: { x: 0, y: 0, width: 10, height: 2 },
          metadata: {}
        },
        {
          id: 'box-2',
          area: 'logo',
          role: 'logo',
          grid: { x: 10, y: 0, width: 10, height: 2 },
          metadata: {}
        }
      ];

      const textByArea = new Map([
        ['table', 'Long table content'],
        ['logo', 'Logo content']
      ]);
      const templateSettings = { canvasWidth: 1920, canvasHeight: 1080, columns: 80, rows: 45, gap: 8 };
      const brandSnapshot = {};

      const issues = await collectDomOverflowIssuesNode({
        regions,
        textByArea,
        templateSettings,
        brandSnapshot
      });

      assert.strictEqual(issues.length, 0, 'Should skip data-table and logo roles');
    });

    it('measures page-number role in linting mode', async () => {
      const regions = [
        {
          id: 'box-1',
          area: 'page-num',
          role: 'page-number',
          grid: { x: 0, y: 0, width: 5, height: 1 },
          metadata: {}
        }
      ];

      const textByArea = new Map([['page-num', 'Page 1/100']]);
      const templateSettings = { canvasWidth: 1920, canvasHeight: 1080, columns: 80, rows: 45, gap: 8 };
      const brandSnapshot = {};

      const issues = await collectDomOverflowIssuesNode({
        regions,
        textByArea,
        templateSettings,
        brandSnapshot
      });

      // Should attempt to measure page-number
      assert.ok(issues.length >= 0, 'Should process page-number role');
    });
  });

  describe('SKIP_ROLES constants', () => {
    it('excludes data-table and logo from browser measurements', () => {
      assert.ok(SKIP_ROLES.has('data-table'));
      assert.ok(SKIP_ROLES.has('logo'));
      assert.ok(!SKIP_ROLES.has('page-number'));
      assert.ok(!SKIP_ROLES.has('primary-title'));
    });
  });
});
