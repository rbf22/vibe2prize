// Comprehensive resize test
// Run this in the browser console after refreshing Template Studio

async function runResizeTests() {
  console.log('🧪 Running Comprehensive Resize Tests\n');
  
  // Wait a moment for everything to load
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const productionPanel = document.querySelector('.production-preview-panel');
  const previewPanel = document.querySelector('.slide-preview-panel');
  const productionContainer = document.querySelector('#productionPreview');
  const previewContainer = document.querySelector('#slidePreview');
  
  if (!productionPanel || !previewPanel || !productionContainer || !previewContainer) {
    console.error('❌ Required containers not found');
    return;
  }
  
  // Test 1: Check initial state
  console.log('📊 Test 1: Initial State');
  console.log(`  Production panel: ${productionPanel.clientWidth} x ${productionPanel.clientHeight}`);
  console.log(`  Production inner: ${productionContainer.clientWidth} x ${productionContainer.clientHeight}`);
  console.log(`  Preview panel: ${previewPanel.clientWidth} x ${previewPanel.clientHeight}`);
  console.log(`  Preview inner: ${previewContainer.clientWidth} x ${previewContainer.clientHeight}`);
  
  // Test 2: Resize to small
  console.log('\n📉 Test 2: Resizing to small (400x300)');
  productionPanel.style.width = '400px';
  productionPanel.style.height = '300px';
  previewPanel.style.width = '400px';
  previewPanel.style.height = '300px';
  
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const prodSmall = productionContainer.querySelector('div');
  const prevSmall = previewContainer.querySelector('.slide-preview-grid');
  
  console.log(`  Production content: ${prodSmall ? prodSmall.offsetWidth : 'N/A'} x ${prodSmall ? prodSmall.offsetHeight : 'N/A'}`);
  console.log(`  Preview content: ${prevSmall ? prevSmall.offsetWidth : 'N/A'} x ${prevSmall ? prevSmall.offsetHeight : 'N/A'}`);
  
  // Test 3: Resize to medium
  console.log('\n📈 Test 3: Resizing to medium (600x450)');
  productionPanel.style.width = '600px';
  productionPanel.style.height = '450px';
  previewPanel.style.width = '600px';
  previewPanel.style.height = '450px';
  
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const prodMedium = productionContainer.querySelector('div');
  const prevMedium = previewContainer.querySelector('.slide-preview-grid');
  
  console.log(`  Production content: ${prodMedium ? prodMedium.offsetWidth : 'N/A'} x ${prodMedium ? prodMedium.offsetHeight : 'N/A'}`);
  console.log(`  Preview content: ${prevMedium ? prevMedium.offsetWidth : 'N/A'} x ${prevMedium ? prevMedium.offsetHeight : 'N/A'}`);
  
  // Test 4: Resize to large
  console.log('\n📊 Test 4: Resizing to large (900x675)');
  productionPanel.style.width = '900px';
  productionPanel.style.height = '675px';
  previewPanel.style.width = '900px';
  previewPanel.style.height = '675px';
  
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const prodLarge = productionContainer.querySelector('div');
  const prevLarge = previewContainer.querySelector('.slide-preview-grid');
  
  console.log(`  Production content: ${prodLarge ? prodLarge.offsetWidth : 'N/A'} x ${prodLarge ? prodLarge.offsetHeight : 'N/A'}`);
  console.log(`  Preview content: ${prevLarge ? prevLarge.offsetWidth : 'N/A'} x ${prevLarge ? prevLarge.offsetHeight : 'N/A'}`);
  
  // Test 5: Analysis
  console.log('\n📋 Test 5: Analysis');
  
  const prodWidths = [
    prodSmall ? prodSmall.offsetWidth : 0,
    prodMedium ? prodMedium.offsetWidth : 0,
    prodLarge ? prodLarge.offsetWidth : 0
  ];
  
  const prevWidths = [
    prevSmall ? prevSmall.offsetWidth : 0,
    prevMedium ? prevMedium.offsetWidth : 0,
    prevLarge ? prevLarge.offsetWidth : 0
  ];
  
  const prodIncreases = prodWidths[1] > prodWidths[0] && prodWidths[2] > prodWidths[1];
  const prevIncreases = prevWidths[1] > prevWidths[0] && prevWidths[2] > prevWidths[1];
  
  console.log(`  Production width progression: ${prodWidths.join(' → ')}`);
  console.log(`  Preview width progression: ${prevWidths.join(' → ')}`);
  console.log(`  Production scales up correctly: ${prodIncreases ? '✅' : '❌'}`);
  console.log(`  Preview scales up correctly: ${prevIncreases ? '✅' : '❌'}`);
  
  // Calculate scale differences
  const prodScales = prodWidths.map(w => (w / 1920).toFixed(3));
  const prevScales = prevWidths.map(w => (w / 1920).toFixed(3));
  
  console.log(`  Production scales: ${prodScales.join(', ')}`);
  console.log(`  Preview scales: ${prevScales.join(', ')}`);
  
  // Test 6: Check ResizeObserver
  console.log('\n🔍 Test 6: ResizeObserver Status');
  console.log(`  Production has _resizeObserver: ${!!productionContainer._resizeObserver}`);
  console.log(`  Production has _windowResizeHandler: ${!!productionContainer._windowResizeHandler}`);
  console.log(`  Production panel has _parentResizeObserver: ${!!productionPanel._parentResizeObserver}`);
  
  // Restore original size
  console.log('\n🔄 Restoring original size...');
  productionPanel.style.width = '';
  productionPanel.style.height = '';
  previewPanel.style.width = '';
  previewPanel.style.height = '';
  
  await new Promise(resolve => setTimeout(resolve, 300));
  
  console.log('\n✅ Tests completed!');
  
  if (!prodIncreases) {
    console.log('\n⚠️  ISSUE: Production renderer is NOT resizing from small to big!');
    console.log('   The content width should increase as the container grows.');
  }
}

// Auto-run
runResizeTests();
