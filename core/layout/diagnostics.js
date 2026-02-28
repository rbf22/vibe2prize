import { evaluateTextOverflow } from './overflow-metrics.js';

const ROLE_TITLES = {
  'primary-title': 'Primary Title',
  'secondary-title': 'Secondary Insight',
  'supporting-text': 'Narrative',
  'criteria-list': 'Key Questions',
  'key-data': 'Key Data',
  'context-info': 'Context',
  'logo': 'Brand Mark',
  'page-number': 'Pagination',
  'footer': 'Footer Note',
  'section-title': 'Section Title',
  'data-table': 'Data Table',
  'visual-aid': 'Visual Aid',
  'supporting-data': 'Supporting Data'
};

const ROLE_COPY = {
  'primary-title': 'Bold idea headline',
  'secondary-title': 'Supporting insight framing the story.',
  'supporting-text': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec vitae lacus cursus, auctor arcu eget, aliquet ipsum.',
  'criteria-list': '\u2022 Criteria item one.\n\u2022 Criteria item two.\n\u2022 Criteria item three.',
  'key-data': 'Key figure or stat.',
  'context-info': 'Event or context summary.',
  'logo': '',
  'page-number': '',
  'footer': 'EPAM Continuum Proprietary and Confidential',
  'section-title': 'Section heading',
  'data-table': '',
  'visual-aid': 'Placeholder description',
  'supporting-data': 'Supporting metric label'
};

const IMAGE_ROLES = new Set(['logo', 'visual-aid', 'supporting-data', 'iconography']);

const ROLE_TYPOGRAPHY = new Map([
  ['primary-title', { fontSize: 26, lineHeight: 30 }],
  ['secondary-title', { fontSize: 18, lineHeight: 24 }],
  ['section-title', { fontSize: 16, lineHeight: 22 }],
  ['supporting-text', { fontSize: 15, lineHeight: 22 }],
  ['context-info', { fontSize: 14, lineHeight: 20 }],
  ['criteria-list', { fontSize: 14, lineHeight: 20 }],
  ['key-data', { fontSize: 18, lineHeight: 24 }],
  ['supporting-data', { fontSize: 16, lineHeight: 22 }],
  ['data-table', { fontSize: 13, lineHeight: 18 }],
  ['footer', { fontSize: 12, lineHeight: 16 }],
  ['page-number', { fontSize: 11, lineHeight: 14 }],
  ['logo', { fontSize: 12, lineHeight: 16 }],
  ['visual-aid', { fontSize: 14, lineHeight: 20 }]
]);

const DEFAULT_LAYOUT = {
  canvasWidth: 1920,
  canvasHeight: 1080,
  columns: 80,
  rows: 45,
  gap: 0
};

const AVERAGE_CHAR_WIDTH_RATIO = 0.55;

export function getRoleTitle(roleKey) {
  return ROLE_TITLES[normalizeRole(roleKey)] || 'Content Block';
}

export function getRoleCopy(roleKey) {
  return ROLE_COPY[normalizeRole(roleKey)] || ROLE_COPY['supporting-text'];
}

export function isImageRole(roleKey) {
  return IMAGE_ROLES.has(normalizeRole(roleKey));
}

export function resolvePreviewText(source = {}, roleKey) {
  const role = normalizeRole(roleKey);
  const metadata = source?.metadata || source;
  const explicit = (metadata?.previewText || metadata?.sampleContent || '').toString().trim();
  if (explicit) {
    return explicit;
  }
  const baseCopy = getRoleCopy(role);
  if (metadata?.maxWords && baseCopy) {
    const words = baseCopy.split(/\s+/).slice(0, Math.max(3, metadata.maxWords));
    return words.join(' ');
  }
  return baseCopy;
}

export function formatPageNumberLabel(pagination = {}) {
  const page = pagination?.pageNumber ?? 1;
  const total = pagination?.totalSlides ?? page;
  const label = pagination?.label || 'Page';
  return `${label} ${page}/${total}`;
}

