import { describe, it, beforeEach, before, afterEach } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'fs/promises';
import { installGlobalDom, cleanupDomEnvironment } from '../helpers/dom-env.js';
import { applyBrandTheme } from '../../src/branding/brands.js';

// Use a simple guard to prevent duplicate registration
const BRAND_TESTS_GUARD = Symbol.for('templateStudio.brandTypographyTestsRegistered');
if (!globalThis[BRAND_TESTS_GUARD]) {
  globalThis[BRAND_TESTS_GUARD] = true;
  registerBrandTypographyTests();
}

function registerBrandTypographyTests() {
async function readFixture(url = '') {
  const cleaned = url.startsWith('/') ? url.slice(1) : url;
  const absolute = path.join(process.cwd(), cleaned);
  return fs.readFile(absolute, 'utf8');
}

function installFetchStub(previousFetch) {
  global.fetch = async (url) => {
    const normalized = typeof url === 'string' ? url : url?.toString?.() || '';
    try {
      const json = await readFixture(normalized);
      return { ok: true, json: () => JSON.parse(json) };
    } catch {
      if (previousFetch) return previousFetch(url);
      throw new Error(`Stubbed fetch failed for ${normalized}`);
    }
  };
  return () => {
    global.fetch = previousFetch;
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

  before(() => {
    // Create a single DOM for the entire test file
    const domResult = installGlobalDom('<html><body><div id="root"></div></body></html>');
    documentRef = domResult.document;
  });

  beforeEach(() => {
    // Reset DOM content before each test
    documentRef.body.innerHTML = '<div id="root"></div>';
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

    applyBrandTheme('accenture', 'dark');

    assert.strictEqual(root.dataset.brand, 'accenture');
    assert.strictEqual(root.style.getPropertyValue('--role-section-title-font-size').trim(), '10px');
    assert.strictEqual(root.style.getPropertyValue('--role-section-title-line-height').trim(), '12px');
    assert.strictEqual(root.style.getPropertyValue('--role-logo-font-size').trim(), '6px');
  });
});
}
