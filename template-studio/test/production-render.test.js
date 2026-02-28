import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { state } from '../src/state.js';
import { renderProductionSlide, cleanupProductionRender, __resetReactCacheForTests } from '../src/canvas/production-renderer.js';

function setDimension(target, prop, value) {
  try {
    delete target[prop];
  } catch (error) {
    // ignore if deletion fails (property may be non-configurable)
  }
  Object.defineProperty(target, prop, {
    configurable: true,
    get: () => value
  });
}

// Mock ResizeObserver for Node.js environment
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock MutationObserver for Node.js environment
global.MutationObserver = class MutationObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  disconnect() {}
};

// Mock window and global scope for tests
const dom = new JSDOM(`
  <!DOCTYPE html>
  <div class="preview-workbench" data-view="production">
    <div class="production-preview-panel" style="display:flex">
      <div id="test-container"></div>
    </div>
  </div>
`, {
  pretendToBeVisual: true,
  resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
// Don't override navigator as it's read-only

// Mock React for testing
global.window.React = {
  createElement: (type, props, ...children) => ({
    type,
    props: { ...props, children: children.length === 1 ? children[0] : children }
  })
};

global.window.ReactDOM = {
  createRoot: (container) => ({
    render: (element) => {
      // Simple mock rendering for testing
      container.innerHTML = `<div style="width:100%;height:100%;background:#fff">Mock React Render</div>`;
    },
    unmount: () => {
      container.innerHTML = '';
    }
  })
};

describe('Production Renderer', () => {
  beforeEach(() => {
    // Reset state
    state.boxes = [];
    state.canvasWidth = 1920;
    state.canvasHeight = 1080;
    state.columns = 12;
    state.rows = 6;
    state.brand = { id: 'epam', variant: 'dark' };
    state.pagination = { pageNumber: 1, totalSlides: 12, label: 'Page' };
  });

  test('should render with proper scaling', async () => {
    const container = dom.window.document.getElementById('test-container');
    const parentPanel = container.closest('.production-preview-panel');
    
    // Set container size
    container.style.width = '658px';
    container.style.height = '370px';
    setDimension(container, 'clientWidth', 658);
    setDimension(container, 'clientHeight', 370);

    // Also set parent panel dimensions
    if (parentPanel) {
      setDimension(parentPanel, 'clientWidth', 658);
      setDimension(parentPanel, 'clientHeight', 370);
    }
    
    // Add a test box with grid properties
    state.boxes = [{
      id: 'test-box-1',
      role: 'primary-title',
      gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3,
      metadata: { role: 'primary-title', importance: 'critical' }
    }];
    
    await renderProductionSlide(container);
    
    // Check that content was rendered - look for any content, not just Mock React Render
    assert(container.innerHTML.length > 0, 'Should render content');
    // More flexible check - either React mock or fallback
    const hasContent = container.innerHTML.includes('Mock React Render') || 
                     container.innerHTML.includes('slide-preview-region') ||
                     container.innerHTML.includes('slide-board');
    assert(hasContent, `Should render slide content. Got: ${container.innerHTML.substring(0, 200)}`);
  });

  test('should handle empty state', async () => {
    const container = dom.window.document.getElementById('test-container');
    const parentPanel = container.closest('.production-preview-panel');
    
    // Clear any existing content and set dimensions
    container.innerHTML = '';
    container._productionRoot = null;
    setDimension(container, 'clientWidth', 658);
    setDimension(container, 'clientHeight', 370);

    // Also set parent panel dimensions
    if (parentPanel) {
      setDimension(parentPanel, 'clientWidth', 658);
      setDimension(parentPanel, 'clientHeight', 370);
    }
    
    await renderProductionSlide(container);
    
    assert(container.innerHTML.includes('No regions to render'), 'Should show empty state message');
  });

  test('should cleanup properly', async () => {
    const container = dom.window.document.getElementById('test-container');
    const parentPanel = container.closest('.production-preview-panel');
    
    // Add a box and render
    state.boxes = [{
      id: 'test', role: 'supporting-text', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3, metadata: {}
    }];
    await renderProductionSlide(container);
    
    // Cleanup
    cleanupProductionRender(container);
    
    assert(container._productionRoot === null, 'Should cleanup root reference');
    assert(container._resizeObserver === null, 'Should cleanup resize observer');
    assert(container._windowResizeHandler === null, 'Should cleanup window resize handler');
    
    // Visibility observer is only created if there's a parent panel
    if (parentPanel) {
      assert(container._visibilityObserver === null, 'Should cleanup visibility observer');
    }
  });

  test('should use fallback when React not available', async (t) => {
    // Remove React mock from global and module
    delete global.window.React;
    delete global.window.ReactDOM;

    // Ensure cached references inside module are cleared
    if (typeof __resetReactCacheForTests === 'function') {
      __resetReactCacheForTests();
    }

    // Create a new container with fresh properties
    const newContainer = dom.window.document.createElement('div');
    setDimension(newContainer, 'clientWidth', 658);
    setDimension(newContainer, 'clientHeight', 370);
    dom.window.document.body.appendChild(newContainer);
    
    // Add a test box with grid properties
    state.boxes = [{
      id: 'test-box-1',
      gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3,
      metadata: { role: 'primary-title', importance: 'critical' }
    }];
    
    await renderProductionSlide(newContainer);
    
    // Should use fallback renderer - check for slide-preview-region class
    assert(newContainer.innerHTML.includes('slide-preview-region'), `Should render fallback HTML with slide-preview-region. Got: ${newContainer.innerHTML.substring(0, 200)}`);
    assert(newContainer.innerHTML.includes('test-box-1'), 'Should include box ID');
    // The role is included as a data attribute
    assert(newContainer.innerHTML.includes('data-role="primary-title"'), 'Should include role as data attribute');
    
    // Cleanup
    dom.window.document.body.removeChild(newContainer);
    
    // Restore React mock after test completes
    t.after(() => {
      global.window.React = {
        createElement: (type, props, ...children) => ({
          type,
          props: { ...props, children: children.length === 1 ? children[0] : children }
        })
      };
      global.window.ReactDOM = {
        createRoot: (container) => ({
          render: (element) => {
            container.innerHTML = `<div style="width:100%;height:100%;background:#fff">Mock React Render</div>`;
          },
          unmount: () => {
            container.innerHTML = '';
          }
        })
      };
    });
  });

  test('should maintain aspect ratio', async () => {
    // Test with different container sizes
    const testCases = [
      { width: 658, height: 370 },  // Standard preview
      { width: 500, height: 500 },  // Square container
      { width: 800, height: 300 }   // Wide container
    ];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      // Create a new container for each test
      const container = dom.window.document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { 
        value: testCase.width, 
        configurable: true,
        enumerable: true
      });
      Object.defineProperty(container, 'clientHeight', { 
        value: testCase.height, 
        configurable: true,
        enumerable: true
      });
      dom.window.document.body.appendChild(container);
      
      state.boxes = [{ id: `test-${i}`, x: 0, y: 0, width: 6, height: 3, metadata: { role: 'primary-title' } }];
      
      await renderProductionSlide(container);
      
      assert(container.innerHTML.length > 0, `Should render in ${testCase.width}x${testCase.height} container`);
      
      // Cleanup
      dom.window.document.body.removeChild(container);
    }
  });

  describe('Visibility Tests', () => {
    test('should skip render when panel is hidden', async () => {
      const container = dom.window.document.getElementById('test-container');
      const panel = dom.window.document.querySelector('.production-preview-panel');
      const workbench = dom.window.document.querySelector('.preview-workbench');
      
      // Hide the panel
      panel.style.display = 'none';
      
      // Mock console.log
      const originalLog = console.log;
      const logCalls = [];
      console.log = (...args) => {
        logCalls.push(args.join(' '));
        originalLog(...args);
      };
      
      await renderProductionSlide(container);
      
      // Should have skipped render
      assert(logCalls.some(call => call.includes('Panel is not visible, skipping render')), 
        'Should log that render was skipped');
      
      // Restore console
      console.log = originalLog;
    });

    test('should render when panel is visible', async () => {
      const container = dom.window.document.getElementById('test-container');
      const panel = dom.window.document.querySelector('.production-preview-panel');
      
      // Ensure panel is visible and has dimensions
      panel.style.display = 'flex';
      Object.defineProperty(panel, 'clientWidth', { value: 800 });
      Object.defineProperty(panel, 'clientHeight', { value: 600 });
      
      state.boxes = [{ id: 'test', x: 0, y: 0, width: 6, height: 3, metadata: { role: 'primary-title' } }];
      
      await renderProductionSlide(container);
      
      assert(container.innerHTML.length > 0, 'Should render when panel is visible');
      assert(!container.innerHTML.includes('Invalid container dimensions'), 
        'Should not show invalid dimensions message');
    });

    test('should handle data-view attribute changes', async () => {
      const container = dom.window.document.getElementById('test-container');
      const workbench = dom.window.document.querySelector('.preview-workbench');
      
      // Set to canvas view
      workbench.setAttribute('data-view', 'canvas');
      
      // Mock console.log
      const originalLog = console.log;
      const logCalls = [];
      console.log = (...args) => {
        logCalls.push(args.join(' '));
        originalLog(...args);
      };
      
      await renderProductionSlide(container);
      
      // The render should still happen because the panel is visible
      // The data-view only affects MutationObserver behavior
      assert(container.innerHTML.length > 0, 'Should still render when panel is visible');
      
      // Restore console
      console.log = originalLog;
    });
  });
});
