import { state } from '../state.js';

export function renderGuides(guideLayer, previewGrid) {
  try {
    console.log('[renderGuides] Starting render', {
      guideLayer: !!guideLayer,
      previewGrid: !!previewGrid,
      guideSettings: JSON.stringify(state.guideSettings),
      columns: state.columns,
      rows: state.rows
    });
    
    if (!guideLayer || !previewGrid) {
      console.warn('[renderGuides] Missing elements', { guideLayer: !!guideLayer, previewGrid: !!previewGrid });
      return;
    }
    
    const rect = previewGrid.getBoundingClientRect();
    let width = rect.width;
    let height = rect.height;
    
    console.log('[renderGuides] Initial dimensions', { 
      width, 
      height, 
      rect,
      previewGridStyles: {
        display: getComputedStyle(previewGrid).display,
        position: getComputedStyle(previewGrid).position,
        width: getComputedStyle(previewGrid).width,
        height: getComputedStyle(previewGrid).height,
        visibility: getComputedStyle(previewGrid).visibility
      }
    });
    
    // Fallback: if grid has no dimensions, try to get from parent
    if (!width || !height) {
      const container = previewGrid.parentElement;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        width = containerRect.width;
        height = containerRect.height;
        console.log('[renderGuides] Using container dimensions', { width, height, containerRect });
      }
    }
    
    if (!width || !height) {
      console.warn('[renderGuides] No valid dimensions, scheduling retry');
      guideLayer.innerHTML = '';
      // Retry after a short delay to allow for layout
      setTimeout(() => {
        const retryRect = previewGrid.getBoundingClientRect();
        const retryWidth = retryRect.width;
        const retryHeight = retryRect.height;
        if (retryWidth && retryHeight) {
          console.log('[renderGuides] Retry successful, rendering guides');
          renderGuides(guideLayer, previewGrid);
        } else {
          console.warn('[renderGuides] Retry failed - grid still has no dimensions');
        }
      }, 100);
      return;
    }

    guideLayer.innerHTML = '';
    let linesAdded = 0;
    const cellWidth = width / state.columns;
    const cellHeight = height / state.rows;

    const horizontalStart = state.exclusions.left * cellWidth;
    const verticalStart = state.exclusions.top * cellHeight;
    const horizontalSpan = width - (state.exclusions.left + state.exclusions.right) * cellWidth;
    const verticalSpan = height - (state.exclusions.top + state.exclusions.bottom) * cellHeight;

    const addGuideLine = (orientation, fraction, options = {}) => {
      const { label = '', accent = true, start = 0, span, center = false } = options;
      const total = span ?? (orientation === 'vertical' ? width : height);
      if (total <= 0) return;
      const position = start + fraction * total;
      const line = document.createElement('div');
      line.className = `guide-line ${orientation}`;
      if (center) {
        line.classList.add('center');
      } else if (accent) {
        line.classList.add('accent');
      }
      
      // Position relative to the guide layer (which covers the entire grid)
      if (orientation === 'vertical') {
        line.style.left = `${position}px`;
        line.style.top = `${start}px`;
        line.style.height = `${total}px`;
        line.style.width = '1px';
      } else {
        line.style.top = `${position}px`;
        line.style.left = `${start}px`;
        line.style.width = `${total}px`;
        line.style.height = '1px';
      }
      guideLayer.appendChild(line);
      linesAdded++;
    };

    // Center guides
    if (state.guideSettings.center) {
      addGuideLine('vertical', 0.5, { center: true, span: height, start: 0 });
      addGuideLine('horizontal', 0.5, { center: true, span: width, start: 0 });
    }

    // Fraction guides
    const fractions = {
      halves: [0.5],
      thirds: [1/3, 2/3],
      quarters: [0.25, 0.5, 0.75],
      sixths: [1/6, 2/6, 3/6, 4/6, 5/6],
      eighths: [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]
    };

    Object.entries(fractions).forEach(([type, positions]) => {
      if (state.guideSettings[type]) {
        positions.forEach(pos => {
          if (!state.guideSettings.center || Math.abs(pos - 0.5) > 0.01) {
            addGuideLine('vertical', pos, { span: verticalSpan, start: verticalStart });
            addGuideLine('horizontal', pos, { span: horizontalSpan, start: horizontalStart });
          }
        });
      }
    });

    // Margin guides (1-grid offset)
    if (state.guideSettings.margin) {
      addGuideLine('vertical', 0, { accent: false, span: verticalSpan, start: verticalStart });
      addGuideLine('vertical', 1, { accent: false, span: verticalSpan, start: verticalStart });
      addGuideLine('horizontal', 0, { accent: false, span: horizontalSpan, start: horizontalStart });
      addGuideLine('horizontal', 1, { accent: false, span: horizontalSpan, start: horizontalStart });
    }

    // Exclusion zones
    const createZone = (x, y, w, h, label) => {
      if (w <= 0 || h <= 0) return;
      const zone = document.createElement('div');
      zone.className = 'exclusion-zone';
      zone.style.left = `${x}px`;
      zone.style.top = `${y}px`;
      zone.style.width = `${w}px`;
      zone.style.height = `${h}px`;
      zone.textContent = label;
      guideLayer.appendChild(zone);
    };

    const topHeight = state.exclusions.top * cellHeight;
    const bottomHeight = state.exclusions.bottom * cellHeight;
    const leftWidth = state.exclusions.left * cellWidth;
    const rightWidth = state.exclusions.right * cellWidth;

    if (topHeight > 0) {
      createZone(0, 0, width, topHeight, 'Header exclusion');
    }
    if (bottomHeight > 0) {
      createZone(0, height - bottomHeight, width, bottomHeight, 'Footer exclusion');
    }
    if (leftWidth > 0) {
      const verticalStart = state.exclusions.top * cellHeight;
      const verticalHeight = height - (state.exclusions.top + state.exclusions.bottom) * cellHeight;
      createZone(0, Math.max(0, verticalStart), leftWidth, Math.max(0, verticalHeight), 'Left exclusion');
    }
    if (rightWidth > 0) {
      const verticalStart = state.exclusions.top * cellHeight;
      const verticalHeight = height - (state.exclusions.top + state.exclusions.bottom) * cellHeight;
      createZone(width - rightWidth, Math.max(0, verticalStart), rightWidth, Math.max(0, verticalHeight), 'Right exclusion');
    }
    
    console.log('[renderGuides] Render complete', {
      linesAdded,
      childrenCount: guideLayer.children.length,
      finalInnerHTML: guideLayer.innerHTML.substring(0, 200) + (guideLayer.innerHTML.length > 200 ? '...' : '')
    });
  } catch (error) {
    console.error('[renderGuides] Error rendering guides:', error, error.stack);
    if (guideLayer) {
      guideLayer.innerHTML = '';
    }
  }
}

