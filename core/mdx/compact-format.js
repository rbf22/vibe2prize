/**
 * Compact MDX Format Utilities
 * 
 * Transforms between verbose and compact MDX formats to reduce verbosity
 * while maintaining compatibility and improving LLM comprehension.
 */

/**
 * Parse compact grid notation "x,y,widthxheight" into grid object
 */
export function parseCompactGrid(gridStr) {
  if (!gridStr || typeof gridStr !== 'string') {
    return null;
  }
  
  // Handle "x,y,widthxheight" format
  const match = gridStr.match(/^(\d+),(\d+),(\d+)x(\d+)$/);
  if (!match) {
    return null;
  }
  
  return {
    x: parseInt(match[1], 10),
    y: parseInt(match[2], 10),
    width: parseInt(match[3], 10),
    height: parseInt(match[4], 10)
  };
}

/**
 * Convert grid object to compact notation
 */
export function toCompactGrid(grid) {
  if (!grid || typeof grid !== 'object') {
    return null;
  }
  
  return `${grid.x},${grid.y},${grid.width}x${grid.height}`;
}

/**
 * Parse compact settings object
 * Expands shorthand notations
 */
export function parseCompactSettings(settings) {
  if (!settings) return {};
  
  const parsed = {};
  
  // Handle canvas shorthand "1920x1080"
  if (settings.canvas) {
    const [width, height] = settings.canvas.split('x').map(Number);
    parsed.canvasWidth = width;
    parsed.canvasHeight = height;
  }
  
  // Handle grid shorthand "80x45"
  if (settings.grid) {
    const [columns, rows] = settings.grid.split('x').map(Number);
    parsed.columns = columns;
    parsed.rows = rows;
  }
  
  // Copy other properties
  if (settings.gap) parsed.gap = settings.gap;
  if (settings.columnSize) parsed.columnSize = settings.columnSize;
  if (settings.rowSize) parsed.rowSize = settings.rowSize;
  
  return parsed;
}

/**
 * Convert settings to compact format
 */
export function toCompactSettings(settings) {
  if (!settings) return {};
  
  const compact = {};
  
  if (settings.canvasWidth && settings.canvasHeight) {
    compact.canvas = `${settings.canvasWidth}x${settings.canvasHeight}`;
  }
  
  if (settings.columns && settings.rows) {
    compact.grid = `${settings.columns}x${settings.rows}`;
  }
  
  if (settings.gap) compact.gap = settings.gap;
  if (settings.columnSize) compact.columnSize = settings.columnSize;
  if (settings.rowSize) compact.rowSize = settings.rowSize;
  
  return compact;
}

/**
 * Parse compact exclusions "top,bottom,left,right"
 */
export function parseCompactExclusions(exclusions) {
  if (!exclusions) return {};
  
  if (typeof exclusions === 'string') {
    const [top, bottom, left, right] = exclusions.split(',').map(Number);
    return { top, bottom, left, right };
  }
  
  return exclusions;
}

/**
 * Convert exclusions to compact format
 */
export function toCompactExclusions(exclusions) {
  if (!exclusions || typeof exclusions !== 'object') {
    return exclusions;
  }
  
  return `${exclusions.top},${exclusions.bottom},${exclusions.left},${exclusions.right}`;
}

/**
 * Parse compact brand "id variant"
 */
export function parseCompactBrand(brand) {
  if (!brand) return {};
  
  if (typeof brand === 'string') {
    const [id, variant] = brand.split(' ');
    return { id, variant: variant || 'light' };
  }
  
  return brand;
}

/**
 * Convert brand to compact format
 */
export function toCompactBrand(brand) {
  if (!brand || typeof brand !== 'object') {
    return brand;
  }
  
  return brand.variant ? `${brand.id} ${brand.variant}` : brand.id;
}

/**
 * Parse compact shape string "id kind x,y,widthxheight"
 */
export function parseCompactShape(shapeStr) {
  if (!shapeStr || typeof shapeStr !== 'string') {
    return null;
  }
  
  const parts = shapeStr.split(' ');
  if (parts.length < 3) return null;
  
  const [id, kind, gridStr, ...styleParts] = parts;
  const grid = parseCompactGrid(gridStr);
  
  if (!grid) return null;
  
  const shape = { id, kind, coords: grid };
  
  // Parse additional style properties
  styleParts.forEach(part => {
    if (part.includes(':')) {
      const [key, value] = part.split(':');
      shape[key] = value;
    }
  });
  
  return shape;
}

/**
 * Convert shape to compact format
 */
export function toCompactShape(shape) {
  if (!shape || typeof shape !== 'object') {
    return null;
  }
  
  let compact = `${shape.id} ${shape.kind} ${toCompactGrid(shape.coords)}`;
  
  // Add style properties
  const styleProps = ['opacity', 'blendMode', 'fill', 'filter', 'rotate'];
  styleProps.forEach(prop => {
    if (shape[prop] !== undefined) {
      compact += ` ${prop}:${shape[prop]}`;
    }
  });
  
  return compact;
}

/**
 * Transform compact region to verbose format
 */
