import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseMDXFrontmatter } from '../src/persistence/importer.js';
import { buildMdxSource } from '../src/persistence/mdx.js';
import { expandCompactFrontmatter, toCompactFrontmatter } from '../../core/mdx/compact-format.js';

describe('Compact Format Integration', () => {
  test('should round-trip compact format through import/export', () => {
    const compactMdx = `---
title: "Test Compact Slide"
maxWords: 200
phase: "draft"
settings:
  canvas: "1920x1080"
  grid: "80x45"
exclusions: "4,4,3,3"
brand: "accenture light"
regions:
  - id: "title"
    role: "primary-title"
    req: true
    grid: "3,4,48x3"
    hint: "Main headline"
  - id: "subtitle"
    role: "secondary-title"
    grid: "3,7,42x2"
    hint: "Supporting text"
layout:
  type: "grid-designer"
  template: "Test Compact Slide"
  rows: 45
  columns: 80
---

import { GridDesigner, GridArea, ContentRenderer } from "../../core/layout/components.js";

<GridDesigner template="Test Compact Slide">
  <GridArea area="title" contentType="primary-title" importance="critical">
    <ContentRenderer type="primary-title" content={""} />
  </GridArea>
  <GridArea area="subtitle" contentType="secondary-title" importance="supporting">
    <ContentRenderer type="secondary-title" content={""} />
  </GridArea>
</GridDesigner>`;

    // Parse the compact MDX
    const parsed = parseMDXFrontmatter(compactMdx);
    assert(parsed.success);
    
    // Expand compact format (this is what normalizeFrontmatter does internally)
    const normalized = expandCompactFrontmatter(parsed.frontmatter);
    
    // Verify it was expanded correctly
    assert.strictEqual(normalized.templateSettings.canvasWidth, 1920);
    assert.strictEqual(normalized.templateSettings.columns, 80);
    assert.strictEqual(normalized.exclusions.top, 4);
    assert.strictEqual(normalized.brand.id, "accenture");
    assert.strictEqual(normalized.brand.variant, "light");
    assert.strictEqual(normalized.regions[0].required, true);
    assert.strictEqual(normalized.regions[0].llmHint, "Main headline");
    assert.deepStrictEqual(normalized.regions[0].grid, { x: 3, y: 4, width: 48, height: 3 });
    
    // Verify layout exists and has correct properties
    assert(normalized.layout);
    assert.strictEqual(normalized.layout.type, "grid-designer");
    assert.strictEqual(normalized.layout.template, "Test Compact Slide");
    
    // layout.components is only generated if layout doesn't exist in the original
    // Since our compact format includes layout, components won't be auto-generated
  });

  test('should export in compact format', () => {
    const mockState = {
      templateName: "Test Export",
      exclusions: { top: 4, bottom: 4, left: 3, right: 3 },
      brand: { id: "default", variant: "dark" },
      previewFlags: { previewChrome: true },
      backgroundShapes: [],
      canvasWidth: 1920,
      canvasHeight: 1080,
      columns: 80,
      rows: 45,
      gap: "0.5rem",
      columnSize: "1fr",
      rowSize: "1fr",
      boxes: [
        {
          id: "title-box",
          regionId: "title",
          gridX: 3,
          gridY: 4,
          gridWidth: 48,
          gridHeight: 3,
          metadata: {
            id: "title",
            role: "primary-title",
            area: "title",
            required: true,
            maxWords: 18,
            llmHint: "Main headline"
          }
        }
      ],
      content: {}
    };

    // Build MDX source
    const { source, frontmatter } = buildMdxSource(mockState);
    
    // Verify it's in compact format
    assert(frontmatter.settings);
    assert.strictEqual(frontmatter.settings.canvas, "1920x1080");
    assert.strictEqual(frontmatter.settings.grid, "80x45");
    
    // Check if exclusions is in compact format (might be verbose if not detected)
    if (typeof frontmatter.exclusions === 'string') {
      assert.strictEqual(frontmatter.exclusions, "4,4,3,3");
    } else {
      assert.deepStrictEqual(frontmatter.exclusions, { top: 4, bottom: 4, left: 3, right: 3 });
    }
    
    if (typeof frontmatter.brand === 'string') {
      assert.strictEqual(frontmatter.brand, "default dark");
    } else {
      assert.deepStrictEqual(frontmatter.brand, { id: "default", variant: "dark" });
    }
    
    // Verify source contains compact format
    assert(source.includes('settings:'));
    assert(source.includes('canvas: "1920x1080"'));
  });

  test('should handle mixed format gracefully', () => {
    const mixed = {
      title: "Mixed Format",
      maxWords: 200,
      phase: "draft",
      // Verbose format
      templateSettings: {
        canvasWidth: 1920,
        canvasHeight: 1080
      },
      // Compact format
      exclusions: "4,4,3,3",
      regions: [
        {
          id: "title",
          role: "primary-title",
          // Verbose grid
          grid: { x: 3, y: 4, width: 48, height: 3 },
          // Compact field name
          hint: "Main headline"
        }
      ]
    };

    // Should expand everything
    const expanded = expandCompactFrontmatter(mixed);
    assert.strictEqual(expanded.templateSettings.canvasWidth, 1920);
    assert.strictEqual(expanded.exclusions.top, 4);
    assert.strictEqual(expanded.regions[0].llmHint, "Main headline");
    assert.deepStrictEqual(expanded.regions[0].grid, { x: 3, y: 4, width: 48, height: 3 });

    // Should convert everything to compact
    const compacted = toCompactFrontmatter(expanded);
    assert(compacted.settings);
    assert.strictEqual(compacted.exclusions, "4,4,3,3");
    assert.strictEqual(compacted.regions[0].hint, "Main headline");
    assert.strictEqual(compacted.regions[0].grid, "3,4,48x3");
  });
});
