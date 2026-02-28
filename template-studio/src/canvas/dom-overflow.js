// Re-export shared DOM overflow utilities from core
import {
  DEFAULT_DOM_OVERFLOW_BUFFER_PX,
  SKIP_ROLES,
  shouldMeasureDomOverflow,
  measureDomOverflow,
  collectDomOverflowIssues as collectDomOverflowIssuesCore
} from '../../../core/layout/dom-overflow.js';
import { isImageRole } from '../utils/preview-content.js';

// Set up the utils for the shared module
if (typeof window !== 'undefined') {
  window.__templateStudioUtils = { isImageRole };
}

// Re-export everything
export {
  DEFAULT_DOM_OVERFLOW_BUFFER_PX,
  SKIP_ROLES,
  shouldMeasureDomOverflow,
  measureDomOverflow
};

// Wrapper to maintain compatibility with existing Template Studio code
export function collectDomOverflowIssues({ board, descriptors = [], bufferPx = DEFAULT_DOM_OVERFLOW_BUFFER_PX } = {}) {
  return collectDomOverflowIssuesCore({ board, descriptors, bufferPx });
}
