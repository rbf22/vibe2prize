import { state, pushHistory, captureHistoryForInteraction, resetInteractionHistory } from '../state.js';

export const DRAW_DRAG_THRESHOLD = 6; // pixels

// Interaction state
let isDragging = false;
let isResizing = false;
let draggedBox = null;
let resizeHandle = null;
let dragOffset = { x: 0, y: 0 };
let originalBoxState = null;

export function isEditableTarget(event) {
  const target = event.target;
  if (!target) return false;
  const tagName = target.tagName ? target.tagName.toLowerCase() : '';
  return (
    target.isContentEditable ||
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select'
  );
}

export function hasOverlap(testBox, excludeId = null) {
  for (const box of state.boxes) {
    if (excludeId && box.id === excludeId) continue;
    
    if (!(testBox.gridX + testBox.gridWidth <= box.gridX || 
          testBox.gridX >= box.gridX + box.gridWidth ||
          testBox.gridY + testBox.gridHeight <= box.gridY || 
          testBox.gridY >= box.gridY + box.gridHeight)) {
      return true;
    }
  }
  return false;
}

export function createBox(x, y, width, height, name = null, previewGrid) {
  // Use the same cell size calculation as renderPreview for consistency
  const rect = previewGrid.getBoundingClientRect();
  const cellWidth = rect.width / state.columns;
  const cellHeight = rect.height / state.rows;
  
  const gridX1 = Math.floor(x / cellWidth);
  const gridY1 = Math.floor(y / cellHeight);
  const gridX2 = Math.ceil((x + width) / cellWidth);
  const gridY2 = Math.ceil((y + height) / cellHeight);
  
  // Check for overlaps with existing boxes
  for (const box of state.boxes) {
    if (!(gridX2 <= box.gridX || gridX1 >= box.gridX + box.gridWidth ||
          gridY2 <= box.gridY || gridY1 >= box.gridY + box.gridHeight)) {
      // Overlap detected; log a non-blocking warning and skip creation
      console.warn('Regions cannot overlap. Please draw in an empty area.');
      return null;
    }
  }
  
  pushHistory();

  const id = `box-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const box = {
    id,
    name: name || `region-${state.boxes.length + 1}`,
    gridX: gridX1,
    gridY: gridY1,
    gridWidth: gridX2 - gridX1,
    gridHeight: gridY2 - gridY1,
    metadata: {
      required: false,
      inputType: 'any',
      fieldTypes: [],
      llmHint: '',
      type: ''
    }
  };
  state.boxes.push(box);
  state.metadata[id] = box.metadata;
  state._boxesInitialized = true;
  
  return box;
}

export function deleteBox(id) {
  state.boxes = state.boxes.filter(box => box.id !== id);
  delete state.metadata[id];
  state._boxesInitialized = true;
  if (state.selectedBoxId === id) {
    state.selectedBoxId = null;
  }
}

export function deleteSelectedRegion() {
  if (!state.selectedBoxId) return;
  pushHistory();
  deleteBox(state.selectedBoxId);
  state.selectedBoxId = null;
}

export function getBoxAtGrid(gridX, gridY) {
  for (const box of state.boxes) {
    if (gridX >= box.gridX && gridX < box.gridX + box.gridWidth &&
        gridY >= box.gridY && gridY < box.gridY + box.gridHeight) {
      return box;
    }
  }
  return null;
}

export function createBoxFromGrid(gridX, gridY, gridWidth, gridHeight, name = null) {
  // Basic validation - only reject clearly invalid values or out-of-bounds requests
  const exceedsColumns = gridX + gridWidth > state.columns;
  const exceedsRows = gridY + gridHeight > state.rows;
  if (gridX < 0 || gridY < 0 || gridWidth <= 0 || gridHeight <= 0 || exceedsColumns || exceedsRows) {
    return null;
  }
  
  // Check for overlaps with existing boxes
  for (const box of state.boxes) {
    if (!(gridX + gridWidth <= box.gridX || gridX >= box.gridX + box.gridWidth ||
          gridY + gridHeight <= box.gridY || gridY >= box.gridY + box.gridHeight)) {
      console.warn('Regions cannot overlap. Please draw in an empty area.');
      return null;
    }
  }
  
  pushHistory();

  const id = `box-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const box = {
    id: id,
    name: name || `region-${state.boxes.length + 1}`,
    gridX: gridX,
    gridY: gridY,
    gridWidth: gridWidth,
    gridHeight: gridHeight,
    metadata: {
      required: false,
      inputType: 'any',
      fieldTypes: [],
      llmHint: '',
      type: ''
    }
  };
  console.log(`createBoxFromGrid: grid(${gridX},${gridY}) size(${gridWidth}x${gridHeight}) id=${id}`);
  state.boxes.push(box);
  state.metadata[id] = box.metadata;
  state._boxesInitialized = true;
  
  return box;
}