export function resolveFooterCopy({ role, previewText, brandSnapshot }) {
  if (role !== 'footer') {
    return previewText;
  }
  const hasCustomCopy = Boolean(previewText && previewText.trim().length);
  if (hasCustomCopy) {
    return previewText;
  }
  return brandSnapshot?.copy?.footer || ROLE_COPY.footer;
}

export function normalizeLayoutMetrics(layout = {}) {
  const base = {
    canvasWidth: Number(layout.canvasWidth) || Number(layout?.templateSettings?.canvasWidth) || DEFAULT_LAYOUT.canvasWidth,
    canvasHeight: Number(layout.canvasHeight) || Number(layout?.templateSettings?.canvasHeight) || DEFAULT_LAYOUT.canvasHeight,
    columns: Number(layout.columns) || Number(layout?.templateSettings?.columns) || DEFAULT_LAYOUT.columns,
    rows: Number(layout.rows) || Number(layout?.templateSettings?.rows) || DEFAULT_LAYOUT.rows,
    gap: layout.gap ?? layout?.templateSettings?.gap ?? DEFAULT_LAYOUT.gap
  };

  base.cellWidth = base.canvasWidth / Math.max(base.columns, 1);
  base.cellHeight = base.canvasHeight / Math.max(base.rows, 1);
  return base;
}

export function collectDiagnostics({
  regions = [],
  textByArea = new Map(),
  templateSettings = {},
  brandSnapshot = null,
  pagination = null,
  options = {}
} = {}) {
  const textMap = normalizeTextMap(textByArea);
  const layout = normalizeLayoutMetrics(templateSettings);
  const includeVisual = options.includeVisual !== false;

  const semantic = [];
  const visual = [];

  for (const region of regions) {
    const descriptor = normalizeRegionDescriptor(region);
    if (!descriptor) continue;
    const text = resolveRegionText({ descriptor, textMap, brandSnapshot, pagination });

    const semanticDiag = buildSemanticDiagnostic({ descriptor, text });
    if (semanticDiag) {
      semantic.push(semanticDiag);
    }

    if (includeVisual) {
      const visualDiag = buildVisualDiagnostic({ descriptor, text, layout, brandSnapshot });
      if (visualDiag) {
        visual.push(visualDiag);
      }
    }
  }

  return {
    semantic,
    visual,
    issues: [...semantic, ...visual]
  };
}

function buildSemanticDiagnostic({ descriptor, text }) {
  const normalizedText = sanitizeText(text);
  if (!normalizedText) {
    return null;
  }

  const metrics = evaluateTextOverflow({
    text: normalizedText,
    gridWidth: descriptor.grid.width,
    gridHeight: descriptor.grid.height,
    role: descriptor.role,
    maxWords: descriptor.maxWords
  });

  if (metrics.overflowChars <= 0) {
    return null;
  }

  const percentOver = metrics.capacity > 0
    ? Math.round((metrics.overflowChars / metrics.capacity) * 100)
    : 0;

  return {
    type: 'semantic',
    area: descriptor.area,
    boxId: descriptor.id,
    role: descriptor.role,
    metrics,
    message: `Region "${descriptor.area}" exceeds capacity by ${metrics.overflowChars} chars (~${percentOver}% over). Trim ~${metrics.suggestedTrim} characters or enlarge the region.`
  };
}

function buildVisualDiagnostic({ descriptor, text, layout, brandSnapshot }) {
  const normalizedText = sanitizeText(text);
  if (!normalizedText) {
    return null;
  }

  const regionGeometry = computeRegionGeometry({ descriptor, layout });
  if (!regionGeometry.innerHeight || !regionGeometry.innerWidth) {
    return null;
  }

  const typography = resolveRoleTypography(descriptor.role, brandSnapshot);
  const avgCharWidth = typography.fontSize * AVERAGE_CHAR_WIDTH_RATIO;
  const approxCharsPerLine = Math.max(10, Math.floor(regionGeometry.innerWidth / Math.max(avgCharWidth, 1)));
  const linesNeeded = Math.ceil(normalizedText.length / approxCharsPerLine);
  const contentHeight = linesNeeded * typography.lineHeight;
  const overflowPx = Math.max(0, Math.ceil(contentHeight - regionGeometry.innerHeight));

  if (overflowPx <= 0) {
    return null;
  }

  return {
    type: 'visual',
    area: descriptor.area,
    boxId: descriptor.id,
    role: descriptor.role,
    metrics: {
      overflowPx,
      linesNeeded,
      capacityPx: regionGeometry.innerHeight
    },
    message: [
      `Region "${descriptor.area}" visually overflows by ~${overflowPx}px.`,
      'Global fix: lower this role’s font size/line-height in the brand typography tokens.',
      'Local fix: give the region more rows/columns or swap to a smaller text style.'
    ].join(' ')
  };
}

