// Test to check what happens when other views render
// Run this in browser console

console.log('🔍 Testing View Interference\n');

const prodContainer = document.querySelector('#productionPreview');
const canvasContainer = document.querySelector('#previewGrid');
const slideContainer = document.querySelector('#slidePreview');

// Monitor production container
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    console.log('Production container mutated:', {
      type: mutation.type,
      oldValue: mutation.oldValue,
      newHTML: prodContainer.innerHTML.substring(0, 100)
    });
  });
});

observer.observe(prodContainer, {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
  attributeOldValue: true
});

// Test sequence
async function testSequence() {
  console.log('\n1. Render production...');
  document.querySelector('[data-preview-view="production"]').click();
  await new Promise(resolve => setTimeout(resolve, 300));
  console.log('Production children:', prodContainer.children.length);
  
  console.log('\n2. Render canvas...');
  document.querySelector('[data-preview-view="canvas"]').click();
  await new Promise(resolve => setTimeout(resolve, 300));
  console.log('Production children after canvas:', prodContainer.children.length);
  
  console.log('\n3. Back to production...');
  document.querySelector('[data-preview-view="production"]').click();
  await new Promise(resolve => setTimeout(resolve, 300));
  console.log('Production children after switch back:', prodContainer.children.length);
  
  console.log('\n4. Render slide...');
  document.querySelector('[data-preview-view="slide"]').click();
  await new Promise(resolve => setTimeout(resolve, 300));
  console.log('Production children after slide:', prodContainer.children.length);
  
  console.log('\n5. Back to production again...');
  document.querySelector('[data-preview-view="production"]').click();
  await new Promise(resolve => setTimeout(resolve, 300));
  console.log('Production children after final switch:', prodContainer.children.length);
}

testSequence();
