# Template Studio Regression Tests

This directory contains regression tests for Template Studio to ensure critical issues don't resurface.

## Tests

### 1. Guide Positioning (`guide-positioning.test.js`)
Tests that guide lines have correct dimensions and positions:
- Vertical guides should span the full height of the grid
- Horizontal guides should span the full width of the grid
- Both should be 1px thick
- Center guides should be positioned at the exact center

**Issue**: Guides were using swapped width/height values causing incorrect lengths.

### 2. Region Display (`region-display.test.js`)
Tests that regions (grid blocks) are visible immediately when the canvas loads:
- Regions should be visible without requiring any guide toggle
- Regions should render based on the boxes in state
- Initial render should include all regions

**Issue**: Regions only appeared after toggling a guide setting because guide clicks trigger a full re-render.

## Running Tests

### Run all tests:
```bash
node test/run-regression-tests.js
```

### Run individual tests:
```bash
node test/guide-positioning.test.js
node test/region-display.test.js
```

## Test Output

- Screenshots are saved to `test/screenshots/` for visual verification
- Tests return exit code 0 for success, 1 for failure
- Detailed logs show exactly what passed/failed and why

## Adding New Tests

1. Create a new test file following the pattern `test-name.test.js`
2. Export the test function
3. Add it to the test list in `run-regression-tests.js`
4. Include clear pass/fail criteria and helpful error messages

## Current Status

- ❌ Guide Positioning: FAILED - Guides not rendering
- ❌ Region Display: FAILED - Regions not visible initially

Both issues need to be fixed.
