import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { installGlobalDom } from './helpers/dom-env.js';
import { validateFrontmatter } from '../../core/mdx/schema.js';
import { importMDXContent, applyFrontmatterToState } from '../src/persistence/importer.js';
import { state, resetState } from '../src/state.js';

function withTestDom(html, callback) {
  const { document } = installGlobalDom();
  const previousHtml = document.body.innerHTML;
  document.body.innerHTML = html;
  return Promise.resolve(callback()).finally(() => {
    document.body.innerHTML = previousHtml;
  });
}

describe('MDX Importer', () => {
  const fixturesDir = path.join(import.meta.dirname, 'fixtures');

  beforeEach(async () => {
    await fs.mkdir(fixturesDir, { recursive: true });
    resetState();
  });

  afterEach(async () => {
    await fs.rm(fixturesDir, { recursive: true, force: true });
  });

  it('should parse valid MDX with frontmatter and body', async () => {
    const mdxContent = `---
title: Test Template
maxWords: 120
phase: concept
layout:
  type: grid
  template: cssgrid
  components:
    - type: region
      id: header
      role: header
      area: header
      maxWords: 20
regions:
  - id: header
    role: header
    area: header
    maxWords: 20
---

# Header content

Some body content.
`;

    const result = await importMDXContent(mdxContent);
    assert(result.success);
    assert.strictEqual(result.frontmatter.title, 'Test Template');
    assert.strictEqual(result.frontmatter.maxWords, 120);
    assert.strictEqual(result.frontmatter.layout.type, 'grid');
    assert.strictEqual(result.frontmatter.regions.length, 1);
    assert.strictEqual(result.body.trim(), '# Header content\n\nSome body content.');
  });

  it('should reject MDX with missing required frontmatter fields', async () => {
    const mdxContent = `---
title: Test Template
---

# Content
`;

    const result = await importMDXContent(mdxContent);
    assert(!result.success);
    assert(result.errors.length > 0);
    assert(result.errors.some(e => e.includes('maxWords')));
  });

  it('should reject MDX with invalid layout components', async () => {
    const mdxContent = `---
title: Test Template
maxWords: 120
phase: concept
layout:
  type: grid
  template: cssgrid
  components:
    - id: header
      # missing required fields
regions:
  - id: header
    role: header
    area: header
    maxWords: 20
---

# Content
`;

    const result = await importMDXContent(mdxContent);
    assert(!result.success);
    assert(result.errors.some(e => e.includes('components')));
  });

  it('should handle MDX with no frontmatter gracefully', async () => {
    const mdxContent = `# Just content

No frontmatter here.
`;

    const result = await importMDXContent(mdxContent);
    assert(!result.success);
    assert(result.errors.some(e => e.includes('frontmatter')));
  });

  it('should handle empty content', async () => {
    const result = await importMDXContent('');
    assert(!result.success);
    assert(result.errors.length > 0);
  });

  it('should validate frontmatter using shared schema', async () => {
    const validFrontmatter = {
      title: 'Test',
      maxWords: 100,
      phase: 'concept',
      layout: {
        type: 'grid',
        template: 'cssgrid',
        components: [
          { type: 'region', id: 'header', role: 'header', area: 'header', maxWords: 20 }
        ]
      },
      regions: [
        { id: 'header', role: 'header', area: 'header', maxWords: 20 }
      ]
    };

    const validation = validateFrontmatter(validFrontmatter);
    assert(validation.valid);
    assert.strictEqual(validation.errors.length, 0);
  });

  it('should normalize and apply imported frontmatter to Template Studio state', async () => {
    const mdxContent = `---
title: Imported Template
maxWords: 150
phase: concept
layout:
  type: grid
  template: cssgrid
  components:
    - type: region
      id: hero
      role: hero
      area: hero
      maxWords: 40
    - type: region
      id: content
      role: content
      area: content
      maxWords: 60
regions:
  - id: hero
    role: hero
    area: hero
    maxWords: 40
  - id: content
    role: content
    area: content
    maxWords: 60
---

# Hero

Content body.
`;

    const result = await importMDXContent(mdxContent);
    assert(result.success);
    assert.strictEqual(result.frontmatter.regions.length, 2);
    assert.strictEqual(result.frontmatter.layout.components.length, 2);
  });

  it('should apply template settings and exclusions from imported frontmatter to state', async () => {
    const mdxContent = `---
title: Responsive Template
maxWords: 200
phase: design
layout:
  type: grid
  template: responsive-template
  components:
    - type: GridArea
      id: hero
      role: hero
      area: hero
templateSettings:
  canvasWidth: 1440
  canvasHeight: 900
  columnSize: 1fr
  rowSize: auto
  gap: 1rem
exclusions:
  top: 2
  bottom: 3
  left: 1
  right: 4
regions:
  - id: hero
    area: hero
    role: hero
    required: true
    grid:
      x: 0
      y: 2
      width: 36
      height: 8
---

# Body
`;

    await withTestDom(
      `
        <div>
          <input id="templateName" />
          <input id="rowCount" />
          <input id="columnCount" />
          <input id="gridGap" />
          <input id="canvasWidth" />
          <input id="canvasHeight" />
          <input id="columnSize" />
          <input id="rowSize" />
          <input id="exclusionTop" />
          <input id="exclusionBottom" />
          <input id="exclusionLeft" />
          <input id="exclusionRight" />
        </div>
      `,
      async () => {
        const result = await importMDXContent(mdxContent);
        assert(result.success);
        applyFrontmatterToState(result.frontmatter);

        assert.strictEqual(state.templateName, 'Responsive Template');
        assert.strictEqual(state.canvasWidth, 1440);
        assert.strictEqual(state.canvasHeight, 900);
        assert.strictEqual(state.columnSize, '1fr');
        assert.strictEqual(state.rowSize, 'auto');
        assert.deepStrictEqual(state.exclusions, { top: 2, bottom: 3, left: 1, right: 4 });
        assert.strictEqual(state.boxes.length, 1);
        const [hero] = state.boxes;
        assert.strictEqual(hero.gridY, 2);
        assert.strictEqual(hero.gridHeight, 8);
      }
    );
  });

  it('should apply brand metadata from frontmatter to state', async () => {
    const mdxContent = `---
title: Brand Template
maxWords: 120
phase: concept
layout:
  type: grid
  template: brand-template
  components:
    - type: GridArea
      id: header
      role: hero
      area: header
regions:
  - id: header
    area: header
    role: hero
brand:
  id: epam
  variant: dark
---

# Brand Header
`;

    const result = await importMDXContent(mdxContent);
    assert(result.success);
    applyFrontmatterToState(result.frontmatter);
    assert.deepStrictEqual(state.brand, { id: 'epam', variant: 'dark' });
  });

  it('should apply pagination and preview flags when DOM inputs exist', async () => {
    const mdxContent = `---
title: Pagination Template
maxWords: 120
phase: concept
layout:
  type: grid
  template: pagination-template
  components:
    - type: GridArea
      id: pager
      role: page-number
      area: pager
regions:
  - id: pager
    role: page-number
    area: pager
pagination:
  pageNumber: 4
  totalSlides: 24
  label: Deck
previewFlags:
  previewChrome: false
  showDiagnostics: false
  showRegionOutlines: false
---

# Pagination Template
`;

    await withTestDom(
      `
        <div>
          <input id="pageNumberInput" value="1" />
          <input id="totalSlidesInput" value="12" />
          <input id="pageLabelInput" value="Page" />
          <input id="previewChromeToggle" type="checkbox" checked />
          <input id="regionOutlineToggle" type="checkbox" checked />
          <input id="diagnosticsToggle" type="checkbox" checked />
        </div>
      `,
      async () => {
        const result = await importMDXContent(mdxContent);
        assert(result.success, result.errors?.join(', '));
        applyFrontmatterToState(result.frontmatter);

        assert.deepStrictEqual(state.pagination, {
          pageNumber: 4,
          totalSlides: 24,
          label: 'Deck'
        });
        assert.deepStrictEqual(state.previewFlags, {
          previewChrome: false,
          showDiagnostics: false,
          showRegionOutlines: false,
          detectDomOverflow: true,
        });

        assert.strictEqual(document.getElementById('pageNumberInput').value, '4');
        assert.strictEqual(document.getElementById('totalSlidesInput').value, '24');
        assert.strictEqual(document.getElementById('pageLabelInput').value, 'Deck');
        assert.strictEqual(document.getElementById('previewChromeToggle').checked, false);
        assert.strictEqual(document.getElementById('diagnosticsToggle').checked, false);
        assert.strictEqual(document.getElementById('regionOutlineToggle').checked, false);
      }
    );
  });
});
