import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { installGlobalDom } from './helpers/dom-env.js';

// Import Template Studio modules
import * as TemplateStudio from '../src/main.js';
import { state, resetState } from '../src/state.js';

function setGridMeasurements(element, width = 800, height = 400) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => ({ width, height, top: 0, left: 0, right: width, bottom: height }),
    configurable: true
  });
}

let domEnv;

function getDocument() {
  return domEnv?.document ?? document;
}

function buildControls() {
  const document = getDocument();
  return {
    templateName: document.getElementById('templateName'),
    canvasWidth: document.getElementById('canvasWidth'),
    canvasHeight: document.getElementById('canvasHeight'),
    columnCount: document.getElementById('columnCount'),
    rowCount: document.getElementById('rowCount'),
    columnSize: document.getElementById('columnSize'),
    rowSize: document.getElementById('rowSize'),
    gridGap: document.getElementById('gridGap'),
    previewGrid: document.getElementById('previewGrid'),
    snippetOutput: document.getElementById('snippetOutput'),
    resetNames: document.getElementById('resetNames'),
    openCssGrid: document.getElementById('openCssGrid'),
    copySnippet: document.getElementById('copySnippet'),
    saveMdx: document.getElementById('saveMdx'),
    deleteSelectedBtn: document.getElementById('deleteSelectedBtn'),
    exclusions: {
      top: document.getElementById('exclusionTop'),
      bottom: document.getElementById('exclusionBottom'),
      left: document.getElementById('exclusionLeft'),
      right: document.getElementById('exclusionRight')
    }
  };
}

function initializeHarness() {
  const document = getDocument();
  const previewGrid = document.getElementById('previewGrid');
  const guideLayer = document.getElementById('guideLayer');
  setGridMeasurements(previewGrid);
  const controls = buildControls();

  TemplateStudio.attachControlHandlers(
    controls,
    () => TemplateStudio.renderPreview(previewGrid, () => TemplateStudio.renderGuides(guideLayer, previewGrid)),
    TemplateStudio.renderSnippet,
    TemplateStudio.renderRegionsTable
  );
}

