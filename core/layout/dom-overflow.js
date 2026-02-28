// Shared DOM overflow detection for both Template Studio (browser) and linting (Node.js)

export const DEFAULT_DOM_OVERFLOW_BUFFER_PX = 2;

// For browser environment
export const SKIP_ROLES = new Set(['data-table', 'logo']);

// For linting environment (we check page-number)
export const SKIP_ROLES_LINT = new Set(['data-table', 'logo']);

export function shouldMeasureDomOverflow(role, inputType = 'text', isLinting = false) {
  const normalizedRole = (role || '').toString().toLowerCase();
  if ((inputType || '').toLowerCase() === 'image') {
    return false;
  }
  
  // In browser, use isImageRole from preview-content
  if (typeof window !== 'undefined') {
    // This will be replaced with actual import in Template Studio
    const isImageRole = window.__templateStudioUtils?.isImageRole || (() => false);
    if (isImageRole(normalizedRole)) {
      return false;
    }
  }
  
  const skipRoles = isLinting ? SKIP_ROLES_LINT : SKIP_ROLES;
  if (skipRoles.has(normalizedRole)) {
    return false;
  }
  return true;
}

export function measureDomOverflow(element, { bufferPx = DEFAULT_DOM_OVERFLOW_BUFFER_PX } = {}) {
  if (!element) {
    return null;
  }

  const clientHeight = Number(element.clientHeight ?? element?.getBoundingClientRect?.().height ?? 0);
  const scrollHeight = Number(element.scrollHeight ?? clientHeight);
  if (!Number.isFinite(clientHeight) || !Number.isFinite(scrollHeight)) {
    return null;
  }

  const overflowPx = Math.max(0, Math.round(scrollHeight - clientHeight - bufferPx));
  if (overflowPx <= 0) {
    return null;
  }

  return {
    overflowPx,
    scrollHeight,
    clientHeight,
    bufferPx
  };
}

function buildDomOverflowIssue({ descriptor, metrics, origin = 'preview-dom' }) {
  const area = descriptor.area || descriptor.id || 'region';
  const overflowPx = metrics.overflowPx;
  const capacityPx = metrics.clientHeight;
  return {
    type: 'visual',
    origin,
    area,
    boxId: descriptor.id,
    role: descriptor.role,
    metrics: {
      overflowPx,
      capacityPx,
      scrollHeight: metrics.scrollHeight,
      bufferPx: metrics.bufferPx,
      origin
    },
    message: origin === 'lint-dom' 
      ? `Region "${area}" visually overflows by ~${overflowPx}px. Trim the copy, decrease the typography, or give the region more rows/padding.`
      : `Region "${area}" visually overflows the live preview by ~${overflowPx}px. Trim the copy, decrease the typography, or give the region more rows/padding.`
  };
}

// Browser version - used by Template Studio
export function collectDomOverflowIssues({ board, descriptors = [], bufferPx = DEFAULT_DOM_OVERFLOW_BUFFER_PX } = {}) {
  if (!board || !descriptors.length) {
    return [];
  }

  const descriptorById = new Map();
  descriptors.forEach((descriptor) => {
    if (descriptor?.id) {
      descriptorById.set(descriptor.id, descriptor);
    }
  });

  if (!descriptorById.size) {
    return [];
  }

  const regions = board.querySelectorAll('.slide-preview-region');
  const issues = [];

  regions.forEach((region) => {
    const boxId = region.dataset.boxId;
    const descriptor = descriptorById.get(boxId);
    if (!descriptor) {
      return;
    }

    const inputType = region.dataset.inputType || descriptor.metadata?.inputType || 'text';
    if (!shouldMeasureDomOverflow(descriptor.role, inputType, false)) {
      return;
    }

    const metrics = measureDomOverflow(region, { bufferPx });
    if (!metrics) {
      return;
    }

    issues.push(buildDomOverflowIssue({ descriptor, metrics, origin: 'preview-dom' }));
  });

  return issues;
}

