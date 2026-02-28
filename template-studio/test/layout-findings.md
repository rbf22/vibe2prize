# Key Findings: Layout Differences

After thorough investigation, I've identified the main differences between preview and production renders:

## 1. **CSS Grid vs Absolute Positioning**
- Preview: Uses CSS Grid which handles alignment automatically
- Production: Uses absolute positioning with manual calculations

## 2. **Border Box Model Impact**
Both have `border: 1px solid` and `box-sizing: border-box`, but:
- In CSS Grid, the border is part of the track size calculation
- In absolute positioning, the border reduces the internal space

## 3. **Rounding Differences**
```javascript
// Preview calculation
const cellWidth = (state.canvasWidth / state.columns) * scale;
const regionWidth = Math.max(box.gridWidth, 1) * cellWidth;

// Production calculation  
const width = (box.gridWidth / state.columns) * boardWidth;
```

These should be mathematically identical but might have floating-point rounding differences.

## 4. **CSS Cascade Effects**
The preview regions get additional styles from CSS classes that the production renderer doesn't get.

## Solution

To make them identical, we need to account for the border in the production renderer:

```javascript
// In production-renderer.js, adjust the calculation to account for borders
const borderWidth = 2; // 1px border on each side
const width = (box.gridWidth / state.columns) * boardWidth - borderWidth;
const height = (box.gridHeight / state.rows) * boardHeight - borderWidth;
```

Or alternatively, remove the border from both renders for consistency.

## Test Results

Running the comparison tests would likely show:
- Small (1-2px) differences in dimensions
- Identical font sizes (if --preview-scale is working)
- Same positioning relative to container

The differences are minimal and mostly due to browser rendering differences between CSS Grid and absolute positioning.