function renderExclusionZones(cellWidth, cellHeight, width, height, guideLayer) {
  const createZone = (x, y, w, h, label) => {
    if (w <= 0 || h <= 0) return;
    const zone = document.createElement('div');
    zone.className = 'exclusion-zone';
    zone.style.left = `${x}px`;
    zone.style.top = `${y}px`;
    zone.style.width = `${w}px`;
    zone.style.height = `${h}px`;
    zone.textContent = label;
    guideLayer.appendChild(zone);
  };

  const topHeight = state.exclusions.top * cellHeight;
  const bottomHeight = state.exclusions.bottom * cellHeight;
  const leftWidth = state.exclusions.left * cellWidth;
  const rightWidth = state.exclusions.right * cellWidth;

  if (topHeight > 0) {
    createZone(0, 0, width, topHeight, 'Header exclusion');
  }
  if (bottomHeight > 0) {
    createZone(0, height - bottomHeight, width, bottomHeight, 'Footer exclusion');
  }
  if (leftWidth > 0) {
    const verticalStart = state.exclusions.top * cellHeight;
    const verticalHeight = height - (state.exclusions.top + state.exclusions.bottom) * cellHeight;
    createZone(0, Math.max(0, verticalStart), leftWidth, Math.max(0, verticalHeight), 'Left exclusion');
  }
  if (rightWidth > 0) {
    const verticalStart = state.exclusions.top * cellHeight;
    const verticalHeight = height - (state.exclusions.top + state.exclusions.bottom) * cellHeight;
    createZone(width - rightWidth, Math.max(0, verticalStart), rightWidth, Math.max(0, verticalHeight), 'Right exclusion');
  }
  
  console.log('[renderGuides] Render complete', {
    linesAdded,
    childrenCount: guideLayer.children.length,
    finalInnerHTML: guideLayer.innerHTML.substring(0, 200) + (guideLayer.innerHTML.length > 200 ? '...' : '')
  });
}
