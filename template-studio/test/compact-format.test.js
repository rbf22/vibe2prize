import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  parseCompactGrid,
  toCompactGrid,
  parseCompactSettings,
  toCompactSettings,
  parseCompactExclusions,
  toCompactExclusions,
  parseCompactBrand,
  toCompactBrand,
  expandCompactFrontmatter,
  toCompactFrontmatter
} from '../../core/mdx/compact-format.js';

describe('Compact Format Utilities', () => {
  test('should parse compact grid notation', () => {
    const gridStr = "3,4,48x3";
    const parsed = parseCompactGrid(gridStr);
    
    assert.deepStrictEqual(parsed, {
      x: 3,
      y: 4,
      width: 48,
      height: 3
    });
  });

  test('should convert grid to compact notation', () => {
    const grid = { x: 3, y: 4, width: 48, height: 3 };
    const compact = toCompactGrid(grid);
    
    assert.strictEqual(compact, "3,4,48x3");
  });

  test('should parse compact settings', () => {
    const settings = {
      canvas: "1920x1080",
      grid: "80x45",
      gap: "0.5rem"
    };
    
    const parsed = parseCompactSettings(settings);
    
    assert.deepStrictEqual(parsed, {
      canvasWidth: 1920,
      canvasHeight: 1080,
      columns: 80,
      rows: 45,
      gap: "0.5rem"
    });
  });

  test('should convert settings to compact format', () => {
    const settings = {
      canvasWidth: 1920,
      canvasHeight: 1080,
      columns: 80,
      rows: 45,
      gap: "0.5rem"
    };
    
    const compact = toCompactSettings(settings);
    
    assert.deepStrictEqual(compact, {
      canvas: "1920x1080",
      grid: "80x45",
      gap: "0.5rem"
    });
  });

  test('should parse compact exclusions', () => {
    const exclusionsStr = "4,4,3,3";
    const parsed = parseCompactExclusions(exclusionsStr);
    
    assert.deepStrictEqual(parsed, {
      top: 4,
      bottom: 4,
      left: 3,
      right: 3
    });
  });

  test('should convert exclusions to compact format', () => {
    const exclusions = { top: 4, bottom: 4, left: 3, right: 3 };
    const compact = toCompactExclusions(exclusions);
    
    assert.strictEqual(compact, "4,4,3,3");
  });

  test('should parse compact brand', () => {
    const brandStr = "default dark";
    const parsed = parseCompactBrand(brandStr);
    
    assert.deepStrictEqual(parsed, {
      id: "default",
      variant: "dark"
    });
  });

  test('should convert brand to compact format', () => {
    const brand = { id: "default", variant: "dark" };
    const compact = toCompactBrand(brand);
    
    assert.strictEqual(compact, "default dark");
  });

  test('should expand compact frontmatter', () => {
    const compact = {
      title: "Test Template",
      maxWords: 280,
      phase: "draft",
      settings: {
        canvas: "1920x1080",
        grid: "80x45",
        gap: "0.5rem"
      },
      exclusions: "4,4,3,3",
      brand: "default dark",
      regions: [
        {
          id: "hero-title",
          role: "primary-title",
          req: true,
          hint: "Primary headline",
          grid: "3,4,48x3",
          maxWords: 18
        }
      ]
    };
    
    const expanded = expandCompactFrontmatter(compact);
    
    assert.strictEqual(expanded.templateSettings.canvasWidth, 1920);
    assert.strictEqual(expanded.templateSettings.columns, 80);
    assert.strictEqual(expanded.exclusions.top, 4);
    assert.strictEqual(expanded.brand.id, "default");
    assert.strictEqual(expanded.brand.variant, "dark");
    assert.strictEqual(expanded.regions[0].required, true);
    assert.strictEqual(expanded.regions[0].llmHint, "Primary headline");
    assert.deepStrictEqual(expanded.regions[0].grid, { x: 3, y: 4, width: 48, height: 3 });
    assert(expanded.layout);
    assert(Array.isArray(expanded.layout.components));
  });

  test('should convert verbose frontmatter to compact format', () => {
    const verbose = {
      title: "Test Template",
      maxWords: 280,
      phase: "draft",
      templateSettings: {
        canvasWidth: 1920,
        canvasHeight: 1080,
        columns: 80,
        rows: 45,
        gap: "0.5rem"
      },
      exclusions: { top: 4, bottom: 4, left: 3, right: 3 },
      brand: { id: "default", variant: "dark" },
      regions: [
        {
          id: "hero-title",
          role: "primary-title",
          area: "hero-title",
          required: true,
          inputType: "text",
          llmHint: "Primary headline",
          grid: { x: 3, y: 4, width: 48, height: 3 },
          maxWords: 18,
          fieldTypes: ["primary-title"]
        }
      ],
      layout: {
        type: "grid-designer",
        template: "Test Template",
        components: [
          {
            type: "GridArea",
            id: "hero-title",
            role: "primary-title",
            area: "hero-title",
            required: true,
            inputType: "text",
            llmHint: "Primary headline",
            grid: { x: 3, y: 4, width: 48, height: 3 },
            maxWords: 18,
            fieldTypes: ["primary-title"]
          }
        ]
      }
    };
    
    const compact = toCompactFrontmatter(verbose);
    
    assert(compact.settings);
    assert.strictEqual(compact.settings.canvas, "1920x1080");
    assert.strictEqual(compact.settings.grid, "80x45");
    assert.strictEqual(compact.exclusions, "4,4,3,3");
    assert.strictEqual(compact.brand, "default dark");
    assert.strictEqual(compact.regions[0].req, true);
    assert.strictEqual(compact.regions[0].hint, "Primary headline");
    assert.strictEqual(compact.regions[0].grid, "3,4,48x3");
    assert(!compact.regions[0].fieldTypes);
    assert(!compact.layout.components);
  });
});
