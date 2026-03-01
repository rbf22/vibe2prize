import { state } from '../state.js';
import { getRoleFromBox } from '../utils/roles.js';
import { getRoleTypographyStyle, getTableStyleConfig } from '../utils/shared-styles.js';
import {
  resolvePreviewText,
  isImageRole,
  createImagePlaceholder,
  getPreviewTableData
} from '../utils/preview-content.js';
import { styleObjectToCss } from '../utils/shared-styles.js';
import { getRegionFrameStyle, calculateRegionPadding } from './region-layout.js';
import { getBrandSnapshot } from '../branding/brands.js';
import { computeRegionGeometry } from '../../../core/layout/region-geometry.js';

const ZERO_DIMENSION_RETRY_MS = 250;

const FALLBACK_LAYOUT = [
  {
    id: 'title',
    role: 'title',
    gridX: 0,
    gridY: 0,
    gridWidth: 12,
    gridHeight: 4,
    metadata: { role: 'title' }
  },
  {
    id: 'content',
    role: 'body',
    gridX: 0,
    gridY: 4,
    gridWidth: 12,
    gridHeight: 8,
    metadata: { role: 'body' }
  },
  {
    id: 'logo',
    role: 'logo',
    gridX: 10,
    gridY: 0,
    gridWidth: 2,
    gridHeight: 2,
    metadata: { role: 'logo', inputType: 'image' }
  }
];

function seedFallbackLayout() {
  // Don't seed if state has been explicitly initialized with empty boxes
  // This allows tests to verify empty state behavior
  if (state.boxes?.length === 0 && state._boxesInitialized) {
    return;
  }
  
  if (state.boxes?.length) {
    return;
  }

  state.boxes = FALLBACK_LAYOUT.map((box) => ({ ...box }));
  state.metadata = Object.fromEntries(
    FALLBACK_LAYOUT.map((box) => [box.id, { ...box.metadata }])
  );
}

function handleInvalidDimensions(container) {
  showLoadingState(container);

  if (!container._retryTimeout) {
    container._retryTimeout = setTimeout(() => {
      container._retryTimeout = null;
      if (document.contains(container)) {
        renderProductionSlide(container);
      }
    }, ZERO_DIMENSION_RETRY_MS);
  }

  container._isRendering = false;
}

function showLoadingState(container, message = 'Loading production preview...') {
  container.innerHTML = `
    <div class="production-preview-placeholder" style="
      display:flex;
      align-items:center;
      justify-content:center;
      width:100%;
      height:100%;
      color:rgba(255,255,255,0.7);
      font-family: system-ui, -apple-system, sans-serif;
      text-align:center;
      padding: 1rem;
    ">
      <p>${message}</p>
    </div>
  `;
}

function getWorkbenchForPanel(parentPanel) {
  return parentPanel?.closest('.preview-workbench') || null;
}

function toSafeDimension(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function isProductionPanelActive(parentPanel, workbench) {
  if (!parentPanel) {
    return true;
  }

  let panelStyle;
  try {
    panelStyle = window.getComputedStyle(parentPanel);
  } catch (error) {
    console.warn('Production render: getComputedStyle error:', error.message);
    return true; // Assume visible if we can't compute style
  }
  
  if (!panelStyle) {
    return true;
  }

  if (panelStyle.display === 'none') {
    console.log('Production render: parent panel display=none');
    return false;
  }

  if (panelStyle.visibility === 'hidden') {
    console.log('Production render: parent panel visibility hidden');
    return false;
  }

  const opacity = Number.parseFloat(panelStyle.opacity ?? '1');
  if (!Number.isNaN(opacity) && opacity <= 0.01) {
    console.log('Production render: parent panel opacity', opacity);
    return false;
  }

  // Only check workbench view if it's explicitly set to something other than production
  if (workbench?.dataset?.view && workbench.dataset.view !== 'production' && workbench.dataset.view !== 'canvas') {
    console.log('Production render: workbench view', workbench.dataset.view);
    return false;
  }

  return true;
}

function ensureVisibilityObserver(container, parentPanel, workbench) {
  if (container._visibilityObserver || typeof MutationObserver !== 'function') {
    return;
  }

  const targets = [];
  if (workbench) {
    targets.push(workbench);
  }
  if (parentPanel) {
    targets.push(parentPanel);
  }
  if (!targets.length) {
    return;
  }

  const observer = new MutationObserver(() => {
    if (!document.contains(container)) {
      return;
    }

    if (isProductionPanelActive(parentPanel, workbench) && !container._isRendering) {
      renderProductionSlide(container);
    }
  });

  targets.forEach((target) => {
    observer.observe(target, { attributes: true, attributeFilter: ['data-view', 'class', 'style'] });
  });

  container._visibilityObserver = observer;
}

// React will be loaded from CDN or global scope
let React;
let ReactDOM;

const DATA_TABLE_PADDING = '0.45rem';

// Test helper to ensure fallback path can be exercised
export function __resetReactCacheForTests() {
  React = null;
  ReactDOM = null;
}

async function ensureReactLoaded() {
  if (React && ReactDOM) {
    return { React, ReactDOM };
  }

  if (typeof window === 'undefined') {
    return null;
  }

  if (window.React && window.ReactDOM) {
    React = window.React;
    ReactDOM = window.ReactDOM;
    return { React, ReactDOM };
  }

  let attempts = 0;
  while (attempts < 50 && (!window.React || !window.ReactDOM)) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    attempts += 1;
  }

  if (window.React && window.ReactDOM) {
    React = window.React;
    ReactDOM = window.ReactDOM;
    return { React, ReactDOM };
  }

  return null;
}

