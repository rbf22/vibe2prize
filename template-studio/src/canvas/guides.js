import { state } from '../state.js';

export function renderGuides(guideLayer, previewGrid) {
  console.log('renderGuides called', { guideLayer: !!guideLayer, previewGrid: !!previewGrid });
  console.log('Current guide settings:', JSON.stringify(state.guideSettings, null, 2));
  
  if (!guideLayer || !previewGrid) return;
  const rect = previewGrid.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  console.log('Guide dimensions:', { width, height });
  
  if (!width || !height) {
    guideLayer.innerHTML = '';
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
    if (orientation === 'vertical') {
      line.style.left = `${position}px`;
    } else {
      line.style.top = `${position}px`;
    }
    guideLayer.appendChild(line);
    linesAdded += 1;
    console.log('Guide line created:', orientation, 'at position:', position, 'with class:', line.className);

    if (label) {
      const labelEl = document.createElement('div');
      labelEl.className = `guide-label${orientation === 'horizontal' ? ' horizontal' : ''}`;
      if (orientation === 'vertical') {
        labelEl.style.left = `${position}px`;
        labelEl.style.top = '12px';
      } else {
        labelEl.style.left = '12px';
        labelEl.style.top = `${position}px`;
      }
      labelEl.textContent = label;
      guideLayer.appendChild(labelEl);
    }
  };

  const canDrawHorizontalGuides = verticalSpan > 0;
  const canDrawVerticalGuides = horizontalSpan > 0;

  if (state.guideSettings.center) {
    if (canDrawVerticalGuides) {
      addGuideLine('vertical', 0.5, { label: 'Center', start: horizontalStart, span: horizontalSpan, center: true, accent: false });
    }
    if (canDrawHorizontalGuides) {
      addGuideLine('horizontal', 0.5, { label: 'Center', start: verticalStart, span: verticalSpan, center: true, accent: false });
    }
  }

  const fractionSets = {
    halves: [0.5],
    thirds: [1 / 3, 2 / 3],
    quarters: [0.25, 0.5, 0.75],
    sixths: [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6],
    eighths: [1 / 8, 2 / 8, 3 / 8, 4 / 8, 5 / 8, 6 / 8, 7 / 8]
  };

  Object.entries(fractionSets).forEach(([key, fractions]) => {
    if (!state.guideSettings[key]) return;
    fractions.forEach((fraction) => {
      const skipCenter = fraction === 0.5 && state.guideSettings.center;
      if (skipCenter) return;
      if (canDrawVerticalGuides) {
        addGuideLine('vertical', fraction, { start: horizontalStart, span: horizontalSpan });
      }
      if (canDrawHorizontalGuides) {
        addGuideLine('horizontal', fraction, { start: verticalStart, span: verticalSpan });
      }
    });
  });

  renderExclusionZones(cellWidth, cellHeight, width, height, guideLayer);

  if (state.guideSettings.margin && state.columns > 2 && state.rows > 2) {
    const marginOutline = document.createElement('div');
    marginOutline.className = 'margin-outline';
    const offsetX = cellWidth;
    const offsetY = cellHeight;
    const marginWidth = width - offsetX * 2;
    const marginHeight = height - offsetY * 2;
    if (marginWidth > 0 && marginHeight > 0) {
      marginOutline.style.left = `${offsetX}px`;
      marginOutline.style.top = `${offsetY}px`;
      marginOutline.style.width = `${marginWidth}px`;
      marginOutline.style.height = `${marginHeight}px`;
      guideLayer.appendChild(marginOutline);
    }
  }

  console.log('Guide render complete. Lines added:', linesAdded, 'children now:', guideLayer.children.length);
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
}
