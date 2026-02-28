// Debug script for production renderer issues
// Paste this into the browser console when on Template Studio

function debugProductionRenderer() {
  console.log('🔍 Debugging Production Renderer\n');
  
  // Check if we're on the right page
  const productionPanel = document.querySelector('.production-preview-panel');
  const productionContainer = document.querySelector('#productionPreview');
  
  if (!productionPanel || !productionContainer) {
    console.error('❌ Production elements not found');
    return;
  }
  
  // Check visibility
  const panelStyle = window.getComputedStyle(productionPanel);
  const containerStyle = window.getComputedStyle(productionContainer);
  
  console.log('📊 Panel Info:');
  console.log(`  Display: ${panelStyle.display}`);
  console.log(`  Visibility: ${panelStyle.visibility}`);
  console.log(`  Width: ${panelStyle.width}`);
  console.log(`  Height: ${panelStyle.height}`);
  console.log(`  Client dimensions: ${productionPanel.clientWidth} x ${productionPanel.clientHeight}`);
  
  console.log('\n📊 Container Info:');
  console.log(`  Display: ${containerStyle.display}`);
  console.log(`  Visibility: ${containerStyle.visibility}`);
  console.log(`  Width: ${containerStyle.width}`);
  console.log(`  Height: ${containerStyle.height}`);
  console.log(`  Client dimensions: ${productionContainer.clientWidth} x ${productionContainer.clientHeight}`);
  
  // Check what's actually in the container
  console.log('\n📦 Container Contents:');
  console.log(`  Inner HTML length: ${productionContainer.innerHTML.length}`);
  console.log(`  Children count: ${productionContainer.children.length}`);
  
  if (productionContainer.children.length > 0) {
    for (let i = 0; i < productionContainer.children.length; i++) {
      const child = productionContainer.children[i];
      console.log(`  Child ${i}: ${child.tagName} - ${child.style.width} x ${child.style.height}`);
    }
  } else {
    console.log('  ⚠️  Container is empty!');
  }
  
  // Check if production view is active
  const workbench = document.getElementById('previewWorkbench');
  if (workbench) {
    console.log(`\n🎯 Current view: ${workbench.getAttribute('data-view')}`);
    if (workbench.getAttribute('data-view') !== 'production') {
      console.log('  ⚠️  Production view is NOT active!');
      console.log('  Switching to production view...');
      workbench.setAttribute('data-view', 'production');
      
      // Wait and check again
      setTimeout(() => {
        console.log('\n🔄 After switching to production view:');
        console.log(`  Panel dimensions: ${productionPanel.clientWidth} x ${productionPanel.clientHeight}`);
        console.log(`  Container has content: ${productionContainer.children.length > 0}`);
      }, 500);
    }
  }
  
  // Try to manually trigger render
  console.log('\n🔧 Attempting manual render...');
  if (window.TemplateStudio && window.TemplateStudio.renderProductionSlide) {
    window.TemplateStudio.renderProductionSlide(productionContainer);
    setTimeout(() => {
      console.log(`  After manual render - Children count: ${productionContainer.children.length}`);
    }, 500);
  } else {
    console.log('  ❌ renderProductionSlide not available');
  }
}

// Run the debug
debugProductionRenderer();
