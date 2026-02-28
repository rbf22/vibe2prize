import { state } from '../state.js';
import { hashColor } from './renderer.js';
import { getRoleFromBox } from '../utils/roles.js';
import {
  getRoleTitle,
  resolvePreviewText,
  isImageRole,
  buildTablePreview,
  formatAreaLabel,
  createImagePlaceholder
} from '../utils/preview-content.js';
import { getRoleTypographyStyle, styleObjectToCss } from '../utils/shared-styles.js';
import { getBrandSnapshot, adaptSnapshotToDom } from '../branding/brands.js';
import { getRegionFrameStyle, calculateRegionPadding } from './region-layout.js';
import { collectDiagnostics } from '../../../core/layout/diagnostics.js';
import {
  formatPageNumberLabel,
  normalizeRendererFlags
} from '../../../core/layout/renderer-utils.js';
import { collectDomOverflowIssues } from './dom-overflow.js';
const IMAGE_REGION_PADDING = '0.4rem';

function applyStyleObject(element, style = {}) {
  if (!element || !style) return;
  Object.entries(style).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    element.style[key] = value;
  });
}

function emptyState(container) {
  container.innerHTML = '';
  const empty = document.createElement('div');
  empty.className = 'slide-preview-empty';
  empty.innerHTML = '<p>Draw regions to preview a slide.</p><p class="hint">The preview mirrors approximate typography, spacing, and data blocks.</p>';
  container.appendChild(empty);
}

function ensureOverflowBadge(region, textContent) {
  if (!region) return null;
  let badge = region.querySelector('.slide-preview-overflow-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'slide-preview-overflow-badge';
    region.appendChild(badge);
  }
  badge.textContent = textContent;
  return badge;
}

function describeTypography(element) {
  if (typeof window === 'undefined' || !element) {
    return null;
  }
  const styles = window.getComputedStyle(element);
  if (!styles) return null;
  return {
    fontFamily: styles.fontFamily,
    fontSize: styles.fontSize,
    fontWeight: styles.fontWeight,
    lineHeight: styles.lineHeight,
    color: styles.color
  };
}

function buildTooltipSections({ role, box, region }) {
  const titleParts = [];
  const roleTitle = getRoleTitle(role);
  if (roleTitle) titleParts.push(roleTitle);
  const areaLabel = formatAreaLabel(box);
  if (areaLabel) titleParts.push(areaLabel);

  const contentNode = region.querySelector('.slide-preview-region-copy')
    || region.querySelector('.slide-preview-table')
    || region.querySelector('.slide-preview-image');
  const typography = describeTypography(contentNode);
  const styleLines = [];
  if (typography) {
    if (typography.fontFamily) styleLines.push(`Font: ${typography.fontFamily}`);
    if (typography.fontSize) styleLines.push(`Size: ${typography.fontSize}`);
    if (typography.lineHeight) styleLines.push(`Line: ${typography.lineHeight}`);
    if (typography.fontWeight) styleLines.push(`Weight: ${typography.fontWeight}`);
    if (typography.color) styleLines.push(`Color: ${typography.color}`);
  }

  return {
    title: titleParts.join(' — '),
    styleLines
  };
}

function buildTooltip({ role, box, region }) {
  const sections = buildTooltipSections({ role, box, region });
  const tooltipLines = [];
  if (sections.title) tooltipLines.push(sections.title);
  if (sections.styleLines.length) tooltipLines.push(sections.styleLines.join(' • '));
  return tooltipLines.join('\n');
}

function selectBrandLogo(snapshot) {
  if (!snapshot?.assets?.logo) return null;
  const variantKey = snapshot.theme === 'light' ? 'light' : 'dark';
  const fallbackKey = variantKey === 'light' ? 'dark' : 'light';
  return snapshot.assets.logo[variantKey] || snapshot.assets.logo[fallbackKey] || null;
}

