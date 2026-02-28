// Simple test runner for production renderer visibility
console.log('🧪 Running Production Renderer Visibility Tests\n');

// Mock DOM
document.body.innerHTML = `
  <div class="preview-workbench" id="previewWorkbench" data-view="production">
    <div class="production-preview-panel" style="display:flex">
      <div id="productionPreview"></div>
    </div>
  </div>
`;

// Mock state
window.TemplateStudio = {
  state: {
    boxes: [{ id: 'test', x: 0, y: 0, width: 100, height: 100, metadata: { role: 'title' } }],
    canvasWidth: 1920,
    canvasHeight: 1080,
    brand: { id: 'dark', variant: 'default' }
  }
};

// Test helper
async function runTest(name, testFn) {
  try {
    await testFn();
    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return false;
  }
}

// Tests
const tests = [
  {
    name: 'Should skip render when panel is hidden',
    test: async () => {
      const container = document.querySelector('#productionPreview');
      const panel = document.querySelector('.production-preview-panel');
      
      panel.style.display = 'none';
      
      const { renderProductionSlide } = await import('./src/canvas/production-renderer.js');
      await renderProductionSlide(container);
      
      if (container.children.length > 0) {
        throw new Error('Container should be empty when panel is hidden');
      }
    }
  },
  {
    name: 'Should render when panel is visible',
    test: async () => {
      const container = document.querySelector('#productionPreview');
      const panel = document.querySelector('.production-preview-panel');
      
      panel.style.display = 'flex';
      Object.defineProperty(panel, 'clientWidth', { value: 800 });
      Object.defineProperty(panel, 'clientHeight', { value: 600 });
      
      const { renderProductionSlide } = await import('./src/canvas/production-renderer.js');
      await renderProductionSlide(container);
      
      if (container.children.length === 0) {
        throw new Error('Container should have content when panel is visible');
      }
    }
  },
  {
    name: 'Should handle data-view changes',
    test: async () => {
      const container = document.querySelector('#productionPreview');
      const workbench = document.querySelector('#preview-workbench');
      
      workbench.dataset.view = 'canvas';
      
      const { renderProductionSlide } = await import('./src/canvas/production-renderer.js');
      await renderProductionSlide(container);
      
      if (container.children.length > 0 && !container.innerHTML.includes('Invalid')) {
        throw new Error('Should not render when data-view is not production');
      }
    }
  }
];

// Run all tests
(async () => {
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await runTest(test.name, test.test);
    if (result) passed++;
    else failed++;
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('❌ Some tests failed');
  }
})();