describe('Template Studio Visual Regression Tests', () => {
  beforeEach(() => {
    resetState();
    domEnv = installGlobalDom();
    const document = domEnv.document;
    
    // Create test DOM structure
    document.body.innerHTML = `
      <div class="canvas-container">
        <div class="guide-layer" id="guideLayer"></div>
        <div id="previewGrid" class="preview-grid"></div>
      </div>
      <div class="controls-panel">
        <input id="templateName" value="test-template">
        <input id="canvasWidth" value="1920">
        <input id="canvasHeight" value="1080">
        <input id="columnCount" value="12">
        <input id="rowCount" value="8">
        <input id="columnSize" value="1fr">
        <input id="rowSize" value="1fr">
        <input id="gridGap" value="0px">
        <textarea id="snippetOutput"></textarea>
        <button id="resetNames"></button>
        <button id="openCssGrid"></button>
        <button id="copySnippet"></button>
        <button id="saveMdx"></button>
        <button id="deleteSelectedBtn"></button>
        <input id="exclusionTop" value="0">
        <input id="exclusionBottom" value="0">
        <input id="exclusionLeft" value="0">
        <input id="exclusionRight" value="0">
        <div class="guide-controls">
          <button class="guide-btn active" data-guide="center">Center</button>
          <button class="guide-btn" data-guide="halves">Halves</button>
          <button class="guide-btn" data-guide="thirds">Thirds</button>
          <button class="guide-btn" data-guide="quarters">Quarters</button>
          <button class="guide-btn" data-guide="sixths">Sixths</button>
          <button class="guide-btn" data-guide="eighths">Eighths</button>
          <button class="guide-btn active" data-guide="margin">Margin</button>
        </div>
      </div>
    `;
    initializeHarness();
  });

  afterEach(() => {
    if (domEnv?.document) {
      domEnv.document.body.innerHTML = '';
    }
  });

  describe('Canvas Rendering', () => {
    it('should render grid blocks with correct CSS classes', () => {
      const previewGrid = getDocument().getElementById('previewGrid');
      
      // Create test boxes
      TemplateStudio.createBoxFromGrid(0, 0, 4, 2, 'header');
      TemplateStudio.createBoxFromGrid(0, 2, 12, 6, 'main');
      TemplateStudio.createBoxFromGrid(0, 8, 12, 2, 'footer');
      
      // Render
      TemplateStudio.renderPreview(previewGrid, () => {});
      
      // Check grid blocks exist
      const gridBlocks = previewGrid.querySelectorAll('.grid-block');
      assert.strictEqual(gridBlocks.length, 3);
      
      // Check grid areas are set
      const gridStyle = previewGrid.style.gridTemplateAreas;
      assert(gridStyle.includes('header'));
      assert(gridStyle.includes('main'));
      assert(gridStyle.includes('footer'));
    });

    it('should apply selection styling correctly', () => {
      const previewGrid = getDocument().getElementById('previewGrid');
      
      // Create and select a box
      const box = TemplateStudio.createBoxFromGrid(2, 2, 4, 3, 'selectable');
      state.selectedBoxId = box.id;
      
      // Render
      TemplateStudio.renderPreview(previewGrid, () => {});
      
      // Check selected class is applied
      const selectedBlock = previewGrid.querySelector('.grid-block.selected');
      assert(selectedBlock);
      
      // Check resize handles are visible
      const resizeHandles = selectedBlock.querySelectorAll('.resize-handle');
      assert.strictEqual(resizeHandles.length, 4);
    });

    it('should handle thin region styling', () => {
      const previewGrid = getDocument().getElementById('previewGrid');
      
      // Create thin regions
      TemplateStudio.createBoxFromGrid(0, 0, 12, 1, 'thin-horizontal');
      TemplateStudio.createBoxFromGrid(0, 1, 1, 6, 'thin-vertical');
      TemplateStudio.createBoxFromGrid(1, 1, 1, 1, 'very-small');
      
      // Render
      TemplateStudio.renderPreview(previewGrid, () => {});
      
      // Check styling classes
      const thinHorizontal = previewGrid.querySelector('.thin-horizontal');
      const thinVertical = previewGrid.querySelector('.thin-vertical');
      const verySmall = previewGrid.querySelector('.very-small');
      
      assert(thinHorizontal);
      assert(thinVertical);
      assert(verySmall);
    });

    it('should render region labels correctly', () => {
      const previewGrid = getDocument().getElementById('previewGrid');
      
      // Create regions with different name lengths
      TemplateStudio.createBoxFromGrid(0, 0, 6, 3, 'short');
      TemplateStudio.createBoxFromGrid(6, 0, 1, 1, 'very-long-region-name-that-should-be-truncated');
      
      // Render
      TemplateStudio.renderPreview(previewGrid, () => {});
      
      // Check labels exist
      const labels = previewGrid.querySelectorAll('.region-label');
      assert.strictEqual(labels.length, 2);
      
      // Check truncation for long names
      const longLabel = Array.from(labels).find(label => 
        label.textContent.includes('...')
      );
      assert(longLabel);
    });
  });

  describe('Guide Rendering', () => {
    it('should render center guides when enabled', () => {
      const document = getDocument();
      const guideLayer = document.getElementById('guideLayer');
      const previewGrid = document.getElementById('previewGrid');
      
      // Enable center guides
      state.guideSettings.center = true;
      
      // Set dimensions for proper guide calculation
      previewGrid.style.width = '800px';
      previewGrid.style.height = '400px';
      
      // Render guides
      TemplateStudio.renderGuides(guideLayer, previewGrid);
      
      // Check guide lines exist
      const guideLines = guideLayer.querySelectorAll('.guide-line');
      assert(guideLines.length >= 2); // At least center horizontal and vertical
      
      // Check center lines
      const centerLines = guideLayer.querySelectorAll('.guide-line.center');
      assert(centerLines.length >= 1);
    });

    it('should render fraction guides when enabled', () => {
      const document = getDocument();
      const guideLayer = document.getElementById('guideLayer');
      const previewGrid = document.getElementById('previewGrid');
      
      // Enable thirds
      state.guideSettings.thirds = true;
      state.guideSettings.center = false;
      
      previewGrid.style.width = '600px';
      previewGrid.style.height = '300px';
      
      // Render guides
      TemplateStudio.renderGuides(guideLayer, previewGrid);
      
      // Check third guides exist
      const guideLines = guideLayer.querySelectorAll('.guide-line');
      assert(guideLines.length >= 4); // 2 horizontal + 2 vertical thirds
    });

    it('should render exclusion zones', () => {
      const document = getDocument();
      const guideLayer = document.getElementById('guideLayer');
      const previewGrid = document.getElementById('previewGrid');
      
      // Set exclusions
      state.exclusions.top = 2;
      state.exclusions.left = 1;
      state.exclusions.right = 1;
      state.exclusions.bottom = 2;
      
      previewGrid.style.width = '800px';
      previewGrid.style.height = '400px';
      
      // Render guides
      TemplateStudio.renderGuides(guideLayer, previewGrid);
      
      // Check exclusion zones exist
      const exclusionZones = guideLayer.querySelectorAll('.exclusion-zone');
      assert(exclusionZones.length > 0);
    });

    it('should render margin outline', () => {
      const document = getDocument();
      const guideLayer = document.getElementById('guideLayer');
      const previewGrid = document.getElementById('previewGrid');
      
      // Enable margin
      state.guideSettings.margin = true;
      state.columns = 4;
      state.rows = 4;
      
      previewGrid.style.width = '400px';
      previewGrid.style.height = '400px';
      
      // Render guides
      TemplateStudio.renderGuides(guideLayer, previewGrid);
      
      // Check margin outline exists
      const marginOutline = guideLayer.querySelector('.margin-outline');
      assert(marginOutline);
    });
  });

  describe('Interactive Elements', () => {
    it('should render resize handles on hover', () => {
      const previewGrid = getDocument().getElementById('previewGrid');
      
      // Create a box
      const box = TemplateStudio.createBoxFromGrid(2, 2, 4, 3, 'resizable');
      
      // Render
      TemplateStudio.renderPreview(previewGrid, () => {});
      
      // Check resize handles exist (should be visible on hover)
      const gridBlock = previewGrid.querySelector('.grid-block');
      const resizeHandles = gridBlock.querySelectorAll('.resize-handle');
      assert.strictEqual(resizeHandles.length, 4);
      
      // Check handle positions
      const positions = Array.from(resizeHandles).map(handle => 
        handle.dataset.position
      ).sort();
      
      assert.deepStrictEqual(positions, ['ne', 'nw', 'se', 'sw']);
    });

    it('should handle guide button interactions', () => {
      const document = getDocument();
      const centerBtn = document.querySelector('[data-guide="center"]');
      const thirdsBtn = document.querySelector('[data-guide="thirds"]');
      assert(centerBtn);
      assert(thirdsBtn);

      // initial state reflects buttons from setup
      assert.strictEqual(state.guideSettings.center, true);
      assert.strictEqual(state.guideSettings.thirds, false);

      centerBtn.click();
      assert.strictEqual(state.guideSettings.center, false);
      thirdsBtn.click();
      assert.strictEqual(state.guideSettings.thirds, true);
    });

    it('should update control states based on selection', () => {
      const deleteBtn = getDocument().createElement('button');
      deleteBtn.id = 'deleteSelectedBtn';
      deleteBtn.disabled = true;
      
      const controls = { deleteSelectedBtn: deleteBtn };
      
      // Test with no selection
      TemplateStudio.updateSelectionControls(controls);
      assert.strictEqual(deleteBtn.disabled, true);
      
      // Test with selection
      const box = TemplateStudio.createBoxFromGrid(2, 2, 4, 3, 'deletable');
      state.selectedBoxId = box.id;
      
      TemplateStudio.updateSelectionControls(controls);
      assert.strictEqual(deleteBtn.disabled, false);
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt to different canvas sizes', () => {
      const previewGrid = getDocument().getElementById('previewGrid');
      
      // Test small canvas
      previewGrid.style.width = '300px';
      previewGrid.style.height = '200px';
      
      TemplateStudio.createBoxFromGrid(0, 0, 2, 2, 'responsive');
      TemplateStudio.renderPreview(previewGrid, () => {});
      
      // Should render without errors
      const gridBlocks = previewGrid.querySelectorAll('.grid-block');
      assert.strictEqual(gridBlocks.length, 1);
      
      // Test large canvas
      previewGrid.style.width = '1200px';
      previewGrid.style.height = '800px';
      
      TemplateStudio.renderPreview(previewGrid, () => {});
      
      // Should still render correctly
      const gridBlocksLarge = previewGrid.querySelectorAll('.grid-block');
      assert.strictEqual(gridBlocksLarge.length, 1);
    });

    it('should handle different grid dimensions', () => {
      const previewGrid = getDocument().getElementById('previewGrid');
      
      // Test with many columns and rows
      state.columns = 20;
      state.rows = 15;
      
      TemplateStudio.createBoxFromGrid(5, 3, 10, 8, 'large-grid');
      TemplateStudio.renderPreview(previewGrid, () => {});
      
      // Should render correctly
      const gridBlocks = previewGrid.querySelectorAll('.grid-block');
      assert.strictEqual(gridBlocks.length, 1);
      
      // Check grid template areas
      const gridAreas = previewGrid.style.gridTemplateAreas;
      assert(gridAreas);
    });
  });

  describe('Error Recovery', () => {
    it('should handle missing DOM elements gracefully', () => {
      const previewGrid = getDocument().getElementById('previewGrid');
      previewGrid.remove();
      
      // Should not throw
      assert.doesNotThrow(() => {
        TemplateStudio.renderPreview(previewGrid, () => {});
      });
    });

    it('should handle corrupted state gracefully', () => {
      const previewGrid = getDocument().getElementById('previewGrid');
      
      // Corrupt state
      state.boxes = [{ invalid: 'box' }];
      state.selectedBoxId = 'nonexistent';
      
      // Should handle gracefully
      assert.doesNotThrow(() => {
        TemplateStudio.renderPreview(previewGrid, () => {});
      });
      
      // Reset for other tests
      resetState();
    });

    it('should handle CSS calculation errors', () => {
      const document = getDocument();
      const previewGrid = document.getElementById('previewGrid');
      
      // Set invalid dimensions
      previewGrid.style.width = '0px';
      previewGrid.style.height = '0px';
      
      // Should handle gracefully
      assert.doesNotThrow(() => {
        TemplateStudio.renderPreview(previewGrid, () => {});
        TemplateStudio.renderGuides(document.getElementById('guideLayer'), previewGrid);
      });
    });
  });
});
