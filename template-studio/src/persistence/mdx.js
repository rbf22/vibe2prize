import { validateFrontmatter } from '../../../core/mdx/schema.js';

const DEFAULT_LAYOUT_TYPE = 'grid-designer';

function escapeYamlString(value) {
  return String(value ?? '')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

function cloneObject(value) {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return { ...value };
}

function normalizeBackgroundShapes(shapes = []) {
  if (!Array.isArray(shapes)) return [];
  return shapes
    .filter(Boolean)
    .map((shape, index) => {
      const id = typeof shape.id === 'string' && shape.id.trim()
        ? shape.id.trim()
        : `background-shape-${index + 1}`;
      const normalized = { id };
      if (typeof shape.kind === 'string' && shape.kind.trim()) {
        normalized.kind = shape.kind.trim();
      }
      if (typeof shape.html === 'string') {
        normalized.html = shape.html;
      }
      if (typeof shape.svg === 'string') {
        normalized.svg = shape.svg;
      }
      if (typeof shape.className === 'string' && shape.className.trim()) {
        normalized.className = shape.className.trim();
      }
      if (typeof shape.label === 'string' && shape.label.trim()) {
        normalized.label = shape.label.trim();
      }
      if (typeof shape.blendMode === 'string' && shape.blendMode.trim()) {
        normalized.blendMode = shape.blendMode.trim();
      }
      if (typeof shape.opacity === 'number' && Number.isFinite(shape.opacity)) {
        normalized.opacity = shape.opacity;
      }
      if (typeof shape.zIndex === 'number' && Number.isFinite(shape.zIndex)) {
        normalized.zIndex = shape.zIndex;
      }
      if (shape.coords && typeof shape.coords === 'object') {
        normalized.coords = cloneObject(shape.coords);
      }
      if (shape.style && typeof shape.style === 'object') {
        normalized.style = cloneObject(shape.style);
      }
      if (shape.gridSpan && typeof shape.gridSpan === 'object') {
        normalized.gridSpan = cloneObject(shape.gridSpan);
      }
      if (shape.transform && typeof shape.transform === 'object') {
        normalized.transform = cloneObject(shape.transform);
      }
      if (shape.attrs && typeof shape.attrs === 'object') {
        normalized.attrs = cloneObject(shape.attrs);
      }
      return normalized;
    });
}

function formatScalar(value) {
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value === null) return 'null';
  return quote(String(value ?? ''));
}

function serializeYamlKeyValue(key, value, indent = 0) {
  const pad = ' '.repeat(indent);
  if (value === undefined || value === null) {
    return [`${pad}${key}: null`];
  }
  if (Array.isArray(value)) {
    if (!value.length) {
      return [`${pad}${key}: []`];
    }
    const lines = [`${pad}${key}:`];
    value.forEach((entry) => {
      if (entry && typeof entry === 'object') {
        lines.push(`${pad}  -`);
        const nested = Object.entries(entry);
        if (!nested.length) {
          lines.push(`${pad}    {}`);
        } else {
          nested.forEach(([childKey, childValue]) => {
            serializeYamlKeyValue(childKey, childValue, indent + 4).forEach((line) => {
              lines.push(line);
            });
          });
        }
      } else {
        lines.push(`${pad}  - ${formatScalar(entry)}`);
      }
    });
    return lines;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) {
      return [`${pad}${key}: {}`];
    }
    const lines = [`${pad}${key}:`];
    entries.forEach(([childKey, childValue]) => {
      serializeYamlKeyValue(childKey, childValue, indent + 2).forEach((line) => {
        lines.push(line);
      });
    });
    return lines;
  }
  return [`${pad}${key}: ${formatScalar(value)}`];
}

function serializeBackgroundShapes(shapes) {
  if (!Array.isArray(shapes) || !shapes.length) {
    return 'backgroundShapes: []';
  }
  const lines = ['backgroundShapes:'];
  shapes.forEach((shape) => {
    lines.push('  -');
    Object.entries(shape)
      .filter(([, value]) => value !== undefined)
      .forEach(([key, value]) => {
        serializeYamlKeyValue(key, value, 4).forEach((line) => {
          lines.push(line);
        });
      });
  });
  return lines.join('\n');
}

function serializePreviewFlags(flags) {
  if (!flags || typeof flags !== 'object') {
    return '';
  }
  const lines = ['previewFlags:'];
  ['previewChrome', 'showDiagnostics', 'showRegionOutlines', 'detectDomOverflow', 'showBackgroundShapes'].forEach((key) => {
    if (key in flags) {
      lines.push(`  ${key}: ${flags[key] ? 'true' : 'false'}`);
    }
  });
  return lines.join('\n');
}

function quote(value) {
  return `"${escapeYamlString(value)}"`;
}

function slugToTitle(slug) {
  if (!slug) return 'Generated Layout';
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .trim();
}