// Node.js version - used by linting
export async function collectDomOverflowIssuesNode({ regions, textByArea, templateSettings, brandSnapshot, bufferPx = DEFAULT_DOM_OVERFLOW_BUFFER_PX } = {}) {
  // Dynamic import for Node.js environment
  const { JSDOM } = await import('jsdom');
  
  // Validate inputs
  if (!Array.isArray(regions)) {
    console.warn('collectDomOverflowIssuesNode: regions must be an array');
    return [];
  }
  
  if (!regions.length) {
    return [];
  }

  const dom = createVirtualDOM({ regions, textByArea, templateSettings, brandSnapshot, JSDOM });
  
  // Force layout computation by accessing computed styles
  dom.window.getComputedStyle(dom.window.document.body);
  
  const issues = [];
  const layout = {
    canvasWidth: templateSettings?.canvasWidth || 1920,
    canvasHeight: templateSettings?.canvasHeight || 1080,
    columns: templateSettings?.columns || 80,
    rows: templateSettings?.rows || 45,
    gap: templateSettings?.gap || 8
  };
  
  const cellWidth = layout.canvasWidth / layout.columns;
  const cellHeight = layout.canvasHeight / layout.rows;

  regions.forEach(region => {
    if (!shouldMeasureDomOverflow(region.role, region.metadata?.inputType, true)) {
      return;
    }

    const regionEl = dom.window.document.querySelector(`[data-box-id="${region.id}"]`);
    if (!regionEl) {
      return;
    }

    // Try to get real measurements
    const offsetHeight = regionEl.offsetHeight;
    const scrollHeight = regionEl.scrollHeight;
    
    let metrics = null;
    
    // If jsdom didn't compute layout, fall back to calculation
    if (offsetHeight === 0 || scrollHeight === 0) {
      metrics = calculateTextOverflow({ region, textByArea, cellWidth, cellHeight, bufferPx });
    } else {
      metrics = measureDomOverflow(regionEl, { bufferPx });
    }
    
    if (!metrics) {
      return;
    }

    // Debug output for page-number region
    if (region.area === 'page-number') {
      console.log(`Page-number region debug:`);
      console.log(`  Text: "${textByArea.get(region.area) || textByArea.get(region.id) || ''}"`);
      console.log(`  Region dimensions: ${region.grid.width}x${region.grid.height} grid units`);
      console.log(`  Typography: font-size=${getRoleTypography(region.role).fontSize}px, line-height=${getRoleTypography(region.role).lineHeight}px`);
      console.log(`  Should measure: ${shouldMeasureDomOverflow(region.role, region.metadata?.inputType, true)}`);
      console.log(`  Metrics:`, metrics);
    }

    issues.push(buildDomOverflowIssue({ descriptor: region, metrics, origin: 'lint-dom' }));
  });

  return issues;
}

function calculateTextOverflow({ region, textByArea, cellWidth, cellHeight, bufferPx }) {
  const text = textByArea.get(region.area) || textByArea.get(region.id) || '';
  if (!text) return null;
  
  // Validate inputs
  if (!region?.grid?.width || !region?.grid?.height) {
    console.warn(`Invalid grid dimensions for region ${region.area || region.id}`);
    return null;
  }
  
  if (!cellWidth || !cellHeight || !Number.isFinite(cellWidth) || !Number.isFinite(cellHeight)) {
    console.warn(`Invalid cell dimensions: ${cellWidth}x${cellHeight}`);
    return null;
  }
  
  // Get typography based on role
  const typography = getRoleTypography(region.role);
  if (!typography) {
    console.warn(`No typography found for role: ${region.role}`);
    return null;
  }
  
  // Calculate region dimensions
  const regionWidth = region.grid.width * cellWidth;
  const regionHeight = region.grid.height * cellHeight;
  
  // Validate calculated dimensions
  if (regionWidth <= 0 || regionHeight <= 0) {
    console.warn(`Invalid region dimensions: ${regionWidth}x${regionHeight}`);
    return null;
  }
  
  // For page-number, use more accurate padding based on actual CSS
  let verticalPadding, horizontalPadding;
  if (region.role === 'page-number') {
    // Page-number uses the base region padding plus additional constraints
    // Base padding: 0.7rem = 11.2px vertical, 0.85rem = 13.6px horizontal
    // Plus border: 1px each side = 2px total
    // Plus potential gap: 0.35rem = 5.6px
    verticalPadding = 11.2 + 2; // Padding + border
    horizontalPadding = 13.6 + 2; // Padding + border
  } else {
    // Estimate padding (same as CSS - 0.7rem = 11.2px vertical, 0.85rem = 13.6px horizontal)
    verticalPadding = 11.2; // Fixed padding in px
    horizontalPadding = 13.6; // Fixed padding in px
  }
  
  const innerWidth = Math.max(regionWidth - horizontalPadding * 2, regionWidth * 0.5);
  const innerHeight = Math.max(regionHeight - verticalPadding * 2, regionHeight * 0.35);
  
  // Estimate characters per line - account for letter-spacing and text-transform
  const letterSpacingPx = typography.letterSpacing ? typography.letterSpacing * typography.fontSize : 0;
  const isUppercase = ['footer', 'section-title'].includes(region.role);
  
  // Validate typography values
  if (!typography.fontSize || typography.fontSize <= 0) {
    console.warn(`Invalid font size: ${typography.fontSize}`);
    return null;
  }
  
  const effectiveCharWidth = typography.averageCharWidth * typography.fontSize + letterSpacingPx;
  
  // Validate effective character width
  if (!Number.isFinite(effectiveCharWidth) || effectiveCharWidth <= 0) {
    console.warn(`Invalid effective character width: ${effectiveCharWidth}`);
    return null;
  }
  const uppercaseMultiplier = isUppercase ? 1.1 : 1.0; // Uppercase text is ~10% wider
  const avgCharWidth = (typography.fontSize * 0.55 + letterSpacingPx) * uppercaseMultiplier;
  
  // Validate average character width
  if (!Number.isFinite(avgCharWidth) || avgCharWidth <= 0) {
    console.warn(`Invalid average character width: ${avgCharWidth}`);
    return null;
  }
  
  const charsPerLine = Math.max(10, Math.floor(innerWidth / avgCharWidth));
  
  // Calculate lines needed
  const words = text.split(' ');
  let lines = 1;
  let currentLineLength = 0;
  
  for (const word of words) {
    if (currentLineLength === 0) {
      currentLineLength = word.length;
    } else if (currentLineLength + 1 + word.length <= charsPerLine) {
      currentLineLength += 1 + word.length; // +1 for space
    } else {
      lines++;
      currentLineLength = word.length;
    }
  }
  
  // Calculate required height
  const requiredHeight = lines * typography.lineHeight;
  
  // Validate calculated height
  if (!Number.isFinite(requiredHeight) || requiredHeight <= 0) {
    console.warn(`Invalid required height: ${requiredHeight}`);
    return null;
  }
  
  const overflowPx = Math.max(0, Math.ceil(requiredHeight - innerHeight));
  
  if (overflowPx <= bufferPx) {
    return null;
  }
  
  return {
    overflowPx,
    scrollHeight: Math.ceil(requiredHeight),
    clientHeight: Math.ceil(innerHeight),
    bufferPx
  };
}

