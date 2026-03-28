import { state, pushHistory, captureHistoryForInteraction, resetInteractionHistory, handleUndo, handleRedo } from './state.js';
import { downloadMdxFile } from './persistence/mdx.js';
import { exportToPptx } from './persistence/pptx.js';
import { renderPreview } from './canvas/renderer.js';
import { renderSlidePreview } from './canvas/rendered-view.js';
import { renderProductionSlide, cleanupProductionRender } from './canvas/production-renderer.js';
import { renderGuides } from './canvas/guides.js';
import { cleanupAllEventListeners } from './utils/event-cleanup.js';
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
import { importMDXFile, parseMDXFrontmatter, applyFrontmatterToState, normalizeFrontmatter } from './persistence/importer.js';
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
      const normalizedFrontmatter = normalizeFrontmatter(parsed.frontmatter);
      applyFrontmatterToState(normalizedFrontmatter);
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
  console.log('Template Studio init() called');
  if (typeof window === 'undefined') return;
  window.initComposer = initComposer;
  if (window.TemplateStudio && window.TemplateStudio.__initialized) return;

  // Add debug functions to window
  window.debugGuides = {
    render: () => {
      const guideLayer = document.getElementById('guideLayer');
      const previewGrid = document.getElementById('previewGrid');
      console.log('[debugGuides] Manual render called');
      if (guideLayer && previewGrid) {
        renderGuides(guideLayer, previewGrid);
      }
    },
    checkElements: () => {
      console.log('[debugGuides] Checking elements:', {
        guideLayer: document.getElementById('guideLayer'),
        previewGrid: document.getElementById('previewGrid'),
        guideButtons: document.querySelectorAll('.guide-btn').length,
        state: window.TemplateStudio?.state?.guideSettings
      });
    },
    toggleGuide: (guide) => {
      console.log(`[debugGuides] Toggling ${guide}`);
      if (window.TemplateStudio?.state) {
        window.TemplateStudio.state.guideSettings[guide] = !window.TemplateStudio.state.guideSettings[guide];
        window.TemplateStudio.renderPreview(document.getElementById('previewGrid'));
      }
    },
    renderProduction: () => {
      console.log('[debugGuides] Manual production render');
      const container = document.getElementById('productionPreview');
      if (container) {
        container._forceRender = true;
        import('./canvas/production-renderer.js').then(({ renderProductionSlide }) => {
          renderProductionSlide(container).then(() => {
            container._forceRender = false;
            console.log('[debugGuides] Production render complete');
          });
        });
      }
    },
    renderSlide: () => {
      console.log('[debugGuides] Manual slide render');
      const container = document.getElementById('slidePreview');
      if (container) {
        import('./canvas/rendered-view.js').then(({ renderSlidePreview }) => {
          renderSlidePreview(container);
          console.log('[debugGuides] Slide render complete');
        });
      }
    },
    synchronizePreviews: () => {
      console.log('[debugGuides] Manual synchronize previews');
      if (window.TemplateStudio?.synchronizePreviewDimensions) {
        window.TemplateStudio.synchronizePreviewDimensions();
      }
    }
  };

  // Cleanup any existing event listeners before re-initializing
  cleanupAllEventListeners();

  // Gather all control elements
  const controls = {
    templateName: document.getElementById('templateName'),
    canvasWidth: document.getElementById('canvasWidth'),
    canvasHeight: document.getElementById('canvasHeight'),
    columnCount: document.getElementById('columnCount'),
    rowCount: document.getElementById('rowCount'),
    columnSize: document.getElementById('columnSize'),
    rowSize: document.getElementById('rowSize'),
    gridGap: document.getElementById('gridGap'),
    previewGrid: document.getElementById('previewGrid'),
    canvasContainer: document.getElementById('canvasContainer'),
    slidePreviewSurface: document.getElementById('slidePreview'),
    productionPreviewSurface: document.getElementById('productionPreview'),
    presetButtons: Array.from(document.querySelectorAll('.preset-btn')),
    presetStatus: document.getElementById('presetStatus'),
    snippetOutput: document.getElementById('snippetOutput'),
    resetNames: document.getElementById('resetNames'),
    openCssGrid: document.getElementById('openCssGrid'),
    copySnippet: document.getElementById('copySnippet'),
    saveMdx: document.getElementById('saveMdx'),
    downloadPptx: document.getElementById('downloadPptx'),
    importMdxBtn: document.getElementById('importMdxBtn'),
    mdxFileInput: document.getElementById('mdxFileInput'),
    deleteSelectedBtn: document.getElementById('deleteSelectedBtn'),
    clearAllBtn: document.getElementById('clearAllBtn'),
    addRegionBtn: document.getElementById('addRegionBtn'),
    exclusions: {
      top: document.getElementById('exclusionTop'),
      bottom: document.getElementById('exclusionBottom'),
      left: document.getElementById('exclusionLeft'),
      right: document.getElementById('exclusionRight')
    },
    paginationInputs: {
      pageNumber: document.getElementById('pageNumberInput'),
      totalSlides: document.getElementById('totalSlidesInput'),
      pageLabel: document.getElementById('pageLabelInput')
    },
    previewToggles: {
      previewChrome: document.getElementById('previewChromeToggle'),
      regionOutlines: document.getElementById('regionOutlineToggle'),
      diagnostics: document.getElementById('diagnosticsToggle'),
      backgroundShapes: document.getElementById('backgroundShapesToggle')
    },
    brandSelect: document.getElementById('brandSelect'),
    brandThemeSelect: document.getElementById('brandThemeSelect'),
    brandLabel: document.getElementById('brandLabel'),
    brandVariantLabel: document.getElementById('brandVariantLabel'),
    brandLogo: document.getElementById('brandLogo'),
    brandTokens: document.getElementById('brandTokens'),
    brandEditorialList: document.getElementById('brandEditorialList')
  };

  // Re-export for global access - will be set after initialization
  let synchronizePreviewDimensionsFn = null;

  // Create render functions that close over the controls
  const renderPreviewFn = () => renderPreview(controls.previewGrid);
  const renderSnippetFn = () => renderSnippet(controls.snippetOutput, controls);
  const renderRegionsTableFn = () => renderRegionsTable();

  // Attach all control handlers
  console.log('[main] About to attach control handlers');
  const { synchronizePreviewDimensions } = attachControlHandlers(controls, renderPreviewFn, renderSnippetFn, renderRegionsTableFn);
  console.log('[main] Control handlers attached');
  
  // Store the function for later use
  synchronizePreviewDimensionsFn = synchronizePreviewDimensions;

  // Apply canvas dimensions
  applyCanvasDimensions(controls);

  // Ensure we have a fallback layout before initial render
  seedFallbackLayout();

  // Initial render - wait for browser layout
  requestAnimationFrame(() => {
    console.log('[main] Initial render starting');
    
    // Check if guide buttons exist
    const guideButtons = document.querySelectorAll('.guide-btn');
    console.log('[main] Guide buttons in DOM:', {
      count: guideButtons.length,
      buttons: Array.from(guideButtons).map(b => ({
        guide: b.dataset.guide,
        visible: b.offsetParent !== null,
        rect: b.getBoundingClientRect()
      }))
    });
    
    renderPreviewFn();
    renderSnippetFn();
    console.log('[main] Initial render complete');
    
    // Synchronize preview dimensions after initial render
    setTimeout(() => {
      if (synchronizePreviewDimensionsFn) {
        synchronizePreviewDimensionsFn();
      }
    }, 200);
  });

  // Initialize brand controls
  // Initialize brand dropdown
  if (controls.brandSelect) {
    const brands = listBrandOptions();
    controls.brandSelect.innerHTML = '';
    brands.forEach(brand => {
      const option = document.createElement('option');
      option.value = brand.id;
      option.textContent = brand.label;
      controls.brandSelect.appendChild(option);
    });
    
    // Select first brand and trigger update
    if (brands.length > 0) {
      controls.brandSelect.value = brands[0].id;
      controls.brandSelect.dispatchEvent(new Event('change'));
      
      // Update brand label directly
      if (controls.brandLabel) {
        controls.brandLabel.textContent = brands[0].label;
      }
    }
  }
  
  // Handle theme dropdown changes
  if (controls.brandThemeSelect) {
    controls.brandThemeSelect.addEventListener('change', (e) => {
      if (controls.brandSelect && window.TemplateStudio && window.TemplateStudio.applyBrandTheme) {
        const brand = controls.brandSelect.value;
        const variant = e.target.value;
        
        // Update state first
        state.brand = { id: brand, variant };
        
        // Get snapshot for logo update
        const snapshot = getBrandSnapshot(brand, variant);
        
        window.TemplateStudio.applyBrandTheme(brand, variant);
        
        // Dispatch event to update UI
        document.dispatchEvent(new CustomEvent('brandStateChanged', { 
          detail: { brand, variant } 
        }));
        
        // Also update brand label directly
        if (controls.brandLabel) {
          if (snapshot) {
            controls.brandLabel.textContent = snapshot.label || snapshot.id;
          }
        }
        
        // Update logo directly
        if (controls.brandLogo && snapshot) {
          const variantKey = variant === 'light' ? 'light' : 'dark';
          const fallbackKey = variantKey === 'light' ? 'dark' : 'light';
          const logoSrc = snapshot.assets?.logo?.[variantKey] || snapshot.assets?.logo?.[fallbackKey] || '';
          if (logoSrc) {
            controls.brandLogo.src = logoSrc;
            controls.brandLogo.hidden = false;
          } else {
            controls.brandLogo.hidden = true;
          }
        }
      }
    });
  }
  
  // Handle brand dropdown changes
  if (controls.brandSelect && controls.brandThemeSelect) {
    controls.brandSelect.addEventListener('change', (e) => {
      const brand = e.target.value;
      
      // Populate theme variants for the selected brand
      const variants = listBrandThemeOptions(brand);
      controls.brandThemeSelect.innerHTML = '';
      variants.forEach(variant => {
        const option = document.createElement('option');
        option.value = variant.id;
        option.textContent = variant.label;
        controls.brandThemeSelect.appendChild(option);
      });
      
      // Apply the first variant
      if (variants.length > 0 && window.TemplateStudio && window.TemplateStudio.applyBrandTheme) {
        const variant = variants[0].id;
        controls.brandThemeSelect.value = variant;
        
        // Update state first
        state.brand = { id: brand, variant };
        
        // Get snapshot for logo update
        const snapshot = getBrandSnapshot(brand, variant);
        
        window.TemplateStudio.applyBrandTheme(brand, variant);
        
        // Dispatch event to update UI
        document.dispatchEvent(new CustomEvent('brandStateChanged', { 
          detail: { brand, variant } 
        }));
        
        // Also update brand label directly
        if (controls.brandLabel) {
          if (snapshot) {
            controls.brandLabel.textContent = snapshot.label || snapshot.id;
          }
        }
        
        // Update logo directly
        if (controls.brandLogo && snapshot) {
          const variantKey = variant === 'light' ? 'light' : 'dark';
          const fallbackKey = variantKey === 'light' ? 'dark' : 'light';
          const logoSrc = snapshot.assets?.logo?.[variantKey] || snapshot.assets?.logo?.[fallbackKey] || '';
          if (logoSrc) {
            controls.brandLogo.src = logoSrc;
            controls.brandLogo.hidden = false;
          } else {
            controls.brandLogo.hidden = true;
          }
        }
      }
    });
  }

  // Set up global references IMMEDIATELY
  window.TemplateStudio = {
    state,
    renderPreview,
    renderSlidePreview,
    renderProductionSlide,
    cleanupProductionRender,
    renderGuides,
    synchronizePreviewDimensions: synchronizePreviewDimensionsFn,
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
        // Trigger render if we just seeded
        if (window.TemplateStudio?.renderPreview) {
          window.TemplateStudio.renderPreview();
        }
      }
    })
    .catch(() => {
      seedFallbackLayout();
      // Trigger render if we just seeded
      if (window.TemplateStudio?.renderPreview) {
        window.TemplateStudio.renderPreview();
      }
    });

  if (typeof document !== 'undefined') {
    document.addEventListener('masterTemplateHydrated', () => {
      if (!state.boxes?.length) {
        seedFallbackLayout();
        // Trigger re-render if we just seeded the layout
        if (window.TemplateStudio?.renderPreview) {
          window.TemplateStudio.renderPreview();
        }
      }
    });
  }

  window.TemplateStudio.__initialized = true;
  console.log('Template Studio initialized');
}

// Auto-initialize if this module is loaded directly (guarded so it only happens once)
if (typeof window !== 'undefined' && !window.TemplateStudio?.__initialized) {
  console.log('Auto-initializing Template Studio');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}