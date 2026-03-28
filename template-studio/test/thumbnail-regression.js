#!/usr/bin/env node

/**
 * Regression test script for template thumbnail rendering
 * Verifies that the API returns correct region data for all templates
 */

import http from 'node:http';

const PORT = 4174;

function checkTemplateAPI() {
  const options = {
    hostname: 'localhost',
    port: PORT,
    path: '/api/templates',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const templates = JSON.parse(data);
        console.log('\n✅ Template API Response Summary:');
        console.log('=====================================');
        
        // Expected region counts
        const expected = {
          'accenture-master.mdx': 6,
          'accenture-master-verbose-backup.mdx': 11,
          'compact-example.mdx': 11,
          'narrative-slide-compact.mdx': 11,
          'narrative-slide-ultra-compact.mdx': 1,
          'simple-test.mdx': 2,
          'simple-test-verbose-backup.mdx': 2,
          'ultra-compact.mdx': 1
        };

        let allCorrect = true;
        
        templates.forEach(template => {
          const actual = template.regions.length;
          const exp = expected[template.file];
          const status = exp && actual === exp ? '✅' : '❌';
          
          console.log(`${status} ${template.file}: ${actual} regions${exp ? ` (expected ${exp})` : ' (unknown expected)'}`);
          
          if (exp && actual !== exp) {
            allCorrect = false;
          }
        });

        console.log('\n=====================================');
        if (allCorrect) {
          console.log('✅ All templates have correct region counts!');
          console.log('✅ Thumbnail regression test PASSED');
        } else {
          console.log('❌ Some templates have incorrect region counts');
          console.log('❌ Thumbnail regression test FAILED');
        }
        
        // Check for fallback templates (should not exist)
        const hasFallback = templates.some(t => 
          t.regions.length === 2 && 
          t.regions[0].name === 'Title' && 
          t.regions[1].name === 'Content'
        );
        
        if (hasFallback) {
          console.log('\n⚠️  WARNING: Found fallback template data!');
        }

      } catch (err) {
        console.error('❌ Failed to parse API response:', err.message);
      }
    });
  });

  req.on('error', (err) => {
    console.error(`\n❌ Cannot connect to Template Studio server on port ${PORT}`);
    console.log('   Make sure the server is running: npm run studio');
    process.exit(1);
  });

  req.end();
}

console.log(`\n🔍 Checking template API at http://localhost:${PORT}/api/templates`);
checkTemplateAPI();
