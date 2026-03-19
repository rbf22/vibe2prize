import { state } from '../state.js';
import { downloadMdxFile } from '../persistence/mdx.js';
import { exportToPptx } from '../persistence/pptx.js';
import { importMDXFile } from '../persistence/importer.js';
import { applyRoleMetadataToBox, getRoleForPreset } from './semantic-presets.js';
import { applyBrandTheme, listBrandOptions, listBrandThemeOptions, getBrandSnapshot, emitBrandStateChanged } from '../branding/brands.js';
import { hydrateMasterTemplate } from '../main.js';

export function slugify(value, fallback) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return slug || fallback;
}

export function applyCanvasDimensions(controls) {
  const ratio = `${state.canvasWidth} / ${state.canvasHeight}`;
  const targetElements = [
    controls.previewGrid,
    controls.canvasContainer,
    controls.slidePreviewSurface,
    controls.productionPreviewSurface
  ].filter(Boolean);
  targetElements.forEach((element) => {
    element.style.setProperty('--canvas-width', `${state.canvasWidth}px`);
    element.style.setProperty('--canvas-height', `${state.canvasHeight}px`);
    element.style.aspectRatio = ratio;
  });
  controls.previewGrid.dataset.canvas = `${state.canvasWidth}×${state.canvasHeight}`;
}

export function applyReferenceOverlay(controls) {
  if (state.referenceBackground) {
    controls.previewGrid.style.backgroundImage = `url(${state.referenceBackground})`;
  } else {
    controls.previewGrid.style.backgroundImage = 'none';
  }
}

export function updateSelectionControls(controls) {
  if (!controls) return;
  
  console.log('updateSelectionControls called, selectedBoxId:', state.selectedBoxId);
  if (controls.deleteSelectedBtn) {
    controls.deleteSelectedBtn.disabled = !state.selectedBoxId;
    console.log('deleteSelectedBtn.disabled set to:', controls.deleteSelectedBtn.disabled);
  }

  if (controls.presetButtons) {
    const hasSelection = Boolean(state.selectedBoxId);
    controls.presetButtons.forEach((btn) => {
      const preset = btn.dataset?.preset;
      btn.disabled = preset !== 'clear' && !hasSelection;
    });
    if (controls.presetStatus) {
      controls.presetStatus.textContent = hasSelection
        ? 'Choose a semantic role to apply metadata to the selected region.'
        : 'Select a region before applying semantic metadata presets.';
    }
  }
}

function ensurePaginationState() {
  if (!state.pagination) {
    state.pagination = {
      pageNumber: 1,
      totalSlides: 1,
      label: 'Page'
    };
  }
}

function ensurePreviewFlagState() {
  if (!state.previewFlags) {
    state.previewFlags = {
      previewChrome: true,
      showDiagnostics: true,
      showRegionOutlines: true,
      detectDomOverflow: true,
      showBackgroundShapes: true
    };
  }
}

function syncPaginationControls(controls) {
  if (!controls?.paginationInputs) return;
  ensurePaginationState();
  const { pageNumber, totalSlides, label } = controls.paginationInputs;
  if (pageNumber) pageNumber.value = state.pagination.pageNumber ?? 1;
  if (totalSlides) totalSlides.value = state.pagination.totalSlides ?? state.pagination.pageNumber ?? 1;
  if (label) label.value = state.pagination.label || 'Page';
}

function syncPreviewFlagControls(controls) {
  if (!controls?.previewToggles) return;
  ensurePreviewFlagState();
  const { previewChrome, regionOutlines, diagnostics, domOverflow, backgroundShapes } = controls.previewToggles;
  if (previewChrome) previewChrome.checked = !!state.previewFlags.previewChrome;
  if (regionOutlines) regionOutlines.checked = !!state.previewFlags.showRegionOutlines;
  if (diagnostics) diagnostics.checked = !!state.previewFlags.showDiagnostics;
  if (domOverflow) domOverflow.checked = !!state.previewFlags.detectDomOverflow;
  if (backgroundShapes) backgroundShapes.checked = !!state.previewFlags.showBackgroundShapes;
}

function coerceInt(value, { fallback = 0, min = -Infinity, max = Infinity } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const clamped = Math.max(min, Math.min(max, Math.floor(parsed)));
  return clamped;
}

