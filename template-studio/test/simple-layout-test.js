import { renderProductionSlide } from '../src/canvas/production-renderer.js';
import { renderSlidePreview } from '../src/canvas/rendered-view.js';
import { state } from '../src/state.js';

/**
 * Simple test to compare preview and production renders
 * Run this in the browser console: testRenderComparison()
 */
export function testRenderComparison() {
  console.log('🔍 Comparing Preview and Production Renders...\n');
  
  // Find existing containers
  const previewContainer = document.querySelector('.slide-preview-grid');
  const productionContainer = document.querySelector('#production-render');
  
  if (!previewContainer) {
    console.error('❌ Preview container not found. Make sure you\'re on the preview tab.');
    return;
  }
  
  if (!productionContainer) {
    console.error('❌ Production container not found. Make sure you\'ve switched to production render at least once.');
    return;
  }
  
  // Get container dimensions
  const previewRect = previewContainer.getBoundingClientRect();
  const productionRect = productionContainer.getBoundingClientRect();
  
  console.log('📐 Container Dimensions:');
  console.log(`  Preview: ${previewRect.width.toFixed(1)} x ${previewRect.height.toFixed(1)}`);
  console.log(`  Production: ${productionRect.width.toFixed(1)} x ${productionRect.height.toFixed(1)}`);
  
  // Find all regions in both renders
  const previewRegions = previewContainer.querySelectorAll('.slide-preview-region');
  const productionRegions = productionContainer.querySelectorAll('.slide-preview-region, article[data-role]');
  
  console.log(`\n📦 Region Count:`);
  console.log(`  Preview: ${previewRegions.length} regions`);
  console.log(`  Production: ${productionRegions.length} regions`);
  
  // Compare each region
  const differences = [];
  const scale = previewRect.width / state.canvasWidth;
  
  previewRegions.forEach((previewRegion, index) => {
    const role = previewRegion.dataset.role;
    const boxId = previewRegion.dataset.boxId;
    
    // Find matching production region
    const productionRegion = Array.from(productionRegions).find(
      r => r.dataset.role === role && r.dataset.boxId === boxId
    );
    
    if (!productionRegion) {
      differences.push({
        type: 'missing',
        role,
        boxId,
        message: 'Region missing in production render'
      });
      return;
    }
    
    // Measure regions
    const previewRect = previewRegion.getBoundingClientRect();
    const productionRect = productionRegion.getBoundingClientRect();
    
    // Expected dimensions based on grid
    const expectedWidth = (state.boxes.find(b => b.id === boxId)?.gridWidth || 1) * (previewRect.width / state.columns);
    const expectedHeight = (state.boxes.find(b => b.id === boxId)?.gridHeight || 1) * (previewRect.height / state.rows);
    
    // Check dimensions
    const widthDiff = Math.abs(previewRect.width - productionRect.width);
    const heightDiff = Math.abs(previewRect.height - productionRect.height);
    
    if (widthDiff > 2 || heightDiff > 2) {
      differences.push({
        type: 'dimensions',
        role,
        boxId,
        preview: { width: previewRect.width, height: previewRect.height },
        production: { width: productionRect.width, height: productionRect.height },
        expected: { width: expectedWidth, height: expectedHeight },
        scale
      });
    }
    
    // Check text if present
    const previewText = previewRegion.querySelector('.slide-preview-region-copy');
    const productionText = productionRegion.querySelector('p');
    
    if (previewText && productionText) {
      const previewStyle = window.getComputedStyle(previewText);
      const productionStyle = window.getComputedStyle(productionText);
      
      const previewFontSize = parseFloat(previewStyle.fontSize);
      const productionFontSize = parseFloat(productionStyle.fontSize);
      const fontSizeDiff = Math.abs(previewFontSize - productionFontSize);
      
      if (fontSizeDiff > 1) {
        differences.push({
          type: 'font-size',
          role,
          boxId,
          preview: previewFontSize,
          production: productionFontSize,
          expected: parseFloat(previewStyle.fontSize) / scale,
          scale
        });
      }
    }
  });
  
  // Report results
  console.log(`\n📊 Analysis Results:`);
  console.log(`  Scale factor: ${scale.toFixed(3)}`);
  console.log(`  Differences found: ${differences.length}`);
  
  if (differences.length > 0) {
    console.log('\n❌ Differences:');
    differences.forEach((diff, index) => {
      console.log(`\n${index + 1}. ${diff.role} (${diff.boxId}) - ${diff.type}`);
      
      if (diff.type === 'dimensions') {
        console.log(`   Preview: ${diff.preview.width.toFixed(1)} x ${diff.preview.height.toFixed(1)}`);
        console.log(`   Production: ${diff.production.width.toFixed(1)} x ${diff.production.height.toFixed(1)}`);
        console.log(`   Expected: ${diff.expected.width.toFixed(1)} x ${diff.expected.height.toFixed(1)}`);
      } else if (diff.type === 'font-size') {
        console.log(`   Preview: ${diff.preview.toFixed(1)}px`);
        console.log(`   Production: ${diff.production.toFixed(1)}px`);
        console.log(`   Expected scaled: ${diff.expected.toFixed(1)}px`);
      } else {
        console.log(`   ${diff.message}`);
      }
    });
  } else {
    console.log('\n✅ No significant differences found!');
  }
  
  // Additional checks
  console.log('\n🔍 Additional Checks:');
  
  // Check if CSS scale is being applied
  const computedScale = previewContainer.style.getPropertyValue('--preview-scale');
  console.log(`  CSS --preview-scale: ${computedScale || 'not set'}`);
  
  // Check grid vs positioning
  const previewUsesGrid = previewContainer.style.display === 'grid';
  console.log(`  Preview uses CSS Grid: ${previewUsesGrid}`);
  console.log(`  Production uses absolute positioning: true`);
  
  return differences;
}

