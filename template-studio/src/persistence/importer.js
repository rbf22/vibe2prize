import { state, pushHistory } from '../state.js';
import { applyBrandTheme, emitBrandStateChanged } from '../branding/brands.js';
import { validateFrontmatter } from '../../../core/mdx/schema.js';

const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---/;

function parseScalar(value) {
  if (value === undefined || value === null) return '';
  const trimmed = value.trim();
  if (!trimmed.length) return '';
  if (trimmed === 'true' || trimmed === 'false') {
    return trimmed === 'true';
  }
  if (!Number.isNaN(Number(trimmed)) && !/^0[0-9]+$/.test(trimmed)) {
    return Number(trimmed);
  }
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith('\'') && trimmed.endsWith('\''))) {
    const sliceStart = trimmed.startsWith('"') ? 1 : 1;
    const sliceEnd = trimmed.endsWith('"') ? trimmed.length - 1 : trimmed.length - 1;
    return trimmed.slice(sliceStart, sliceEnd).replace(/\\"/g, '"');
  }
  return trimmed;
}

function peekNext(lines, startIndex) {
  for (let i = startIndex; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw) continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    const indent = raw.match(/^\s*/)[0].length;
    return { indent, trimmed };
  }
  return null;
}

function createContainer(parent, key, indent, nextLineInfo) {
  const isArray = nextLineInfo?.trimmed.startsWith('- ');
  const container = isArray ? [] : {};
  parent[key] = container;
  return { indent, type: isArray ? 'array' : 'object', value: container };
}

function ensureArrayContainer(entry, indent) {
  if (entry.type === 'array') return entry;
  const arr = [];
  entry.value.push(arr);
  return { indent, type: 'array', value: arr };
}

function parseFrontmatterBlock(block) {
  const lines = block.split('\n');
  const root = {};
  const stack = [{ indent: -1, type: 'object', value: root }];

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    if (!rawLine) continue;
    const indent = rawLine.match(/^\s*/)[0].length;
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    while (indent <= stack[stack.length - 1].indent && stack.length > 1) {
      stack.pop();
    }

    const parentEntry = stack[stack.length - 1];

    if (trimmed.startsWith('- ')) {
      if (parentEntry.type !== 'array') {
        throw new Error('Unexpected list item');
      }

      const itemContent = trimmed.slice(2).trim();
      if (!itemContent.length) {
        const obj = {};
        parentEntry.value.push(obj);
        stack.push({ indent, type: 'object', value: obj });
        continue;
      }

      const keyMatch = itemContent.match(/^([^:]+):(.*)$/);
      if (keyMatch) {
        const obj = {};
        parentEntry.value.push(obj);
        stack.push({ indent, type: 'object', value: obj });
        const key = keyMatch[1].trim();
        const val = keyMatch[2].trim();
        if (val) {
          obj[key] = parseScalar(val);
        } else {
          const nextInfo = peekNext(lines, i + 1);
          const childEntry = createContainer(obj, key, indent, nextInfo);
          stack.push(childEntry);
        }
      } else {
        parentEntry.value.push(parseScalar(itemContent));
      }
      continue;
    }

    const keyValueMatch = trimmed.match(/^([^:]+):(.*)$/);
    if (!keyValueMatch) {
      continue;
    }
    const key = keyValueMatch[1].trim();
    const rawValue = keyValueMatch[2].trim();

    if (!rawValue) {
      const nextInfo = peekNext(lines, i + 1);
      const entry = createContainer(parentEntry.value, key, indent, nextInfo);
      stack.push(entry);
    } else {
      parentEntry.value[key] = parseScalar(rawValue);
    }
  }

  return root;
}

function createComponentFromRegion(region, fallbackId) {
  if (!region || typeof region !== 'object') return null;
  const id = typeof region.id === 'string' && region.id.trim() ? region.id : fallbackId;
  const area = typeof region.area === 'string' && region.area.trim() ? region.area : id;
  if (!id || !area) return null;
  const component = {
    type: 'GridArea',
    id,
    role: typeof region.role === 'string' && region.role.trim() ? region.role : 'supporting-text',
    area,
  };
  if (typeof region.maxWords === 'number') {
    component.maxWords = region.maxWords;
  }
  return component;
}

function buildComponentsFromRegions(regions = []) {
  const components = [];
  regions.forEach((region, index) => {
    const fallbackId = `region-${index + 1}`;
    const component = createComponentFromRegion(region, fallbackId);
    if (component) {
      components.push(component);
    }
  });
  return components;
}

function normalizeLayoutComponents(frontmatter) {
  if (!frontmatter || typeof frontmatter !== 'object') return;
  if (!frontmatter.layout || typeof frontmatter.layout !== 'object') {
    frontmatter.layout = {};
  }

  const layout = frontmatter.layout;
  const regions = Array.isArray(frontmatter.regions) ? frontmatter.regions : [];

  if (!Array.isArray(layout.components) || layout.components.length === 0) {
    layout.components = buildComponentsFromRegions(regions);
    return;
  }

  const hasNonObjectEntry = layout.components.some((component) => component === null || typeof component !== 'object');
  if (hasNonObjectEntry) {
    layout.components = buildComponentsFromRegions(regions);
  }
}

