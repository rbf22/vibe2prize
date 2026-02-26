import { state } from '../state.js';
import { downloadMdxFile } from '../persistence/mdx.js';
import { importMDXFile } from '../persistence/importer.js';
import { applyRoleMetadataToBox, getRoleForPreset } from './semantic-presets.js';

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
  controls.previewGrid.style.aspectRatio = ratio;
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
  
  if (controls.deleteSelectedBtn) {
    controls.deleteSelectedBtn.disabled = !state.selectedBoxId;
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
  let resizeFrame = null;
  const handleWindowResize = () => {
    if (typeof window === 'undefined') return;
    if (resizeFrame !== null) {
      window.cancelAnimationFrame(resizeFrame);
    }
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = null;
      renderPreview();
    });
  };

  if (typeof window !== 'undefined') {
    if (window.__templateStudioResizeHandler) {
      window.removeEventListener('resize', window.__templateStudioResizeHandler);
    }
    window.__templateStudioResizeHandler = handleWindowResize;
    window.addEventListener('resize', handleWindowResize);
  }

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
    state.columns = Math.max(1, Math.min(100, Number(e.target.value) || 80));
    e.target.value = state.columns;
    renderPreview();
    renderSnippet();
  });

  controls.rowCount.addEventListener('input', (e) => {
    state.rows = Math.max(1, Math.min(60, Number(e.target.value) || 45));
    e.target.value = state.rows;
    renderPreview();
    renderSnippet();
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
      // This will be handled by the interactions module
    });
  }

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
    renderPreview();
    renderSnippet();
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
