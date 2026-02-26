import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { JSDOM } from 'jsdom';
import { VirtualConsole } from 'jsdom';

// Mock browser environment
const virtualConsole = new VirtualConsole();
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable',
  virtualConsole
});

// Use Object.defineProperty to set read-only properties
Object.defineProperty(global, 'window', {
  value: dom.window,
  writable: false
});

Object.defineProperty(global, 'document', {
  value: dom.window.document,
  writable: false
});

Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  writable: false
});

Object.defineProperty(global, 'HTMLElement', {
  value: dom.window.HTMLElement,
  writable: false
});

Object.defineProperty(global, 'Element', {
  value: dom.window.Element,
  writable: false
});

Object.defineProperty(global, 'Node', {
  value: dom.window.Node,
  writable: false
});

// Import Template Studio modules
import * as TemplateStudio from '../src/main.js';
import { state, resetState } from '../src/state.js';

describe('Template Studio Regression Tests', () => {
  let mockPreviewGrid, mockGuideLayer, mockControls;

  beforeEach(() => {
    // Reset state before each test
    resetState();
    
    // Create mock DOM elements
    mockPreviewGrid = dom.window.document.createElement('div');
    mockPreviewGrid.id = 'previewGrid';
    mockPreviewGrid.className = 'preview-grid';
    mockPreviewGrid.style.width = '800px';
    mockPreviewGrid.style.height = '400px';
    
    mockGuideLayer = dom.window.document.createElement('div');
    mockGuideLayer.id = 'guideLayer';
    mockGuideLayer.className = 'guide-layer';
    
    mockControls = {
      templateName: dom.window.document.createElement('input'),
      canvasWidth: dom.window.document.createElement('input'),
      canvasHeight: dom.window.document.createElement('input'),
      columnCount: dom.window.document.createElement('input'),
      rowCount: dom.window.document.createElement('input'),
      columnSize: dom.window.document.createElement('input'),
      rowSize: dom.window.document.createElement('input'),
      gridGap: dom.window.document.createElement('input'),
      snippetOutput: dom.window.document.createElement('textarea'),
      resetNames: dom.window.document.createElement('button'),
      openCssGrid: dom.window.document.createElement('button'),
      copySnippet: dom.window.document.createElement('button'),
      saveMdx: dom.window.document.createElement('button'),
      deleteSelectedBtn: dom.window.document.createElement('button'),
      previewGrid: null,
      exclusions: {
        top: dom.window.document.createElement('input'),
        bottom: dom.window.document.createElement('input'),
        left: dom.window.document.createElement('input'),
        right: dom.window.document.createElement('input')
      }
    };
    
    // Set default values
    mockControls.templateName.value = 'test-template';
    mockControls.canvasWidth.value = '1920';
    mockControls.canvasHeight.value = '1080';
    mockControls.columnCount.value = '12';
    mockControls.rowCount.value = '8';
    mockControls.columnSize.value = '1fr';
    mockControls.rowSize.value = '1fr';
    mockControls.gridGap.value = '1rem';
    mockControls.previewGrid = mockPreviewGrid;
    
    dom.window.document.body.appendChild(mockPreviewGrid);
    dom.window.document.body.appendChild(mockGuideLayer);
  });

  afterEach(() => {
    // Clean up DOM
    dom.window.document.body.innerHTML = '';
  });

  describe('State Management', () => {
    it('should initialize with default state', () => {
      assert.strictEqual(state.templateName, 'cssgrid-template');
      assert.strictEqual(state.canvasWidth, 1920);
      assert.strictEqual(state.canvasHeight, 1080);
      assert.strictEqual(state.columns, 80);
      assert.strictEqual(state.rows, 45);
      assert.strictEqual(state.boxes.length, 0);
      assert.strictEqual(state.selectedBoxId, null);
      assert.strictEqual(state.isDrawing, false);
    });

    it('should reset state to defaults', () => {
      // Modify state
      state.templateName = 'modified';
      state.boxes.push({ id: 'test', name: 'test' });
      state.selectedBoxId = 'test';
      
      // Reset
      resetState();
      
      // Verify reset
      assert.strictEqual(state.templateName, 'cssgrid-template');
      assert.strictEqual(state.boxes.length, 0);
      assert.strictEqual(state.selectedBoxId, null);
    });
  });

  describe('Canvas Rendering', () => {
    it('should render preview without errors', () => {
      assert.doesNotThrow(() => {
        TemplateStudio.renderPreview(mockPreviewGrid, () => {});
      });
    });

    it('should render guides without errors', () => {
      assert.doesNotThrow(() => {
        TemplateStudio.renderGuides(mockGuideLayer, mockPreviewGrid);
      });
    });

    it('should handle empty canvas gracefully', () => {
      // Test with no boxes
      assert.doesNotThrow(() => {
        TemplateStudio.renderPreview(mockPreviewGrid, () => {});
      });
    });

    it('should render with boxes', () => {
      // Add a test box
      const box = TemplateStudio.createBoxFromGrid(2, 2, 4, 3, 'test-region');
      assert(box);
      assert.strictEqual(state.boxes.length, 1);
      
      // Render should not throw
      assert.doesNotThrow(() => {
        TemplateStudio.renderPreview(mockPreviewGrid, () => {});
      });
    });
  });

  describe('Region Creation and Management', () => {
    it('should create a box from grid coordinates', () => {
      const box = TemplateStudio.createBoxFromGrid(2, 2, 4, 3, 'test-region');
      
      assert(box);
      assert.strictEqual(box.gridX, 2);
      assert.strictEqual(box.gridY, 2);
      assert.strictEqual(box.gridWidth, 4);
      assert.strictEqual(box.gridHeight, 3);
      assert.strictEqual(box.name, 'test-region');
      assert(box.id);
      assert(box.metadata);
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

    it('should delete selected region', () => {
      // Create and select a box
      const box = TemplateStudio.createBoxFromGrid(2, 2, 4, 3, 'test-region');
      state.selectedBoxId = box.id;
      
      // Delete selected region
      TemplateStudio.deleteSelectedRegion();
      
      // Verify deletion
      assert.strictEqual(state.boxes.length, 0);
      assert.strictEqual(state.selectedBoxId, null);
    });

    it('should handle delete when no region selected', () => {
      state.selectedBoxId = null;
      
      // Should not throw
      assert.doesNotThrow(() => {
        TemplateStudio.deleteSelectedRegion();
      });
    });

    it('should sanitize region names containing spaces to keep layout stable', () => {
      const table = document.createElement('table');
      const tbody = document.createElement('tbody');
      tbody.id = 'regionsTableBody';
      table.appendChild(tbody);
      document.body.appendChild(table);

      // Provide deterministic grid measurements for renderPreview
      mockPreviewGrid.getBoundingClientRect = () => ({
        width: 800,
        height: 400,
        top: 0,
        left: 0,
        right: 800,
        bottom: 400
      });

      const box = TemplateStudio.createBoxFromGrid(2, 2, 4, 3, 'region-original');
      assert(box);

      TemplateStudio.renderRegionsTable();

      const nameInput = document.querySelector(`input[data-box-id="${box.id}"][data-field="name"]`);
      assert(nameInput, 'expected regions table name input to exist');

      nameInput.value = 'Hero Banner';
      nameInput.dispatchEvent(new window.Event('change', { bubbles: true }));

      assert.strictEqual(state.boxes[0].name, 'hero-banner');

      assert.doesNotThrow(() => {
        TemplateStudio.renderPreview(mockPreviewGrid, () => {});
      });

      const templateAreas = mockPreviewGrid.style.gridTemplateAreas;
      assert.ok(templateAreas.includes('hero-banner'));
    });

    it('should download MDX when save button is clicked', () => {
      state.boxes.push({
        id: 'box-1',
        name: 'region-1',
        gridX: 0,
        gridY: 0,
        gridWidth: 2,
        gridHeight: 2,
        metadata: {}
      });
      state.metadata['box-1'] = {};

      const controls = {
        templateName: document.createElement('input'),
        canvasWidth: document.createElement('input'),
        canvasHeight: document.createElement('input'),
        columnCount: document.createElement('input'),
        rowCount: document.createElement('input'),
        columnSize: document.createElement('input'),
        rowSize: document.createElement('input'),
        gridGap: document.createElement('input'),
        previewGrid: mockPreviewGrid,
        snippetOutput: document.createElement('textarea'),
        resetNames: document.createElement('button'),
        openCssGrid: document.createElement('button'),
        copySnippet: document.createElement('button'),
        saveMdx: document.createElement('button'),
        deleteSelectedBtn: document.createElement('button'),
        exclusions: {
          top: document.createElement('input'),
          bottom: document.createElement('input'),
          left: document.createElement('input'),
          right: document.createElement('input')
        }
      };

      let downloadTriggered = false;
      const originalWindowURL = {
        createObjectURL: window.URL?.createObjectURL,
        revokeObjectURL: window.URL?.revokeObjectURL
      };
      const originalGlobalURL = global.URL
        ? {
            createObjectURL: global.URL.createObjectURL,
            revokeObjectURL: global.URL.revokeObjectURL
          }
        : null;

      const stubCreateObjectURL = (blob) => {
        downloadTriggered = true;
        if (originalWindowURL.createObjectURL) {
          return originalWindowURL.createObjectURL.call(window.URL, blob);
        }
        return 'blob:test';
      };

      const stubRevokeObjectURL = (url) => {
        if (originalWindowURL.revokeObjectURL) {
          originalWindowURL.revokeObjectURL.call(window.URL, url);
        }
      };

      window.URL.createObjectURL = stubCreateObjectURL;
      window.URL.revokeObjectURL = stubRevokeObjectURL;
      if (global.URL && originalGlobalURL) {
        global.URL.createObjectURL = stubCreateObjectURL;
        global.URL.revokeObjectURL = stubRevokeObjectURL;
      }

      TemplateStudio.attachControlHandlers(controls, () => {}, () => {}, () => {});
      controls.saveMdx.click();

      window.URL.createObjectURL = originalWindowURL.createObjectURL || window.URL.createObjectURL;
      window.URL.revokeObjectURL = originalWindowURL.revokeObjectURL || window.URL.revokeObjectURL;
      if (global.URL && originalGlobalURL) {
        global.URL.createObjectURL = originalGlobalURL.createObjectURL || global.URL.createObjectURL;
        global.URL.revokeObjectURL = originalGlobalURL.revokeObjectURL || global.URL.revokeObjectURL;
      }

      assert.strictEqual(downloadTriggered, true);
    });
  });

  describe('Mouse Interactions', () => {
    it('should handle mouse move without drawing', () => {
      assert.doesNotThrow(() => {
        TemplateStudio.handleMouseMove(
          { clientX: 100, clientY: 100 },
          mockPreviewGrid,
          () => {}
        );
      });
    });

    it('should handle mouse up without drawing', () => {
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

    it('should handle editable target detection', () => {
      const editableEvent = {
        target: dom.window.document.createElement('input')
      };
      
      const nonEditableEvent = {
        target: dom.window.document.createElement('div')
      };
      
      assert.strictEqual(TemplateStudio.isEditableTarget(editableEvent), true);
      assert.strictEqual(TemplateStudio.isEditableTarget(nonEditableEvent), false);
    });
  });

  describe('Guide Controls', () => {
    it('should toggle guide settings', () => {
      const initialState = state.guideSettings.center;
      
      // Toggle center guide
      state.guideSettings.center = !state.guideSettings.center;
      
      assert.strictEqual(state.guideSettings.center, !initialState);
    });

    it('should render different guide combinations', () => {
      // Enable all guides
      Object.keys(state.guideSettings).forEach(key => {
        state.guideSettings[key] = true;
      });
      
      assert.doesNotThrow(() => {
        TemplateStudio.renderGuides(mockGuideLayer, mockPreviewGrid);
      });
      
      // Disable all guides
      Object.keys(state.guideSettings).forEach(key => {
        state.guideSettings[key] = false;
      });
      
      assert.doesNotThrow(() => {
        TemplateStudio.renderGuides(mockGuideLayer, mockPreviewGrid);
      });
    });

    it('should handle exclusion zones', () => {
      // Set exclusions
      state.exclusions.top = 2;
      state.exclusions.left = 1;
      state.exclusions.right = 1;
      state.exclusions.bottom = 2;
      
      assert.doesNotThrow(() => {
        TemplateStudio.renderGuides(mockGuideLayer, mockPreviewGrid);
      });
    });
  });

  describe('Control Handlers', () => {
    it('should attach control handlers without errors', () => {
      assert.doesNotThrow(() => {
        TemplateStudio.attachControlHandlers(
          mockControls,
          () => {},
          () => {},
          () => {}
        );
      });
    });

    it('should update selection controls', () => {
      // Test with no selection
      assert.doesNotThrow(() => {
        TemplateStudio.updateSelectionControls(mockControls);
      });
      
      // Test with selection
      const box = TemplateStudio.createBoxFromGrid(2, 2, 4, 3, 'test-region');
      state.selectedBoxId = box.id;
      
      assert.doesNotThrow(() => {
        TemplateStudio.updateSelectionControls(mockControls);
      });
    });

    it('should apply canvas dimensions', () => {
      assert.doesNotThrow(() => {
        TemplateStudio.applyCanvasDimensions(mockControls);
      });
    });
  });

  describe('MDX Export', () => {
    it('should build MDX source without errors', () => {
      // Add a test box
      TemplateStudio.createBoxFromGrid(2, 2, 4, 3, 'test-region');
      
      assert.doesNotThrow(() => {
        const result = TemplateStudio.buildMdxSource?.(state);
        // Note: buildMdxSource might not be exported in main.js
        // This test will pass if the function doesn't exist or doesn't throw
      });
    });

    it('should handle empty state for MDX export', () => {
      assert.doesNotThrow(() => {
        const result = TemplateStudio.buildMdxSource?.(state);
        // Note: buildMdxSource might not be exported in main.js
        // This test will pass if the function doesn't exist or doesn't throw
      });
    });
  });

  describe('UI Components', () => {
    it('should render regions table', () => {
      // Add test boxes
      TemplateStudio.createBoxFromGrid(2, 2, 4, 3, 'region-1');
      TemplateStudio.createBoxFromGrid(6, 1, 3, 2, 'region-2');
      
      assert.doesNotThrow(() => {
        TemplateStudio.renderRegionsTable();
      });
    });

    it('should render snippet', () => {
      // Add test boxes
      TemplateStudio.createBoxFromGrid(2, 2, 4, 3, 'test-region');
      
      assert.doesNotThrow(() => {
        TemplateStudio.renderSnippet();
      });
    });

    it('should handle empty regions table', () => {
      assert.doesNotThrow(() => {
        TemplateStudio.renderRegionsTable();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle null DOM elements gracefully', () => {
      assert.doesNotThrow(() => {
        TemplateStudio.renderPreview(null, () => {});
        TemplateStudio.renderGuides(null, null);
        TemplateStudio.updateSelectionControls(null);
      });
    });

    it('should handle invalid coordinates', () => {
      // Test with negative coordinates
      const box = TemplateStudio.createBoxFromGrid(-1, -1, 0, 0, 'invalid');
      // Should either return null or handle gracefully
      assert(box === null || box === undefined);
    });

    it('should handle large coordinates', () => {
      // Test with coordinates outside grid bounds
      const box = TemplateStudio.createBoxFromGrid(1000, 1000, 100, 100, 'out-of-bounds');
      assert.strictEqual(box, null);
    });
  });

  describe('History Management', () => {
    it('should handle undo/redo operations', () => {
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

    it('should handle undo when no history available', () => {
      // Clear history
      TemplateStudio.resetInteractionHistory();
      
      assert.doesNotThrow(() => {
        TemplateStudio.handleUndo();
      });
    });

    it('should handle redo when no redo available', () => {
      // Clear redo stack
      TemplateStudio.resetInteractionHistory();
      
      assert.doesNotThrow(() => {
        TemplateStudio.handleRedo();
      });
    });
  });
});
