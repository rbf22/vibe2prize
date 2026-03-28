import { test, describe } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

const PORT = 4174;
const BASE_URL = `http://localhost:${PORT}`;

describe('Template API Regression Tests', async () => {
  let server;

  test('should return correct number of regions for each template', async () => {
    const response = await fetch(`${BASE_URL}/api/templates`);
    assert.ok(response.ok, 'API should respond successfully');
    
    const templates = await response.json();
    
    // Expected region counts based on MDX files
    const expectedCounts = {
      'accenture-master.mdx': 6,
      'accenture-master-verbose-backup.mdx': 11, // Uses verbose format
      'compact-example.mdx': 11,
      'narrative-slide-compact.mdx': 11,
      'narrative-slide-ultra-compact.mdx': 1,
      'simple-test.mdx': 2,
      'simple-test-verbose-backup.mdx': 2,
      'ultra-compact.mdx': 1
    };
    
    for (const template of templates) {
      const expected = expectedCounts[template.file];
      if (expected) {
        assert.strictEqual(
          template.regions.length,
          expected,
          `${template.file} should have ${expected} regions, got ${template.regions.length}`
        );
      }
    }
  });

  test('should parse grid coordinates correctly', async () => {
    const response = await fetch(`${BASE_URL}/api/templates`);
    const templates = await response.json();
    
    for (const template of templates) {
      for (const region of template.regions) {
        // All regions should have x, y, w, h coordinates
        assert.ok(typeof region.x === 'number', `${template.file}: Region ${region.id} missing x coordinate`);
        assert.ok(typeof region.y === 'number', `${template.file}: Region ${region.id} missing y coordinate`);
        assert.ok(typeof region.w === 'number', `${template.file}: Region ${region.id} missing w coordinate`);
        assert.ok(typeof region.h === 'number', `${template.file}: Region ${region.id} missing h coordinate`);
        
        // Coordinates should be within grid bounds (80x45)
        assert.ok(region.x >= 0 && region.x < 80, `${template.file}: Region ${region.id} x out of bounds`);
        assert.ok(region.y >= 0 && region.y < 45, `${template.file}: Region ${region.id} y out of bounds`);
        assert.ok(region.w > 0 && region.x + region.w <= 80, `${template.file}: Region ${region.id} width out of bounds`);
        assert.ok(region.h > 0 && region.y + region.h <= 45, `${template.file}: Region ${region.id} height out of bounds`);
      }
    }
  });

  test('should not return fallback templates (2 regions) for known templates', async () => {
    const response = await fetch(`${BASE_URL}/api/templates`);
    const templates = await response.json();
    
    const fallbackRegions = [
      {name: 'Title', role: 'primary-title', x: 2, y: 2, w: 76, h: 6},
      {name: 'Content', role: 'supporting-text', x: 2, y: 10, w: 76, h: 30}
    ];
    
    for (const template of templates) {
      const isFallback = template.regions.length === 2 &&
        template.regions[0].name === fallbackRegions[0].name &&
        template.regions[1].name === fallbackRegions[1].name;
      
      assert.ok(!isFallback, `${template.file} should not use fallback template data`);
    }
  });
});

describe('Template Thumbnail Rendering', async () => {
  test('should have renderThumbnail function available', async () => {
    // This would be tested in the browser context
    // For Node.js testing, we verify the function exists in the composer module
    const { renderThumbnail } = await import('../src/composer.js');
    assert.ok(typeof renderThumbnail === 'function', 'renderThumbnail should be a function');
  });
});

// Helper to check if server is running
async function isServerRunning() {
  try {
    const response = await fetch(`${BASE_URL}/api/templates`, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(1000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Skip tests if server is not running
const test = describe('Template API Tests', async (t) => {
  if (!await isServerRunning()) {
    console.log('\n⚠️  Template Studio server not running. Skipping API tests.');
    console.log('   Run: npm run studio');
    return;
  }
  
  await t;
});