function formatPageNumberLabel({ pageNumber, totalSlides, label = 'Page' } = {}) {
  const numericPage = Number.isFinite(pageNumber) ? pageNumber : null;
  if (!numericPage) {
    return label;
  }

  const paddedPage = String(Math.max(1, Math.floor(numericPage))).padStart(2, '0');
  if (Number.isFinite(totalSlides) && totalSlides > 0) {
    const paddedTotal = String(Math.max(1, Math.floor(totalSlides))).padStart(2, '0');
    return `${paddedPage} / ${paddedTotal}`;
  }

  return `${label} ${paddedPage}`;
}

function resolveFooterCopy({ box, role, previewText, brandSnapshot }) {
  if (role !== 'footer') return previewText;
  const hasCustomCopy = Boolean(box?.metadata?.previewText || box?.metadata?.sampleContent);
  if (hasCustomCopy) {
    return previewText;
  }
  return brandSnapshot?.copy?.footer || previewText;
}

function resolvePageNumberCopy({ role, pagination }) {
  if (role !== 'page-number') return null;
  return formatPageNumberLabel(pagination);
}

// Helper function to select brand logo
function selectBrandLogo(snapshot) {
  if (!snapshot?.assets?.logo) return null;
  const variantKey = snapshot.theme === 'light' ? 'light' : 'dark';
  const fallbackKey = variantKey === 'light' ? 'dark' : 'light';
  return snapshot.assets.logo[variantKey] || snapshot.assets.logo[fallbackKey] || null;
}

// Create brand image element
function createBrandImageElement({ React, snapshot, role, scale }) {
  if (!snapshot || role !== 'logo') return null;
  const src = selectBrandLogo(snapshot);
  if (!src) return null;
  
  return React.createElement('img', {
    src: src,
    alt: `${snapshot.label || snapshot.id || 'Brand'} logo`,
    style: {
      width: '100%',
      height: '100%',
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'contain',
      display: 'block'
    }
  });
}

// Create image placeholder element
function createImagePlaceholderElement({ React, role, scale }) {
  const placeholderContent = createImagePlaceholder(role);
  if (!placeholderContent) return null;
  
  // Extract the SVG content from the placeholder
  const svgElement = placeholderContent.querySelector('svg');
  if (!svgElement) return null;
  
  // Convert SVG to string for React
  const svgString = new XMLSerializer().serializeToString(svgElement);
  
  return React.createElement('div', {
    dangerouslySetInnerHTML: { __html: svgString },
    style: {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.5
    }
  });
}

// Create table element for data-table role
function createTableElement({ React, metadata, scale, brandSnapshot }) {
  const { columns, rows } = getPreviewTableData(metadata);
  const styleConfig = getTableStyleConfig({ scale, brandSnapshot });

  // Create header
  const headerCells = columns.map((col, i) => 
    React.createElement('th', { key: `h-${i}`, style: styleConfig.headCell }, col)
  );
  const headerRow = React.createElement('tr', {}, ...headerCells);
  const thead = React.createElement('thead', {}, headerRow);

  // Create body rows
  const bodyRows = rows.map((row, i) => {
    const cells = row.map((cell, j) => 
      React.createElement('td', { key: `c-${i}-${j}`, style: styleConfig.bodyCell }, cell)
    );
    return React.createElement('tr', { key: `r-${i}` }, ...cells);
  });
  const tbody = React.createElement('tbody', {}, ...bodyRows);

  return React.createElement('table', { style: styleConfig.table }, thead, tbody);
}

