# Template Studio Testing Guide

This document describes the testing strategy and regression tests for the Template Studio application.

## Test Structure

### Test Files

- **`core-regression.test.js`** - Core functionality regression tests
- **`integration.test.js`** - Full workflow integration tests  
- **`visual-regression.test.js`** - UI rendering and visual behavior tests
- **`regression.test.js`** - Comprehensive regression test suite
- **`importer.test.js`** - MDX import functionality tests
- **`exporter.test.js`** - MDX export functionality tests
- **`schema-validation.test.js`** - MDX schema validation tests

### Test Categories

#### 1. Core Regression Tests (`core-regression.test.js`)

**Purpose**: Test fundamental Template Studio functionality and prevent regressions.

**Coverage**:
- State management (initialization, reset, modifications)
- Box creation and management (creation, deletion, overlap detection)
- Mouse interaction detection (editable targets, event handling)
- Guide settings (toggles, exclusions)
- History management (undo/redo operations)
- Error handling (null elements, invalid coordinates)
- Performance (multiple operations, rapid changes)
- Data integrity (metadata, uniqueness)

**Running Tests**:
```bash
npm run test:regression
# Or specifically:
node --test template-studio/test/core-regression.test.js
```

#### 2. Integration Tests (`integration.test.js`)

**Purpose**: Test complete workflows and end-to-end functionality.

**Coverage**:
- Full design-to-export workflow
- MDX import/export data integrity
- UI state synchronization
- Performance with large layouts
- Boundary conditions and edge cases
- Browser compatibility scenarios

#### 3. Visual Regression Tests (`visual-regression.test.js`)

**Purpose**: Test UI rendering, visual behavior, and DOM interactions.

**Coverage**:
- Canvas rendering (grid blocks, CSS classes, selection styling)
- Guide rendering (center lines, fraction guides, exclusion zones)
- Interactive elements (resize handles, guide buttons, control states)
- Responsive behavior (different canvas sizes, grid dimensions)
- Error recovery (missing DOM elements, corrupted state)

#### 4. MDX Tests

**Purpose**: Test MDX import/export functionality and schema validation.

**Files**:
- `importer.test.js` - MDX file parsing and state application
- `exporter.test.js` - State to MDX conversion
- `schema-validation.test.js` - Frontmatter schema validation

## Running Tests

### All Tests
```bash
npm test
```

### MDX Tests Only
```bash
npm run test:mdx
```

### Regression Tests Only
```bash
npm run test:regression
```

### Watch Mode
```bash
npm run test:watch
```

## Test Environment

### Browser Mocking

Tests use JSDOM to mock browser environment:
- DOM manipulation (`document`, `window`, `HTMLElement`)
- Browser APIs (`navigator`, `getComputedStyle`)
- User interaction APIs (`alert`, `confirm`, `prompt`)
- Event APIs (`CustomEvent`, `MouseEvent`)

### State Management

Each test runs with a clean state:
```javascript
beforeEach(() => {
  resetState();
});
```

### DOM Cleanup

Tests clean up DOM after each run:
```javascript
afterEach(() => {
  dom.window.document.body.innerHTML = '';
});
```

## Test Coverage Areas

### ✅ Currently Tested

1. **State Management**
   - Initial state values
   - State reset functionality
   - State mutations

2. **Box Operations**
   - Creation with valid coordinates
   - Overlap detection and prevention
   - Selection and deletion
   - Metadata management

3. **Mouse Interactions**
   - Editable target detection
   - Mouse event handling
   - Drawing state management

4. **Guide System**
   - Guide setting toggles
   - Exclusion zone handling
   - Guide rendering

5. **Error Handling**
   - Null DOM elements
   - Invalid coordinates
   - Out-of-bounds values
   - Corrupted state

6. **Performance**
   - Multiple box creation
   - Rapid state changes
   - Large layout handling

7. **Data Integrity**
   - Box metadata preservation
   - Unique ID generation
   - State consistency

### 🔄 Areas for Future Testing

1. **Advanced UI Interactions**
   - Drag and drop functionality
   - Resize operations
   - Complex selection scenarios

2. **MDX Import/Export**
   - Complex frontmatter structures
   - Error recovery in parsing
   - Large file handling

3. **Browser Compatibility**
   - Different browser APIs
   - Mobile device testing
   - Accessibility features

4. **Performance Optimization**
   - Memory usage testing
   - Rendering performance
   - Large dataset handling

## Writing New Tests

### Test Structure

```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    resetState();
    // Setup test environment
  });

  it('should do something specific', () => {
    // Arrange
    const input = createTestInput();
    
    // Act
    const result = TemplateStudio.functionName(input);
    
    // Assert
    assert.strictEqual(result.expectedProperty, expectedValue);
  });
});
```

### Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Clean State**: Use `resetState()` in beforeEach
3. **Mock Dependencies**: Mock browser APIs when needed
4. **Test Edge Cases**: Include invalid inputs and error conditions
5. **Performance Tests**: Include timing assertions for critical operations
6. **Descriptive Names**: Use clear, descriptive test names

### Assertions

Use Node.js built-in assertions:
```javascript
assert.strictEqual(actual, expected);
assert.deepStrictEqual(actual, expected);
assert(condition);
assert.doesNotThrow(() => riskyOperation());
assert.throws(() => riskyOperation(), expectedError);
```

## Debugging Failed Tests

### Console Output

Tests include console logging for debugging:
- State changes
- DOM operations
- Event handling
- Error conditions

### Test Isolation

To debug a specific test:
```bash
node --test --grep "test name pattern" template-studio/test/core-regression.test.js
```

### Browser Environment

For UI-related issues, you may need to:
1. Check DOM structure in test setup
2. Verify CSS class application
3. Test event simulation
4. Validate element dimensions

## Continuous Integration

### GitHub Actions

Tests should run on:
- Pull requests
- Main branch merges
- Release candidates

### Test Requirements

- All tests must pass
- Code coverage should be maintained
- Performance tests should not regress
- No new console errors or warnings

## Test Data

### Mock Data

Tests use predictable mock data:
- Box coordinates: Simple, non-overlapping values
- State values: Known defaults
- DOM elements: Minimal required structure

### Test Scenarios

Common test scenarios:
1. **Happy Path**: Normal operation with valid inputs
2. **Edge Cases**: Boundary values and limits
3. **Error Cases**: Invalid inputs and error conditions
4. **Performance**: Large datasets and rapid operations

## Maintenance

### Updating Tests

When adding new features:
1. Write tests for new functionality
2. Update existing tests if behavior changes
3. Add to test coverage documentation
4. Verify all tests pass

### Regression Prevention

Tests prevent regressions by:
1. Validating core functionality
2. Testing error conditions
3. Ensuring performance standards
4. Maintaining data integrity

### Test Review

Regular test maintenance:
1. Remove obsolete tests
2. Update test expectations
3. Improve test performance
4. Add missing coverage areas