function getRoleTypography(role) {
  const typographyMap = {
    'primary-title': { fontSize: 25.6, lineHeight: 29.44, letterSpacing: -0.01, averageCharWidth: 0.55 }, // 1.6rem, 1.15 * 25.6, -0.01em
    'secondary-title': { fontSize: 16.8, lineHeight: 21.84, letterSpacing: 0, averageCharWidth: 0.55 }, // 1.05rem, 1.3 * 16.8
    'section-title': { fontSize: 16, lineHeight: 19.2, letterSpacing: 0.08, averageCharWidth: 0.55 }, // 1rem, 1.2 * 16, 0.08em
    'supporting-text': { fontSize: 14.72, lineHeight: 19.87, letterSpacing: 0, averageCharWidth: 0.55 }, // 0.92rem, 1.35 * 14.72
    'context-info': { fontSize: 14.72, lineHeight: 19.87, letterSpacing: 0, averageCharWidth: 0.55 }, // Same as supporting-text
    'criteria-list': { fontSize: 14.4, lineHeight: 18.72, letterSpacing: 0, averageCharWidth: 0.55 }, // 0.9rem, 1.3 * 14.4
    'key-data': { fontSize: 16, lineHeight: 19.2, letterSpacing: 0, averageCharWidth: 0.55 }, // 1rem, 1.2 * 16
    'supporting-data': { fontSize: 16, lineHeight: 19.2, letterSpacing: 0, averageCharWidth: 0.55 }, // Same as key-data
    'footer': { fontSize: 11.52, lineHeight: 13.82, letterSpacing: 0.08, averageCharWidth: 0.55 }, // 0.72rem, 1.2 * 11.52, 0.08em
    'page-number': { fontSize: 11.2, lineHeight: 13.44, letterSpacing: 0.2, averageCharWidth: 0.55 }, // 0.7rem, 1.2 * 11.2, 0.2em
    'data-table': { fontSize: 14, lineHeight: 16, letterSpacing: 0, averageCharWidth: 0.55 },
    'visual-aid': { fontSize: 14, lineHeight: 16, letterSpacing: 0, averageCharWidth: 0.55 },
    'logo': { fontSize: 14, lineHeight: 16, letterSpacing: 0, averageCharWidth: 0.55 }
  };
  
  const typography = typographyMap[role] || typographyMap['supporting-text'];
  
  // Validate typography object
  if (!typography || typeof typography.fontSize !== 'number' || typography.fontSize <= 0) {
    console.warn(`Invalid typography for role: ${role}, using fallback`);
    return typographyMap['supporting-text'];
  }
  
  return typography;
}

