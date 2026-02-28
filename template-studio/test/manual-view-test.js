// Simple manual test - run this in browser console
console.log('🔍 Manual View Switching Test\n');

// Step 1: Make sure you have some regions
if (window.TemplateStudio.state.boxes.length === 0) {
  console.log('Adding test regions...');
  window.TemplateStudio.addNewRegion();
  window.TemplateStudio.addNewRegion();
}

// Step 2: Go to production view first
console.log('\n1. Going to Production view...');
document.querySelector('[data-preview-view="production"]').click();

// Wait and check
setTimeout(() => {
  const prodContainer = document.querySelector('#productionPreview');
  console.log('Production container has content:', prodContainer.children.length > 0);
  if (prodContainer.children.length > 0) {
    console.log('Content dimensions:', prodContainer.children[0].offsetWidth, 'x', prodContainer.children[0].offsetHeight);
  }
  
  // Step 3: Switch to canvas
  console.log('\n2. Switching to Canvas...');
  document.querySelector('[data-preview-view="canvas"]').click();
  
  // Step 4: Switch back to production
  setTimeout(() => {
    console.log('\n3. Switching back to Production...');
    document.querySelector('[data-preview-view="production"]').click();
    
    // Check immediately
    const checkRender = () => {
      const container = document.querySelector('#productionPreview');
      const hasContent = container.children.length > 0;
      const dimensions = hasContent ? `${container.children[0].offsetWidth}x${container.children[0].offsetHeight}` : 'No content';
      
      console.log(`Render status: ${hasContent ? '✅' : '❌'} - ${dimensions}`);
      
      if (!hasContent) {
        console.log('Container HTML:', container.innerHTML);
      }
    };
    
    checkRender(); // Immediately
    setTimeout(checkRender, 100); // After 100ms
    setTimeout(checkRender, 200); // After 200ms
    setTimeout(checkRender, 500); // After 500ms
  }, 200);
}, 500);
