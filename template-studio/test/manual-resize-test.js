// Quick test to check resize behavior
// Run this in browser console

// First, create some regions if none exist
if (window.TemplateStudio && window.TemplateStudio.state.boxes.length === 0) {
  console.log('Creating test regions...');
  window.TemplateStudio.addNewRegion();
  window.TemplateStudio.addNewRegion();
}

// Switch to production view
document.getElementById('previewWorkbench').setAttribute('data-view', 'production');

// Force render
const container = document.querySelector('#productionPreview');
window.TemplateStudio.renderProductionSlide(container);

// Check observers
setTimeout(() => {
  console.log('Container has _resizeObserver:', !!container._resizeObserver);
  console.log('Panel has _parentResizeObserver:', !!container.closest('.production-preview-panel')._parentResizeObserver);
  
  // Try manual resize
  console.log('Testing manual resize...');
  const panel = document.querySelector('.production-preview-panel');
  const originalWidth = panel.style.width;
  
  panel.style.width = '500px';
  setTimeout(() => {
    const content = container.querySelector('div');
    console.log('Content width after resize:', content?.offsetWidth);
    
    panel.style.width = originalWidth;
  }, 500);
}, 1000);
