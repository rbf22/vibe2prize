import { renderProductionSlide } from '../src/canvas/production-renderer.js';
import { renderSlidePreview } from '../src/canvas/rendered-view.js';
import { state } from '../src/state.js';
import { getBrandSnapshot } from '../src/branding/brands.js';

// Test helper to measure rendered elements
function measureElement(element) {
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);
  
  return {
    width: rect.width,
    height: rect.height,
    x: rect.left,
    y: rect.top,
    fontSize: parseFloat(computedStyle.fontSize),
    fontFamily: computedStyle.fontFamily,
    lineHeight: computedStyle.lineHeight,
    padding: {
      top: parseFloat(computedStyle.paddingTop),
      right: parseFloat(computedStyle.paddingRight),
      bottom: parseFloat(computedStyle.paddingBottom),
      left: parseFloat(computedStyle.paddingLeft)
    },
    backgroundColor: computedStyle.backgroundColor,
    color: computedStyle.color
  };
}

// Test helper to find regions by role
function findRegionsByRole(container, role) {
  return Array.from(container.querySelectorAll(`[data-role="${role}"]`));
}

// Test helper to measure all regions
function measureAllRegions(container) {
  const regions = container.querySelectorAll('.slide-preview-region, article[data-role]');
  const measurements = {};
  
  regions.forEach(region => {
    const role = region.dataset.role;
    const boxId = region.dataset.boxId;
    const key = `${role}-${boxId}`;
    
    const textElement = region.querySelector('.slide-preview-region-copy, p');
    const regionMeasurements = measureElement(region);
    const textMeasurements = textElement ? measureElement(textElement) : null;
    
    measurements[key] = {
      region: regionMeasurements,
      text: textMeasurements,
      role,
      boxId
    };
  });
  
  return measurements;
}

// Test helper to compare measurements
function compareMeasurements(previewMeasurements, productionMeasurements, tolerance = 2) {
  const differences = [];
  const keys = new Set([...Object.keys(previewMeasurements), ...Object.keys(productionMeasurements)]);
  
  keys.forEach(key => {
    const preview = previewMeasurements[key];
    const production = productionMeasurements[key];
    
    if (!preview || !production) {
      differences.push({
        key,
        issue: 'Missing in one renderer',
        preview: !!preview,
        production: !!production
      });
      return;
    }
    
    // Compare region dimensions
    const regionDiff = {
      width: Math.abs(preview.region.width - production.region.width),
      height: Math.abs(preview.region.height - production.region.height),
      x: Math.abs(preview.region.x - production.region.x),
      y: Math.abs(preview.region.y - production.region.y)
    };
    
    // Compare text properties if text exists
    const textDiff = preview.text && production.text ? {
      fontSize: Math.abs(preview.text.fontSize - production.text.fontSize),
      fontFamily: preview.text.fontFamily !== production.text.fontFamily,
      lineHeight: Math.abs(parseFloat(preview.text.lineHeight) - parseFloat(production.text.lineHeight))
    } : null;
    
    // Check if differences exceed tolerance
    const hasSignificantDiff = 
      regionDiff.width > tolerance ||
      regionDiff.height > tolerance ||
      regionDiff.x > tolerance ||
      regionDiff.y > tolerance ||
      (textDiff && (
        textDiff.fontSize > tolerance ||
        textDiff.lineHeight > tolerance ||
        textDiff.fontFamily
      ));
    
    if (hasSignificantDiff) {
      differences.push({
        key,
        role: preview.role,
        regionDiff,
        textDiff,
        preview: preview,
        production: production
      });
    }
  });
  
  return differences;
}

