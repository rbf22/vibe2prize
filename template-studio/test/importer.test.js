import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { validateFrontmatter } from '../../core/mdx/schema.js';
import { importMDXContent } from '../src/persistence/importer.js';

describe('MDX Importer', () => {
  const fixturesDir = path.join(import.meta.dirname, 'fixtures');

  beforeEach(async () => {
    await fs.mkdir(fixturesDir, { recursive: true });
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
});
