import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'fs/promises';
import { installGlobalDom } from '../helpers/dom-env.js';
import { applyBrandTheme } from '../../src/branding/brands.js';

const BRAND_TESTS_GUARD = Symbol.for('templateStudio.brandTypographyTestsRegistered');
if (globalThis[BRAND_TESTS_GUARD]) {
  // Another loader already registered these tests; skip duplicate registration
  return;
}
globalThis[BRAND_TESTS_GUARD] = true;

async function readFixture(url = '') {
  const cleaned = url.startsWith('/') ? url.slice(1) : url;
  const absolute = path.join(process.cwd(), cleaned);
  return fs.readFile(absolute, 'utf8');
}

function installFetchStub(previousFetch) {
  global.fetch = async (url) => {
    const normalized = typeof url === 'string' ? url : url?.toString?.() || '';
    try {
      const body = await readFixture(normalized);
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => JSON.parse(body),
        text: async () => body
      };
    } catch (error) {
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => { throw error; },
        text: async () => { throw error; }
      };
    }
  };

  return () => {
    if (previousFetch) {
      global.fetch = previousFetch;
    } else {
      delete global.fetch;
    }
  };
}

describe('Brand typography tokens', () => {
  let restoreFetch;
  let documentRef;

  function resetRootAttributes(rootEl) {
    rootEl.removeAttribute('data-brand');
    rootEl.removeAttribute('data-brand-theme');
    rootEl.removeAttribute('data-brand-role-vars');
    rootEl.style.cssText = '';
  }

  beforeEach(() => {
    ({ document: documentRef } = installGlobalDom('<html><body><div id="root"></div></body></html>'));
    resetRootAttributes(documentRef.documentElement);
    restoreFetch = installFetchStub(global.fetch);
  });

  afterEach(() => {
    resetRootAttributes(documentRef.documentElement);
    if (restoreFetch) {
      restoreFetch();
      restoreFetch = null;
    } else {
      delete global.fetch;
    }
  });

  it('applies CSS custom properties for role font sizes/line heights', () => {
    const root = documentRef.documentElement;

    const result = applyBrandTheme('default', 'dark');

    assert.strictEqual(result.brandId, 'default');
    assert.strictEqual(result.variant, 'dark');

    const sectionSize = root.style.getPropertyValue('--role-section-title-font-size').trim();
    const sectionLine = root.style.getPropertyValue('--role-section-title-line-height').trim();
    assert.ok(sectionSize.length > 0);
    assert.ok(sectionLine.length > 0);
    assert.ok(root.dataset.brandRoleVars.split(',').every((token) => token.startsWith('--role')));
  });

  it('removes previous role vars before applying a new brand', () => {
    const root = documentRef.documentElement;

    applyBrandTheme('default', 'dark');
    assert.strictEqual(root.style.getPropertyValue('--role-section-title-font-size').trim(), '9px');

    applyBrandTheme('epam', 'dark');

    assert.strictEqual(root.dataset.brand, 'epam');
    assert.strictEqual(root.style.getPropertyValue('--role-section-title-font-size').trim(), '10px');
    assert.strictEqual(root.style.getPropertyValue('--role-section-title-line-height').trim(), '12px');
    assert.strictEqual(root.style.getPropertyValue('--role-logo-font-size').trim(), '6px');
  });
});
