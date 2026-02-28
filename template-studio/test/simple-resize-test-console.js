// Simple resize test - paste this directly into the console
// No module loading required

function simpleResizeTest() {
  console.log('🧪 Simple Resize Test\n');
  
  // Find elements
  const productionPanel = document.querySelector('.production-preview-panel');
  const previewPanel = document.querySelector('.slide-preview-panel');
  const productionContainer = document.querySelector('#productionPreview');
  const previewContainer = document.querySelector('#slidePreview');
  
  if (!productionPanel || !previewPanel || !productionContainer || !previewContainer) {
    console.error('❌ Containers not found. Make sure you are on Template Studio page.');
    return;
  }
  
  // Store original sizes
  const origProdWidth = productionPanel.style.width;
  const origProdHeight = productionPanel.style.height;
  const origPrevWidth = previewPanel.style.width;
  const origPrevHeight = previewPanel.style.height;
  
  console.log('📏 Original sizes:');
  console.log(`  Production: ${productionPanel.clientWidth} x ${productionPanel.clientHeight}`);
  console.log(`  Preview: ${previewPanel.clientWidth} x ${previewPanel.clientHeight}`);
  
  // Test 1: Small size
  console.log('\n📉 Making containers small (400x300)...');
  productionPanel.style.width = '400px';
  productionPanel.style.height = '300px';
  previewPanel.style.width = '400px';
  previewPanel.style.height = '300px';
  
  setTimeout(() => {
    const prodSmall = productionContainer.querySelector('div');
    const prevSmall = previewContainer.querySelector('.slide-preview-grid');
    
    console.log('  Small size results:');
    console.log(`    Production content: ${prodSmall ? prodSmall.offsetWidth : 'N/A'}px`);
    console.log(`    Preview content: ${prevSmall ? prevSmall.offsetWidth : 'N/A'}px`);
    
    // Test 2: Large size
    console.log('\n📈 Making containers large (800x600)...');
    productionPanel.style.width = '800px';
    productionPanel.style.height = '600px';
    previewPanel.style.width = '800px';
    previewPanel.style.height = '600px';
    
    setTimeout(() => {
      const prodLarge = productionContainer.querySelector('div');
      const prevLarge = previewContainer.querySelector('.slide-preview-grid');
      
      console.log('  Large size results:');
      console.log(`    Production content: ${prodLarge ? prodLarge.offsetWidth : 'N/A'}px`);
      console.log(`    Preview content: ${prevLarge ? prevLarge.offsetWidth : 'N/A'}px`);
      
      // Analysis
      if (prodSmall && prodLarge) {
        const prodResized = prodLarge.offsetWidth > prodSmall.offsetWidth;
        console.log('\n📊 Results:');
        console.log(`  Production resized correctly: ${prodResized ? '✅ YES' : '❌ NO'}`);
        console.log(`    Width change: ${prodSmall.offsetWidth}px → ${prodLarge.offsetWidth}px`);
        
        if (!prodResized) {
          console.log('\n⚠️  PROBLEM: Production renderer is NOT resizing!');
          console.log('    The content should grow when the container grows.');
        }
      }
      
      // Restore original sizes
      setTimeout(() => {
        productionPanel.style.width = origProdWidth;
        productionPanel.style.height = origProdHeight;
        previewPanel.style.width = origPrevWidth;
        previewPanel.style.height = origPrevHeight;
        console.log('\n✅ Test completed - sizes restored');
      }, 500);
    }, 500);
  }, 500);
}

// Run the test
simpleResizeTest();