export function expandCompactRegion(compactRegion) {
  if (!compactRegion || typeof compactRegion !== 'object') {
    return compactRegion;
  }
  
  const region = { ...compactRegion };
  
  // Parse compact grid
  if (typeof region.grid === 'string') {
    region.grid = parseCompactGrid(region.grid);
  }
  
  // Expand field names
  if (region.hint !== undefined) {
    region.llmHint = region.hint;
    delete region.hint;
  }
  
  if (region.req !== undefined) {
    region.required = region.req;
    delete region.req;
  }
  
  if (region.type !== undefined) {
    region.inputType = region.type;
    delete region.type;
  }
  
  // Set defaults
  if (region.required === undefined) {
    region.required = false;
  }
  
  // Default area to id if not specified
  if (!region.area && region.id) {
    region.area = region.id;
  }
  
  // Infer inputType from role if not specified
  if (!region.inputType && region.role) {
    if (region.role === 'logo') {
      region.inputType = 'image';
    } else if (region.role === 'data-table') {
      region.inputType = 'table';
    } else {
      region.inputType = 'text';
    }
  }
  
  // Add fieldTypes array for compatibility
  if (region.role && !region.fieldTypes) {
    region.fieldTypes = [region.role];
  }
  
  return region;
}

/**
 * Transform verbose region to compact format
 */
export function compactRegion(verboseRegion) {
  if (!verboseRegion || typeof verboseRegion !== 'object') {
    return verboseRegion;
  }
  
  const compact = { ...verboseRegion };
  
  // Convert grid to compact notation
  if (compact.grid && typeof compact.grid === 'object') {
    compact.grid = toCompactGrid(compact.grid);
  }
  
  // Shorten field names
  if (compact.llmHint !== undefined) {
    compact.hint = compact.llmHint;
    delete compact.llmHint;
  }
  
  if (compact.required !== undefined) {
    compact.req = compact.required;
    delete compact.required;
  }
  
  if (compact.inputType !== undefined) {
    compact.type = compact.inputType;
    delete compact.inputType;
  }
  
  // Remove redundant fields
  delete compact.fieldTypes;
  
  // Remove area if it matches id
  if (compact.area === compact.id) {
    delete compact.area;
  }
  
  // Remove default values
  if (compact.required === false) {
    delete compact.req;
  }
  
  return compact;
}

/**
 * Transform entire frontmatter from compact to verbose format
 */
export function expandCompactFrontmatter(frontmatter) {
  if (!frontmatter || typeof frontmatter !== 'object') {
    return frontmatter;
  }
  
  const expanded = { ...frontmatter };
  
  // Transform settings
  if (expanded.settings) {
    expanded.templateSettings = parseCompactSettings(expanded.settings);
    delete expanded.settings;
  }
  
  // Transform exclusions
  if (typeof expanded.exclusions === 'string') {
    expanded.exclusions = parseCompactExclusions(expanded.exclusions);
  }
  
  // Transform brand
  if (typeof expanded.brand === 'string') {
    expanded.brand = parseCompactBrand(expanded.brand);
  }
  
  // Transform shapes
  if (expanded.shapes && Array.isArray(expanded.shapes)) {
    expanded.backgroundShapes = expanded.shapes.map(parseCompactShape).filter(Boolean);
    delete expanded.shapes;
  }
  
  // Transform regions
  if (expanded.regions && Array.isArray(expanded.regions)) {
    expanded.regions = expanded.regions.map(expandCompactRegion);
  }
  
  // Generate layout.components from regions
  if (expanded.regions && !expanded.layout) {
    expanded.layout = {
      type: "grid-designer",
      template: expanded.title || "Untitled Template",
      components: expanded.regions.map(region => ({
        type: "GridArea",
        ...region
      }))
    };
  }
  
  return expanded;
}

/**
 * Transform entire frontmatter from verbose to compact format
 */
export function toCompactFrontmatter(frontmatter) {
  if (!frontmatter || typeof frontmatter !== 'object') {
    return frontmatter;
  }
  
  const compact = { ...frontmatter };
  
  // Transform settings
  if (compact.templateSettings) {
    compact.settings = toCompactSettings(compact.templateSettings);
    delete compact.templateSettings;
  }
  
  // Transform exclusions
  if (compact.exclusions && typeof compact.exclusions === 'object') {
    compact.exclusions = toCompactExclusions(compact.exclusions);
  }
  
  // Transform brand
  if (compact.brand && typeof compact.brand === 'object') {
    compact.brand = toCompactBrand(compact.brand);
  }
  
  // Transform shapes
  if (compact.backgroundShapes && Array.isArray(compact.backgroundShapes)) {
    compact.shapes = compact.backgroundShapes.map(toCompactShape).filter(Boolean);
    delete compact.backgroundShapes;
  }
  
  // Transform regions
  if (compact.regions && Array.isArray(compact.regions)) {
    compact.regions = compact.regions.map(compactRegion);
  }
  
  // Remove layout.components (redundant)
  if (compact.layout && compact.layout.components) {
    // Keep layout metadata but remove components
    const { components, ...layoutMeta } = compact.layout;
    compact.layout = layoutMeta;
  }
  
  return compact;
}
