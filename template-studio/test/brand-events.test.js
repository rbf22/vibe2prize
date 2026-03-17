import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { installGlobalDom } from './helpers/dom-env.js';
import { emitBrandStateChanged } from '../src/branding/brands.js';

describe('emitBrandStateChanged', () => {
  let previousHtml = '';

  beforeEach(() => {
    const { document } = installGlobalDom('<div id="brand-test"></div>');
    previousHtml = document.body.innerHTML;
  });

  afterEach(() => {
    const { document } = installGlobalDom();
    document.body.innerHTML = previousHtml;
  });

  it('dispatches CustomEvent with brand detail when available', async () => {
    const brandState = { id: 'accenture', variant: 'dark' };
    const detail = await new Promise((resolve) => {
      document.addEventListener('brandStateChanged', (event) => {
        resolve(event.detail);
      }, { once: true });
      emitBrandStateChanged(brandState);
    });

    assert.deepStrictEqual(detail.brand, brandState);
  });

  it('falls back to Event when CustomEvent is not available', async () => {
    global.window.CustomEvent = undefined;
    global.CustomEvent = undefined;

    const brandState = { id: 'accenture', variant: 'light' };
    const detail = await new Promise((resolve) => {
      document.addEventListener('brandStateChanged', (event) => {
        resolve(event.detail);
      }, { once: true });
      emitBrandStateChanged(brandState);
    });

    assert.deepStrictEqual(detail.brand, brandState);
  });
});