export function startDrag(e, box) {
  isDragging = true;
  draggedBox = box;
  const rect = previewGrid.getBoundingClientRect();
  const cellWidth = rect.width / state.columns;
  const cellHeight = rect.height / state.rows;
  dragOffset = {
    x: e.clientX - rect.left - box.gridX * cellWidth,
    y: e.clientY - rect.top - box.gridY * cellHeight
  };
  originalBoxState = {
    gridX: box.gridX,
    gridY: box.gridY,
    gridWidth: box.gridWidth,
    gridHeight: box.gridHeight
  };
  captureHistoryForInteraction();
  e.preventDefault();
}

export function startResize(e, box, handle) {
  isResizing = true;
  draggedBox = box;
  resizeHandle = handle;
  originalBoxState = {
    gridX: box.gridX,
    gridY: box.gridY,
    gridWidth: box.gridWidth,
    gridHeight: box.gridHeight
  };
  captureHistoryForInteraction();
  e.preventDefault();
  e.stopPropagation();
}

export function handleMouseMove(e, previewGrid, renderPreview) {
  const clientX = e.clientX || (e.touches && e.touches[0].clientX);
  const clientY = e.clientY || (e.touches && e.touches[0].clientY);

  if (state.isDrawing && state.dragStart) {
    const rect = previewGrid.getBoundingClientRect();
    const cellPixelSizeX = rect.width / state.columns;
    const cellPixelSizeY = rect.height / state.rows;
    
    // Update grid coordinates directly
    const nextGridX = Math.floor((clientX - rect.left) / cellPixelSizeX);
    const nextGridY = Math.floor((clientY - rect.top) / cellPixelSizeY);
    state.dragStart.currentGridX = nextGridX;
    state.dragStart.currentGridY = nextGridY;

    const deltaX = Math.abs(clientX - state.dragStart.startClientX);
    const deltaY = Math.abs(clientY - state.dragStart.startClientY);
    const gridChanged =
      nextGridX !== state.dragStart.startGridX ||
      nextGridY !== state.dragStart.startGridY;
    if (!state.dragStart.hasMoved && (gridChanged || deltaX >= DRAW_DRAG_THRESHOLD || deltaY >= DRAW_DRAG_THRESHOLD)) {
      state.dragStart.hasMoved = true;
    }
    
    renderPreview();
  } else if (isDragging && draggedBox) {
    const rect = previewGrid.getBoundingClientRect();
    const cellPixelSizeX = rect.width / state.columns;
    const cellPixelSizeY = rect.height / state.rows;
    
    const newGridX = Math.floor((clientX - rect.left - dragOffset.x) / cellPixelSizeX);
    const newGridY = Math.floor((clientY - rect.top - dragOffset.y) / cellPixelSizeY);
    
    // Ensure box stays within bounds
    const boundedX = Math.max(0, Math.min(newGridX, state.columns - draggedBox.gridWidth));
    const boundedY = Math.max(0, Math.min(newGridY, state.rows - draggedBox.gridHeight));
    
    const testBox = {
      ...draggedBox,
      gridX: boundedX,
      gridY: boundedY
    };
    
    if (!hasOverlap(testBox, draggedBox.id)) {
      draggedBox.gridX = boundedX;
      draggedBox.gridY = boundedY;
      renderPreview();
    }
  } else if (isResizing && draggedBox) {
    const rect = previewGrid.getBoundingClientRect();
    const cellPixelSizeX = rect.width / state.columns;
    const cellPixelSizeY = rect.height / state.rows;
    
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    
    let newX = originalBoxState.gridX;
    let newY = originalBoxState.gridY;
    let newWidth = originalBoxState.gridWidth;
    let newHeight = originalBoxState.gridHeight;
    
    switch (resizeHandle) {
      case 'se':
        newWidth = Math.ceil(mouseX / cellPixelSizeX) - originalBoxState.gridX;
        newHeight = Math.ceil(mouseY / cellPixelSizeY) - originalBoxState.gridY;
        break;
      case 'ne':
        newWidth = Math.ceil(mouseX / cellPixelSizeX) - originalBoxState.gridX;
        newHeight = originalBoxState.gridHeight;
        newY = Math.floor(mouseY / cellPixelSizeY);
        newHeight = originalBoxState.gridY + originalBoxState.gridHeight - newY;
        break;
      case 'sw':
        newWidth = originalBoxState.gridWidth;
        newX = Math.floor(mouseX / cellPixelSizeX);
        newWidth = originalBoxState.gridX + originalBoxState.gridWidth - newX;
        newHeight = Math.ceil(mouseY / cellPixelSizeY) - originalBoxState.gridY;
        break;
      case 'nw':
        newX = Math.floor(mouseX / cellPixelSizeX);
        newY = Math.floor(mouseY / cellPixelSizeY);
        newWidth = originalBoxState.gridX + originalBoxState.gridWidth - newX;
        newHeight = originalBoxState.gridY + originalBoxState.gridHeight - newY;
        break;
    }
    
    // Ensure minimum size and positive dimensions
    if (newWidth >= 1 && newHeight >= 1 && newX >= 0 && newY >= 0 && 
        newX + newWidth <= state.columns && newY + newHeight <= state.rows) {
      
      const testBox = {
        ...draggedBox,
        gridX: newX,
        gridY: newY,
        gridWidth: newWidth,
        gridHeight: newHeight
      };
      
      if (!hasOverlap(testBox, draggedBox.id)) {
        draggedBox.gridX = newX;
        draggedBox.gridY = newY;
        draggedBox.gridWidth = newWidth;
        draggedBox.gridHeight = newHeight;
        renderPreview();
      }
    }
  }
}

