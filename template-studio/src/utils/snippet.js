import { state } from '../state.js';
import { toCompactFrontmatter } from '../../../core/mdx/compact-format.js';

export function renderSnippet() {
  // Build frontmatter from current state
  const frontmatter = {
    title: state.templateName || 'Untitled Template',
    phase: 'draft',
    settings: {
      canvas: `${state.canvasWidth}x${state.canvasHeight}`,
      grid: `${state.columns}x${state.rows}`,
      gap: state.gap
    },
    exclusions: `${state.exclusions.left},${state.exclusions.right},${state.exclusions.top},${state.exclusions.bottom}`,
    brand: state.brand ? `${state.brand.id}${state.brand.variant ? ' ' + state.brand.variant : ''}` : 'default',
    regions: state.boxes.map(box => {
      const metadata = state.metadata[box.id] || {};
      const region = {
        id: box.id,
        role: metadata.fieldTypes?.[0] || 'supporting-text',
        grid: `${box.gridX},${box.gridY},${box.gridWidth}x${box.gridHeight}`
      };
      
      if (metadata.required) region.req = true;
      if (metadata.llmHint) region.hint = metadata.llmHint;
      if (metadata.inputType && metadata.inputType !== 'text') region.type = metadata.inputType;
      
      return region;
    }),
    layout: {
      type: 'grid-designer',
      template: state.templateName || 'Untitled Template',
      rows: state.rows,
      columns: state.columns,
      gap: state.gap
    }
  };
  
  // Convert to compact format
  const compactFrontmatter = toCompactFrontmatter(frontmatter);
  
  // Generate MDX content
  const mdxContent = generateMDX(compactFrontmatter);
  
  const snippetOutput = document.getElementById('snippetOutput');
  if (snippetOutput) {
    snippetOutput.value = mdxContent;
  }
}

function generateMDX(frontmatter) {
  // Convert frontmatter to YAML
  const yaml = frontmatterToYaml(frontmatter);
  
  // Generate component imports
  const componentImports = `import { GridDesigner, GridArea, ContentRenderer } from "../../core/layout/components.js";`;
  
  // Generate GridDesigner content
  const gridDesignerContent = generateGridDesignerContent(frontmatter.regions || []);
  
  return `---\n${yaml}\n---\n\n${componentImports}\n\n${gridDesignerContent}`;
}

function frontmatterToYaml(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  let yaml = '';
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    
    if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      value.forEach(item => {
        yaml += `${spaces}  ${objectToYaml(item, indent + 2)}\n`;
      });
    } else if (typeof value === 'object') {
      yaml += `${spaces}${key}:\n`;
      yaml += frontmatterToYaml(value, indent + 1);
    } else {
      yaml += `${spaces}${key}: ${JSON.stringify(value)}\n`;
    }
  }
  
  return yaml;
}

function objectToYaml(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return JSON.stringify(obj);
  }
  
  const entries = Object.entries(obj)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      if (typeof value === 'object') {
        return `${key}: ${objectToYaml(value, indent)}`;
      }
      return `${key}: ${JSON.stringify(value)}`;
    });
  
  if (entries.length === 0) return '{}';
  
  // Use inline format for simple objects
  const inline = entries.join(', ');
  if (inline.length < 80) {
    return `{ ${inline} }`;
  }
  
  // Use multiline format for complex objects
  return `\n${spaces}  ${entries.join(`\n${spaces}  `)}`;
}

function generateGridDesignerContent(regions) {
  const gridAreas = regions.map(region => 
    `  <GridArea area="${region.id}" contentType="${region.role}" importance="${getImportance(region.role)}">
    <ContentRenderer type="${region.role}" content={""} />
  </GridArea>`
  ).join('\n');
  
  return `<GridDesigner template="${state.templateName || 'Untitled Template'}">
${gridAreas}
</GridDesigner>`;
}

function getImportance(role) {
  switch (role) {
    case 'primary-title':
    case 'logo':
      return 'critical';
    case 'secondary-title':
    case 'key-data':
      return 'high';
    case 'section-title':
    case 'data-table':
      return 'medium';
    default:
      return 'supporting';
  }
}