function initializeRendererControls(controls, renderPreview) {
  if (!controls) return;
  syncPaginationControls(controls);
  syncPreviewFlagControls(controls);

  const paginationInputs = controls.paginationInputs || {};
  const previewToggles = controls.previewToggles || {};

  if (paginationInputs.pageNumber) {
    paginationInputs.pageNumber.addEventListener('input', (event) => {
      ensurePaginationState();
      const nextPage = coerceInt(event.target.value, {
        fallback: state.pagination.pageNumber || 1,
        min: 1,
        max: 999
      });
      state.pagination.pageNumber = nextPage;
      if (!Number.isFinite(state.pagination.totalSlides) || state.pagination.totalSlides < nextPage) {
        state.pagination.totalSlides = nextPage;
      }
      syncPaginationControls(controls);
      renderPreview();
    });
  }

  if (paginationInputs.totalSlides) {
    paginationInputs.totalSlides.addEventListener('input', (event) => {
      ensurePaginationState();
      const minTotal = Math.max(1, state.pagination.pageNumber || 1);
      const nextTotal = coerceInt(event.target.value, {
        fallback: state.pagination.totalSlides || minTotal,
        min: minTotal,
        max: 999
      });
      state.pagination.totalSlides = nextTotal;
      syncPaginationControls(controls);
      renderPreview();
    });
  }

  if (paginationInputs.label) {
    paginationInputs.label.addEventListener('input', (event) => {
      ensurePaginationState();
      const nextLabel = event.target.value?.trim() || 'Page';
      state.pagination.label = nextLabel;
      syncPaginationControls(controls);
      renderPreview();
    });
  }

  if (previewToggles.previewChrome) {
    previewToggles.previewChrome.addEventListener('change', (event) => {
      ensurePreviewFlagState();
      state.previewFlags.previewChrome = !!event.target.checked;
      syncPreviewFlagControls(controls);
      renderPreview();
    });
  }

  if (previewToggles.regionOutlines) {
    previewToggles.regionOutlines.addEventListener('change', (event) => {
      ensurePreviewFlagState();
      state.previewFlags.showRegionOutlines = !!event.target.checked;
      syncPreviewFlagControls(controls);
      renderPreview();
    });
  }

  if (previewToggles.diagnostics) {
    previewToggles.diagnostics.addEventListener('change', (event) => {
      ensurePreviewFlagState();
      state.previewFlags.showDiagnostics = !!event.target.checked;
      syncPreviewFlagControls(controls);
      renderPreview();
    });
  }

  if (previewToggles.backgroundShapes) {
    previewToggles.backgroundShapes.addEventListener('change', (event) => {
      ensurePreviewFlagState();
      state.previewFlags.showBackgroundShapes = !!event.target.checked;
      syncPreviewFlagControls(controls);
      renderPreview();
    });
  }
}

export function normalizeExclusions(controls) {
  const maxHorizontal = Math.max(0, state.columns - 1);
  const maxVertical = Math.max(0, state.rows - 1);

  state.exclusions.left = Math.max(0, Math.min(state.exclusions.left, state.columns));
  state.exclusions.right = Math.max(0, Math.min(state.exclusions.right, state.columns));
  if (state.exclusions.left + state.exclusions.right > maxHorizontal) {
    state.exclusions.right = Math.max(0, maxHorizontal - state.exclusions.left);
  }

  state.exclusions.top = Math.max(0, Math.min(state.exclusions.top, state.rows));
  state.exclusions.bottom = Math.max(0, Math.min(state.exclusions.bottom, state.rows));
  if (state.exclusions.top + state.exclusions.bottom > maxVertical) {
    state.exclusions.bottom = Math.max(0, maxVertical - state.exclusions.top);
  }

  if (controls.exclusions) {
    Object.entries(controls.exclusions).forEach(([key, input]) => {
      if (input) input.value = state.exclusions[key];
    });
  }
}

export function getCellDimensions(previewGrid) {
  const rect = previewGrid.getBoundingClientRect();
  return {
    cellWidth: rect.width / state.columns,
    cellHeight: rect.height / state.rows
  };
}