export function handleMouseUp(e, previewGrid, renderPreview, renderRegionsTable, renderSnippet) {
  if (state.isDrawing && state.dragStart) {
    const dragSession = state.dragStart;
    const startGridX = dragSession.startGridX;
    const startGridY = dragSession.startGridY;
    const endGridX = dragSession.currentGridX;
    const endGridY = dragSession.currentGridY;
    const hasMoved = dragSession.hasMoved;

    const gridWidth = Math.abs(endGridX - startGridX) + 1;
    const gridHeight = Math.abs(endGridY - startGridY) + 1;

    // Reset drawing state BEFORE creating the box
    state.isDrawing = false;
    state.dragStart = null;
    previewGrid.classList.remove('drawing');
    resetInteractionHistory();

    if (!hasMoved) {
      renderPreview();
      return;
    }
    if (gridWidth >= 1 && gridHeight >= 1) {
      const gridX = Math.min(startGridX, endGridX);
      const gridY = Math.min(startGridY, endGridY);
      const box = createBoxFromGrid(gridX, gridY, gridWidth, gridHeight);
      if (box) {
        // Clear selection after creating the box
        state.selectedBoxId = null;
        renderRegionsTable();
        renderSnippet();
        // Trigger custom events for UI updates
        if (typeof document !== 'undefined') {
          document.dispatchEvent(new CustomEvent('regionAdded'));
          document.dispatchEvent(new CustomEvent('regionsTableChanged'));
          document.dispatchEvent(new CustomEvent('snippetChanged'));
        }
      }
    }

    // Render preview after all state is reset and box is created
    renderPreview();
  }
  
  // Always reset drag/resize states on mouse up
  if (isDragging || isResizing) {
    isDragging = false;
    isResizing = false;
    draggedBox = null;
    resizeHandle = null;
    originalBoxState = null;
    resetInteractionHistory();
    renderPreview();
    renderSnippet();
    // Trigger custom events for UI updates
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('regionsTableChanged'));
      document.dispatchEvent(new CustomEvent('snippetChanged'));
    }
  }
}
