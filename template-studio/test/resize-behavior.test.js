import { renderProductionSlide } from '../src/canvas/production-renderer.js';
import { renderSlidePreview } from '../src/canvas/rendered-view.js';
import { state } from '../src/state.js';

/**
 * Test suite for resize behavior
 * Run in browser console: testResizeBehavior()
 */
export function testResizeBehavior() {
  console.log('🧪 Testing Resize Behavior...\n');
  
  // Find containers
  const previewContainer = document.querySelector('.slide-preview-panel');
  const productionContainer = document.querySelector('.production-preview-panel');
  
  if (!previewContainer || !productionContainer) {
    console.error('❌ Containers not found. Make sure you have both preview and production panels visible.');
    return;
  }
  
  // Get initial dimensions
  const initialPreview = {
    width: previewContainer.clientWidth,
    height: previewContainer.clientHeight
  };
  
  const initialProduction = {
    width: productionContainer.clientWidth,
    height: productionContainer.clientHeight
  };
  
  console.log('📏 Initial Dimensions:');
  console.log(`  Preview: ${initialPreview.width} x ${initialPreview.height}`);
  console.log(`  Production: ${initialProduction.width} x ${initialProduction.height}`);
  
  // Test 1: Check if ResizeObserver is attached
  console.log('\n🔍 Test 1: ResizeObserver Attachment');
  const previewHasObserver = !!previewContainer._resizeObserver;
  const productionHasObserver = !!productionContainer._resizeObserver;
  
  console.log(`  Preview has ResizeObserver: ${previewHasObserver ? '✅' : '❌'}`);
  console.log(`  Production has ResizeObserver: ${productionHasObserver ? '✅' : '❌'}`);
  
  // Test 2: Measure rendered content size
  console.log('\n📐 Test 2: Rendered Content Size');
  
  const previewContent = previewContainer.querySelector('.slide-preview-grid');
  const productionContent = productionContainer.querySelector('#production-render > div');
  
  if (previewContent && productionContent) {
    const previewRect = previewContent.getBoundingClientRect();
    const productionRect = productionContent.getBoundingClientRect();
    
    console.log(`  Preview content: ${previewRect.width.toFixed(1)} x ${previewRect.height.toFixed(1)}`);
    console.log(`  Production content: ${productionRect.width.toFixed(1)} x ${productionRect.height.toFixed(1)}`);
    
    // Check if they're similar
    const widthDiff = Math.abs(previewRect.width - productionRect.width);
    const heightDiff = Math.abs(previewRect.height - productionRect.height);
    
    console.log(`  Width difference: ${widthDiff.toFixed(1)}px`);
    console.log(`  Height difference: ${heightDiff.toFixed(1)}px`);
    
    if (widthDiff < 5 && heightDiff < 5) {
      console.log('  ✅ Content sizes match');
    } else {
      console.log('  ❌ Content sizes differ significantly');
    }
  }
  
  // Test 3: Simulate resize
  console.log('\n🔄 Test 3: Simulating Resize...');
  
  // Store original size
  const originalWidth = previewContainer.style.width;
  
  // Function to test resize at a specific size
  const testResize = (width, height) => {
    console.log(`\n  Testing resize to ${width}x${height}:`);
    
    // Apply new size
    previewContainer.style.width = width + 'px';
    previewContainer.style.height = height + 'px';
    productionContainer.style.width = width + 'px';
    productionContainer.style.height = height + 'px';
    
    // Wait for resize to complete
    return new Promise(resolve => {
      setTimeout(() => {
        // Measure new content sizes
        const newPreviewRect = previewContent.getBoundingClientRect();
        const newProductionRect = productionContent.getBoundingClientRect();
        
        console.log(`    Preview: ${newPreviewRect.width.toFixed(1)} x ${newPreviewRect.height.toFixed(1)}`);
        console.log(`    Production: ${newProductionRect.width.toFixed(1)} x ${newProductionRect.height.toFixed(1)}`);
        
        // Calculate scale
        const previewScale = newPreviewRect.width / state.canvasWidth;
        const productionScale = newProductionRect.width / state.canvasWidth;
        
        console.log(`    Preview scale: ${previewScale.toFixed(3)}`);
        console.log(`    Production scale: ${productionScale.toFixed(3)}`);
        
        resolve({
          preview: { rect: newPreviewRect, scale: previewScale },
          production: { rect: newProductionRect, scale: productionScale }
        });
      }, 200);
    });
  };
  
  // Test different sizes
  const testSizes = [
    { width: 400, height: 225 },
    { width: 800, height: 450 },
    { width: 1200, height: 675 }
  ];
  
  const results = [];
  
  // Run tests sequentially
  testSizes.reduce((promise, size) => {
    return promise.then(() => testResize(size.width, size.height))
      .then(result => results.push({ size, ...result }));
  }, Promise.resolve()).then(() => {
    // Restore original size
    previewContainer.style.width = originalWidth;
    productionContainer.style.width = originalWidth;
    
    // Analyze results
    console.log('\n📊 Resize Analysis:');
    results.forEach(result => {
      const scaleDiff = Math.abs(result.preview.scale - result.production.scale);
      console.log(`  ${result.size.width}x${result.size.height}: Scale diff = ${scaleDiff.toFixed(3)}`);
    });
    
    // Check if scales match across all sizes
    const scalesMatch = results.every(r => 
      Math.abs(r.preview.scale - r.production.scale) < 0.01
    );
    
    if (scalesMatch) {
      console.log('\n✅ All resize tests passed! Scales match across all sizes.');
    } else {
      console.log('\n❌ Resize tests failed. Scales do not match consistently.');
    }
    
    return results;
  });
}

