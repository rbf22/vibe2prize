import { state, pushHistory, captureHistoryForInteraction, resetInteractionHistory, handleUndo, handleRedo } from './state.js';
import { downloadMdxFile } from './persistence/mdx.js';
import { renderPreview } from './canvas/renderer.js';
import { renderGuides } from './canvas/guides.js';
import { 
  isEditableTarget, 
  hasOverlap, 
  createBox, 
  deleteBox, 
  deleteSelectedRegion, 
  getBoxAtGrid, 
  createBoxFromGrid,
  startDrag,
  startResize,
  handleMouseMove,
  handleMouseUp,
  DRAW_DRAG_THRESHOLD
} from './canvas/interactions.js';
import { 
  slugify, 
  applyCanvasDimensions, 
  applyReferenceOverlay, 
  updateSelectionControls, 
  normalizeExclusions, 
  getCellDimensions,
  attachControlHandlers,
  applyPreset
} from './ui/controls.js';
import { renderRegionsTable, addNewRegion, clearAllRegions } from './ui/regions-table.js';
import { importMDXFile, parseMDXFrontmatter } from './persistence/importer.js';
import { renderSnippet } from './utils/snippet.js';

// Re-export for HTML script usage
export { 
  state, 
  pushHistory, 
  captureHistoryForInteraction, 
  resetInteractionHistory, 
  handleUndo, 
  handleRedo, 
  downloadMdxFile,
  renderPreview,
  renderGuides,
  isEditableTarget,
  hasOverlap,
  createBox,
  deleteBox,
  deleteSelectedRegion,
  getBoxAtGrid,
  createBoxFromGrid,
  startDrag,
  startResize,
  handleMouseMove,
  handleMouseUp,
  slugify,
  applyCanvasDimensions,
  applyReferenceOverlay,
  updateSelectionControls,
  normalizeExclusions,
  getCellDimensions,
  attachControlHandlers,
  applyPreset,
  renderRegionsTable,
  addNewRegion,
  clearAllRegions,
  importMDXFile,
  parseMDXFrontmatter,
  renderSnippet,
  DRAW_DRAG_THRESHOLD
};

// Entry point for Template Studio when loaded as an ESM
export function init() {
  // Capture initial state so the first undo has a baseline
  pushHistory();
  
  // Set up global references
  window.TemplateStudio = {
    state,
    renderPreview,
    renderGuides,
    renderRegionsTable,
    renderSnippet,
    applyCanvasDimensions,
    applyReferenceOverlay,
    updateSelectionControls,
    normalizeExclusions,
    attachControlHandlers,
    applyPreset,
    importMDXFile,
    parseMDXFrontmatter,
    deleteSelectedRegion,
    addNewRegion,
    clearAllRegions,
    isEditableTarget,
    hasOverlap,
    createBox,
    deleteBox,
    getBoxAtGrid,
    createBoxFromGrid,
    startDrag,
    startResize,
    handleMouseMove,
    handleMouseUp,
    handleUndo,
    handleRedo,
    captureHistoryForInteraction,
    resetInteractionHistory,
    downloadMdxFile
  };

  window.TemplateStudio.__initialized = true;
}

// Auto-initialize if this module is loaded directly (guarded so it only happens once)
if (typeof window !== 'undefined') {
  if (!window.TemplateStudio || !window.TemplateStudio.__initialized) {
    init();
  }
}