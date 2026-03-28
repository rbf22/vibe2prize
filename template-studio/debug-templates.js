// Test to verify template loading and rendering
console.log('=== Template Debug Test ===');

// Test 1: Check if templates are loaded correctly
fetch('./templates/templates-manifest.json', { cache: 'no-store' })
  .then(res => {
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  })
  .then(templates => {
    console.log('Loaded templates:', templates.length);
    
    // Check the first few templates
    templates.slice(0, 3).forEach((template, i) => {
      console.log(`\nTemplate ${i}: ${template.name}`);
      console.log('Regions:', template.regions.length);
      
      // Check if all regions have the same coordinates
      const coords = template.regions.map(r => `${r.x},${r.y},${r.w},${r.h}`);
      const uniqueCoords = [...new Set(coords)];
      console.log('Unique coordinate sets:', uniqueCoords.length);
      
      if (uniqueCoords.length === 1) {
        console.warn('⚠️ All regions have the same coordinates!');
      }
      
      // Show first few regions
      template.regions.slice(0, 3).forEach(r => {
        console.log(`  - ${r.name}: x=${r.x}, y=${r.y}, w=${r.w}, h=${r.h}`);
      });
    });
  })
  .catch(err => console.error('Failed to load templates:', err));

// Test 2: Check if renderThumbnail is being called
const originalRenderThumbnail = window.TemplateStudio?.renderThumbnail;
if (window.TemplateStudio && window.TemplateStudio.renderThumbnail) {
  console.log('\n✅ renderThumbnail function exists');
} else {
  console.log('\n❌ renderThumbnail function not found on TemplateStudio');
}

// Test 3: Check current slide when clicking
setTimeout(() => {
  const cards = document.querySelectorAll('.template-card');
  console.log(`\nFound ${cards.length} template cards`);
  
  if (cards.length > 0) {
    // Add debug click handler
    cards[0].addEventListener('click', () => {
      console.log('\n=== Click Debug ===');
      console.log('Clicked card index:', cards[0].dataset.index);
      console.log('Clicked card type:', cards[0].dataset.type);
      
      // Check if currentSlide is updated
      setTimeout(() => {
        if (window.currentSlide) {
          console.log('Current slide name:', window.currentSlide.name);
          console.log('Current slide regions:', window.currentSlide.regions.length);
          
          // Check region coordinates
          const firstRegion = window.currentSlide.regions[0];
          if (firstRegion) {
            console.log('First region coords:', {
              x: firstRegion.x,
              y: firstRegion.y,
              w: firstRegion.w,
              h: firstRegion.h,
              grid: firstRegion.grid
            });
          }
        }
      }, 100);
    });
  }
}, 1000);
