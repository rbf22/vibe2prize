import { state } from '../state.js';
import { startResize, startDrag } from './interactions.js';

function getAreaName(box) {
  if (!box) return null;
  const explicitName = typeof box.name === 'string' ? box.name.trim() : '';
  if (explicitName) return explicitName;
  const fallbackId = typeof box.id === 'string' ? box.id.trim() : '';
  return fallbackId || null;
}

export function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

export function boxesToAreaMatrix() {
  const matrix = Array.from({ length: state.rows }, () => Array(state.columns).fill('.'));
  
  state.boxes.forEach(box => {
    const areaName = getAreaName(box);
    if (!areaName) {
      return;
    }
    for (let r = box.gridY; r < Math.min(box.gridY + box.gridHeight, state.rows); r++) {
      for (let c = box.gridX; c < Math.min(box.gridX + box.gridWidth, state.columns); c++) {
        matrix[r][c] = areaName;
      }
    }
  });
  
  return matrix;
}

export function renderPreview(previewGrid, renderGuides) {
  if (!previewGrid) {
    return;
  }
  
  const { columns, rows, columnSize, rowSize, gap } = state;
  const grid = previewGrid;
  
  // Get actual container dimensions
  const containerRect = grid.getBoundingClientRect();
  if (!containerRect) {
    return;
  }
  
  const containerWidth = containerRect.width;
  const containerHeight = containerRect.height;
  
  if (containerWidth <= 0 || containerHeight <= 0) {
    return;
  }
  
  // Calculate cell size to exactly fill container
  const cellPixelSizeX = containerWidth / columns;
  const cellPixelSizeY = containerHeight / rows;
  
  // Use calculated cell sizes for exact fill
  grid.style.gridTemplateColumns = `repeat(${columns}, ${cellPixelSizeX}px)`;
  grid.style.gridTemplateRows = `repeat(${rows}, ${cellPixelSizeY}px)`;
  grid.style.gap = '0px'; // No gap for exact alignment
  
  // Set CSS variables for grid background to match actual cell size
  grid.style.setProperty('--cell-width', `${cellPixelSizeX}px`);
  grid.style.setProperty('--cell-height', `${cellPixelSizeY}px`);
  
  const areas = boxesToAreaMatrix();
  const templateAreas = areas.map((row) => `"${row.join(' ')}"`).join(' ');
  grid.style.gridTemplateAreas = templateAreas;
  grid.innerHTML = '';

  const areaEntries = state.boxes
    .map(box => ({ box, areaName: getAreaName(box) }))
    .filter(entry => entry.areaName);

  const uniqueAreas = [...new Set(areaEntries.map(entry => entry.areaName))];
  uniqueAreas.forEach((name) => {
    const block = document.createElement('div');
    block.className = 'grid-block';
    block.style.background = hashColor(name);
    block.style.gridArea = name;
    
    // Add responsive classes based on box dimensions
    const entry = areaEntries.find(e => e.areaName === name);
    const box = entry?.box;
    if (box) {
      if (box.id === state.selectedBoxId) {
        block.classList.add('selected');
      }
      // Add classes for thin regions
      if (box.gridHeight === 1 && box.gridWidth > 1) {
        block.classList.add('thin-horizontal');
      } else if (box.gridWidth === 1 && box.gridHeight > 1) {
        block.classList.add('thin-vertical');
      } else if (box.gridWidth === 1 && box.gridHeight === 1) {
        block.classList.add('very-small');
      }
      
      // Truncate long names for small regions
      let displayName = name;
      if ((box.gridWidth === 1 || box.gridHeight === 1) && name.length > 8) {
        displayName = name.substring(0, 6) + '...';
      } else if (box.gridWidth === 1 && box.gridHeight === 1 && name.length > 4) {
        displayName = name.substring(0, 3) + '...';
      }
      
      // Create the label
      const label = document.createElement('div');
      label.className = 'region-label';
      label.textContent = displayName;
      block.appendChild(label);
      
      // Add mouse event listener for selection, drag, and resize
      block.addEventListener('mousedown', (e) => {
        // Handle resize handles
        if (e.target.classList.contains('resize-handle')) {
          e.stopPropagation();
          startResize(e, box, e.target.dataset.position);
          return;
        }
        
        // Select this box
        state.selectedBoxId = box.id;
        
        // Start dragging if this is the selected box
        if (state.selectedBoxId === box.id) {
          startDrag(e, box);
        }
        
        // Re-render to show selection
        renderPreview(previewGrid, renderGuides);
        e.stopPropagation();
      });
    }
    
    // Add resize handles
    const handles = ['nw', 'ne', 'sw', 'se'];
    handles.forEach(position => {
      const handle = document.createElement('div');
      handle.className = `resize-handle ${position}`;
      handle.dataset.position = position;
      
      // Add resize event handler
      handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        startResize(e, box, position);
      });
      
      block.appendChild(handle);
    });
    
    grid.appendChild(block);
  });

  // Draw preview box while dragging
  if (state.isDrawing && state.dragStart) {
    const startGridX = state.dragStart.startGridX;
    const startGridY = state.dragStart.startGridY;
    const currentGridX = state.dragStart.currentGridX;
    const currentGridY = state.dragStart.currentGridY;
    
    // Calculate grid dimensions
    const gridX = Math.min(startGridX, currentGridX);
    const gridY = Math.min(startGridY, currentGridY);
    const gridWidth = Math.abs(currentGridX - startGridX) + 1;
    const gridHeight = Math.abs(currentGridY - startGridY) + 1;
    
    // Convert to pixels for display
    const pixelX = gridX * cellPixelSizeX;
    const pixelY = gridY * cellPixelSizeY;
    const pixelWidth = gridWidth * cellPixelSizeX;
    const pixelHeight = gridHeight * cellPixelSizeY;
    
    const previewBox = document.createElement('div');
    previewBox.style.position = 'absolute';
    previewBox.style.left = `${pixelX}px`;
    previewBox.style.top = `${pixelY}px`;
    previewBox.style.width = `${pixelWidth}px`;
    previewBox.style.height = `${pixelHeight}px`;
    previewBox.style.border = '2px dashed var(--primary)';
    previewBox.style.background = 'rgba(129, 240, 200, 0.2)';
    previewBox.style.pointerEvents = 'none';
    previewBox.style.borderRadius = '0';
    previewBox.style.zIndex = '1000';
    grid.appendChild(previewBox);
  }
}
