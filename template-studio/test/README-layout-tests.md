# Layout Comparison Tests

This directory contains tests to compare the preview and production renders.

## Running Tests

1. Open Template Studio in your browser
2. Open the browser console (F12)
3. Run the following commands:

### Basic Comparison
```javascript
testRenderComparison()
```
This will:
- Compare region dimensions between preview and production
- Check font sizes
- Identify missing regions
- Report any significant differences

### Scaling Behavior Test
```javascript
testScalingBehavior()
```
This will:
- Check if CSS scale is being applied correctly
- Verify font sizes scale with the container
- Test table scaling

### Manual Inspection

For visual comparison, you can:

1. Create some regions with different roles
2. Switch between preview and production tabs
3. Run `testRenderComparison()` to see quantitative differences

## Expected Results

Both renders should have:
- Same number of regions
- Same region dimensions (within 2px tolerance)
- Same font sizes (within 1px tolerance)
- Same positioning

## Common Issues

If you see differences:

1. **Font size differences**: Check if `--preview-scale` CSS variable is set
2. **Position differences**: Verify both are using the same grid coordinates
3. **Missing regions**: Ensure production render handles all content types

## Debug Tips

- Check the console for detailed measurements
- Use browser dev tools to inspect elements
- Verify CSS variables are applied correctly
- Check that both renders use the same state data
