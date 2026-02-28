// Copy and paste this entire block into the browser console

(function() {
  console.log('🧪 Quick Resize Test');
  
  const prodPanel = document.querySelector('.production-preview-panel');
  const prevPanel = document.querySelector('.slide-preview-panel');
  const prodContainer = document.querySelector('#productionPreview');
  
  if (!prodPanel || !prodContainer) {
    console.error('❌ Not on Template Studio page');
    return;
  }
  
  console.log('Current size:', prodPanel.clientWidth, 'x', prodPanel.clientHeight);
  
  // Make small
  prodPanel.style.width = '400px';
  prodPanel.style.height = '300px';
  prevPanel.style.width = '400px';
  prevPanel.style.height = '300px';
  
  setTimeout(() => {
    const smallWidth = prodContainer.querySelector('div')?.offsetWidth || 0;
    console.log('Small size content width:', smallWidth);
    
    // Make large
    prodPanel.style.width = '800px';
    prodPanel.style.height = '600px';
    prevPanel.style.width = '800px';
    prevPanel.style.height = '600px';
    
    setTimeout(() => {
      const largeWidth = prodContainer.querySelector('div')?.offsetWidth || 0;
      console.log('Large size content width:', largeWidth);
      
      if (largeWidth > smallWidth) {
        console.log('✅ SUCCESS: Production renderer resized!');
      } else {
        console.log('❌ FAILED: Production renderer did NOT resize');
        console.log('   Expected width to increase from', smallWidth, 'to greater than', smallWidth);
      }
      
      // Restore
      prodPanel.style.width = '';
      prodPanel.style.height = '';
      prevPanel.style.width = '';
      prevPanel.style.height = '';
    }, 300);
  }, 300);
})();
