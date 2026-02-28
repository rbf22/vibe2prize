// Debug script to investigate the white page issue
// Run this in browser console

function debugViewSwitching() {
  console.log('🔍 Debugging View Switching Issue\n');
  
  const workbench = document.getElementById('previewWorkbench');
  const prodPanel = document.querySelector('.production-preview-panel');
  const prodContainer = document.querySelector('#productionPreview');
  
  // Function to check production state
  const checkProductionState = () => {
    console.log('Production State:');
    console.log(`  Current view: ${workbench.dataset.view}`);
    console.log(`  Panel display: ${window.getComputedStyle(prodPanel).display}`);
    console.log(`  Panel dimensions: ${prodPanel.clientWidth} x ${prodPanel.clientHeight}`);
    console.log(`  Container has children: ${prodContainer.children.length > 0}`);
    console.log(`  Container innerHTML: ${prodContainer.innerHTML.substring(0, 100)}...`);
    
    if (prodContainer.children.length > 0) {
      const child = prodContainer.children[0];
      console.log(`  First child dimensions: ${child.offsetWidth} x ${child.offsetHeight}`);
      console.log(`  First child display: ${window.getComputedStyle(child).display}`);
    }
  };
  
  // Check initial state
  console.log('1. Initial state:');
  checkProductionState();
  
  // Switch to canvas
  console.log('\n2. Switching to canvas...');
  workbench.dataset.view = 'canvas';
  setTimeout(() => {
    checkProductionState();
    
    // Switch back to production
    console.log('\n3. Switching back to production...');
    workbench.dataset.view = 'production';
    
    // Check immediately
    checkProductionState();
    
    // Check after a delay
    setTimeout(() => {
      console.log('\n4. State after 500ms:');
      checkProductionState();
      
      // Try manual render if needed
      if (prodContainer.children.length === 0) {
        console.log('\n5. Attempting manual render...');
        window.TemplateStudio.renderProductionSlide(prodContainer);
        
        setTimeout(() => {
          console.log('\n6. State after manual render:');
          checkProductionState();
        }, 500);
      }
    }, 500);
  }, 500);
}

// Run the debug
debugViewSwitching();
