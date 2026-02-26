import { state, pushHistory } from '../state.js';
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

function applyFrontmatterToState(frontmatter) {
  pushHistory();
  const { layout, regions } = frontmatter;

  if (frontmatter?.title || layout?.template) {
    state.templateName = frontmatter?.title || layout?.template;
    const input = document.getElementById('templateName');
    if (input) input.value = state.templateName;
  }

  if (typeof layout?.rows === 'number') {
    state.rows = layout.rows;
    const rowInput = document.getElementById('rowCount');
    if (rowInput) rowInput.value = state.rows;
  }

  if (typeof layout?.columns === 'number') {
    state.columns = layout.columns;
    const columnInput = document.getElementById('columnCount');
    if (columnInput) columnInput.value = state.columns;
  }

  if (layout?.gap) {
    state.gap = layout.gap;
    const gapInput = document.getElementById('gridGap');
    if (gapInput) gapInput.value = state.gap;
  }

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
      metadata: {
        required: Boolean(region.required),
        inputType: region.inputType || 'any',
        fieldTypes: region.role ? [region.role] : [],
        llmHint: region.llmHint || '',
        maxWords: typeof region.maxWords === 'number' ? region.maxWords : undefined,
      },
    };
    state.boxes.push(box);
    state.metadata[id] = box.metadata;
  });
}

export async function importMDXContent(content) {
  const parseResult = parseMDXFrontmatter(content);
  
  if (!parseResult.success) {
    return parseResult;
  }

  const { frontmatter, body } = parseResult;

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
  reader.onload = (e) => {
    try {
      const content = e.target.result;
      const result = importMDXContent(content);
      
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