// Create table HTML for fallback renderer
function createTableHTML({ metadata, scale, brandSnapshot }) {
  const { columns, rows } = getPreviewTableData(metadata);
  const styleConfig = getTableStyleConfig({ scale, brandSnapshot });

  const headerCells = columns.map(col => `<th style='${styleObjectToCss(styleConfig.headCell)}'>${col}</th>`).join('');
  const bodyRows = rows.map((row, rowIndex) => {
    const cells = row.map(cell => `<td style='${styleObjectToCss(styleConfig.bodyCell)}'>${cell}</td>`).join('');
    let rowHtml = `<tr>${cells}</tr>`;
    if (rowIndex === rows.length - 1) {
      rowHtml = rowHtml.replace(/style="([^"]*?)border-bottom:[^;]*;?([^"]*?)"/g, 'style="$1$2"');
    }
    return rowHtml;
  }).join('');

  return `
    <table style='${styleObjectToCss(styleConfig.table)}'>
      <thead>
        <tr>${headerCells}</tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
  `;
}

// Get typography styles for each role
function getTypographyStyles(role, scale, brandSnapshot) {
  return getRoleTypographyStyle({ role, scale, brandSnapshot });
}

// Simplified component creation without importing from core/layout
function createSimpleGridDesigner({ React, boxes, brandSnapshot, pagination, containerWidth, containerHeight }) {
  // Validate state before using
  if (!state || !state.canvasWidth || !state.canvasHeight || !state.columns || !state.rows) {
    console.error('Production render: Invalid state', {
      hasState: !!state,
      canvasWidth: state?.canvasWidth,
      canvasHeight: state?.canvasHeight,
      columns: state?.columns,
      rows: state?.rows
    });
    return React.createElement('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        color: 'red'
      }
    }, 'Error: Invalid state - missing required properties');
  }
  
  // Calculate scale to fit container
  const scaleX = containerWidth / state.canvasWidth;
  const scaleY = containerHeight / state.canvasHeight;
  const scale = Math.max(Math.min(scaleX, scaleY), 0);
  const boardWidth = state.canvasWidth * scale;
  const boardHeight = state.canvasHeight * scale;
  
  console.log('Production React component scale calculation:', {
    containerWidth,
    containerHeight,
    scaleX: scaleX.toFixed(3),
    scaleY: scaleY.toFixed(3),
    scale: scale.toFixed(3),
    boardWidth,
    boardHeight
  });
  
  // Create a container with CSS classes like the preview
  const containerStyle = {
    position: 'relative',
    width: `${boardWidth}px`,
    height: `${boardHeight}px`,
    backgroundColor: brandSnapshot?.theme === 'light' ? '#ffffff' : '#1a1a1a',
    color: brandSnapshot?.theme === 'light' ? '#1a1a1a' : '#ffffff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    transform: 'translateZ(0)', // Hardware acceleration
    boxSizing: 'border-box',
    overflow: 'hidden'
  };

  // Create children elements positioned according to box coordinates
  const children = boxes.map((box) => {
    const role = getRoleFromBox(box);
    const inputType = box.metadata?.inputType || 'text';
    
    // Use the exact same content resolution logic as the preview
    const basePreviewText = resolvePreviewText(box, role);
    const footerAwareCopy = resolveFooterCopy({ box, role, previewText: basePreviewText, brandSnapshot });
    const systemCopy = resolvePageNumberCopy({ role, pagination });
    const content = systemCopy || footerAwareCopy || basePreviewText || '';

    // Calculate actual position and size using grid properties
    // Account for border width (1px on each side = 2px total) to match CSS Grid behavior
    const borderWidth = 1; // 1px border on each side
    const geometry = computeRegionGeometry({
      box,
      columns: state.columns,
      rows: state.rows,
      boardWidth,
      boardHeight
    });
    const left = geometry.left;
    const top = geometry.top;
    const width = geometry.width;
    const height = geometry.height;

    // Calculate dynamic padding like the preview
    const regionStyle = {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      padding: calculateRegionPadding({
        role,
        inputType,
        regionWidth: width,
        regionHeight: height,
        isImageRole: isImageRole(role)
      }),
      ...getRegionFrameStyle(brandSnapshot?.theme, { variant: 'production' }),
      background: 'transparent',
      className: 'production-region'
    };

    if (inputType === 'image' || isImageRole(role)) {
      regionStyle.justifyContent = 'center';
      regionStyle.alignItems = 'stretch';
    }

    // Create content element based on role and input type
    let contentElement;
    if (role === 'data-table') {
      contentElement = createTableElement({ React, metadata: box.metadata, scale: boardWidth / state.canvasWidth, brandSnapshot });
    } else if (inputType === 'image' || isImageRole(role)) {
      const brandImage = createBrandImageElement({ React, snapshot: brandSnapshot, role, scale: boardWidth / state.canvasWidth });
      if (brandImage) {
        contentElement = React.createElement('img', {
          ...brandImage.props,
          className: 'slide-preview-brand-asset'
        });
      } else {
        contentElement = createImagePlaceholderElement({ React, role, scale: boardWidth / state.canvasWidth });
      }
    } else {
      const typographyStyles = getTypographyStyles(role, boardWidth / state.canvasWidth, brandSnapshot);
      contentElement = React.createElement('p', {
        className: 'slide-preview-region-copy',
        style: typographyStyles
      }, content);
    }

    return React.createElement('article', {
      key: box.id,
      className: 'production-region',
      'data-box-id': box.id,
      'data-role': role,
      'data-input-type': inputType,
      style: regionStyle
    }, contentElement);
  });

  return React.createElement('div', {
    style: containerStyle
  }, ...children);
}