function createBrandImage({ snapshot, role }) {
  if (!snapshot) return null;
  if (role !== 'logo') return null;
  const src = selectBrandLogo(snapshot);
  if (!src) return null;
  const img = document.createElement('img');
  img.className = 'slide-preview-brand-asset';
  img.src = src;
  img.alt = `${snapshot.label || snapshot.id || 'Brand'} logo`;
  img.decoding = 'async';
  img.loading = 'lazy';
  img.style.maxWidth = '100%';
  img.style.maxHeight = '100%';
  img.style.objectFit = 'contain';
  img.style.display = 'block';
  return img;
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

export function renderSlidePreview(container, resizeEntry) {
  if (!container) {
    return;
  }
  
  // Skip if this is a resize call but we don't have valid dimensions
  if (resizeEntry && (resizeEntry.contentRect.width <= 0 || resizeEntry.contentRect.height <= 0)) {
    return;
  }
  
  const parentPanel = container.closest('.slide-preview-panel') || container.parentElement;
  const observedElement = parentPanel || container;

  // Remove any existing resize observer (but not on resize calls to avoid infinite loop)
  if (!resizeEntry) {
    if (container._resizeObserver) {
      container._resizeObserver.disconnect();
    }
    
    // Debounce function to prevent excessive re-renders
    let resizeTimeout;
    const debouncedRender = (entry) => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        renderSlidePreview(container, entry);
      }, 100);
    };
    
    if (observedElement) {
      // Create resize observer to handle container resizing
      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            debouncedRender(entry);
          }
        }
      });
      container._resizeObserver = resizeObserver;
      resizeObserver.observe(observedElement);
    }
    
    // Also add window resize listener as backup
    if (!container._windowResizeHandler) {
      container._windowResizeHandler = () => {
        setTimeout(() => {
          renderSlidePreview(container);
        }, 50);
      };
      window.addEventListener('resize', container._windowResizeHandler, { passive: true });
    }
  }

  const boxes = state.boxes || [];
  if (!boxes.length) {
    emptyState(container);
    return;
  }

  container.innerHTML = '';
  const board = document.createElement('div');
  board.className = 'slide-preview-grid';

  // Get container dimensions - use resize entry if available
  let containerWidth, containerHeight;
  if (resizeEntry) {
    containerWidth = resizeEntry.contentRect.width;
    containerHeight = resizeEntry.contentRect.height;
  } else {
    const measurementSource = observedElement || container;
    const rect = measurementSource?.getBoundingClientRect();
    containerWidth = measurementSource?.clientWidth || rect?.width || container.clientWidth;
    containerHeight = measurementSource?.clientHeight || rect?.height || container.clientHeight;
  }
  
  if (containerWidth <= 0 || containerHeight <= 0) {
    container.appendChild(board);
    return;
  }

  const pagination = state.pagination || {};
  const flags = normalizeRendererFlags(state.previewFlags || {});
  const diagnosticsEnabled = Boolean(flags.showDiagnostics);

  const scaleX = containerWidth / state.canvasWidth;
  const scaleY = containerHeight / state.canvasHeight;
  const scale = Math.max(Math.min(scaleX, scaleY), 0);
  const boardWidth = state.canvasWidth * scale;
  const boardHeight = state.canvasHeight * scale;
  const cellWidth = (state.canvasWidth / Math.max(state.columns, 1)) * scale;
  const cellHeight = (state.canvasHeight / Math.max(state.rows, 1)) * scale;

  board.style.width = `${boardWidth}px`;
  board.style.height = `${boardHeight}px`;
  board.style.gridTemplateColumns = `repeat(${state.columns}, ${cellWidth}px)`;
  board.style.gridTemplateRows = `repeat(${state.rows}, ${cellHeight}px)`;
  board.style.gap = '0';
  // Set scale factor for CSS to use
  board.style.setProperty('--preview-scale', scale);
  board.dataset.previewChrome = flags.previewChrome ? 'true' : 'false';
  board.dataset.regionOutlines = flags.showRegionOutlines ? 'true' : 'false';
  container.appendChild(board);

  // Log sizing diagnostics after layout settles
  requestAnimationFrame(() => {
    const panelRect = observedElement?.getBoundingClientRect?.();
    const boardRect = board.getBoundingClientRect();
    console.info('Preview board metrics:', {
      panel: panelRect ? { width: panelRect.width, height: panelRect.height } : null,
      board: { width: boardRect.width, height: boardRect.height }
    });
  });

  const diagnosticsBuffer = diagnosticsEnabled ? { regions: [], textMap: new Map() } : null;
  const brandSnapshot = adaptSnapshotToDom(getBrandSnapshot(state.brand?.id, state.brand?.variant));

  boxes.forEach((box) => {
    const role = getRoleFromBox(box);
    const region = document.createElement('article');
    region.className = 'slide-preview-region';
    region.dataset.boxId = box.id;
    region.dataset.role = role;
    const inputType = box.metadata?.inputType || 'text';
    region.dataset.inputType = inputType;
    region.style.gridColumn = `${box.gridX + 1} / span ${Math.max(box.gridWidth, 1)}`;
    region.style.gridRow = `${box.gridY + 1} / span ${Math.max(box.gridHeight, 1)}`;
    const regionBorderColor = hashColor(box.id);
    applyStyleObject(region, getRegionFrameStyle(brandSnapshot?.theme));
    region.style.borderColor = regionBorderColor;
    region.classList.add(flags.showRegionOutlines ? 'slide-preview-region--outlined' : 'slide-preview-region--plain');

    const regionWidth = Math.max(box.gridWidth, 1) * cellWidth;
    const regionHeight = Math.max(box.gridHeight, 1) * cellHeight;
    region.style.padding = calculateRegionPadding({
      role,
      inputType,
      regionWidth,
      regionHeight,
      isImageRole: isImageRole(role)
    });

    const descriptor = diagnosticsBuffer ? buildDiagnosticsDescriptor(box, role) : null;

    if (role === 'data-table') {
      region.appendChild(buildTablePreview({ metadata: box.metadata, scale, brandSnapshot }));
    } else if (inputType === 'image' || isImageRole(role)) {
      region.style.justifyContent = 'center';
      region.style.alignItems = 'stretch';
      const brandImage = createBrandImage({ snapshot: brandSnapshot, role });
      if (brandImage) {
        region.appendChild(brandImage);
      } else {
        region.appendChild(createImagePlaceholder(role));
      }
    } else {
      region.style.justifyContent = region.style.justifyContent || 'flex-start';
      region.style.alignItems = region.style.alignItems || 'flex-start';
      const body = document.createElement('p');
      body.className = 'slide-preview-region-copy';
      const basePreviewText = resolvePreviewText(box, role);
      const footerAwareCopy = resolveFooterCopy({ box, role, previewText: basePreviewText, brandSnapshot });
      const systemCopy = resolvePageNumberCopy({ role, pagination });
      const resolvedCopy = systemCopy || footerAwareCopy || basePreviewText || '';
      body.textContent = resolvedCopy;
      const typographyStyles = getRoleTypographyStyle({ role, scale, brandSnapshot });
      body.style.cssText = styleObjectToCss(typographyStyles);
      region.appendChild(body);

      if (diagnosticsBuffer && descriptor) {
        descriptor.text = resolvedCopy;
        diagnosticsBuffer.textMap.set(descriptor.area, resolvedCopy);
      }
    }

    if (diagnosticsBuffer && descriptor) {
      diagnosticsBuffer.regions.push(descriptor);
    }

    board.appendChild(region);

    const tooltip = buildTooltip({ role, box, region });
    if (tooltip) {
      region.title = tooltip;
    } else {
      region.removeAttribute('title');
    }
  });
  const domOverflowIssues = diagnosticsEnabled && flags.detectDomOverflow
    ? collectDomOverflowIssues({
        board,
        descriptors: diagnosticsBuffer?.regions || []
      })
    : [];

  const diagnostics = diagnosticsEnabled
    ? collectDiagnostics({
        regions: diagnosticsBuffer?.regions,
        textByArea: diagnosticsBuffer?.textMap,
        templateSettings: {
          canvasWidth: state.canvasWidth,
          canvasHeight: state.canvasHeight,
          columns: state.columns,
          rows: state.rows,
          gap: state.gap
        },
        brandSnapshot,
        pagination: state.pagination,
        options: { includeVisual: true }
      })
    : { semantic: [], visual: [], issues: [] };

  if (diagnosticsEnabled && domOverflowIssues.length) {
    const domBoxIds = new Set(domOverflowIssues.map((issue) => issue.boxId).filter(Boolean));
    const visualWithoutDom = (diagnostics.visual || []).filter((issue) => {
      if (issue.type !== 'visual') return true;
      if (!domBoxIds.size) return true;
      return !domBoxIds.has(issue.boxId);
    });
    diagnostics.visual = [...visualWithoutDom, ...domOverflowIssues];
    diagnostics.issues = [...(diagnostics.semantic || []), ...diagnostics.visual];
  }

  if (diagnosticsEnabled) {
    applyDiagnosticsToBoard({ board, diagnostics });
  } else {
    clearRegionOverflowBadges(board);
  }

  const nextDiagnostics = diagnosticsEnabled ? diagnostics.issues : [];
  state.diagnostics = state.diagnostics || {};
  state.diagnostics.overflow = nextDiagnostics;
  document.dispatchEvent(new CustomEvent('templateDiagnosticsUpdated', {
    detail: {
      overflow: nextDiagnostics
    }
  }));
}