function computeRegionGeometry({ descriptor, layout }) {
  const widthPx = descriptor.grid.width * layout.cellWidth;
  const heightPx = descriptor.grid.height * layout.cellHeight;
  const verticalPadding = Math.min(heightPx * 0.25, 18);
  const horizontalPadding = Math.min(widthPx * 0.08, 24);
  return {
    widthPx,
    heightPx,
    innerWidth: Math.max(widthPx - horizontalPadding * 2, widthPx * 0.5),
    innerHeight: Math.max(heightPx - verticalPadding * 2, heightPx * 0.35)
  };
}

function resolveRegionText({ descriptor, textMap, brandSnapshot, pagination }) {
  const supplied = descriptor.text || textMap.get(descriptor.area) || textMap.get(descriptor.id);
  if (supplied) {
    return supplied;
  }
  const preview = resolvePreviewText(descriptor.metadata || {}, descriptor.role);
  const footerAware = resolveFooterCopy({ role: descriptor.role, previewText: preview, brandSnapshot });
  if (descriptor.role === 'page-number') {
    return formatPageNumberLabel(pagination);
  }
  return footerAware;
}

function normalizeRegionDescriptor(region) {
  if (!region) return null;
  const grid = region.grid || {};
  const width = Number(grid.width ?? grid.w ?? region.gridWidth ?? 1) || 1;
  const height = Number(grid.height ?? grid.h ?? region.gridHeight ?? 1) || 1;
  const descriptor = {
    id: region.id || region.area || region.name || null,
    area: region.area || region.name || region.id || 'region',
    role: normalizeRole(region.role || region.fieldTypes?.[0]),
    grid: {
      width: Math.max(width, 1),
      height: Math.max(height, 1),
      x: Number(grid.x ?? grid.col ?? region.gridX ?? 0) || 0,
      y: Number(grid.y ?? grid.row ?? region.gridY ?? 0) || 0
    },
    maxWords: region.maxWords || region.metadata?.maxWords || null,
    metadata: region.metadata || {},
    text: region.text || null
  };
  return descriptor;
}

function normalizeRole(roleKey) {
  if (!roleKey || typeof roleKey !== 'string') {
    return 'supporting-text';
  }
  return roleKey;
}

function getRoleTypography(roleKey) {
  return ROLE_TYPOGRAPHY.get(normalizeRole(roleKey)) || { fontSize: 22, lineHeight: 28 };
}

function resolveRoleTypography(roleKey, brandSnapshot) {
  const role = normalizeRole(roleKey);
  const base = getRoleTypography(role);
  const overrides = brandSnapshot?.typography?.roles?.[role];
  if (!overrides) {
    return base;
  }

  const next = { ...base };
  if (typeof overrides.fontSize === 'number' && overrides.fontSize > 0) {
    next.fontSize = overrides.fontSize;
  }
  if (typeof overrides.lineHeight === 'number' && overrides.lineHeight > 0) {
    next.lineHeight = overrides.lineHeight;
  }
  return next;
}

function sanitizeText(value) {
  return (value ?? '').toString().replace(/\s+/g, ' ').trim();
}

function normalizeTextMap(input) {
  if (input instanceof Map) {
    return input;
  }
  if (Array.isArray(input)) {
    return new Map(input);
  }
  if (typeof input === 'object' && input !== null) {
    return new Map(Object.entries(input));
  }
  return new Map();
}

export {
  ROLE_TITLES,
  ROLE_COPY,
  IMAGE_ROLES
};