/**
 * Test for CSS constraints
 */
export function testCSSConstraints() {
  console.log('\n🔍 Testing CSS Constraints...');
  
  const productionSurface = document.querySelector('.production-preview-surface');
  const productionInner = productionSurface?.querySelector('div');
  
  if (!productionSurface || !productionInner) {
    console.error('❌ Production surface elements not found');
    return;
  }
  
  const surfaceStyle = window.getComputedStyle(productionSurface);
  const innerStyle = window.getComputedStyle(productionInner);
  
  console.log('Production Surface CSS:');
  console.log(`  display: ${surfaceStyle.display}`);
  console.log(`  align-items: ${surfaceStyle.alignItems}`);
  console.log(`  justify-content: ${surfaceStyle.justifyContent}`);
  console.log(`  overflow: ${surfaceStyle.overflow}`);
  
  console.log('\nProduction Inner CSS:');
  console.log(`  max-width: ${innerStyle.maxWidth}`);
  console.log(`  max-height: ${innerStyle.maxHeight}`);
  console.log(`  width: ${innerStyle.width}`);
  console.log(`  height: ${innerStyle.height}`);
  
  // Check for problematic constraints
  const hasMaxWidth = innerStyle.maxWidth !== 'none';
  const hasMaxHeight = innerStyle.maxHeight !== 'none';
  
  if (hasMaxWidth || hasMaxHeight) {
    console.log('\n⚠️  Found constraints that may prevent resizing:');
    if (hasMaxWidth) console.log(`    - max-width: ${innerStyle.maxWidth}`);
    if (hasMaxHeight) console.log(`    - max-height: ${innerStyle.maxHeight}`);
  } else {
    console.log('\n✅ No problematic constraints found');
  }
}

/**
 * Test font scaling consistency
 */
export function testFontScaling() {
  console.log('\n🔍 Testing Font Scaling...');
  
  const previewTitle = document.querySelector('.slide-preview-region[data-role="primary-title"] .slide-preview-region-copy');
  const productionTitle = document.querySelector('#production-render [data-role="primary-title"] p');
  
  if (!previewTitle || !productionTitle) {
    console.log('⚠️  No primary title found to test font scaling');
    return;
  }
  
  const previewStyle = window.getComputedStyle(previewTitle);
  const productionStyle = window.getComputedStyle(productionTitle);
  
  const previewFontSize = parseFloat(previewStyle.fontSize);
  const productionFontSize = parseFloat(productionStyle.fontSize);
  
  console.log(`Preview font size: ${previewFontSize.toFixed(1)}px`);
  console.log(`Production font size: ${productionFontSize.toFixed(1)}px`);
  
  const diff = Math.abs(previewFontSize - productionFontSize);
  if (diff < 1) {
    console.log('✅ Font sizes match');
  } else {
    console.log(`❌ Font sizes differ by ${diff.toFixed(1)}px`);
  }
  
  // Check if CSS variable is set
  const previewGrid = document.querySelector('.slide-preview-grid');
  const scaleValue = previewGrid?.style.getPropertyValue('--preview-scale');
  console.log(`CSS --preview-scale: ${scaleValue || 'not set'}`);
}

/**
 * Run all tests
 */
export function runAllResizeTests() {
  console.log('🚀 Running all resize tests...\n');
  
  testCSSConstraints();
  testFontScaling();
  testResizeBehavior();
}

// Make available globally
if (typeof window !== 'undefined') {
  window.testResizeBehavior = testResizeBehavior;
  window.testCSSConstraints = testCSSConstraints;
  window.testFontScaling = testFontScaling;
  window.runAllResizeTests = runAllResizeTests;
  
  console.log('🧪 Resize tests loaded!');
  console.log('Available commands:');
  console.log('  testResizeBehavior() - Test resize functionality');
  console.log('  testCSSConstraints() - Check for CSS constraints');
  console.log('  testFontScaling() - Test font scaling consistency');
  console.log('  runAllResizeTests() - Run all tests');
}
