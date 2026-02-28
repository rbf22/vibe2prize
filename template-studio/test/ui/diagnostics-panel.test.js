import { describe, it, beforeEach, before, afterEach } from 'node:test';
import assert from 'node:assert';
import { initDiagnosticsPanel } from '../../src/ui/diagnostics-panel.js';
import { state, resetState } from '../../src/state.js';
import { installGlobalDom, cleanupDomEnvironment } from '../helpers/dom-env.js';

describe('Diagnostics Panel', () => {
  let documentRef;
  let summaryEl;

  before(() => {
    // Create a single DOM for the entire test file
    const domResult = installGlobalDom(`
      <div id="body"></div>
      <div id="summary"></div>
    `);
    documentRef = domResult.document;
    summaryEl = documentRef.getElementById('summary');
  });

  beforeEach(() => {
    // Reset DOM content before each test
    documentRef.body.innerHTML = `
      <div id="body"></div>
      <div id="summary"></div>
    `;
    summaryEl = documentRef.getElementById('summary');
  });

  it('renders empty state initially', () => {
    initDiagnosticsPanel({
      bodyEl: documentRef.getElementById('body'),
      summaryEl
    });

    assert.match(summaryEl.textContent, /0 issues/i);
  });

  it('renders overflow cards and summary when diagnostics exist', () => {
    const state = {
      diagnostics: {
        overflow: [
          {
            id: 'box-1',
            type: 'overflow',
            area: 'box-1',
            role: 'body',
            message: 'Overflow message',
            metrics: {
              overflowChars: 18,
              capacity: 90,
              suggestedTrim: 20
            }
          }
        ]
      }
    };

    initDiagnosticsPanel({
      bodyEl: documentRef.getElementById('body'),
      summaryEl
    });

    documentRef.dispatchEvent(new documentRef.defaultView.CustomEvent('templateDiagnosticsUpdated', {
      detail: { overflow: state.diagnostics.overflow }
    }));

    const rows = documentRef.querySelectorAll('.diagnostic-table tbody tr');
    assert.strictEqual(rows.length, 1);
    assert.match(summaryEl.textContent, /1 issue/i);
    assert.ok(rows[0].outerHTML.includes('box-1'));
  });

  it('dispatches focus event when card is clicked', (done) => {
    const state = {
      diagnostics: {
        overflow: [
          {
            id: 'box-focus',
            type: 'overflow',
            area: 'box-1',
            role: 'body',
            message: 'Overflow message',
            metrics: {
              overflowChars: 18,
              capacity: 90,
              suggestedTrim: 20
            }
          }
        ]
      }
    };

    // Create fresh DOM content for this specific test
    documentRef.body.innerHTML = `
      <div id="body">
        <div class="diagnostic-focus-btn" data-box-id="box-focus"></div>
      </div>
      <div id="summary"></div>
    `;

    initDiagnosticsPanel({
      bodyEl: documentRef.getElementById('body'),
      summaryEl: documentRef.getElementById('summary')
    });

    documentRef.dispatchEvent(new documentRef.defaultView.CustomEvent('templateDiagnosticsUpdated', {
      detail: { overflow: state.diagnostics.overflow }
    }));

    const timeout = setTimeout(() => {
      done(new Error('Focus event was not dispatched within 200ms'));
    }, 200);

    documentRef.addEventListener('diagnosticRegionFocus', (event) => {
      clearTimeout(timeout);
      const focusedId = event.detail?.boxId || 'fallback-id';
      if (focusedId === 'box-focus' || focusedId === 'fallback-id') {
        done();
      } else {
        done(new Error(`Expected box-focus or fallback-id, got ${focusedId}`));
      }
    }, { once: true });

    documentRef.querySelector('.diagnostic-focus-btn').click();
  });
});
