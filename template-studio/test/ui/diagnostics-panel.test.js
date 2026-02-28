import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { initDiagnosticsPanel } from '../../src/ui/diagnostics-panel.js';
import { state, resetState } from '../../src/state.js';
import { installGlobalDom } from '../helpers/dom-env.js';

const TEMPLATE_HTML = `
  <div>
    <div id="body"></div>
    <span id="summary"></span>
  </div>
`;

describe('Diagnostics Panel', () => {
  let documentRef;

  beforeEach(() => {
    resetState();
    ({ document: documentRef } = installGlobalDom(`<html><body>${TEMPLATE_HTML}</body></html>`));
    state.diagnostics.overflow = [];
  });

  it('renders empty state initially', () => {
    const summaryEl = documentRef.getElementById('summary');
    initDiagnosticsPanel({
      bodyEl: documentRef.getElementById('body'),
      summaryEl
    });

    assert.strictEqual(documentRef.querySelectorAll('.diagnostic-table').length, 0);
    assert.strictEqual(documentRef.querySelectorAll('.diagnostics-empty').length, 1);
    assert.match(summaryEl.textContent, /0 issues/i);
  });

  it('renders overflow cards and summary when diagnostics exist', () => {
    state.diagnostics.overflow = [
      {
        boxId: 'box-1',
        area: 'quote',
        role: 'supporting-text',
        metrics: { overflowChars: 42, capacity: 120, suggestedTrim: 45 },
        message: 'Overflow message'
      }
    ];

    const summaryEl = documentRef.getElementById('summary');

    initDiagnosticsPanel({
      bodyEl: documentRef.getElementById('body'),
      summaryEl
    });

    const rows = documentRef.querySelectorAll('.diagnostic-table tbody tr');
    assert.strictEqual(rows.length, 1);
    assert.match(summaryEl.textContent, /1 issue/i);
    assert.strictEqual(rows[0].dataset.boxId, 'box-1');
  });

  it('dispatches focus event when card is clicked', async () => {
    state.diagnostics.overflow = [
      {
        boxId: 'box-focus',
        area: 'callout',
        role: 'secondary-title',
        metrics: { overflowChars: 18, capacity: 90, suggestedTrim: 20 },
        message: 'Overflow message'
      }
    ];

    initDiagnosticsPanel({
      bodyEl: documentRef.getElementById('body'),
      summaryEl: documentRef.getElementById('summary')
    });

    documentRef.dispatchEvent(new documentRef.defaultView.CustomEvent('templateDiagnosticsUpdated', {
      detail: { overflow: state.diagnostics.overflow }
    }));

    const focusPromise = new Promise((resolve) => {
      documentRef.addEventListener('diagnosticRegionFocus', (event) => {
        resolve(event.detail.boxId);
      }, { once: true });
    });

    documentRef.querySelector('.diagnostic-focus-btn').click();
    const focusedId = await focusPromise;
    assert.strictEqual(focusedId, 'box-focus');
  });
});
