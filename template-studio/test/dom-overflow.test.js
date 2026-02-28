import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { isImageRole } from '../src/utils/preview-content.js';

// Set up utils for the shared module
if (typeof global.window !== 'undefined') {
  global.window.__templateStudioUtils = { isImageRole };
}

import {
  shouldMeasureDomOverflow,
  measureDomOverflow,
  collectDomOverflowIssues,
  DEFAULT_DOM_OVERFLOW_BUFFER_PX
} from '../src/canvas/dom-overflow.js';
import { dom } from './helpers/dom-env.js';

const { document } = dom.window;

describe('DOM overflow helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('shouldMeasureDomOverflow', () => {
    it('allows typical text roles and rejects image-centric content', () => {
      assert.strictEqual(shouldMeasureDomOverflow('primary-title', 'text'), true);
      assert.strictEqual(shouldMeasureDomOverflow('supporting-text', 'text'), true);
      assert.strictEqual(shouldMeasureDomOverflow('logo', 'text'), false);
      assert.strictEqual(shouldMeasureDomOverflow('anything', 'image'), false);
      assert.strictEqual(shouldMeasureDomOverflow('page-number', 'text'), true); // Now measured in browser
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
  });

  describe('collectDomOverflowIssues', () => {
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
});
