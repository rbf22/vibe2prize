#!/usr/bin/env node
// Regression test runner
import { testGuidePositioning } from './guide-positioning.test.js';
import { testRegionDisplay } from './region-display.test.js';

console.log('🧪 Running Template Studio Regression Tests\n');

const tests = [
  { name: 'Guide Positioning', fn: testGuidePositioning },
  { name: 'Region Display', fn: testRegionDisplay }
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  console.log(`\n⏯️  Running: ${test.name}`);
  console.log('='.repeat(50));
  
  try {
    const success = await test.fn();
    if (success) {
      passed++;
      console.log(`\n✅ ${test.name}: PASSED`);
    } else {
      failed++;
      console.log(`\n❌ ${test.name}: FAILED`);
    }
  } catch (error) {
    failed++;
    console.log(`\n💥 ${test.name}: ERROR - ${error.message}`);
  }
}

console.log('\n' + '='.repeat(50));
console.log('\n📊 Test Summary:');
console.log(`   Passed: ${passed}`);
console.log(`   Failed: ${failed}`);
console.log(`   Total:  ${tests.length}`);

if (failed > 0) {
  console.log('\n❌ Some tests failed. Check the logs above for details.');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
