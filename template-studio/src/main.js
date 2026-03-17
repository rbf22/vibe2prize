import { state, pushHistory, captureHistoryForInteraction, resetInteractionHistory, handleUndo, handleRedo } from './state.js';
import { downloadMdxFile } from './persistence/mdx.js';
import { exportToPptx } from './persistence/pptx.js';
import { renderPreview } from './canvas/renderer.js';
import { renderSlidePreview } from './canvas/rendered-view.js';
import { renderProductionSlide, cleanupProductionRender } from './canvas/production-renderer.js';
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
import { initComposer } from './composer.js';

// Re-export for HTML script usage
let masterTemplateHydrationPromise = null;

const FALLBACK_LAYOUT = [
  {
    id: 'fallback-title',
    gridX: 0,
    gridY: 0,
    gridWidth: 24,
    gridHeight: 8,
    metadata: { role: 'primary-title' }
  },
  {
    id: 'fallback-insight',
    gridX: 0,
    gridY: 10,
    gridWidth: 34,
    gridHeight: 12,
    metadata: {
      role: 'data-table',
      previewTable: {
        columns: ['Column A', 'Column B'],
        rows: [['Alpha', 'Beta'], ['Gamma', 'Delta']]
      }
    }
  },
  {
    id: 'fallback-logo',
    gridX: 60,
    gridY: 0,
    gridWidth: 10,
    gridHeight: 8,
    metadata: { role: 'logo', inputType: 'image' }
  }
];

function seedFallbackLayout() {
  if (state.boxes?.length) {
    return;
  }

  state.boxes = FALLBACK_LAYOUT.map((box) => ({ ...box }));
  state.metadata = Object.fromEntries(
    FALLBACK_LAYOUT.map((box) => [box.id, { ...box.metadata }])
  );
}

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
  exportToPptx,
  renderPreview,
  renderSlidePreview,
  renderProductionSlide,
  cleanupProductionRender,
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
  if (typeof window === 'undefined') return;
  window.initComposer = initComposer;
  if (window.TemplateStudio && window.TemplateStudio.__initialized) return;

  // Set up global references IMMEDIATELY
  window.TemplateStudio = {
    state,
    renderPreview,
    renderSlidePreview,
    renderProductionSlide,
    cleanupProductionRender,
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
    exportToPptx,
    applyBrandTheme,
    listBrandOptions,
    listBrandThemeOptions,
    getBrandSnapshot,
    hydrateMasterTemplate,
    seedFallbackLayout
  };

  // Capture initial state so the first undo has a baseline
  pushHistory();
  applyBrandTheme(state.brand?.id, state.brand?.variant);

  const masterTemplateReady = hydrateMasterTemplate();
  window.TemplateStudio.masterTemplateReady = masterTemplateReady;

  masterTemplateReady
    .then((result) => {
      if (!result?.applied) {
        seedFallbackLayout();
      }
    })
    .catch(() => {
      seedFallbackLayout();
    });

  if (typeof document !== 'undefined') {
    document.addEventListener('masterTemplateHydrated', () => {
      if (!state.boxes?.length) {
        seedFallbackLayout();
      }
    });
  }

  seedFallbackLayout();
  window.TemplateStudio.__initialized = true;
}

// Auto-initialize if this module is loaded directly (guarded so it only happens once)
if (typeof window !== 'undefined') {
  init();
}