export function attachControlHandlers(controls, renderPreview, renderSnippet, renderRegionsTable) {

  controls.templateName.addEventListener('input', (e) => {
    state.templateName = slugify(e.target.value, 'cssgrid-template');
    e.target.value = state.templateName;
    renderSnippet();
  });

  controls.canvasWidth.addEventListener('input', (e) => {
    state.canvasWidth = Math.max(320, Math.min(7680, Number(e.target.value) || 1920));
    e.target.value = state.canvasWidth;
    applyCanvasDimensions(controls);
    renderPreview();
  });

  controls.canvasHeight.addEventListener('input', (e) => {
    state.canvasHeight = Math.max(240, Math.min(4320, Number(e.target.value) || 1080));
    e.target.value = state.canvasHeight;
    applyCanvasDimensions(controls);
    renderPreview();
  });

  controls.columnCount.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    if (!isNaN(val) && val > 0) {
      state.columns = Math.max(1, Math.min(100, val));
      renderPreview();
      renderSnippet();
      renderRegionsTable();
    }
  });

  controls.columnCount.addEventListener('change', (e) => {
    state.columns = Math.max(1, Math.min(100, Number(e.target.value) || 80));
    e.target.value = state.columns;
    renderPreview();
    renderSnippet();
    renderRegionsTable();
  });

  controls.rowCount.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    if (!isNaN(val) && val > 0) {
      state.rows = Math.max(1, Math.min(60, val));
      renderPreview();
      renderSnippet();
      renderRegionsTable();
    }
  });

  controls.rowCount.addEventListener('change', (e) => {
    state.rows = Math.max(1, Math.min(60, Number(e.target.value) || 45));
    e.target.value = state.rows;
    renderPreview();
    renderSnippet();
    renderRegionsTable();
  });

  controls.columnSize.addEventListener('input', (e) => {
    state.columnSize = e.target.value;
    renderSnippet();
  });

  controls.rowSize.addEventListener('input', (e) => {
    state.rowSize = e.target.value;
    renderSnippet();
  });

  controls.gridGap.addEventListener('input', (e) => {
    state.gap = e.target.value;
    renderPreview();
    renderSnippet();
  });

  controls.resetNames.addEventListener('click', () => {
    state.boxes.forEach((box, index) => {
      box.name = `region-${index + 1}`;
    });
    renderPreview();
    renderRegionsTable();
  });

  controls.openCssGrid.addEventListener('click', () => {
    window.open('https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout', '_blank');
  });

  controls.copySnippet.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(controls.snippetOutput.value);
      controls.copySnippet.textContent = 'Copied!';
      setTimeout(() => (controls.copySnippet.textContent = 'Copy Snippet'), 1500);
    } catch (error) {
      alert('Clipboard access denied. Copy manually.');
    }
  });

  if (controls.importMdxBtn && controls.mdxFileInput) {
    controls.importMdxBtn.addEventListener('click', () => {
      controls.mdxFileInput.click();
    });

    controls.mdxFileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        importMDXFile(file);
      } catch (error) {
        alert(`Failed to import MDX file: ${error.message}`);
      } finally {
        e.target.value = '';
      }
    });
  }

  if (controls.saveMdx) {
    controls.saveMdx.addEventListener('click', () => {
      if (!state.boxes.length) {
        alert('Add at least one region before exporting to MDX.');
        return;
      }

      triggerDownload();
    });
  }

  if (controls.downloadPptx) {
    controls.downloadPptx.addEventListener('click', async () => {
      if (!state.boxes.length) {
        alert('Add at least one region before exporting to PPTX.');
        return;
      }
      try {
          await exportToPptx(state);
      } catch (error) {
          console.error('Failed to export PPTX', error);
          alert('Failed to export PPTX: ' + error.message);
      }
    });
  }

  async function triggerDownload() {
    try {
      await downloadMdxFile(state);
    } catch (error) {
      console.error('Failed to export MDX', error);
      alert('Failed to export MDX. Please check your template metadata.');
    }
  }

  if (controls.deleteSelectedBtn) {
    controls.deleteSelectedBtn.addEventListener('click', () => {
      window.TemplateStudio.deleteSelectedRegion();
      renderPreview();
      renderRegionsTable();
      renderSnippet();
      updateSelectionControls(controls);
    });
  }

  if (controls.clearAllBtn) {
    controls.clearAllBtn.addEventListener('click', () => {
      console.log('clearAllBtn clicked');
      window.TemplateStudio.clearAllRegions();
      renderPreview();
      renderRegionsTable();
      renderSnippet();
      updateSelectionControls(controls);
    });
  }

  if (controls.addRegionBtn) {
    controls.addRegionBtn.addEventListener('click', () => {
      console.log('addRegionBtn clicked');
      window.TemplateStudio.addNewRegion();
      renderPreview();
      renderRegionsTable();
      renderSnippet();
      updateSelectionControls(controls);
    });
  }

  initializeBrandControls();
  initializeRendererControls(controls, renderPreview);

  // Exclusion controls
  if (controls.exclusions) {
    Object.keys(controls.exclusions).forEach(key => {
      const input = controls.exclusions[key];
      if (!input) return;
      
      input.addEventListener('input', (e) => {
        const value = parseInt(e.target.value) || 0;
        state.exclusions[key] = value;
        e.target.value = value;
        normalizeExclusions(controls);
        renderPreview();
      });
    });
  }

  // Guide toggles
  if (typeof document === 'undefined') {
    return;
  }

  const guideButtons = document.querySelectorAll('.guide-btn');
  console.log('Found guide buttons:', guideButtons.length);
  
  guideButtons.forEach(btn => {
    const key = btn.dataset.guide;
    console.log('Setting up guide button:', key);
    const toggleButtonState = () => {
      const isActive = !!state.guideSettings[key];
      btn.classList.toggle('active', isActive);
      console.log('Button state toggled:', key, isActive);
    };
    
    btn.addEventListener('click', () => {
      console.log('Guide button clicked:', key, 'before:', state.guideSettings[key]);
      state.guideSettings[key] = !state.guideSettings[key];
      console.log('Guide button clicked:', key, 'after:', state.guideSettings[key]);
      toggleButtonState();
      console.log('Calling renderPreview callback');
      renderPreview();
    });
    
    // Initialize button state
    toggleButtonState();
    console.log('Button initial state:', key, state.guideSettings[key]);
  });

  // Preset buttons
  if (controls.presetButtons?.length) {
    controls.presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        applyPreset(
          preset,
          controls,
          renderPreview,
          renderRegionsTable,
          renderSnippet
        );
      });
    });
  }

  function initializeBrandControls() {
    if (!controls.brandSelect || !controls.brandThemeSelect) return;

    populateBrandOptions();
    populateThemeOptions(state.brand?.id);
    updateBrandPanel();

    controls.brandSelect.addEventListener('change', (event) => {
      const selectedBrand = event.target.value;
      const themeOptions = listBrandThemeOptions(selectedBrand);
      const defaultVariant = themeOptions[0]?.id || 'dark';
      setBrandState(selectedBrand, defaultVariant);
      populateThemeOptions(selectedBrand);
      controls.brandThemeSelect.value = state.brand?.variant || defaultVariant;
    });

    controls.brandThemeSelect.addEventListener('change', (event) => {
      const variant = event.target.value;
      setBrandState(state.brand?.id || controls.brandSelect.value, variant);
    });

    document.addEventListener('brandStateChanged', () => {
      populateBrandOptions();
      populateThemeOptions(state.brand?.id);
      controls.brandSelect.value = state.brand?.id || controls.brandSelect.value;
      controls.brandThemeSelect.value = state.brand?.variant || controls.brandThemeSelect.value;
      updateBrandPanel();
    });

    document.addEventListener('masterTemplateHydrated', () => {
      // Re-render the canvas after master template is loaded
      renderPreview();
      renderRegionsTable();
    });
  }

  function populateBrandOptions() {
    if (!controls.brandSelect) return;
    const options = listBrandOptions();
    controls.brandSelect.innerHTML = options
      .map(({ id, label }) => `<option value="${id}">${label}</option>`)
      .join('');
    if (state.brand?.id) {
      controls.brandSelect.value = state.brand.id;
    }
  }

  function populateThemeOptions(brandId) {
    if (!controls.brandThemeSelect) return;
    const themes = listBrandThemeOptions(brandId);
    controls.brandThemeSelect.innerHTML = themes
      .map(({ id, label }) => `<option value="${id}">${label}</option>`)
      .join('');
    const desiredVariant = state.brand?.variant;
    controls.brandThemeSelect.value = themes.some(({ id }) => id === desiredVariant)
      ? desiredVariant
      : themes[0]?.id;
  }

  function setBrandState(brandId, variantId) {
    if (!brandId) return;
    const applied = applyBrandTheme(brandId, variantId);
    state.brand = {
      id: applied?.brandId || brandId,
      variant: applied?.variant || variantId
    };
    emitBrandStateChanged(state.brand);
    updateBrandPanel();
    
    // Hydrate the master template for the new brand
    hydrateMasterTemplate({ brandId, variantId, force: true });
  }

  function updateBrandPanel() {
    const snapshot = getBrandSnapshot(state.brand?.id, state.brand?.variant);
    if (!snapshot) return;

    if (controls.brandLabel) {
      controls.brandLabel.textContent = snapshot.label || snapshot.id;
    }

    if (controls.brandVariantLabel) {
      const variantLabel = snapshot.theme ? `${snapshot.theme.charAt(0).toUpperCase()}${snapshot.theme.slice(1)}` : 'Default';
      controls.brandVariantLabel.textContent = `${variantLabel} Theme`;
    }

    if (controls.brandLogo) {
      const variantKey = snapshot.theme === 'light' ? 'light' : 'dark';
      const fallbackKey = variantKey === 'light' ? 'dark' : 'light';
      const logoSrc = snapshot.assets?.logo?.[variantKey] || snapshot.assets?.logo?.[fallbackKey] || '';
      if (logoSrc) {
        controls.brandLogo.src = logoSrc;
        controls.brandLogo.hidden = false;
      } else {
        controls.brandLogo.hidden = true;
      }
    }

    if (controls.brandTokens) {
      const palette = snapshot.tokens?.palette;
      if (palette) {
        controls.brandTokens.innerHTML = Object.entries(palette)
          .map(([tokenName, value]) => (
            `<div class="brand-token">
              <span class="brand-token-swatch" style="background:${value}"></span>
              <div class="brand-token-meta">
                <span class="brand-token-name">${tokenName}</span>
                <span class="brand-token-value">${value}</span>
              </div>
            </div>`
          ))
          .join('');
      } else {
        controls.brandTokens.innerHTML = '<p class="brand-token-empty">No palette metadata</p>';
      }
    }

    if (controls.brandEditorialList) {
      const themes = snapshot.editorialThemes || [];
      controls.brandEditorialList.innerHTML = themes
        .map((theme) => `<li>${theme}</li>`)
        .join('');
    }
  }
}

