// Simple test to check production rendering
// Run this in browser console

console.log('🔍 Production Render Test\n');

// Get elements
const container = document.querySelector('#productionPreview');
const panel = document.querySelector('.production-preview-panel');

// Switch to production view
document.getElementById('previewWorkbench').setAttribute('data-view', 'production');

// Clear container
container.innerHTML = '';

// Check state
console.log('State check:');
console.log('  window.TemplateStudio exists:', !!window.TemplateStudio);
console.log('  state exists:', !!window.TemplateStudio?.state);
console.log('  canvasWidth:', window.TemplateStudio?.state?.canvasWidth);
console.log('  canvasHeight:', window.TemplateStudio?.state?.canvasHeight);
console.log('  boxes count:', window.TemplateStudio?.state?.boxes?.length);

// Force render
console.log('\nForcing render...');
try {
  window.TemplateStudio.renderProductionSlide(container);
  
  // Check result
  setTimeout(() => {
    console.log('\nResult:');
    console.log('  Container children:', container.children.length);
    
    if (container.children.length > 0) {
      const child = container.children[0];
      console.log('  First child tag:', child.tagName);
      console.log('  First child dimensions:', child.offsetWidth, 'x', child.offsetHeight);
      
      // Look for error message
      if (child.textContent.includes('Error: Invalid state')) {
        console.log('  ❌ Found error message - state is invalid!');
      } else if (child.textContent.includes('No regions')) {
        console.log('  ❌ No regions to render');
      } else if (child.textContent.includes('Loading')) {
        console.log('  ⏳ Still loading...');
      } else {
        // Look for actual content
        const textElements = child.querySelectorAll('h1, h2, h3, p, span, div');
        let hasText = false;
        textElements.forEach(el => {
          if (el.textContent.trim() && !el.textContent.includes('Lorem') && el.textContent.length > 5) {
            console.log(`  ✅ Found text: "${el.textContent}"`);
            hasText = true;
          }
        });
        
        if (!hasText) {
          console.log('  ⚠️  No meaningful text found');
          console.log('  Inner HTML preview:', child.innerHTML.substring(0, 200) + '...');
        }
      }
    } else {
      console.log('  ❌ Container is empty!');
    }
  }, 500);
} catch (error) {
  console.error('Render failed:', error);
}
