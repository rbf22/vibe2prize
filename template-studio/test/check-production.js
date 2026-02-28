// Simple test to check if production renderer works
// Run this in the browser console after Template Studio loads

console.log('Testing Production Renderer...');
console.log('TemplateStudio exists:', !!window.TemplateStudio);
console.log('renderProductionSlide exists:', !!window.TemplateStudio?.renderProductionSlide);

// Try to render manually
if (window.TemplateStudio?.renderProductionSlide) {
  const container = document.querySelector('#productionPreview');
  if (container) {
    console.log('Container found, attempting render...');
    window.TemplateStudio.renderProductionSlide(container);
    
    setTimeout(() => {
      console.log('Children after render:', container.children.length);
      if (container.children.length > 0) {
        console.log('First child:', container.children[0]);
        console.log('First child dimensions:', {
          width: container.children[0].offsetWidth,
          height: container.children[0].offsetHeight
        });
      }
    }, 1000);
  }
} else {
  console.log('renderProductionSlide not available');
  
  // Check what IS available
  if (window.TemplateStudio) {
    console.log('Available methods:', Object.keys(window.TemplateStudio).filter(k => typeof window.TemplateStudio[k] === 'function'));
  }
}