// Fallback renderer that doesn't require React
function renderFallbackSlide(container, boxes, brandSnapshot, pagination) {
  let containerWidth = container.clientWidth;
  let containerHeight = container.clientHeight;

  if (containerWidth === 0 || containerHeight === 0) {
    const parent = container.closest('.production-preview-panel') || container.parentElement;
    if (parent) {
      containerWidth = parent.clientWidth || containerWidth;
      containerHeight = parent.clientHeight || containerHeight;
    }
  }

  const scaleX = containerWidth / state.canvasWidth;
  const scaleY = containerHeight / state.canvasHeight;
  const scale = Math.max(Math.min(scaleX, scaleY), 0);
  let boardWidth = state.canvasWidth * scale;
  let boardHeight = state.canvasHeight * scale;

  if (boardWidth <= 0) {
    boardWidth = containerWidth || state.canvasWidth;
  }
  if (boardHeight <= 0) {
    boardHeight = containerHeight || state.canvasHeight;
  }

  // Always set container dimensions to ensure it's visible
  if (boardWidth > 0 && boardHeight > 0) {
    container.style.width = `${boardWidth}px`;
    container.style.height = `${boardHeight}px`;
  }

  const containerStyle = `
    position: relative;
    width: ${boardWidth}px;
    height: ${boardHeight}px;
    background-color: ${brandSnapshot?.theme === 'light' ? '#ffffff' : '#1a1a1a'};
    color: ${brandSnapshot?.theme === 'light' ? '#1a1a1a' : '#ffffff'};
    font-family: system-ui, -apple-system, sans-serif;
    transform: translateZ(0);
    box-sizing: border-box;
    overflow: hidden;
  `;

  // Create HTML for regions with absolute positioning
  const regionsHTML = boxes.map(box => {
    const role = getRoleFromBox(box);
    const inputType = box.metadata?.inputType || 'text';
    
    // Use the exact same content resolution logic as the preview
    const basePreviewText = resolvePreviewText(box, role);
    const footerAwareCopy = resolveFooterCopy({ box, role, previewText: basePreviewText, brandSnapshot });
    const systemCopy = resolvePageNumberCopy({ role, pagination });
    const content = systemCopy || footerAwareCopy || basePreviewText || '';

    const geometry = computeRegionGeometry({
      box,
      columns: state.columns,
      rows: state.rows,
      boardWidth,
      boardHeight
    });
    
    // Get typography styles
    const typographyStyles = getTypographyStyles(role, boardWidth / state.canvasWidth, brandSnapshot);
    
    // Create content based on role and input type
    let contentHTML;
    if (role === 'data-table') {
      contentHTML = createTableHTML({ metadata: box.metadata, scale: boardWidth / state.canvasWidth, brandSnapshot });
    } else if (inputType === 'image' || isImageRole(role)) {
      const logoSrc = selectBrandLogo(brandSnapshot);
      if (logoSrc && role === 'logo') {
        contentHTML = `<img src="${logoSrc}" alt="${brandSnapshot?.label || brandSnapshot?.id || 'Brand'} logo" class="slide-preview-brand-asset" style="width: 100%; height: 100%; max-width: 100%; max-height: 100%; object-fit: contain; display: block;">`;
      } else {
        // Create placeholder
        const placeholderContent = createImagePlaceholder(role);
        if (placeholderContent) {
          const svgElement = placeholderContent.querySelector('svg');
          if (svgElement) {
            const svgString = new XMLSerializer().serializeToString(svgElement);
            contentHTML = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; opacity: 0.5;">${svgString}</div>`;
          }
        }
      }
    } else {
      const typographyCSS = styleObjectToCss(typographyStyles);
      contentHTML = `<p class='slide-preview-region-copy' style='${typographyCSS}'>${content}</p>`;
    }

    const resolvedPadding = calculateRegionPadding({
      role,
      inputType,
      regionWidth: geometry.width,
      regionHeight: geometry.height,
      isImageRole: isImageRole(role)
    });

    const frameStyle = getRegionFrameStyle(brandSnapshot?.theme, { variant: 'production' });
    const regionStyleObject = {
      position: 'absolute',
      left: `${geometry.left}px`,
      top: `${geometry.top}px`,
      width: `${geometry.width}px`,
      height: `${geometry.height}px`,
      padding: resolvedPadding,
      ...frameStyle,
      justifyContent: inputType === 'image' || isImageRole(role) ? 'center' : frameStyle.justifyContent,
      alignItems: inputType === 'image' || isImageRole(role) ? 'stretch' : frameStyle.alignItems
    };

    const regionStyle = styleObjectToCss(regionStyleObject);

    return `
      <article class="production-region" data-box-id="${box.id}" data-role="${role}" data-input-type="${inputType}" style="${regionStyle}">
        ${contentHTML}
      </article>
    `;
  }).join('\n');

  container.innerHTML = `
    <div style="${containerStyle}">
      ${regionsHTML}
    </div>
  `;
  
  // Force a reflow to ensure proper sizing
  container.offsetHeight;
}

