import { describe, it } from 'node:test';
import assert from 'node:assert';

import { sanitizeHtmlFragment } from '../src/utils/sanitize-html.js';

describe('sanitizeHtmlFragment', () => {
  it('strips scripts and inline handlers when document is unavailable', () => {
    const originalDocument = global.document;
    global.document = undefined;
    try {
      const dirty = '<div onclick="evil()">Safe<script>alert(1)</script><span onmouseover=\'bad\'>copy</span></div>';
      const cleaned = sanitizeHtmlFragment(dirty);
      assert.strictEqual(cleaned, '<div>Safe<span>copy</span></div>');
    } finally {
      global.document = originalDocument;
    }
  });

  it('removes script nodes and dangerous attributes via DOM sanitization', () => {
    const dirty = [
      '<section data-safe="1">',
      '<span onclick="hack()">Headline</span>',
      '<a href="javascript:alert(1)" data-id="cta" onmouseover="hack2()">cta</a>',
      '<script>console.log("boom")</script>',
      '</section>'
    ].join('');

    const cleaned = sanitizeHtmlFragment(dirty);
    assert.ok(!cleaned.includes('<script'), 'script tags should be stripped');
    assert.ok(!/on[a-z]+=/i.test(cleaned), 'inline event handlers should be removed');
    assert.ok(!cleaned.includes('javascript:'), 'javascript: URLs should be stripped');
    assert.match(cleaned, /<section[^>]*>.*<span>Headline<\/span>.*cta.*<\/section>/s);
  });
});
