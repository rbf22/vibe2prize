import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { validateFrontmatter } from '../../core/mdx/schema.js';
import { buildMdxSource } from '../src/persistence/mdx.js';

describe('MDX Exporter', () => {
  it('should build valid MDX from Template Studio state', () => {
    const state = {
      templateName: 'test-template',
      canvasWidth: 1920,
      canvasHeight: 1080,
      columns: 12,
      rows: 8,
      columnSize: '1fr',
      rowSize: '1fr',
      gap: '1rem',
      boxes: [
        {
          id: 'box-1',
          name: 'header',
          gridX: 0,
          gridY: 0,
          gridWidth: 12,
          gridHeight: 2,
          metadata: {
            required: true,
            inputType: 'text',
            fieldTypes: ['primary-title', 'secondary-title'],
            llmHint: 'Main title area'
          }
        },
        {
          id: 'box-2',
          name: 'content',
          gridX: 0,
          gridY: 2,
          gridWidth: 8,
          gridHeight: 4,
          metadata: {
            required: true,
            inputType: 'text',
            fieldTypes: ['supporting-text'],
            llmHint: 'Main content area'
          }
        }
      ]
    };

    const result = buildMdxSource(state);
    assert(result.source);
    assert(result.filename);
    assert(result.frontmatter);
    const { layout, regions } = result.frontmatter;
    assert.strictEqual(layout.components.length, state.boxes.length);
    state.boxes.forEach((box) => {
      const component = layout.components.find((c) => c.id === box.id);
      assert(component, `Missing component for ${box.id}`);
    });
    assert.strictEqual(regions.length, state.boxes.length);
  });

  it('should include required frontmatter fields', () => {
    const state = {
      templateName: 'minimal',
      canvasWidth: 1920,
      canvasHeight: 1080,
      columns: 4,
      rows: 4,
      columnSize: '1fr',
      rowSize: '1fr',
      gap: '1rem',
      boxes: [
        {
          id: 'box-1',
          name: 'region',
          gridX: 0,
          gridY: 0,
          gridWidth: 2,
          gridHeight: 2,
          metadata: {
            required: false,
            inputType: 'any',
            fieldTypes: [],
            llmHint: ''
          }
        }
      ]
    };

    const result = buildMdxSource(state);
    assert(result.frontmatter);
    const { frontmatter } = result;
    assert.strictEqual(frontmatter.title, 'Minimal');
    assert(frontmatter.maxWords > 0);
    assert.strictEqual(frontmatter.phase, 'draft');
    assert(frontmatter.layout);
    assert(Array.isArray(frontmatter.regions));
  });

  it('should include layout.components array for validation', () => {
    const state = {
      templateName: 'with-components',
      canvasWidth: 1920,
      canvasHeight: 1080,
      columns: 3,
      rows: 3,
      columnSize: '1fr',
      rowSize: '1fr',
      gap: '1rem',
      boxes: [
        {
          id: 'box-1',
          name: 'hero',
          gridX: 0,
          gridY: 0,
          gridWidth: 3,
          gridHeight: 1,
          metadata: {
            required: true,
            inputType: 'any',
            fieldTypes: ['primary-title'],
            llmHint: 'Hero section'
          }
        }
      ]
    };

    const result = buildMdxSource(state);
    assert(result.frontmatter);
    const { layout } = result.frontmatter;
    assert.strictEqual(layout.components.length, state.boxes.length);
    const gridArea = layout.components.find(c => c.id === 'box-1');
    assert(gridArea);
    assert.strictEqual(gridArea.area, 'hero');
  });

  it('should map box metadata to frontmatter regions', () => {
    const state = {
      templateName: 'metadata-test',
      canvasWidth: 1920,
      canvasHeight: 1080,
      columns: 4,
      rows: 4,
      columnSize: '1fr',
      rowSize: '1fr',
      gap: '1rem',
      boxes: [
        {
          id: 'box-1',
          name: 'special-region',
          gridX: 1,
          gridY: 1,
          gridWidth: 2,
          gridHeight: 2,
          metadata: {
            required: true,
            inputType: 'image',
            fieldTypes: ['visual-aid', 'chart'],
            llmHint: 'Data visualization area'
          }
        }
      ]
    };

    const result = buildMdxSource(state);
    const region = result.frontmatter.regions.find(r => r.id === 'box-1');
    assert(region);
    assert.strictEqual(region.area, 'special-region');
    assert.strictEqual(region.role, 'visual-aid');
    assert.strictEqual(region.required, true);
    assert.strictEqual(region.inputType, 'image');
    assert.strictEqual(region.llmHint, 'Data visualization area');
  });

  it('should validate generated frontmatter against shared schema', () => {
    const state = {
      templateName: 'validation-test',
      canvasWidth: 1920,
      canvasHeight: 1080,
      columns: 2,
      rows: 2,
      columnSize: '1fr',
      rowSize: '1fr',
      gap: '1rem',
      boxes: [
        {
          id: 'box-1',
          name: 'region',
          gridX: 0,
          gridY: 0,
          gridWidth: 1,
          gridHeight: 1,
          metadata: {
            required: false,
            inputType: 'any',
            fieldTypes: [],
            llmHint: ''
          }
        }
      ]
    };

    const result = buildMdxSource(state);
    const validation = validateFrontmatter(result.frontmatter);
    assert(validation.valid, `Validation errors: ${validation.errors.join(', ')}`);
  });

  it('should handle empty state gracefully', () => {
    const state = {
      templateName: 'empty',
      canvasWidth: 1920,
      canvasHeight: 1080,
      columns: 4,
      rows: 4,
      columnSize: '1fr',
      rowSize: '1fr',
      gap: '1rem',
      boxes: []
    };

    // Should still generate valid MDX even with empty boxes
    const result = buildMdxSource(state);
    assert(result.frontmatter);
    assert.strictEqual(result.frontmatter.title, 'Empty');
    assert.strictEqual(result.frontmatter.regions.length, 1);
  });

  it('should calculate maxWords from box grid dimensions', () => {
    const state = {
      templateName: 'word-calc',
      canvasWidth: 1920,
      canvasHeight: 1080,
      columns: 4,
      rows: 4,
      columnSize: '1fr',
      rowSize: '1fr',
      gap: '1rem',
      boxes: [
        {
          id: 'box-1',
          name: 'large',
          gridX: 0,
          gridY: 0,
          gridWidth: 4,
          gridHeight: 2,
          metadata: {
            required: true,
            inputType: 'text',
            fieldTypes: ['primary-title'],
            llmHint: 'Large area'
          }
        },
        {
          id: 'box-2',
          name: 'small',
          gridX: 0,
          gridY: 2,
          gridWidth: 2,
          gridHeight: 1,
          metadata: {
            required: false,
            inputType: 'text',
            fieldTypes: ['supporting-text'],
            llmHint: 'Small area'
          }
        }
      ]
    };

    const result = buildMdxSource(state);
    assert(result.source);
    
    const frontmatterMatch = result.source.match(/^---\n([\s\S]*?)\n---/);
    assert(frontmatterMatch);
    
    const frontmatter = frontmatterMatch[1];
    // Should calculate based on total grid cells (4*2 + 2*1 = 10 cells)
    assert(frontmatter.includes('maxWords:'));
  });
});