function buildDiagnosticsDescriptor(box, role) {
  return {
    id: box.id,
    area: box.name || box.id,
    role,
    grid: {
      width: Math.max(box.gridWidth, 1),
      height: Math.max(box.gridHeight, 1),
      x: box.gridX ?? 0,
      y: box.gridY ?? 0
    },
    metadata: box.metadata || {},
    maxWords: box.metadata?.maxWords || null,
    text: null
  };
}

function applyDiagnosticsToBoard({ board, diagnostics }) {
  const issuesByBox = new Map();
  diagnostics.issues.forEach((issue) => {
    if (!issuesByBox.has(issue.boxId)) {
      issuesByBox.set(issue.boxId, []);
    }
    issuesByBox.get(issue.boxId).push(issue);
  });

  board.querySelectorAll('.slide-preview-region').forEach((region) => {
    const boxId = region.dataset.boxId;
    const issues = issuesByBox.get(boxId) || [];
    if (!issues.length) {
      region.removeAttribute('data-overflow');
      region.removeAttribute('data-dom-overflow');
      const badge = region.querySelector('.slide-preview-overflow-badge');
      if (badge) badge.remove();
      return;
    }

    region.dataset.overflow = 'true';
    if (issues.some((issue) => issue.metrics?.origin === 'preview-dom')) {
      region.dataset.domOverflow = 'true';
    } else {
      region.removeAttribute('data-dom-overflow');
    }
    const semanticIssue = issues.find((issue) => issue.type === 'semantic');
    const visualIssue = issues.find((issue) => issue.type === 'visual');
    const badgeLabel = formatBadgeLabel({ semanticIssue, visualIssue });
    ensureOverflowBadge(region, badgeLabel);
  });
}

function clearRegionOverflowBadges(board) {
  board.querySelectorAll('.slide-preview-region').forEach((region) => {
    region.removeAttribute('data-overflow');
    region.removeAttribute('data-dom-overflow');
    const badge = region.querySelector('.slide-preview-overflow-badge');
    if (badge) {
      badge.remove();
    }
  });
}

function formatBadgeLabel({ semanticIssue, visualIssue }) {
  if (semanticIssue?.metrics?.suggestedTrim) {
    return `-${semanticIssue.metrics.suggestedTrim} chars`;
  }
  if (visualIssue?.metrics?.overflowPx) {
    return `+${visualIssue.metrics.overflowPx}px`;
  }
  return 'Check layout';
}
