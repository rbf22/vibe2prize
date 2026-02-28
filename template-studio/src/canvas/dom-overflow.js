import { isImageRole } from '../utils/preview-content.js';

export const DEFAULT_DOM_OVERFLOW_BUFFER_PX = 2;

const SKIP_ROLES = new Set(['data-table', 'page-number', 'logo']);

export function shouldMeasureDomOverflow(role, inputType = 'text') {
  const normalizedRole = (role || '').toString().toLowerCase();
  if ((inputType || '').toLowerCase() === 'image') {
    return false;
  }
  if (isImageRole(normalizedRole)) {
    return false;
  }
  if (SKIP_ROLES.has(normalizedRole)) {
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

function buildDomOverflowIssue({ descriptor, metrics }) {
  const area = descriptor.area || descriptor.id || 'region';
  const overflowPx = metrics.overflowPx;
  const capacityPx = metrics.clientHeight;
  return {
    type: 'visual',
    origin: 'preview-dom',
    area,
    boxId: descriptor.id,
    role: descriptor.role,
    metrics: {
      overflowPx,
      capacityPx,
      scrollHeight: metrics.scrollHeight,
      bufferPx: metrics.bufferPx,
      origin: 'preview-dom'
    },
    message: `Region "${area}" visually overflows the live preview by ~${overflowPx}px. Trim the copy, decrease the typography, or give the region more rows/padding.`
  };
}

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
    if (!shouldMeasureDomOverflow(descriptor.role, inputType)) {
      return;
    }

    const metrics = measureDomOverflow(region, { bufferPx });
    if (!metrics) {
      return;
    }

    issues.push(buildDomOverflowIssue({ descriptor, metrics }));
  });

  return issues;
}