function normalizeFrontmatter(frontmatter) {
  if (!frontmatter || typeof frontmatter !== 'object') {
    return frontmatter;
  }
  normalizeLayoutComponents(frontmatter);
  return frontmatter;
}

export function parseMDXFrontmatter(content) {
  if (!content || typeof content !== 'string') {
    return { success: false, errors: ['Content must be a non-empty string'], frontmatter: null, body: null };
  }

  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { success: false, errors: ['Missing MDX frontmatter'], frontmatter: null, body: null };
  }

  const [, frontmatterText, body] = match;

  let frontmatter;
  try {
    frontmatter = parseFrontmatterBlock(frontmatterText);
  } catch (error) {
    return { 
      success: false, 
      errors: [`Failed to parse frontmatter YAML: ${error.message}`], 
      frontmatter: null, 
      body 
    };
  }

  return { success: true, errors: [], frontmatter, body };
}

export function getInputById(id) {
  if (typeof document === 'undefined') return null;
  return document.getElementById(id);
}

export function setCheckboxChecked(id, checked) {
  const input = getInputById(id);
  if (input) {
    input.checked = Boolean(checked);
  }
}

export function applyFrontmatterToState(frontmatter) {
  pushHistory();
  const { layout = {}, regions = [], templateSettings = {}, exclusions = {}, brand: brandInput } = frontmatter || {};

  const updateInputValue = (id, value) => {
    const input = getInputById(id);
    if (input) input.value = value;
  };

  const sanitizeNumber = (value, fallback = 0) => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  if (frontmatter?.title || layout?.template) {
    state.templateName = frontmatter?.title || layout?.template;
    updateInputValue('templateName', state.templateName);
  }

  if (typeof layout?.rows === 'number') {
    state.rows = layout.rows;
    updateInputValue('rowCount', state.rows);
  } else if (typeof templateSettings?.rows === 'number') {
    state.rows = templateSettings.rows;
    updateInputValue('rowCount', state.rows);
  }

  if (typeof layout?.columns === 'number') {
    state.columns = layout.columns;
    updateInputValue('columnCount', state.columns);
  } else if (typeof templateSettings?.columns === 'number') {
    state.columns = templateSettings.columns;
    updateInputValue('columnCount', state.columns);
  }

  if (typeof layout?.gap === 'number' && !Number.isNaN(layout.gap)) {
    state.gap = layout.gap;
    updateInputValue('gridGap', state.gap);
  } else if (typeof templateSettings?.gap === 'number' && !Number.isNaN(templateSettings.gap)) {
    state.gap = templateSettings.gap;
    updateInputValue('gridGap', state.gap);
  }

  if (templateSettings?.canvasWidth !== undefined) {
    state.canvasWidth = sanitizeNumber(templateSettings.canvasWidth, state.canvasWidth);
    updateInputValue('canvasWidth', state.canvasWidth);
  }

  if (templateSettings?.canvasHeight !== undefined) {
    state.canvasHeight = sanitizeNumber(templateSettings.canvasHeight, state.canvasHeight);
    updateInputValue('canvasHeight', state.canvasHeight);
  }

  if (typeof templateSettings?.columnSize === 'string') {
    state.columnSize = templateSettings.columnSize;
    updateInputValue('columnSize', state.columnSize);
  }

  if (typeof templateSettings?.rowSize === 'string') {
    state.rowSize = templateSettings.rowSize;
    updateInputValue('rowSize', state.rowSize);
  }

  if (brandInput && typeof brandInput === 'object') {
    const applied = applyBrandTheme(brandInput.id, brandInput.variant);
    state.brand = {
      id: applied?.brandId || brandInput.id || state.brand?.id,
      variant: applied?.variant || brandInput.variant || state.brand?.variant
    };
    emitBrandStateChanged(state.brand);
  }

  if (frontmatter?.pagination && typeof frontmatter.pagination === 'object') {
    const fallbackPagination = state.pagination || { pageNumber: 1, totalSlides: 1, label: 'Page' };
    const parsePositive = (value, fallback) => {
      const parsed = sanitizeNumber(value, fallback);
      return parsed > 0 ? parsed : fallback;
    };
    const pageNumber = parsePositive(frontmatter.pagination.pageNumber, fallbackPagination.pageNumber || 1);
    const totalSlides = Math.max(pageNumber, parsePositive(frontmatter.pagination.totalSlides, fallbackPagination.totalSlides || pageNumber));
    const label = typeof frontmatter.pagination.label === 'string' && frontmatter.pagination.label.trim()
      ? frontmatter.pagination.label.trim()
      : (fallbackPagination.label || 'Page');
    state.pagination = {
      pageNumber,
      totalSlides,
      label,
    };
    updateInputValue('pageNumberInput', state.pagination.pageNumber);
    updateInputValue('totalSlidesInput', state.pagination.totalSlides);
    updateInputValue('pageLabelInput', state.pagination.label);
  }

  if (frontmatter?.previewFlags && typeof frontmatter.previewFlags === 'object') {
    const normalize = (value, fallback) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lowered = value.toLowerCase();
        if (lowered === 'true') return true;
        if (lowered === 'false') return false;
      }
      return fallback;
    };
    const fallbackFlags = state.previewFlags || {
      previewChrome: true,
      showDiagnostics: true,
      showRegionOutlines: true,
      detectDomOverflow: true
    };
    state.previewFlags = {
      previewChrome: normalize(frontmatter.previewFlags.previewChrome, fallbackFlags.previewChrome),
      showDiagnostics: normalize(frontmatter.previewFlags.showDiagnostics, fallbackFlags.showDiagnostics),
      showRegionOutlines: normalize(frontmatter.previewFlags.showRegionOutlines, fallbackFlags.showRegionOutlines),
      detectDomOverflow: normalize(frontmatter.previewFlags.detectDomOverflow, fallbackFlags.detectDomOverflow)
    };
    setCheckboxChecked('previewChromeToggle', state.previewFlags.previewChrome);
    setCheckboxChecked('diagnosticsToggle', state.previewFlags.showDiagnostics);
    setCheckboxChecked('regionOutlineToggle', state.previewFlags.showRegionOutlines);
  }

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const sanitizeExclusion = (value, limit) => clamp(Math.max(0, sanitizeNumber(value, 0)), 0, Math.max(limit, 0));

  state.boxes = [];
  state.metadata = {};
  state.selectedBoxId = null;

  (regions || []).forEach((region, index) => {
    const grid = region.grid || {};
    const id = region.id || `box-${Date.now()}-${index}`;
    const box = {
      id,
      name: region.area || `region-${index + 1}`,
      gridX: grid.x ?? 0,
      gridY: grid.y ?? 0,
      gridWidth: grid.width ?? 1,
      gridHeight: grid.height ?? 1,
      metadata: (() => {
        const fieldTypes = Array.isArray(region.fieldTypes) && region.fieldTypes.length
          ? [...region.fieldTypes]
          : (region.role ? [region.role] : []);
        const metadata = {
          required: Boolean(region.required),
          inputType: region.inputType || 'any',
          fieldTypes,
          llmHint: region.llmHint || '',
        };
        if (typeof region.maxWords === 'number') {
          metadata.maxWords = region.maxWords;
        }
        if (region.type) {
          metadata.type = region.type;
        }
        return metadata;
      })(),
    };
    state.boxes.push(box);
    state.metadata[id] = box.metadata;
  });

  if (exclusions && typeof exclusions === 'object') {
    let left = sanitizeExclusion(exclusions.left, state.columns);
    let right = sanitizeExclusion(exclusions.right, state.columns);
    const maxHorizontal = Math.max(0, state.columns - 1);
    if (left + right > maxHorizontal) {
      right = Math.max(0, maxHorizontal - left);
    }

    let top = sanitizeExclusion(exclusions.top, state.rows);
    let bottom = sanitizeExclusion(exclusions.bottom, state.rows);
    const maxVertical = Math.max(0, state.rows - 1);
    if (top + bottom > maxVertical) {
      bottom = Math.max(0, maxVertical - top);
    }

    state.exclusions = { top, bottom, left, right };

    updateInputValue('exclusionTop', state.exclusions.top);
    updateInputValue('exclusionBottom', state.exclusions.bottom);
    updateInputValue('exclusionLeft', state.exclusions.left);
    updateInputValue('exclusionRight', state.exclusions.right);
  }
}

