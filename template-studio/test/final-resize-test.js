// Final test to verify production renderer resize works
// Run this in browser console

async function finalResizeTest() {
  console.log('🎯 Final Production Renderer Resize Test\n');
  
  const prodPanel = document.querySelector('.production-preview-panel');
  const prodContainer = document.querySelector('#productionPreview');
  
  if (!prodPanel || !prodContainer) {
    console.error('❌ Elements not found');
    return;
  }
  
  // Ensure production view is active
  document.getElementById('previewWorkbench').setAttribute('data-view', 'production');
  
  // Force initial render
  window.TemplateStudio.renderProductionSlide(prodContainer);
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test 1: Small size
  console.log('📉 Test 1: Setting to small (400x300)');
  prodPanel.style.width = '400px';
  prodPanel.style.height = '300px';
  
  await new Promise(resolve => setTimeout(resolve, 300));
  const smallWidth = prodContainer.querySelector('div')?.offsetWidth || 0;
  console.log(`  Content width: ${smallWidth}px`);
  
  // Test 2: Medium size
  console.log('\n📈 Test 2: Setting to medium (600x450)');
  prodPanel.style.width = '600px';
  prodPanel.style.height = '450px';
  
  await new Promise(resolve => setTimeout(resolve, 300));
  const mediumWidth = prodContainer.querySelector('div')?.offsetWidth || 0;
  console.log(`  Content width: ${mediumWidth}px`);
  
  // Test 3: Large size
  console.log('\n📊 Test 3: Setting to large (900x675)');
  prodPanel.style.width = '900px';
  prodPanel.style.height = '675px';
  
  await new Promise(resolve => setTimeout(resolve, 300));
  const largeWidth = prodContainer.querySelector('div')?.offsetWidth || 0;
  console.log(`  Content width: ${largeWidth}px`);
  
  // Results
  console.log('\n✅ Results:');
  console.log(`  Width progression: ${smallWidth} → ${mediumWidth} → ${largeWidth}`);
  
  if (largeWidth > mediumWidth && mediumWidth > smallWidth) {
    console.log('  🎉 SUCCESS: Production renderer resizes correctly!');
    console.log('  The content scales proportionally with the container.');
  } else {
    console.log('  ❌ FAILED: Content is not resizing properly');
  }
  
  // Check ResizeObserver
  console.log('\n🔍 ResizeObserver Status:');
  console.log(`  Has _resizeObserver: ${!!prodContainer._resizeObserver}`);
  console.log(`  Has _windowResizeHandler: ${!!prodContainer._windowResizeHandler}`);
  
  // Restore
  prodPanel.style.width = '';
  prodPanel.style.height = '';
}

// Run the test
finalResizeTest();
