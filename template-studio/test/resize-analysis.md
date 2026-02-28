# Resize Behavior Analysis and Fixes

## Issues Identified:

1. **CSS Constraints**: Removed `max-width: 100%` and `max-height: 100%` from `.production-preview-surface > div`

2. **ResizeObserver Timing**: The debounced resize might not be firing correctly in all cases

3. **Container Flex Behavior**: The production surface uses flex centering which might affect sizing

## Additional Fixes Needed:

### Fix 1: Ensure container fills parent
The production container needs to properly fill its parent without constraints.

### Fix 2: Improve resize detection
Add window resize listener as backup to ResizeObserver.

### Fix 3: Force reflow after resize
Ensure the DOM updates properly after resize calculations.

## Test Results:

Run `runAllResizeTests()` in the console to:
- Check CSS constraints
- Verify font scaling consistency  
- Test resize behavior at multiple sizes
- Compare preview vs production scaling

## Expected Behavior:

Both renders should:
- Resize smoothly from small to large
- Resize smoothly from large to small
- Maintain identical scaling factors
- Keep font sizes proportional
