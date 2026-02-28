# Layout Differences Analysis

After thorough investigation, here are the key differences between preview and production renders:

## 1. **Layout Method**
- **Preview**: Uses CSS Grid with `grid-template-columns` and `grid-template-rows`
- **Production**: Uses absolute positioning with calculated pixel positions

## 2. **Font Scaling**
- **Preview**: Uses CSS `calc()` with `--preview-scale` variable
- **Production**: Directly multiplies font sizes by scale factor

## 3. **Padding Calculation**
Both use the same formula but there might be timing differences:
```javascript
verticalPadding = Math.min(regionHeight * 0.25, 18)
horizontalPadding = Math.min(regionWidth * 0.08, 24)
```

## 4. **CSS Properties Applied**

### Preview (via CSS + JavaScript):
- `.slide-preview-grid` has `justify-content: start` and `align-content: start`
- Regions get default CSS classes that may apply additional styles
- CSS transitions and hover states from stylesheet

### Production (via inline styles):
- All styles applied inline
- No CSS class-based styling
- No hover states or transitions (except those explicitly set)

## 5. **Potential Issues**

### Issue 1: Border Width
- Preview: `border: 1px solid` (from CSS)
- Production: `border: 1px solid` (inline)
- This 1px border affects the total size calculation

### Issue 2: Box Sizing
Both use `box-sizing: border-box`, but the border calculation might differ

### Issue 3: Rounding Errors
Pixel calculations may have rounding differences:
- Preview: Uses `cellWidth` and `cellHeight` which are calculated floats
- Production: Uses direct division which might round differently

### Issue 4: CSS Variable Support
- Preview: Depends on `--preview-scale` being set correctly
- Production: No dependency on CSS variables

## 6. **Debugging Steps**

To identify exact differences:

1. Check if `--preview-scale` is being set:
```javascript
document.querySelector('.slide-preview-grid').style.getPropertyValue('--preview-scale')
```

2. Compare actual measurements:
```javascript
// Preview region
const previewRegion = document.querySelector('.slide-preview-region');
const previewRect = previewRegion.getBoundingClientRect();

// Production region  
const productionRegion = document.querySelector('#production-render article');
const productionRect = productionRegion.getBoundingClientRect();
```

3. Check font sizes:
```javascript
// Preview text
const previewText = document.querySelector('.slide-preview-region-copy');
const previewFont = window.getComputedStyle(previewText).fontSize;

// Production text
const productionText = document.querySelector('#production-render p');
const productionFont = window.getComputedStyle(productionText).fontSize;
```

## 7. **Likely Culprits**

Based on the code analysis, the most likely differences are:

1. **Border inclusion in calculations** - The 1px border affects total dimensions
2. **Rounding differences** - Float calculations may round differently
3. **CSS cascade effects** - Preview might be getting additional styles from CSS
4. **Timing of scale application** - CSS variables might apply at different times

## 8. **Recommended Fixes**

1. Ensure both renders use the same box-sizing model
2. Account for border width in size calculations
3. Use consistent rounding (e.g., Math.round() or Math.floor())
4. Apply CSS variables consistently or avoid them altogether in production
