// Debug script to investigate the real view switching issue
// Run this in browser console

console.log('🔍 Real View Switching Debug\n');

// Get the actual production button
const productionBtn = document.querySelector('[data-preview-view="production"]');
const canvasBtn = document.querySelector('[data-preview-view="canvas"]');
const workbench = document.getElementById('previewWorkbench');
const prodContainer = document.querySelector('#productionPreview');

console.log('Elements found:');
console.log('  Production button:', !!productionBtn);
console.log('  Canvas button:', !!canvasBtn);
console.log('  Workbench:', !!workbench);
console.log('  Production container:', !!prodContainer);

// Monitor production renders
let renderCount = 0;
const originalRender = window.TemplateStudio.renderProductionSlide;
window.TemplateStudio.renderProductionSlide = function(...args) {
  renderCount++;
  console.log(`\n🎨 Render #${renderCount} called`);
  console.log('  Container has children:', args[0].children.length > 0);
  
  const result = originalRender.apply(this, args);
  
  setTimeout(() => {
    console.log('  After render - Children:', args[0].children.length);
    if (args[0].children.length > 0) {
      const child = args[0].children[0];
      console.log('  First child dimensions:', child.offsetWidth, 'x', child.offsetHeight);
    }
  }, 100);
  
  return result;
};

// Helper to check state
const checkState = (label) => {
  console.log(`\n${label}:`);
  console.log('  Current view:', workbench.dataset.view);
  console.log('  Panel display:', window.getComputedStyle(document.querySelector('.production-preview-panel')).display);
  console.log('  Panel dimensions:', document.querySelector('.production-preview-panel').getBoundingClientRect());
  console.log('  Container children:', prodContainer.children.length);
  console.log('  Container HTML (first 100 chars):', prodContainer.innerHTML.substring(0, 100));
};

// Initial state
checkState('Initial State');

// Click canvas button
console.log('\n🖱️  Clicking Canvas button...');
canvasBtn.click();
setTimeout(() => {
  checkState('After Canvas Click');
  
  // Click production button
  console.log('\n🖱️  Clicking Production button...');
  productionBtn.click();
  
  // Check immediately
  checkState('Immediately After Production Click');
  
  // Check after 50ms (when setTimeout should fire)
  setTimeout(() => {
    checkState('After 50ms delay');
  }, 50);
  
  // Check after 200ms
  setTimeout(() => {
    checkState('After 200ms');
  }, 200);
  
  // Check after 500ms
  setTimeout(() => {
    checkState('After 500ms');
    
    // If still not rendered, try manual render
    if (prodContainer.children.length === 0 || prodContainer.children[0].offsetWidth === 0) {
      console.log('\n🔧 Attempting manual render...');
      window.TemplateStudio.renderProductionSlide(prodContainer);
      
      setTimeout(() => {
        checkState('After Manual Render');
      }, 200);
    }
  }, 500);
}, 200);
