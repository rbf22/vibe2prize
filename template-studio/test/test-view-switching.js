// Test to verify the view switching fix
// Run this in browser console

async function testViewSwitching() {
  console.log('🧪 Testing View Switching Fix\n');
  
  const workbench = document.getElementById('previewWorkbench');
  const prodPanel = document.querySelector('.production-preview-panel');
  const prodContainer = document.querySelector('#productionPreview');
  
  // Helper to check if production is rendered
  const isProductionRendered = () => {
    return prodContainer.children.length > 0 && 
           prodContainer.children[0].offsetWidth > 0;
  };
  
  // Test 1: Initial load to production
  console.log('1. Loading production view initially...');
  workbench.dataset.view = 'production';
  await new Promise(resolve => setTimeout(resolve, 200));
  
  if (isProductionRendered()) {
    console.log('✅ Production renders on initial load');
  } else {
    console.log('❌ Production does not render on initial load');
  }
  
  // Test 2: Switch to canvas
  console.log('\n2. Switching to canvas...');
  workbench.dataset.view = 'canvas';
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Test 3: Switch back to production
  console.log('3. Switching back to production...');
  workbench.dataset.view = 'production';
  
  // Check immediately
  let rendered = isProductionRendered();
  console.log(`  Immediately after switch: ${rendered ? '✅ Rendered' : '⏳ Not yet rendered'}`);
  
  // Check after delay
  await new Promise(resolve => setTimeout(resolve, 100));
  rendered = isProductionRendered();
  console.log(`  After 100ms: ${rendered ? '✅ Rendered' : '⏳ Not yet rendered'}`);
  
  await new Promise(resolve => setTimeout(resolve, 200));
  rendered = isProductionRendered();
  console.log(`  After 300ms total: ${rendered ? '✅ Rendered' : '❌ Still not rendered'}`);
  
  if (rendered) {
    console.log('\n🎉 SUCCESS: Production renderer works after view switching!');
  } else {
    console.log('\n❌ FAILED: Production renderer still shows white page');
    
    // Debug info
    console.log('\nDebug info:');
    console.log(`  Panel display: ${window.getComputedStyle(prodPanel).display}`);
    console.log(`  Panel dimensions: ${prodPanel.clientWidth} x ${prodPanel.clientHeight}`);
    console.log(`  Container content: ${prodContainer.innerHTML.substring(0, 100)}`);
  }
  
  // Test 4: Multiple switches
  console.log('\n4. Testing multiple rapid switches...');
  for (let i = 0; i < 3; i++) {
    workbench.dataset.view = 'canvas';
    await new Promise(resolve => setTimeout(resolve, 50));
    workbench.dataset.view = 'production';
    await new Promise(resolve => setTimeout(resolve, 150));
    
    if (isProductionRendered()) {
      console.log(`  Switch ${i + 1}: ✅`);
    } else {
      console.log(`  Switch ${i + 1}: ❌`);
    }
  }
  
  console.log('\n✅ Test completed!');
}

// Run the test
testViewSwitching();