// Setup ResizeObserver helper function
function setupResizeObserver(container, parentPanel) {
  // Debounce function to prevent excessive re-renders
  let resizeTimeout;
  const debouncedRender = (entry) => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      // Check if container is still in DOM before rendering
      if (document.contains(container)) {
        renderProductionSlide(container, entry);
      }
    }, 100);
  };
  
  // Create resize observer to handle container resizing
  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      console.log('Production ResizeObserver detected:', { width, height });
      if (width > 0 && height > 0) {
        // Debounce re-render on resize and pass the entry
        debouncedRender(entry);
      }
    }
  });
  
  container._resizeObserver = resizeObserver;
  const target = parentPanel || container;
  console.log('Production render: Observing element:', target.className, target.id);
  resizeObserver.observe(target);
  
  // Also add window resize listener as backup with cleanup check
  if (!container._windowResizeHandler) {
    container._windowResizeHandler = () => {
      // Force a re-render on window resize
      setTimeout(() => {
        // Check if container is still in DOM and not rendering
        if (document.contains(container) && !container._isRendering) {
          renderProductionSlide(container);
        }
      }, 50);
    };
    window.addEventListener('resize', container._windowResizeHandler, { passive: true });
  }
}

export async function renderProductionSlide(container, resizeEntry) {
  if (!container) {
    console.warn('Production render: No container provided');
    return;
  }
  
  const parentPanel = container.closest('.production-preview-panel');
  const workbench = parentPanel ? getWorkbenchForPanel(parentPanel) : null;

  // Add a flag to force rendering for integration tests
  const forceRender = container._forceRender || false;
  ensureVisibilityObserver(container, parentPanel, workbench);

  if (!forceRender && !isProductionPanelActive(parentPanel, workbench)) {
    showLoadingState(container, 'Waiting for production panel...');
    container._isRendering = false;
    return;
  }
  container._forceRender = false;
  
  // Prevent render loops with better coordination
  if (container._isRendering && !resizeEntry) {
    console.log('Production render: Already rendering, skipping');
    return;
  }
  
  // Cancel any pending retry timeout
  if (container._retryTimeout) {
    clearTimeout(container._retryTimeout);
    container._retryTimeout = null;
  }
  
  container._isRendering = true;
  
  // Skip if this is a resize call but we don't have valid dimensions
  if (resizeEntry && (resizeEntry.contentRect.width <= 0 || resizeEntry.contentRect.height <= 0)) {
    container._isRendering = false;
    return;
  }
  
  // Get container dimensions, preferring the actual preview surface to match slide preview sizing
  let containerWidth;
  let containerHeight;

  if (resizeEntry && resizeEntry.contentRect.width > 0 && resizeEntry.contentRect.height > 0) {
    containerWidth = resizeEntry.contentRect.width;
    containerHeight = resizeEntry.contentRect.height;
    console.log('Production render: Using resize entry dimensions:', { containerWidth, containerHeight });
  } else {
    containerWidth = toSafeDimension(container.clientWidth);
    containerHeight = toSafeDimension(container.clientHeight);
    console.log('Production render: Using container element dimensions:', { containerWidth, containerHeight });

    if ((containerWidth <= 0 || containerHeight <= 0) && parentPanel) {
      containerWidth = toSafeDimension(parentPanel.clientWidth);
      containerHeight = toSafeDimension(parentPanel.clientHeight);
      console.log('Production render: Fallback to parent panel dimensions:', { containerWidth, containerHeight });
    }
  }

  if (containerWidth <= 0 || containerHeight <= 0) {
    console.warn('Production render: Invalid dimensions, cannot render:', { containerWidth, containerHeight });
    handleInvalidDimensions(container);
    return;
  }
  
  seedFallbackLayout();
  const boxes = state.boxes || [];
  console.log('Production render: boxes count:', boxes.length);
  console.log('Production render: state reference:', state);
  console.log('Production render: state.boxes reference:', state.boxes);
  
  // Debug: Check if boxes have content
  if (boxes.length > 0) {
    console.log('Production render: first box:', boxes[0]);
  }
  
  console.log('Production render: container dimensions:', {
    clientWidth: container.clientWidth,
    clientHeight: container.clientHeight,
    resolvedWidth: containerWidth,
    resolvedHeight: containerHeight
  });
  
  console.log('Production render: canvas dimensions:', {
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight
  });
  
  // Check if we have valid dimensions
  if (containerWidth <= 0 || containerHeight <= 0) {
    container._isRendering = false;
    return;
  }
  
  if (!boxes.length) {
    container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: rgba(255,255,255,0.5);"><p>No regions to render</p></div>';
    container._isRendering = false;
    return;
  }
  
  // Set up ResizeObserver on first render
  if (!container._resizeObserver) {
    console.log('Production render: Setting up ResizeObserver');
    setupResizeObserver(container, parentPanel);
  }
  
  const brandSnapshot = getBrandSnapshot(state.brand?.id, state.brand?.variant);
  const pagination = state.pagination || {};
  const renderWithFallback = () => {
    container._fallbackAttempted = true;
    renderFallbackSlide(container, boxes, brandSnapshot, pagination);
  };

  try {
    const reactContext = await ensureReactLoaded();
    if (!reactContext) {
      console.warn('Production render: React unavailable, using fallback renderer');
      renderWithFallback();
    } else {
      const { React, ReactDOM } = reactContext;
      console.log('Production render: React loaded successfully');
      
      const slideElement = createSimpleGridDesigner({
        React,
        boxes,
        brandSnapshot,
        pagination,
        containerWidth,
        containerHeight
      });
      console.log('Production render: element tree created');
      console.log('Production render: slideElement type:', typeof slideElement);
      console.log('Production render: slideElement:', slideElement);
      
      let root = container._productionRoot;
      if (!root) {
        container.innerHTML = '';
        root = ReactDOM.createRoot(container);
        container._productionRoot = root;
        console.log('Production render: new React root created');
      } else {
        console.log('Production render: reusing existing React root');
      }
      
      console.log('Production render: about to render to React root');
      try {
        root.render(slideElement);
        console.log('Production render: React render completed without errors');
      } catch (error) {
        console.error('Production render: React render failed:', error);
        throw error;
      }

      requestAnimationFrame(() => {
        const panelRect = parentPanel?.getBoundingClientRect?.();
        const boardRect = container.firstElementChild?.getBoundingClientRect?.();
        console.info('Production board metrics:', {
          panel: panelRect ? { width: panelRect.width, height: panelRect.height } : null,
          board: boardRect ? { width: boardRect.width, height: boardRect.height } : null
        });
      });

      setTimeout(() => {
        if (!document.contains(container)) {
          console.log('Production render: Container removed from DOM, skipping validation');
          return;
        }

        const hasChildren = container.children.length > 0;
        console.log('Production render: rendered element styles:', {
          hasChildren,
          childrenCount: container.children.length,
          innerHTML: hasChildren ? container.innerHTML.substring(0, 100) : 'empty'
        });

        if (!hasChildren) {
          console.error('Production render: React render failed - no children in container');
          if (!container._fallbackAttempted) {
            console.log('Production render: Attempting fallback render');
            renderWithFallback();
          }
        }
      }, 100);

      setTimeout(() => {
        if (!document.contains(container)) {
          return;
        }

        const firstChild = container.firstElementChild;
        if (!firstChild || firstChild.offsetWidth === 0 || firstChild.offsetHeight === 0) {
          throw new Error('React render produced invisible output');
        }
        const computedStyle = window.getComputedStyle(firstChild);
        console.log('Production render: rendered element styles:', {
          width: firstChild.style.width,
          height: firstChild.style.height,
          display: firstChild.style.display,
          backgroundColor: firstChild.style.backgroundColor,
          computedDisplay: computedStyle.display,
          computedVisibility: computedStyle.visibility,
          offsetWidth: firstChild.offsetWidth,
          offsetHeight: firstChild.offsetHeight
        });

        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || firstChild.offsetWidth === 0) {
          console.warn('Production render: Rendered element is not visible', {
            offsetWidth: firstChild.offsetWidth,
            offsetHeight: firstChild.offsetHeight
          });
        }
      }, 100);
    }
  } catch (error) {
    console.warn('React render failed, using fallback:', error.message);

    if (container._productionRoot) {
      try {
        container._productionRoot.unmount();
        container._productionRoot = null;
      } catch (e) {
        console.warn('Error during React root cleanup:', e);
      }
    }

    renderWithFallback();
  }

  // Reset render flag
  container._isRendering = false;
}

