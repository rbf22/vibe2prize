import { state, pushHistory, captureHistoryForInteraction, resetInteractionHistory, handleUndo, handleRedo } from './state.js';
import { downloadMdxFile } from './persistence/mdx.js';
import { renderPreview } from './canvas/renderer.js';
import { renderSlidePreview } from './canvas/rendered-view.js';
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
import { importMDXFile, parseMDXFrontmatter, applyFrontmatterToState } from './persistence/importer.js';
import { renderSnippet } from './utils/snippet.js';
import {
  applyBrandTheme,
  listBrandOptions,
  listBrandThemeOptions,
  getBrandSnapshot,
  loadBrandMasterTemplate
} from './branding/brands.js';
import { initDiagnosticsPanel } from './ui/diagnostics-panel.js';

// Re-export for HTML script usage
let masterTemplateHydrationPromise = null;

async function hydrateMasterTemplate({ brandId = state.brand?.id, variantId = state.brand?.variant, force = false } = {}) {
  if (!force && state.boxes?.length) {
    return { applied: false, reason: 'boxes-present' };
  }

  if (!force && masterTemplateHydrationPromise) {
    return masterTemplateHydrationPromise;
  }

  const loader = (async () => {
    try {
      const templateSource = await loadBrandMasterTemplate(brandId, variantId);
      if (!templateSource) {
        return { applied: false, reason: 'missing-template' };
      }
      const parsed = parseMDXFrontmatter(templateSource);
      if (!parsed.success || !parsed.frontmatter) {
        console.warn('Master template frontmatter failed to parse for brand %s', brandId);
        return { applied: false, reason: 'parse-error', errors: parsed.errors };
      }
      applyFrontmatterToState(parsed.frontmatter);
      if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('masterTemplateHydrated', {
          detail: {
            brand: { ...state.brand },
            template: parsed.frontmatter
          }
        }));
      }
      return { applied: true, template: parsed.frontmatter };
    } catch (error) {
      console.error('Failed to hydrate master template', error);
      return { applied: false, reason: 'fetch-error', error };
    } finally {
      if (!force) {
        masterTemplateHydrationPromise = null;
      }
    }
  })();

  if (!force) {
    masterTemplateHydrationPromise = loader;
  }

  return loader;
}

export { 
  state, 
  pushHistory, 
  captureHistoryForInteraction, 
  resetInteractionHistory, 
  handleUndo, 
  handleRedo, 
  downloadMdxFile,
  renderPreview,
  renderSlidePreview,
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
  initDiagnosticsPanel,
  DRAW_DRAG_THRESHOLD,
  applyBrandTheme,
  listBrandOptions,
  listBrandThemeOptions,
  getBrandSnapshot,
  hydrateMasterTemplate
};

// Entry point for Template Studio when loaded as an ESM
export function init() {
  // Capture initial state so the first undo has a baseline
  pushHistory();
  applyBrandTheme(state.brand?.id, state.brand?.variant);
  const masterTemplateReady = hydrateMasterTemplate();
  
  // Set up global references
  window.TemplateStudio = {
    state,
    renderPreview,
    renderSlidePreview,
    renderGuides,
    renderRegionsTable,
    renderSnippet,
    initDiagnosticsPanel,
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
    downloadMdxFile,
    applyBrandTheme,
    listBrandOptions,
    listBrandThemeOptions,
    getBrandSnapshot,
    hydrateMasterTemplate,
    masterTemplateReady
  };

  window.TemplateStudio.__initialized = true;
}

// Auto-initialize if this module is loaded directly (guarded so it only happens once)
if (typeof window !== 'undefined') {
  if (!window.TemplateStudio || !window.TemplateStudio.__initialized) {
    init();
  }
}