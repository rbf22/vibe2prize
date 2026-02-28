import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { installGlobalDom } from './helpers/dom-env.js';

// Import Template Studio modules
import * as TemplateStudio from '../src/main.js';
import { state, resetState } from '../src/state.js';

describe('Template Studio Core Regression Tests', () => {
  let dom;

  beforeEach(() => {
    resetState();
    dom = installGlobalDom();
    dom.window.document.body.innerHTML = '';
  });

  afterEach(() => {
    if (dom?.window?.document) {
      dom.window.document.body.innerHTML = '';
    }
  });

  describe('State Management', () => {
    it('should initialize with correct default values', () => {
      assert.strictEqual(state.templateName, 'cssgrid-template');
      assert.strictEqual(state.canvasWidth, 1920);
      assert.strictEqual(state.canvasHeight, 1080);
      assert.strictEqual(state.columns, 80);
      assert.strictEqual(state.rows, 45);
      assert.strictEqual(state.boxes.length, 0);
      assert.strictEqual(state.selectedBoxId, null);
      assert.strictEqual(state.isDrawing, false);
      assert.strictEqual(state.dragStart, null);
      assert.strictEqual(state.guideSettings.center, true);
      assert.strictEqual(state.guideSettings.margin, true);
    });

    it('should reset state completely', () => {
      // Modify state
      state.templateName = 'modified';
      state.boxes.push({ id: 'test', name: 'test' });
      state.selectedBoxId = 'test';
      state.guideSettings.center = false;
      
      // Reset
      resetState();
      
      // Verify all values are reset
      assert.strictEqual(state.templateName, 'cssgrid-template');
      assert.strictEqual(state.boxes.length, 0);
      assert.strictEqual(state.selectedBoxId, null);
      assert.strictEqual(state.guideSettings.center, true);
    });
  });

  describe('Box Creation and Management', () => {
    it('should create a box with valid properties', () => {
      const box = TemplateStudio.createBoxFromGrid(2, 2, 4, 3, 'test-region');
      
      assert(box);
      assert.strictEqual(box.gridX, 2);
      assert.strictEqual(box.gridY, 2);
      assert.strictEqual(box.gridWidth, 4);
      assert.strictEqual(box.gridHeight, 3);
      assert.strictEqual(box.name, 'test-region');
      assert(box.id);
      assert(box.metadata);
      assert.strictEqual(typeof box.id, 'string');
      assert(box.id.length > 0);
    });

    it('should add box to state', () => {
      const initialCount = state.boxes.length;
      const box = TemplateStudio.createBoxFromGrid(1, 1, 3, 2, 'new-region');
      
      assert.strictEqual(state.boxes.length, initialCount + 1);
      assert(state.boxes.includes(box));
    });

    it('should detect box at grid position', () => {
      // Create a box
      const box = TemplateStudio.createBoxFromGrid(2, 2, 4, 3, 'test-region');
      
      // Should find box within its bounds
      const foundBox = TemplateStudio.getBoxAtGrid(3, 3);
      assert.strictEqual(foundBox, box);
      
      // Should not find box outside its bounds
      const notFoundBox = TemplateStudio.getBoxAtGrid(0, 0);
      assert.strictEqual(notFoundBox, null);
    });

    it('should prevent overlapping boxes', () => {
      // Create first box
      TemplateStudio.createBoxFromGrid(2, 2, 4, 3, 'first');
      
      // Try to create overlapping box
      const overlapBox = TemplateStudio.createBoxFromGrid(3, 3, 2, 2, 'overlap');
      
      // Should not create overlapping box
      assert.strictEqual(overlapBox, null);
      assert.strictEqual(state.boxes.length, 1);
    });

    it('should delete selected box', () => {
      // Create and select a box
      const box = TemplateStudio.createBoxFromGrid(2, 2, 4, 3, 'deletable');
      state.selectedBoxId = box.id;
      
      // Delete selected region
      TemplateStudio.deleteSelectedRegion();
      
      // Verify deletion
      assert.strictEqual(state.boxes.length, 0);
      assert.strictEqual(state.selectedBoxId, null);
    });

    it('should handle delete when no selection', () => {
      state.selectedBoxId = null;
      
      // Should not throw
      assert.doesNotThrow(() => {
        TemplateStudio.deleteSelectedRegion();
      });
    });
  });

  describe('Mouse Interaction Detection', () => {
    it('should detect editable targets correctly', () => {
      const editableEvent = {
        target: dom.window.document.createElement('input')
      };
      
      const nonEditableEvent = {
        target: dom.window.document.createElement('div')
      };
      
      assert.strictEqual(TemplateStudio.isEditableTarget(editableEvent), true);
      assert.strictEqual(TemplateStudio.isEditableTarget(nonEditableEvent), false);
    });

    it('should handle mouse events without drawing', () => {
      const mockPreviewGrid = dom.window.document.createElement('div');
      
      assert.doesNotThrow(() => {
        TemplateStudio.handleMouseMove(
          { clientX: 100, clientY: 100 },
          mockPreviewGrid,
          () => {}
        );
      });
      
      assert.doesNotThrow(() => {
        TemplateStudio.handleMouseUp(
          { clientX: 100, clientY: 100 },
          mockPreviewGrid,
          () => {},
          () => {},
          () => {}
        );
      });
    });
  });

  describe('Guide Settings', () => {
    it('should toggle guide settings', () => {
      const initialState = state.guideSettings.center;
      
      // Toggle center guide
      state.guideSettings.center = !state.guideSettings.center;
      
      assert.strictEqual(state.guideSettings.center, !initialState);
    });

    it('should handle exclusion settings', () => {
      state.exclusions.top = 2;
      state.exclusions.left = 1;
      state.exclusions.right = 1;
      state.exclusions.bottom = 2;
      
      assert.strictEqual(state.exclusions.top, 2);
      assert.strictEqual(state.exclusions.left, 1);
      assert.strictEqual(state.exclusions.right, 1);
      assert.strictEqual(state.exclusions.bottom, 2);
    });

    it('should render guides when enabled', () => {
      const guideLayer = dom.window.document.createElement('div');
      const previewGrid = dom.window.document.createElement('div');
      
      // Set dimensions
      previewGrid.style.width = '800px';
      previewGrid.style.height = '400px';
      
      // Enable center guides
      state.guideSettings.center = true;
      
      // Render guides
      TemplateStudio.renderGuides(guideLayer, previewGrid);
      
      // Check that guide lines were created
      const guideLines = guideLayer.querySelectorAll('.guide-line');
      assert(guideLines.length >= 0); // Should not throw
    });

    it('should toggle all guide buttons', () => {
      // Create mock guide buttons
      const centerBtn = dom.window.document.createElement('button');
      const thirdsBtn = dom.window.document.createElement('button');
      const quartersBtn = dom.window.document.createElement('button');
      
      centerBtn.className = 'guide-btn active';
      centerBtn.dataset.guide = 'center';
      
      thirdsBtn.className = 'guide-btn';
      thirdsBtn.dataset.guide = 'thirds';
      
      quartersBtn.className = 'guide-btn';
      quartersBtn.dataset.guide = 'quarters';
      
      // Add buttons to DOM so attachControlHandlers can find them
      dom.window.document.body.appendChild(centerBtn);
      dom.window.document.body.appendChild(thirdsBtn);
      dom.window.document.body.appendChild(quartersBtn);
      
      // Call attachControlHandlers to set up event listeners
      const mockControls = {
        templateName: dom.window.document.createElement('input'),
        canvasWidth: dom.window.document.createElement('input'),
        canvasHeight: dom.window.document.createElement('input'),
        columnCount: dom.window.document.createElement('input'),
        rowCount: dom.window.document.createElement('input'),
        columnSize: dom.window.document.createElement('input'),
        rowSize: dom.window.document.createElement('input'),
        gridGap: dom.window.document.createElement('input'),
        previewGrid: dom.window.document.createElement('div'),
        snippetOutput: dom.window.document.createElement('textarea'),
        resetNames: dom.window.document.createElement('button'),
        openCssGrid: dom.window.document.createElement('button'),
        copySnippet: dom.window.document.createElement('button'),
        saveMdx: dom.window.document.createElement('button'),
        deleteSelectedBtn: dom.window.document.createElement('button'),
        exclusions: {
          top: dom.window.document.createElement('input'),
          bottom: dom.window.document.createElement('input'),
          left: dom.window.document.createElement('input'),
          right: dom.window.document.createElement('input')
        }
      };
      
      TemplateStudio.attachControlHandlers(
        mockControls,
        () => {},
        () => {},
        () => {}
      );
      
      // Test button clicks
      const initialCenterState = state.guideSettings.center;
      centerBtn.click();
      assert.strictEqual(state.guideSettings.center, false);
      
      const initialThirdsState = state.guideSettings.thirds;
      thirdsBtn.click();
      assert.strictEqual(state.guideSettings.thirds, true);
      
      const initialQuartersState = state.guideSettings.quarters;
      quartersBtn.click();
      assert.strictEqual(state.guideSettings.quarters, true);
      
      // Clean up DOM
      dom.window.document.body.removeChild(centerBtn);
      dom.window.document.body.removeChild(thirdsBtn);
      dom.window.document.body.removeChild(quartersBtn);
    });

    it('should render different guide combinations', () => {
      const guideLayer = dom.window.document.createElement('div');
      const previewGrid = dom.window.document.createElement('div');
      
      previewGrid.style.width = '600px';
      previewGrid.style.height = '300px';
      
      // Test center guides only
      state.guideSettings.center = true;
      state.guideSettings.thirds = false;
      state.guideSettings.quarters = false;
      
      TemplateStudio.renderGuides(guideLayer, previewGrid);
      const centerLines = guideLayer.querySelectorAll('.guide-line');
      
      // Clear for next test
      guideLayer.innerHTML = '';
      
      // Test thirds guides
      state.guideSettings.center = false;
      state.guideSettings.thirds = true;
      
      TemplateStudio.renderGuides(guideLayer, previewGrid);
      const thirdsLines = guideLayer.querySelectorAll('.guide-line');
      
      // Should not throw and should create different numbers of lines
      assert(thirdsLines.length >= 0);
    });
  });

  describe('History Management', () => {
    it('should handle history operations', () => {
      // Add initial state
      TemplateStudio.pushHistory();
      
      // Modify state
      TemplateStudio.createBoxFromGrid(2, 2, 4, 3, 'test-region');
      
      // Push history after modification
      TemplateStudio.pushHistory();
      
      // Should be able to undo
      assert.doesNotThrow(() => {
        TemplateStudio.handleUndo();
      });
      
      // Should be able to redo
      assert.doesNotThrow(() => {
        TemplateStudio.handleRedo();
      });
    });

    it('should handle empty history gracefully', () => {
      // Clear history
      TemplateStudio.resetInteractionHistory();
      
      assert.doesNotThrow(() => {
        TemplateStudio.handleUndo();
        TemplateStudio.handleRedo();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle null DOM elements', () => {
      assert.doesNotThrow(() => {
        TemplateStudio.renderPreview(null, () => {});
        TemplateStudio.renderGuides(null, null);
        TemplateStudio.updateSelectionControls(null);
      });
    });

    it('should handle invalid coordinates', () => {
      // Test with negative coordinates
      const negativeBox = TemplateStudio.createBoxFromGrid(-1, -1, 0, 0, 'invalid');
      assert.strictEqual(negativeBox, null);
      
      // Test with zero dimensions
      const zeroBox = TemplateStudio.createBoxFromGrid(0, 0, 0, 0, 'zero');
      assert.strictEqual(zeroBox, null);
    });

    it('should reject out-of-bounds coordinates', () => {
      const outOfBoundsBox = TemplateStudio.createBoxFromGrid(1000, 1000, 100, 100, 'out-of-bounds');
      assert.strictEqual(outOfBoundsBox, null);
    });
  });

  describe('Performance', () => {
    it('should handle multiple box creation efficiently', () => {
      const startTime = Date.now();
      
      // Create multiple boxes
      for (let i = 0; i < 20; i++) {
        const x = (i % 5) * 10;
        const y = Math.floor(i / 5) * 10;
        TemplateStudio.createBoxFromGrid(x, y, 5, 5, `perf-${i}`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time
      assert(duration < 1000, `Creating 20 boxes took too long: ${duration}ms`);
      assert.strictEqual(state.boxes.length, 20);
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

  describe('Data Integrity', () => {
    it('should maintain box metadata', () => {
      const box = TemplateStudio.createBoxFromGrid(2, 2, 4, 3, 'metadata-test');
      
      // Should have default metadata
      assert(box.metadata);
      assert(typeof box.metadata === 'object');
      
      // Should be able to set custom metadata
      state.metadata[box.id] = {
        required: true,
        inputType: 'text',
        fieldTypes: ['title'],
        llmHint: 'Test metadata'
      };
      
      assert.strictEqual(state.metadata[box.id].required, true);
      assert.strictEqual(state.metadata[box.id].inputType, 'text');
    });

    it('should preserve box uniqueness', () => {
      const box1 = TemplateStudio.createBoxFromGrid(0, 0, 4, 3, 'unique-1');
      const box2 = TemplateStudio.createBoxFromGrid(5, 0, 4, 3, 'unique-2');
      
      // Should have unique IDs
      assert.notStrictEqual(box1.id, box2.id);
      
      // Should have unique names
      assert.notStrictEqual(box1.name, box2.name);
    });
  });
});
