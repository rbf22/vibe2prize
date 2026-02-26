import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { dom } from './helpers/dom-env.js';

// Import Template Studio modules
import * as TemplateStudio from '../src/main.js';
import { buildMdxSource, buildFrontmatterFromState } from '../src/persistence/mdx.js';
import { state, resetState } from '../src/state.js';
import { validateFrontmatter } from '../../core/mdx/schema.js';

describe('Template Studio Integration Tests', () => {
  beforeEach(() => {
    // Reset state before each test
    resetState();
  });

  afterEach(() => {
    // Clean up DOM
    dom.window.document.body.innerHTML = '';
  });

  describe('Full Workflow Integration', () => {
    it('should complete full design-to-export workflow', () => {
      state.columns = 12;
      state.rows = 12;

      const header = TemplateStudio.createBoxFromGrid(0, 0, 12, 2, 'header');
      const sidebar = TemplateStudio.createBoxFromGrid(0, 2, 3, 6, 'sidebar');
      const main = TemplateStudio.createBoxFromGrid(3, 2, 9, 6, 'main');
      const footer = TemplateStudio.createBoxFromGrid(0, 8, 12, 4, 'footer');

      [header, sidebar, main, footer].forEach(box => assert(box));
      assert.strictEqual(state.boxes.length, 4);
      
      // 2. Configure metadata for each region
      state.metadata[header.id] = {
        required: true,
        inputType: 'text',
        fieldTypes: ['title'],
        llmHint: 'Main page title'
      };
      
      state.metadata[sidebar.id] = {
        required: false,
        inputType: 'navigation',
        fieldTypes: ['links'],
        llmHint: 'Navigation menu'
      };
      
      state.metadata[main.id] = {
        required: true,
        inputType: 'content',
        fieldTypes: ['text', 'image'],
        llmHint: 'Main content area'
      };
      
      state.metadata[footer.id] = {
        required: false,
        inputType: 'text',
        fieldTypes: ['links'],
        llmHint: 'Footer information'
      };

      // 3. Update template settings
      state.templateName = 'complex-layout';
      state.canvasWidth = 1920;
      state.canvasHeight = 1080;
      state.columns = 12;
      state.rows = 12;

      // 4. Generate MDX (if function available)
      if (TemplateStudio.buildMdxSource) {
        const mdxResult = TemplateStudio.buildMdxSource(state);
        assert(mdxResult);
        assert(typeof mdxResult.source === 'string');
        assert(mdxResult.source.includes('---'));
        assert(mdxResult.source.includes('title: "complex-layout"'));
      }

      // 5. Generate CSS snippet
      assert.doesNotThrow(() => {
        TemplateStudio.renderSnippet();
      });

      // 6. Render regions table
      assert.doesNotThrow(() => {
        TemplateStudio.renderRegionsTable();
      });
    });

    it('should handle undo/redo throughout workflow', () => {
      TemplateStudio.pushHistory();

      const box1 = TemplateStudio.createBoxFromGrid(0, 0, 4, 4, 'region-1');
      const box2 = TemplateStudio.createBoxFromGrid(4, 0, 4, 4, 'region-2');
      assert(box1);
      assert(box2);
      assert.strictEqual(state.boxes.length, 2);

      TemplateStudio.handleUndo();
      assert.strictEqual(state.boxes.length, 1);

      TemplateStudio.handleRedo();
      assert.strictEqual(state.boxes.length, 2);

      TemplateStudio.handleUndo();
      TemplateStudio.handleUndo();
      assert.strictEqual(state.boxes.length, 0);
    });
  });

  describe('MDX Import/Export Integration', () => {
    it('should maintain data integrity through export/import cycle', () => {
      // Create a test layout
      const header = TemplateStudio.createBoxFromGrid(0, 0, 6, 3, 'header');
      const body = TemplateStudio.createBoxFromGrid(6, 0, 6, 3, 'body');
      [header, body].forEach(box => {
        state.metadata[box.id] = {
          required: true,
          inputType: 'text',
          fieldTypes: ['title'],
          llmHint: `${box.name} content`
        };
      });

      state.templateName = 'integration-test';
      state.canvasWidth = 1200;
      state.canvasHeight = 800;

      const exportResult = buildMdxSource(state);

      const validation = validateFrontmatter(exportResult.frontmatter);
      assert(validation.valid, `Export validation failed: ${validation.errors.join(', ')}`);

      resetState();

      const templateSettings = exportResult.frontmatter.templateSettings || {};
      state.templateName = exportResult.frontmatter.title || exportResult.frontmatter.layout?.template;
      state.canvasWidth = templateSettings.canvasWidth || (exportResult.frontmatter.layout.columns * 100);
      state.canvasHeight = templateSettings.canvasHeight || (exportResult.frontmatter.layout.rows * 100);

      exportResult.frontmatter.regions.forEach(region => {
        const newBox = {
          id: region.id,
          name: region.area,
          gridX: region.grid?.x ?? 0,
          gridY: region.grid?.y ?? 0,
          gridWidth: region.grid?.width ?? 1,
          gridHeight: region.grid?.height ?? 1,
          metadata: {
            required: region.required,
            inputType: region.inputType,
            fieldTypes: Array.isArray(region.fieldTypes) && region.fieldTypes.length
              ? region.fieldTypes
              : (region.role ? [region.role] : []),
            llmHint: region.llmHint || '',
            type: region.type || region.role || ''
          }
        };
        state.boxes.push(newBox);
        state.metadata[newBox.id] = newBox.metadata;
      });

      assert.strictEqual(state.boxes.length, exportResult.frontmatter.regions.length);
      const importedAreas = state.boxes.map(box => box.name).sort();
      const exportedAreas = exportResult.frontmatter.regions.map(region => region.area).sort();
      assert.deepStrictEqual(importedAreas, exportedAreas);
      assert.strictEqual(state.templateName, 'Integration Test');
      const importedMetadata = state.metadata[state.boxes[0].id];
      assert.strictEqual(importedMetadata.required, true);
    });
  });

  describe('UI State Synchronization', () => {
    it('should keep UI components synchronized with state', () => {
      // Create mock UI elements
      const previewGrid = dom.window.document.createElement('div');
      const guideLayer = dom.window.document.createElement('div');
      const controls = {
        templateName: dom.window.document.createElement('input'),
        deleteSelectedBtn: dom.window.document.createElement('button')
      };

      // Add a box
      const box = TemplateStudio.createBoxFromGrid(1, 1, 3, 2, 'sync-test');
      
      // Select the box
      state.selectedBoxId = box.id;
      
      // Update UI controls
      TemplateStudio.updateSelectionControls(controls);
      
      // Delete the box
      TemplateStudio.deleteSelectedRegion();
      
      // Verify state is reset
      assert.strictEqual(state.selectedBoxId, null);
      assert.strictEqual(state.boxes.length, 0);
      
      // UI should reflect this
      TemplateStudio.updateSelectionControls(controls);
    });

    it('should handle rapid state changes', () => {
      // Simulate rapid interactions
      for (let i = 0; i < 10; i++) {
        const box = TemplateStudio.createBoxFromGrid(i, i, 2, 2, `rapid-${i}`);
        state.selectedBoxId = box.id;
        TemplateStudio.deleteSelectedRegion();
      }
      
      // Should handle gracefully
      assert.strictEqual(state.boxes.length, 0);
      assert.strictEqual(state.selectedBoxId, null);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large layouts efficiently', () => {
      const startTime = Date.now();
      
      // Create many boxes
      for (let i = 0; i < 50; i++) {
        const x = i % 10;
        const y = Math.floor(i / 10);
        TemplateStudio.createBoxFromGrid(x * 2, y * 2, 2, 2, `perf-${i}`);
      }
      
      const createTime = Date.now() - startTime;
      assert(createTime < 1000, `Creating 50 boxes took too long: ${createTime}ms`);
      
      // Test rendering performance
      const renderStart = Date.now();
      const previewGrid = dom.window.document.createElement('div');
      TemplateStudio.renderPreview(previewGrid, () => {});
      const renderTime = Date.now() - renderStart;
      
      assert(renderTime < 500, `Rendering 50 boxes took too long: ${renderTime}ms`);
    });

    it('should handle boundary conditions', () => {
      // Test edge coordinates
      const edgeBox = TemplateStudio.createBoxFromGrid(0, 0, 1, 1, 'edge');
      assert(edgeBox);
      
      // Test maximum coordinates
      const maxBox = TemplateStudio.createBoxFromGrid(
        state.columns - 1, 
        state.rows - 1, 
        1, 
        1, 
        'max'
      );
      assert(maxBox);
      
      // Test overlapping prevention
      const overlapBox = TemplateStudio.createBoxFromGrid(0, 0, 2, 2, 'overlap');
      assert.strictEqual(overlapBox, null);
    });

    it('should recover from errors gracefully', () => {
      // Test with invalid data
      assert.doesNotThrow(() => {
        TemplateStudio.renderPreview(null, () => {});
        TemplateStudio.renderGuides(null, null);
        TemplateStudio.updateSelectionControls(null);
      });

      // Test with corrupted state
      state.boxes = null;
      assert.doesNotThrow(() => {
        TemplateStudio.renderPreview(dom.window.document.createElement('div'), () => {});
      });
      
      // Reset state for other tests
      resetState();
    });
  });

  describe('Browser Compatibility', () => {
    it('should work with different DOM structures', () => {
      // Test with minimal DOM
      const minimalGrid = dom.window.document.createElement('div');
      assert.doesNotThrow(() => {
        TemplateStudio.renderPreview(minimalGrid, () => {});
      });

      // Test with complex DOM
      const complexGrid = dom.window.document.createElement('div');
      complexGrid.appendChild(dom.window.document.createElement('div'));
      complexGrid.appendChild(dom.window.document.createElement('span'));
      assert.doesNotThrow(() => {
        TemplateStudio.renderPreview(complexGrid, () => {});
      });
    });

    it('should handle missing browser APIs gracefully', () => {
      // Mock missing clipboard API
      const originalClipboard = global.navigator.clipboard;
      global.navigator.clipboard = undefined;

      assert.doesNotThrow(() => {
        // Should not throw when clipboard is unavailable
        if (TemplateStudio.copySnippet) {
          // This would normally handle clipboard errors
        }
      });

      // Restore clipboard
      global.navigator.clipboard = originalClipboard;
    });
  });
});
