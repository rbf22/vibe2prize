// Test script to verify resize behavior
// Run this in the browser console

function testResizeFromSmallToBig() {
  console.log('🧪 Testing resize from small to big...\n');
  
  // Note: We need to resize the panel, not the inner container
  const productionPanel = document.querySelector('.production-preview-panel');
  const previewPanel = document.querySelector('.slide-preview-panel');
  const productionContainer = document.querySelector('#productionPreview');
  const previewContainer = document.querySelector('#slidePreview');
  
  if (!productionPanel || !previewPanel || !productionContainer || !previewContainer) {
    console.error('❌ Containers not found');
    return;
  }
  
  // Store original styles
  const originalProductionStyle = {
    width: productionPanel.style.width,
    height: productionPanel.style.height
  };
  
  const originalPreviewStyle = {
    width: previewPanel.style.width,
    height: previewPanel.style.height
  };
  
  console.log('📏 Original container sizes:');
  console.log(`  Production panel: ${productionPanel.clientWidth} x ${productionPanel.clientHeight}`);
  console.log(`  Production inner: ${productionContainer.clientWidth} x ${productionContainer.clientHeight}`);
  console.log(`  Preview panel: ${previewPanel.clientWidth} x ${previewPanel.clientHeight}`);
  console.log(`  Preview inner: ${previewContainer.clientWidth} x ${previewContainer.clientHeight}`);
  
  // Step 1: Make containers small
  console.log('\n🔽 Step 1: Making containers small (300x200)...');
  productionPanel.style.width = '300px';
  productionPanel.style.height = '200px';
  previewPanel.style.width = '300px';
  previewPanel.style.height = '200px';
  
  // Wait for resize
  setTimeout(() => {
    console.log('  After resize to small:');
    console.log(`    Production panel: ${productionPanel.clientWidth} x ${productionPanel.clientHeight}`);
    console.log(`    Production inner: ${productionContainer.clientWidth} x ${productionContainer.clientHeight}`);
    console.log(`    Preview panel: ${previewPanel.clientWidth} x ${previewPanel.clientHeight}`);
    console.log(`    Preview inner: ${previewContainer.clientWidth} x ${previewContainer.clientHeight}`);
    
    const prodContentSmall = productionContainer.querySelector('div');
    const prevContentSmall = previewContainer.querySelector('.slide-preview-grid');
    
    if (prodContentSmall && prevContentSmall) {
      console.log(`    Production content: ${prodContentSmall.offsetWidth} x ${prodContentSmall.offsetHeight}`);
      console.log(`    Preview content: ${prevContentSmall.offsetWidth} x ${prevContentSmall.offsetHeight}`);
    }
    
    // Step 2: Make containers big
    console.log('\n🔼 Step 2: Making containers big (800x600)...');
    productionPanel.style.width = '800px';
    productionPanel.style.height = '600px';
    previewPanel.style.width = '800px';
    previewPanel.style.height = '600px';
    
    // Wait for resize
    setTimeout(() => {
      console.log('  After resize to big:');
      console.log(`    Production panel: ${productionPanel.clientWidth} x ${productionPanel.clientHeight}`);
      console.log(`    Production inner: ${productionContainer.clientWidth} x ${productionContainer.clientHeight}`);
      console.log(`    Preview panel: ${previewPanel.clientWidth} x ${previewPanel.clientHeight}`);
      console.log(`    Preview inner: ${previewContainer.clientWidth} x ${previewContainer.clientHeight}`);
      
      const prodContentBig = productionContainer.querySelector('div');
      const prevContentBig = previewContainer.querySelector('.slide-preview-grid');
      
      if (prodContentBig && prevContentBig) {
        console.log(`    Production content: ${prodContentBig.offsetWidth} x ${prodContentBig.offsetHeight}`);
        console.log(`    Preview content: ${prevContentBig.offsetWidth} x ${prevContentBig.offsetHeight}`);
        
        // Check if production resized properly
        const prodResized = prodContentBig.offsetWidth > prodContentSmall.offsetWidth;
        const prevResized = prevContentBig.offsetWidth > prevContentSmall.offsetWidth;
        
        console.log('\n📊 Results:');
        console.log(`  Production resized: ${prodResized ? '✅' : '❌'}`);
        console.log(`  Preview resized: ${prevResized ? '✅' : '❌'}`);
        
        if (!prodResized) {
          console.log('\n⚠️  Production renderer did NOT resize from small to big!');
          console.log('    Expected: content width should increase');
          console.log(`    Actual: ${prodContentSmall.offsetWidth} → ${prodContentBig.offsetWidth}`);
        }
      }
      
      // Restore original sizes
      setTimeout(() => {
        productionPanel.style.width = originalProductionStyle.width;
        productionPanel.style.height = originalProductionStyle.height;
        previewPanel.style.width = originalPreviewStyle.width;
        previewPanel.style.height = originalPreviewStyle.height;
        console.log('\n✅ Test completed, original sizes restored');
      }, 1000);
    }, 300);
  }, 300);
}

// Test ResizeObserver directly
function testResizeObserver() {
  console.log('\n🔍 Testing ResizeObserver directly...');
  
  const productionContainer = document.querySelector('.production-preview-panel');
  
  if (!productionContainer) {
    console.error('❌ Production container not found');
    return;
  }
  
  // Create a test ResizeObserver
  const testObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      console.log('📐 ResizeObserver entry:', {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
        target: entry.target.className
      });
    }
  });
  
  testObserver.observe(productionContainer);
  
  console.log('👀 ResizeObserver attached. Try resizing the window manually...');
  console.log('   Call testResizeObserverCleanup() to remove');
  
  window.testResizeObserverCleanup = () => {
    testObserver.disconnect();
    console.log('✅ Test ResizeObserver removed');
  };
}

// Check if production render has resize observer
function checkProductionResizeObserver() {
  const productionContainer = document.querySelector('.production-preview-panel');
  
  if (!productionContainer) {
    console.error('❌ Production container not found');
    return;
  }
  
  console.log('\n🔍 Production renderer resize status:');
  console.log(`  Has _resizeObserver: ${!!productionContainer._resizeObserver}`);
  console.log(`  Has _windowResizeHandler: ${!!productionContainer._windowResizeHandler}`);
  
  if (productionContainer._resizeObserver) {
    console.log('  ✅ ResizeObserver is attached');
  } else {
    console.log('  ❌ ResizeObserver is NOT attached');
  }
  
  if (productionContainer._windowResizeHandler) {
    console.log('  ✅ Window resize handler is attached');
  } else {
    console.log('  ❌ Window resize handler is NOT attached');
  }
}

// Run all tests
function runResizeTests() {
  console.log('🚀 Running resize tests...\n');
  checkProductionResizeObserver();
  setTimeout(testResizeFromSmallToBig, 500);
}

// Make available globally
window.testResizeFromSmallToBig = testResizeFromSmallToBig;
window.testResizeObserver = testResizeObserver;
window.checkProductionResizeObserver = checkProductionResizeObserver;
window.runResizeTests = runResizeTests;

console.log('🧪 Resize test functions loaded!');
console.log('Available commands:');
console.log('  testResizeFromSmallToBig() - Test resize from small to big');
console.log('  testResizeObserver() - Test ResizeObserver directly');
console.log('  checkProductionResizeObserver() - Check resize observer status');
console.log('  runResizeTests() - Run all tests');