function normalizeBoxMetadata(box = {}, fallbackMetadata = {}) {
  const metadataSource = (fallbackMetadata && Object.keys(fallbackMetadata).length)
    ? fallbackMetadata
    : (box.metadata || {});
  const metadata = metadataSource || {};
  const fieldTypes = Array.isArray(metadata.fieldTypes) ? [...metadata.fieldTypes] : [];
  const normalizedFieldTypes = fieldTypes.length
    ? fieldTypes
    : metadata.type
      ? [metadata.type]
      : [];
  return {
    required: Boolean(metadata.required),
    inputType: metadata.inputType || 'any',
    fieldTypes: normalizedFieldTypes,
    llmHint: metadata.llmHint || '',
    maxWords: typeof metadata.maxWords === 'number' ? metadata.maxWords : undefined,
    type: metadata.type || normalizedFieldTypes[0] || ''
  };
}

export function buildFrontmatterFromState(state) {
  if (!state) throw new Error('State is required to build MDX frontmatter');
  const templateName = state.templateName || 'grid-template';
  const workingBoxes = state.boxes.length ? state.boxes : [{
    id: 'region-1',
    name: 'region-1',
    gridX: 0,
    gridY: 0,
    gridWidth: Math.max(1, Number(state.columns) || 1),
    gridHeight: Math.max(1, Number(state.rows) || 1),
    metadata: {}
  }];

  const components = [];

  workingBoxes.forEach((box) => {
    const metadata = normalizeBoxMetadata(box, state.metadata?.[box.id]);
    const role = metadata.fieldTypes[0] || 'supporting-text';
    const component = {
      type: 'GridArea',
      id: box.id,
      role,
      area: box.name
    };
    if (typeof metadata.maxWords === 'number') {
      component.maxWords = metadata.maxWords;
    }
    components.push(component);
  });
  const templateSettings = {
    canvasWidth: Number(state.canvasWidth) || 0,
    canvasHeight: Number(state.canvasHeight) || 0,
    columns: Number(state.columns) || 0,
    rows: Number(state.rows) || 0,
    columnSize: state.columnSize || '',
    rowSize: state.rowSize || '',
    gap: state.gap || ''
  };

  const layout = {
    type: DEFAULT_LAYOUT_TYPE,
    template: templateName,
    components,
    rows: Number(state.rows) || 0,
    columns: Number(state.columns) || 0,
    gap: state.gap || '1rem',
  };

  const regions = workingBoxes.map((box) => {
    const metadata = normalizeBoxMetadata(box, state.metadata?.[box.id]);
    const role = metadata.fieldTypes[0] || 'supporting-text';
    const region = {
      id: box.id,
      area: box.name,
      role,
      required: metadata.required,
      inputType: metadata.inputType,
      type: metadata.type || role,
      fieldTypes: metadata.fieldTypes.length ? metadata.fieldTypes : [role],
      grid: {
        x: box.gridX,
        y: box.gridY,
        width: box.gridWidth,
        height: box.gridHeight,
      },
    };

    if (metadata.maxWords !== undefined) {
      region.maxWords = metadata.maxWords;
    }
    if (metadata.llmHint) {
      region.llmHint = metadata.llmHint;
    }
    return region;
  });

  const exclusions = {
    top: Number(state.exclusions?.top) || 0,
    bottom: Number(state.exclusions?.bottom) || 0,
    left: Number(state.exclusions?.left) || 0,
    right: Number(state.exclusions?.right) || 0
  };

  const frontmatter = {
    title: slugToTitle(templateName),
    phase: 'draft',
    maxWords: 280,
    templateSettings,
    layout,
    exclusions,
    regions,
    brand: state.brand ? { id: state.brand.id, variant: state.brand.variant } : undefined,
    previewFlags: state.previewFlags ? { ...state.previewFlags } : undefined,
    backgroundShapes: normalizeBackgroundShapes(state.backgroundShapes)
  };

  validateFrontmatter(frontmatter);
  return frontmatter;
}

function serializeLayout(layout) {
  if (!layout || typeof layout !== 'object') {
    return 'layout: {}';
  }

  const lines = [
    'layout:',
    `  type: ${quote(layout.type || DEFAULT_LAYOUT_TYPE)}`,
    `  template: ${quote(layout.template || '')}`,
  ];

  if (!Array.isArray(layout.components) || !layout.components.length) {
    lines.push('  components: []');
  } else {
    lines.push('  components:');
    layout.components.forEach((component) => {
      lines.push('    - type: ' + quote(component.type || ''));
      lines.push('      id: ' + quote(component.id || ''));
      lines.push('      role: ' + quote(component.role || ''));
      lines.push('      area: ' + quote(component.area || ''));
      if (typeof component.maxWords === 'number') {
        lines.push(`      maxWords: ${component.maxWords}`);
      }
    });
  }

  lines.push(`  rows: ${layout.rows ?? 0}`);
  lines.push(`  columns: ${layout.columns ?? 0}`);
  lines.push(`  gap: ${quote(layout.gap || '')}`);

  return lines.join('\n');
}