export function applyPreset(
  preset,
  controls,
  renderPreview,
  renderRegionsTable,
  renderSnippet
) {
  if (preset === 'clear') {
    state.boxes = [];
    state.metadata = {};
    state.selectedBoxId = null;
    renderRegionsTable();
    const renderCanvas = () => {
      TemplateStudio.renderPreview(previewGrid);
      TemplateStudio.renderGuides(guideLayer, previewGrid);
    };

    const renderActivePreview = () => {
      const view = workbench.dataset.view;
      if (view === 'slide') {
        TemplateStudio.renderSlidePreview(slidePreview);
      } else if (view === 'production') {
        TemplateStudio.renderProductionSlide(productionPreview);
      }
    };

    renderActivePreview();
    renderCanvas();
    updateSelectionControls(controls);
    return;
  }

  if (!state.selectedBoxId) {
    alert('Select a region before applying a semantic preset.');
    return;
  }

  const targetBox = state.boxes.find((box) => box.id === state.selectedBoxId);
  if (!targetBox) {
    alert('Selected region no longer exists. Please select another region.');
    updateSelectionControls(controls);
    return;
  }

  const presetRole = getRoleForPreset(preset);
  if (!presetRole) {
    console.warn('No semantic role mapping for preset', preset);
    return;
  }

  pushHistory();
  const { role, name } = presetRole;
  applyRoleMetadataToBox(targetBox, role, { name });
  state.metadata[targetBox.id] = targetBox.metadata;

  renderRegionsTable();
  renderPreview();
  renderSnippet();
  updateSelectionControls(controls);
}

export {
  initializeRendererControls,
  syncPaginationControls,
  syncPreviewFlagControls,
  ensurePaginationState,
  ensurePreviewFlagState,
};
