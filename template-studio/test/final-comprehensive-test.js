// Final comprehensive test - run in browser console
console.log('🎯 Final Production Renderer Test\n');

async function comprehensiveTest() {
  const prodContainer = document.querySelector('#productionPreview');
  const results = [];
  
  // Helper to check render
  const checkRender = (label) => {
    const hasContent = prodContainer.children.length > 0 && 
                       !prodContainer.innerHTML.includes('Invalid') &&
                       !prodContainer.innerHTML.includes('Loading');
    results.push({ label, success: hasContent });
    console.log(`${label}: ${hasContent ? '✅' : '❌'}`);
  };
  
  // Test 1: Initial load
  console.log('1. Testing initial production load...');
  document.querySelector('[data-preview-view="production"]').click();
  await new Promise(resolve => setTimeout(resolve, 300));
  checkRender('Initial load');
  
  // Test 2: Canvas -> Production
  console.log('\n2. Canvas -> Production...');
  document.querySelector('[data-preview-view="canvas"]').click();
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Trigger renderAll
  window.TemplateStudio.addNewRegion();
  await new Promise(resolve => setTimeout(resolve, 200));
  
  document.querySelector('[data-preview-view="production"]').click();
  await new Promise(resolve => setTimeout(resolve, 300));
  checkRender('Canvas -> Production');
  
  // Test 3: Slide -> Production
  console.log('\n3. Slide -> Production...');
  document.querySelector('[data-preview-view="slide"]').click();
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Trigger renderAll
  if (window.TemplateStudio.state.selectedBoxId) {
    window.TemplateStudio.deleteSelectedRegion();
  }
  await new Promise(resolve => setTimeout(resolve, 200));
  
  document.querySelector('[data-preview-view="production"]').click();
  await new Promise(resolve => setTimeout(resolve, 300));
  checkRender('Slide -> Production');
  
  // Test 4: Multiple rapid switches
  console.log('\n4. Multiple rapid switches...');
  for (let i = 0; i < 3; i++) {
    document.querySelector('[data-preview-view="canvas"]').click();
    await new Promise(resolve => setTimeout(resolve, 50));
    document.querySelector('[data-preview-view="production"]').click();
    await new Promise(resolve => setTimeout(resolve, 200));
    checkRender(`Rapid switch ${i + 1}`);
  }
  
  // Summary
  const allPassed = results.every(r => r.success);
  console.log('\n📊 Summary:');
  console.log(`  Passed: ${results.filter(r => r.success).length}/${results.length}`);
  
  if (allPassed) {
    console.log('\n🎉 SUCCESS! Production renderer works correctly in all scenarios!');
  } else {
    console.log('\n❌ Some tests failed. Check the output above.');
  }
}

// Run the test
comprehensiveTest();