function serializeRegions(regions) {
  if (!regions.length) return 'regions: []';
  const lines = ['regions:'];
  regions.forEach((region) => {
    lines.push(`  - id: ${quote(region.id)}`);
    lines.push(`    area: ${quote(region.area)}`);
    lines.push(`    role: ${quote(region.role)}`);
    lines.push(`    required: ${region.required ? 'true' : 'false'}`);
    lines.push(`    inputType: ${quote(region.inputType)}`);
    if (region.type) {
      lines.push(`    type: ${quote(region.type)}`);
    }
    if (Array.isArray(region.fieldTypes) && region.fieldTypes.length) {
      lines.push('    fieldTypes:');
      region.fieldTypes.forEach((fieldType) => {
        lines.push(`      - ${quote(fieldType)}`);
      });
    }
    if (typeof region.maxWords === 'number') {
      lines.push(`    maxWords: ${region.maxWords}`);
    }
    if (region.llmHint) {
      lines.push(`    llmHint: ${quote(region.llmHint)}`);
    }
    lines.push('    grid:');
    lines.push(`      x: ${region.grid.x}`);
    lines.push(`      y: ${region.grid.y}`);
    lines.push(`      width: ${region.grid.width}`);
    lines.push(`      height: ${region.grid.height}`);
  });
  return lines.join('\n');
}

function serializeTemplateSettings(settings) {
  if (!settings) return '';
  const lines = ['templateSettings:'];
  lines.push(`  canvasWidth: ${settings.canvasWidth ?? 0}`);
  lines.push(`  canvasHeight: ${settings.canvasHeight ?? 0}`);
  lines.push(`  columns: ${settings.columns ?? 0}`);
  lines.push(`  rows: ${settings.rows ?? 0}`);
  lines.push(`  columnSize: ${quote(settings.columnSize || '')}`);
  lines.push(`  rowSize: ${quote(settings.rowSize || '')}`);
  lines.push(`  gap: ${quote(settings.gap || '')}`);
  return lines.join('\n');
}

function serializeExclusions(exclusions) {
  if (!exclusions) return '';
  const lines = ['exclusions:'];
  lines.push(`  top: ${exclusions.top ?? 0}`);
  lines.push(`  bottom: ${exclusions.bottom ?? 0}`);
  lines.push(`  left: ${exclusions.left ?? 0}`);
  lines.push(`  right: ${exclusions.right ?? 0}`);
  return lines.join('\n');
}

function serializeBrand(brand) {
  if (!brand || typeof brand !== 'object') return '';
  const lines = ['brand:'];
  lines.push(`  id: ${quote(brand.id || '')}`);
  lines.push(`  variant: ${quote(brand.variant || '')}`);
  return lines.join('\n');
}

export function buildMdxSource(state) {
  const frontmatter = buildFrontmatterFromState(state);
  const layoutYaml = serializeLayout(frontmatter.layout);
  const regionsYaml = serializeRegions(frontmatter.regions);
  const templateSettingsYaml = serializeTemplateSettings(frontmatter.templateSettings);
  const exclusionsYaml = serializeExclusions(frontmatter.exclusions);
  const brandYaml = serializeBrand(frontmatter.brand);
  const previewFlagsYaml = serializePreviewFlags(frontmatter.previewFlags);
  const backgroundShapesYaml = serializeBackgroundShapes(frontmatter.backgroundShapes);
  const frontmatterYaml = [
    '---',
    `title: ${quote(frontmatter.title)}`,
    `maxWords: ${frontmatter.maxWords}`,
    `phase: ${quote(frontmatter.phase)}`,
    templateSettingsYaml,
    layoutYaml,
    exclusionsYaml,
    brandYaml,
    previewFlagsYaml,
    backgroundShapesYaml,
    regionsYaml,
    '---',
  ].join('\n');

  const body = buildMdxBody(frontmatter.layout.template, frontmatter.regions);
  const source = `${frontmatterYaml}\n\n${body}\n`;
  const filename = `${frontmatter.layout.template}.mdx`;

  return { frontmatter, body, source, filename };
}

function buildMdxBody(templateName, regions) {
  const lines = [
    'import { GridDesigner, GridArea, ContentRenderer } from "../../core/layout/components.js";',
    '',
    `<GridDesigner template="${escapeYamlString(templateName)}">`,
  ];

  regions.forEach((region) => {
    const importance = region.required ? 'critical' : 'supporting';
    lines.push(
      `  <GridArea area="${escapeYamlString(region.area)}" contentType="${escapeYamlString(region.role)}" importance="${importance}">`
    );
    lines.push(`    <ContentRenderer type="${escapeYamlString(region.role)}" content={""} />`);
    lines.push('  </GridArea>');
  });

  lines.push('</GridDesigner>');
  return lines.join('\n');
}

export async function downloadMdxFile(state) {
  const { source, filename } = buildMdxSource(state);
  const blob = new Blob([source], { type: 'text/mdx;charset=utf-8' });

  if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'MDX Template',
            accept: {
              'text/mdx': ['.mdx'],
              'text/plain': ['.mdx']
            }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      if (error?.name === 'AbortError') {
        console.info('MDX export cancelled by user');
        return;
      }
      console.warn('Failed to use save file picker, falling back to automatic download.', error);
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
