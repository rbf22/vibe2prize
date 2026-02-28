function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function resolveGridValue(region, key, fallback = 0) {
  if (!region) {
    return fallback;
  }
  if (region[key] !== undefined) {
    return toNumber(region[key], fallback);
  }
  if (region.grid && region.grid[key] !== undefined) {
    return toNumber(region.grid[key], fallback);
  }
  return fallback;
}

export function computeRegionGeometry({
  box,
  columns = 1,
  rows = 1,
  boardWidth = 0,
  boardHeight = 0
} = {}) {
  const region = box || {};
  const safeColumns = Math.max(toNumber(columns, 1), 1);
  const safeRows = Math.max(toNumber(rows, 1), 1);
  const unitWidth = safeColumns ? boardWidth / safeColumns : 0;
  const unitHeight = safeRows ? boardHeight / safeRows : 0;

  const gridWidth = Math.max(resolveGridValue(region, 'gridWidth', 1), 1);
  const gridHeight = Math.max(resolveGridValue(region, 'gridHeight', 1), 1);
  const gridX = Math.max(resolveGridValue(region, 'gridX', resolveGridValue(region, 'x', 0)), 0);
  const gridY = Math.max(resolveGridValue(region, 'gridY', resolveGridValue(region, 'y', 0)), 0);

  const widthPx = gridWidth * unitWidth;
  const heightPx = gridHeight * unitHeight;
  const left = gridX * unitWidth;
  const top = gridY * unitHeight;

  const verticalPadding = Math.min(heightPx * 0.25, 18);
  const horizontalPadding = Math.min(widthPx * 0.08, 24);

  const width = Math.max(widthPx, 0);
  const height = Math.max(heightPx, 0);
  const innerWidth = Math.max(width - horizontalPadding * 2, width * 0.5);
  const innerHeight = Math.max(height - verticalPadding * 2, height * 0.35);

  return {
    left,
    top,
    width,
    height,
    padding: {
      vertical: verticalPadding,
      horizontal: horizontalPadding
    },
    innerWidth,
    innerHeight,
    unitWidth,
    unitHeight
  };
}