export function cleanupProductionRender(container) {
  if (container?._productionRoot) {
    try {
      container._productionRoot.unmount();
      container._productionRoot = null;
    } catch (error) {
      console.warn('Failed to cleanup production render:', error);
    }
  }
  
  // Clean up ResizeObserver
  if (container?._resizeObserver) {
    try {
      container._resizeObserver.disconnect();
      container._resizeObserver = null;
    } catch (error) {
      console.warn('Failed to cleanup ResizeObserver:', error);
    }
  }
  
  // Clean up MutationObserver
  if (container?._visibilityObserver) {
    try {
      container._visibilityObserver.disconnect();
      container._visibilityObserver = null;
    } catch (error) {
      console.warn('Failed to cleanup MutationObserver:', error);
    }
  }
  
  // Clean up window resize handler
  if (container?._windowResizeHandler) {
    try {
      window.removeEventListener('resize', container._windowResizeHandler);
      container._windowResizeHandler = null;
    } catch (error) {
      console.warn('Failed to cleanup window resize handler:', error);
    }
  }
  
  // Clean up retry timeout
  if (container?._retryTimeout) {
    try {
      clearTimeout(container._retryTimeout);
      container._retryTimeout = null;
    } catch (error) {
      console.warn('Failed to cleanup retry timeout:', error);
    }
  }
  
  // Clean up parent panel ResizeObserver
  const parentPanel = container?.closest('.production-preview-panel');
  if (parentPanel?._parentResizeObserver) {
    try {
      parentPanel._parentResizeObserver.disconnect();
      parentPanel._parentResizeObserver = null;
    } catch (error) {
      console.warn('Failed to cleanup parent ResizeObserver:', error);
    }
  }
  
  // Reset state flags
  container._isRendering = false;
  container._fallbackAttempted = false;
}
