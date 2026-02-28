// Debug script to check what's happening with production render
// Run this in browser console

console.log('🔍 Production Render Content Debug\n');

const prodContainer = document.querySelector('#productionPreview');
const prodPanel = document.querySelector('.production-preview-panel');

// Monitor render calls
let renderCallCount = 0;
const originalRender = window.TemplateStudio.renderProductionSlide;
window.TemplateStudio.renderProductionSlide = function(container, resizeEntry) {
  renderCallCount++;
  console.log(`\n🎨 Render Call #${renderCallCount}`);
  console.log('  Arguments:', {
    hasContainer: !!container,
    hasResizeEntry: !!resizeEntry,
    resizeEntry: resizeEntry ? `${resizeEntry.contentRect.width}x${resizeEntry.contentRect.height}` : 'none'
  });
  
  // Check state before render
  const state = window.TemplateStudio.state;
  console.log('  State before render:', {
    hasBoxes: !!(state && state.boxes),
    boxCount: state ? state.boxes.length : 0,
    hasBrand: !!(state && state.brand),
    brandId: state && state.brand ? state.brand.id : 'none'
  });
  
  // Call original
  const result = originalRender.apply(this, arguments);
  
  // Check after render
  setTimeout(() => {
    console.log('  After render:');
    console.log('    Container children:', prodContainer.children.length);
    if (prodContainer.children.length > 0) {
      const child = prodContainer.children[0];
      console.log('    First child tag:', child.tagName);
      console.log('    First child classes:', child.className);
      console.log('    First child dimensions:', child.offsetWidth, 'x', child.offsetHeight);
      console.log('    First child innerHTML length:', child.innerHTML.length);
      
      // Look for text content
      const textElements = child.querySelectorAll('h1, h2, h3, p, span, div');
      let textFound = false;
      textElements.forEach(el => {
        if (el.textContent.trim()) {
          console.log(`    Found text: "${el.textContent.substring(0, 50)}..." in ${el.tagName}`);
          textFound = true;
        }
      });
      
      if (!textFound) {
        console.log('    ⚠️  No text content found!');
      }
    } else {
      console.log('    ⚠️  Container is empty!');
    }
  }, 100);
  
  return result;
};

// Test render
console.log('\n1. Checking initial state...');
console.log('  Container children:', prodContainer.children.length);
console.log('  Panel dimensions:', prodPanel.clientWidth, 'x', prodPanel.clientHeight);

console.log('\n2. Forcing a render...');
window.TemplateStudio.renderProductionSlide(prodContainer);

console.log('\n3. Check console output above for details');