export async function importMDXContent(content) {
  const parseResult = parseMDXFrontmatter(content);
  
  if (!parseResult.success) {
    return parseResult;
  }

  const { frontmatter, body } = parseResult;

  normalizeFrontmatter(frontmatter);

  // Validate frontmatter using shared schema
  const validation = validateFrontmatter(frontmatter);
  if (!validation.valid) {
    return { 
      success: false, 
      errors: validation.errors, 
      frontmatter: null, 
      body 
    };
  }

  // Apply frontmatter to state (only in browser context)
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      applyFrontmatterToState(frontmatter);
    } catch (error) {
      return { 
        success: false, 
        errors: [`Failed to apply frontmatter to state: ${error.message}`], 
        frontmatter, 
        body 
      };
    }
  }

  return { success: true, errors: [], frontmatter, body };
}

export function importMDXFile(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const content = e.target.result;
      const result = await importMDXContent(content);
      
      if (result.success) {
        alert(`Successfully imported ${result.frontmatter.title || 'MDX file'} with ${(result.frontmatter.regions || []).length} regions`);
        // Trigger custom event for UI updates
        document.dispatchEvent(new CustomEvent('mdxImported', { detail: result }));
      } else {
        alert(`Failed to import MDX file: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      alert(`Failed to import MDX file: ${error.message}`);
    }
  };
  reader.onerror = () => {
    alert('Failed to read MDX file');
  };

  reader.readAsText(file);
}
