// Quick test runner for resize behavior
// Run this in the browser console

console.log('🚀 Starting resize tests...\n');

// First, check if we're on the right page
if (!document.querySelector('#productionPreview')) {
  console.error('❌ Not on Template Studio page. Please open Template Studio first.');
} else {
  // Load and run the test
  const script = document.createElement('script');
  script.src = './test/resize-debug.js';
  script.onload = () => {
    setTimeout(() => {
      console.log('Running testResizeFromSmallToBig()...\n');
      window.testResizeFromSmallToBig();
    }, 500);
  };
  document.head.appendChild(script);
}