/**
 * Test to verify scaling behavior
 */
export function testScalingBehavior() {
  console.log('\n🔍 Testing Scaling Behavior...\n');
  
  const previewContainer = document.querySelector('.slide-preview-grid');
  if (!previewContainer) {
    console.error('❌ Preview container not found');
    return;
  }
  
  // Get current scale
  const containerWidth = previewContainer.clientWidth;
  const scale = containerWidth / state.canvasWidth;
  
  console.log(`Container width: ${containerWidth}px`);
  console.log(`Canvas width: ${state.canvasWidth}px`);
  console.log(`Scale factor: ${scale.toFixed(3)}`);
  
  // Check a primary title if it exists
  const primaryTitle = previewContainer.querySelector('[data-role="primary-title"] .slide-preview-region-copy');
  if (primaryTitle) {
    const computedStyle = window.getComputedStyle(primaryTitle);
    const fontSize = parseFloat(computedStyle.fontSize);
    const expectedFontSize = 1.6 * 16 * scale; // 1.6rem * 16px * scale
    
    console.log(`\nPrimary Title:`);
    console.log(`  Actual font size: ${fontSize.toFixed(1)}px`);
    console.log(`  Expected font size: ${expectedFontSize.toFixed(1)}px`);
    console.log(`  Match: ${Math.abs(fontSize - expectedFontSize) < 2 ? '✅' : '❌'}`);
  }
  
  // Check table styling
  const table = previewContainer.querySelector('.slide-preview-table');
  if (table) {
    const computedStyle = window.getComputedStyle(table);
    const fontSize = parseFloat(computedStyle.fontSize);
    const expectedFontSize = 0.78 * 16 * scale; // 0.78rem * 16px * scale
    
    console.log(`\nTable:`);
    console.log(`  Actual font size: ${fontSize.toFixed(1)}px`);
    console.log(`  Expected font size: ${expectedFontSize.toFixed(1)}px`);
    console.log(`  Match: ${Math.abs(fontSize - expectedFontSize) < 2 ? '✅' : '❌'}`);
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.testRenderComparison = testRenderComparison;
  window.testScalingBehavior = testScalingBehavior;
  
  console.log('🧪 Layout tests loaded!');
  console.log('Run testRenderComparison() to compare preview and production renders');
  console.log('Run testScalingBehavior() to check scaling behavior');
}