function createCSSTemplate(brandSnapshot) {
  const typography = brandSnapshot?.typography || {};
  
  return `
    <style>
      html {
        font-size: 16px; /* Base font size for rem calculations */
      }
      
      .slide-board {
        position: relative;
        width: 1920px;
        height: 1080px;
        background: white;
        font-family: "Space Grotesk", "Segoe UI", sans-serif;
      }
      
      .slide-preview-region {
        position: absolute;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 0.2rem;
        padding: 0.7rem 0.85rem;
        background: rgba(0, 0, 0, 0.35);
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        transition: border 0.2s ease;
        box-sizing: border-box;
        overflow: hidden;
      }
      
      .slide-preview-region-copy {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.4;
        color: #f5f7ff;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      
      /* Role-specific typography - using px values that match Template Studio's rem values */
      .slide-preview-region[data-role="primary-title"] .slide-preview-region-copy {
        font-family: "Newsreader", serif;
        font-size: 25.6px; /* 1.6rem */
        line-height: 1.15;
        letter-spacing: -0.01em;
      }
      
      .slide-preview-region[data-role="secondary-title"] .slide-preview-region-copy {
        font-size: 16.8px; /* 1.05rem */
        line-height: 1.3;
        text-transform: none;
        color: rgba(255, 255, 255, 0.92);
      }
      
      .slide-preview-region[data-role="supporting-text"] .slide-preview-region-copy,
      .slide-preview-region[data-role="context-info"] .slide-preview-region-copy {
        font-size: 14.72px; /* 0.92rem */
        line-height: 1.35;
      }
      
      .slide-preview-region[data-role="criteria-list"] .slide-preview-region-copy {
        white-space: pre-line;
        font-family: "Space Grotesk", "Segoe UI", sans-serif;
        font-size: 14.4px; /* 0.9rem */
        line-height: 1.3;
      }
      
      .slide-preview-region[data-role="key-data"] .slide-preview-region-copy,
      .slide-preview-region[data-role="supporting-data"] .slide-preview-region-copy {
        font-size: 16px; /* 1rem */
        line-height: 1.2;
        font-weight: 600;
      }
      
      .slide-preview-region[data-role="footer"] .slide-preview-region-copy {
        font-size: 11.52px; /* 0.72rem */
        line-height: 1.2;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: rgba(255, 255, 255, 0.7);
      }
      
      .slide-preview-region[data-role="page-number"] .slide-preview-region-copy {
        font-size: 11.2px; /* 0.7rem */
        line-height: 1.2;
        letter-spacing: 0.2em;
      }
      
      .slide-preview-region[data-role="section-title"] .slide-preview-region-copy {
        font-family: "Newsreader", serif;
        font-size: 16px; /* 1rem */
        line-height: 1.2;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
    </style>
  `;
}

function createVirtualDOM({ regions, textByArea, templateSettings, brandSnapshot, JSDOM }) {
  // Validate inputs
  if (!Array.isArray(regions)) {
    throw new Error('Regions must be an array');
  }
  
  if (!JSDOM || typeof JSDOM !== 'function') {
    throw new Error('JSDOM is required');
  }
  
  const layout = {
    canvasWidth: templateSettings?.canvasWidth || 1920,
    canvasHeight: templateSettings?.canvasHeight || 1080,
    columns: templateSettings?.columns || 80,
    rows: templateSettings?.rows || 45,
    gap: templateSettings?.gap || 8
  };
  
  // Validate layout dimensions
  if (!Number.isFinite(layout.canvasWidth) || layout.canvasWidth <= 0 ||
      !Number.isFinite(layout.canvasHeight) || layout.canvasHeight <= 0 ||
      !Number.isFinite(layout.columns) || layout.columns <= 0 ||
      !Number.isFinite(layout.rows) || layout.rows <= 0) {
    throw new Error('Invalid layout dimensions');
  }
  
  const cellWidth = layout.canvasWidth / layout.columns;
  const cellHeight = layout.canvasHeight / layout.rows;
  
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <head>
        ${createCSSTemplate(brandSnapshot)}
      </head>
      <body>
        <div class="slide-board"></div>
      </body>
    </html>
  `, { runScripts: 'outside-only' });
  
  const board = dom.window.document.querySelector('.slide-board');
  
  regions.forEach(region => {
    const text = textByArea.get(region.area) || textByArea.get(region.id) || '';
    
    const regionEl = dom.window.document.createElement('div');
    regionEl.className = 'slide-preview-region';
    regionEl.dataset.boxId = region.id;
    regionEl.dataset.role = region.role;
    regionEl.dataset.inputType = region.metadata?.inputType || 'text';
    
    // Position the region
    const x = region.grid.x * cellWidth;
    const y = region.grid.y * cellHeight;
    const width = region.grid.width * cellWidth;
    const height = region.grid.height * cellHeight;
    
    regionEl.style.left = `${x}px`;
    regionEl.style.top = `${y}px`;
    regionEl.style.width = `${width}px`;
    regionEl.style.height = `${height}px`;
    regionEl.style.minHeight = `${height}px`;
    
    // Add text content
    const textEl = dom.window.document.createElement('div');
    textEl.className = `slide-preview-region-copy role-${region.role}`;
    textEl.textContent = text;
    
    regionEl.appendChild(textEl);
    board.appendChild(regionEl);
  });
  
  return dom;
}
