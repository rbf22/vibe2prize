export function getCellDimensions(previewGrid, columns, rows) {
  const rect = previewGrid.getBoundingClientRect();
  return {
    cellWidth: rect.width / columns,
    cellHeight: rect.height / rows
  };
}

export function gridToPixels(gridX, gridY, cellWidth, cellHeight) {
  return {
    x: gridX * cellWidth,
    y: gridY * cellHeight
  };
}

export function pixelsToGrid(x, y, cellWidth, cellHeight) {
  return {
    gridX: Math.floor(x / cellWidth),
    gridY: Math.floor(y / cellHeight)
  };
}

export function snapToGrid(value, cellSize) {
  return Math.round(value / cellSize) * cellSize;
}

export function validateGridPosition(gridX, gridY, gridWidth, gridHeight, maxColumns, maxRows) {
  return (
    gridX >= 0 &&
    gridY >= 0 &&
    gridX + gridWidth <= maxColumns &&
    gridY + gridHeight <= maxRows &&
    gridWidth > 0 &&
    gridHeight > 0
  );
}

export function calculateGridBounds(x, y, width, height, cellWidth, cellHeight) {
  const gridX1 = Math.floor(x / cellWidth);
  const gridY1 = Math.floor(y / cellHeight);
  const gridX2 = Math.ceil((x + width) / cellWidth);
  const gridY2 = Math.ceil((y + height) / cellHeight);
  
  return {
    gridX: gridX1,
    gridY: gridY1,
    gridWidth: gridX2 - gridX1,
    gridHeight: gridY2 - gridY1
  };
}