// Create test containers
function createTestContainers() {
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9999;
    background: white;
    display: flex;
    gap: 20px;
    padding: 20px;
  `;
  
  const previewContainer = document.createElement('div');
  previewContainer.style.cssText = `
    flex: 1;
    height: 100%;
    border: 2px solid blue;
    position: relative;
  `;
  
  const productionContainer = document.createElement('div');
  productionContainer.style.cssText = `
    flex: 1;
    height: 100%;
    border: 2px solid red;
    position: relative;
  `;
  
  container.appendChild(previewContainer);
  container.appendChild(productionContainer);
  
  return { container, previewContainer, productionContainer };
}

// Main test function
export async function testLayoutDifferences() {
  console.log('🧪 Testing layout differences between preview and production renders...');
  
  // Save current state
  const originalBoxes = [...state.boxes];
  const originalBrand = state.brand;
  
  try {
    // Set up test data
    state.boxes = [
      {
        id: 'test-1',
        gridX: 0,
        gridY: 0,
        gridWidth: 6,
        gridHeight: 2,
        metadata: { role: 'primary-title' }
      },
      {
        id: 'test-2',
        gridX: 6,
        gridY: 0,
        gridWidth: 6,
        gridHeight: 3,
        metadata: { role: 'logo', inputType: 'image' }
      },
      {
        id: 'test-3',
        gridX: 0,
        gridY: 2,
        gridWidth: 12,
        gridHeight: 4,
        metadata: { role: 'data-table' }
      },
      {
        id: 'test-4',
        gridX: 0,
        gridY: 6,
        gridWidth: 12,
        gridHeight: 2,
        metadata: { role: 'footer' }
      }
    ];
    
    state.columns = 12;
    state.rows = 8;
    state.canvasWidth = 1920;
    state.canvasHeight = 1080;
    
    // Create test containers
    const { container, previewContainer, productionContainer } = createTestContainers();
    document.body.appendChild(container);
    
    // Render both versions
    renderSlidePreview(previewContainer);
    await renderProductionSlide(productionContainer);
    
    // Wait for any async rendering
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Measure both renders
    const previewMeasurements = measureAllRegions(previewContainer);
    const productionMeasurements = measureAllRegions(productionContainer);
    
    // Compare measurements
    const differences = compareMeasurements(previewMeasurements, productionMeasurements);
    
    // Log results
    console.log('\n📊 Measurement Results:');
    console.log('Preview regions:', Object.keys(previewMeasurements).length);
    console.log('Production regions:', Object.keys(productionMeasurements).length);
    console.log('Differences found:', differences.length);
    
    if (differences.length > 0) {
      console.log('\n❌ Significant Differences:');
      differences.forEach(diff => {
        console.log(`\n${diff.key} (${diff.role}):`);
        
        if (diff.regionDiff) {
          console.log('  Region:');
          console.log(`    Width: ${diff.preview.region.width.toFixed(1)} vs ${diff.production.region.width.toFixed(1)} (diff: ${diff.regionDiff.width.toFixed(1)})`);
          console.log(`    Height: ${diff.preview.region.height.toFixed(1)} vs ${diff.production.region.height.toFixed(1)} (diff: ${diff.regionDiff.height.toFixed(1)})`);
          console.log(`    Position: (${diff.preview.region.x.toFixed(1)}, ${diff.preview.region.y.toFixed(1)}) vs (${diff.production.region.x.toFixed(1)}, ${diff.production.region.y.toFixed(1)})`);
        }
        
        if (diff.textDiff) {
          console.log('  Text:');
          console.log(`    Font size: ${diff.preview.text.fontSize.toFixed(1)}px vs ${diff.production.text.fontSize.toFixed(1)}px (diff: ${diff.textDiff.fontSize.toFixed(1)}px)`);
          if (diff.textDiff.fontFamily) {
            console.log(`    Font family: ${diff.preview.text.fontFamily} vs ${diff.production.text.fontFamily}`);
          }
          console.log(`    Line height: ${diff.preview.text.lineHeight} vs ${diff.production.text.lineHeight}`);
        }
      });
    } else {
      console.log('\n✅ No significant differences found within tolerance!');
    }
    
    // Clean up
    document.body.removeChild(container);
    
    return {
      previewMeasurements,
      productionMeasurements,
      differences
    };
    
  } finally {
    // Restore original state
    state.boxes = originalBoxes;
    state.brand = originalBrand;
  }
}

// Test with different container sizes
export async function testScalingDifferences() {
  console.log('\n🧪 Testing scaling differences across container sizes...');
  
  const sizes = [
    { width: 1920, height: 1080, name: 'Full Size' },
    { width: 960, height: 540, name: '50% Scale' },
    { width: 480, height: 270, name: '25% Scale' }
  ];
  
  const results = {};
  
  for (const size of sizes) {
    console.log(`\nTesting ${size.name} (${size.width}x${size.height})...`);
    
    // Create container with specific size
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: ${size.width}px;
      height: ${size.height}px;
      visibility: hidden;
    `;
    document.body.appendChild(container);
    
    const previewContainer = document.createElement('div');
    previewContainer.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
    `;
    container.appendChild(previewContainer);
    
    // Render and measure
    renderSlidePreview(previewContainer);
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const measurements = measureAllRegions(previewContainer);
    results[size.name] = measurements;
    
    // Check a specific region's scaling
    const primaryTitle = Object.values(measurements).find(m => m.role === 'primary-title');
    if (primaryTitle && primaryTitle.text) {
      console.log(`  Primary title font size: ${primaryTitle.text.fontSize.toFixed(1)}px`);
    }
    
    document.body.removeChild(container);
  }
  
  // Compare scaling ratios
  console.log('\n📈 Scaling Analysis:');
  const fullSize = results['Full Size'];
  const halfSize = results['50% Scale'];
  const quarterSize = results['25% Scale'];
  
  if (fullSize && halfSize) {
    const fullTitle = Object.values(fullSize).find(m => m.role === 'primary-title');
    const halfTitle = Object.values(halfSize).find(m => m.role === 'primary-title');
    
    if (fullTitle?.text && halfTitle?.text) {
      const scaleRatio = halfTitle.text.fontSize / fullTitle.text.fontSize;
      console.log(`  Font size scaling ratio (50%): ${scaleRatio.toFixed(3)} (expected: ~0.5)`);
    }
  }
  
  return results;
}

// Run tests if in browser
if (typeof window !== 'undefined') {
  // Add to window for manual testing
  window.testLayoutDifferences = testLayoutDifferences;
  window.testScalingDifferences = testScalingDifferences;
  
  // Auto-run on page load with a delay
  setTimeout(async () => {
    console.log('🚀 Running layout comparison tests...');
    try {
      await testLayoutDifferences();
      await testScalingDifferences();
      console.log('\n✅ All tests completed!');
    } catch (error) {
      console.error('❌ Test error:', error);
    }
  }, 1000);
}
