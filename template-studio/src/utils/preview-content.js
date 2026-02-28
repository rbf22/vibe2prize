import { getTableStyleConfig, styleObjectToCss } from './shared-styles.js';

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

const LOREM_SHORT = 'Lorem ipsum dolor sit amet.';
const LOREM_MEDIUM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer dictum porta at sapien.';
const LOREM_LONG = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec vitae lacus cursus, auctor arcu eget, aliquet ipsum.';
const LOREM_LIST = '\u2022 Lorem ipsum dolor sit amet.\n\u2022 Consectetur adipiscing elit.\n\u2022 Integer dictum porta sapien.';

const ROLE_COPY = {
  'primary-title': LOREM_SHORT,
  'secondary-title': LOREM_SHORT,
  'supporting-text': LOREM_LONG,
  'criteria-list': LOREM_LIST,
  'key-data': LOREM_SHORT,
  'context-info': LOREM_SHORT,
  'logo': LOREM_SHORT,
  'page-number': LOREM_SHORT,
  'footer': LOREM_MEDIUM,
  'section-title': LOREM_SHORT,
  'data-table': '',
  'visual-aid': LOREM_SHORT,
  'supporting-data': LOREM_SHORT
};

const IMAGE_ROLES = new Set(['logo', 'visual-aid', 'supporting-data', 'iconography']);

const DEFAULT_TABLE_COLUMNS = ['Column A', 'Column B', 'Column C'];
const DEFAULT_TABLE_ROWS = [
  ['Lorem ipsum', 'Lorem ipsum', 'Lorem ipsum'],
  ['Lorem ipsum', 'Lorem ipsum', 'Lorem ipsum'],
  ['Lorem ipsum', 'Lorem ipsum', 'Lorem ipsum']
];

function normalizeRole(roleKey) {
  if (!roleKey) {
    return 'supporting-text';
  }
  return roleKey;
}

export function getRoleTitle(roleKey) {
  return ROLE_TITLES[normalizeRole(roleKey)] || 'Content Block';
}

export function getRoleCopy(roleKey) {
  const normalized = normalizeRole(roleKey);
  return ROLE_COPY[normalized] || ROLE_COPY['supporting-text'];
}

export function isImageRole(roleKey) {
  return IMAGE_ROLES.has(normalizeRole(roleKey));
}

export function resolvePreviewText(box, roleKey) {
  const role = normalizeRole(roleKey);
  const metadata = box?.metadata || {};
  const explicit = (metadata.previewText || metadata.sampleContent || '').toString().trim();
  if (explicit) {
    return explicit;
  }
  const baseCopy = getRoleCopy(role);
  if (metadata.maxWords && baseCopy) {
    const words = baseCopy.split(/\s+/).slice(0, Math.max(3, metadata.maxWords));
    return words.join(' ');
  }
  return baseCopy;
}

export function formatAreaLabel(box) {
  if (!box) return '';
  if (box.name) return box.name;
  if (box.metadata?.llmHint) {
    return box.metadata.llmHint.split(' ').slice(0, 3).join(' ') + '…';
  }
  return box.id;
}

export function createImagePlaceholder(role) {
  const figure = document.createElement('figure');
  figure.className = 'slide-preview-image';
  const glyph = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  glyph.setAttribute('viewBox', '0 0 200 140');
  glyph.setAttribute('aria-label', role || 'image placeholder');
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', '4');
  rect.setAttribute('y', '4');
  rect.setAttribute('width', '192');
  rect.setAttribute('height', '132');
  rect.setAttribute('rx', '12');
  rect.classList.add('placeholder-frame');
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '70');
  circle.setAttribute('cy', '60');
  circle.setAttribute('r', '22');
  circle.classList.add('placeholder-dot');
  const mountain = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  mountain.setAttribute('d', 'M30 120 L90 70 L120 94 L150 60 L190 120 Z');
  mountain.classList.add('placeholder-mountain');
  glyph.appendChild(rect);
  glyph.appendChild(circle);
  glyph.appendChild(mountain);
  figure.appendChild(glyph);
  const caption = document.createElement('figcaption');
  caption.textContent = getRoleTitle(role);
  figure.appendChild(caption);
  return figure;
}

export function buildTablePreview({ metadata = {}, scale = 1, brandSnapshot } = {}) {
  const { columns, rows } = getPreviewTableData(metadata);
  const styleConfig = getTableStyleConfig({ scale, brandSnapshot });

  const table = document.createElement('table');
  table.className = 'slide-preview-table';
  table.style.cssText = styleObjectToCss(styleConfig.table);

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  columns.forEach((column) => {
    const th = document.createElement('th');
    th.textContent = column;
    th.style.cssText = styleObjectToCss(styleConfig.headCell);
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    row.forEach((cell) => {
      const td = document.createElement('td');
      td.textContent = cell;
      td.style.cssText = styleObjectToCss(styleConfig.bodyCell);
      tr.appendChild(td);
    });
    // Remove bottom border on final row to mimic CSS rule
    if (rowIndex === rows.length - 1) {
      tr.querySelectorAll('td').forEach((td) => {
        td.style.borderBottom = 'none';
      });
    }
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  return table;
}

export function getPreviewTableData(metadata = {}) {
  const previewTable = metadata?.previewTable;
  const columns = Array.isArray(previewTable?.columns) && previewTable.columns.length
    ? previewTable.columns
    : DEFAULT_TABLE_COLUMNS;
  const rows = Array.isArray(previewTable?.rows) && previewTable.rows.length
    ? previewTable.rows
    : DEFAULT_TABLE_ROWS;
  return { columns, rows };
}

export { ROLE_TITLES, ROLE_COPY, IMAGE_ROLES };
