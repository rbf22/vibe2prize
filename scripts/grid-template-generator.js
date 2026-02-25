#!/usr/bin/env node

/**
 * Grid Template Generator Utility
 * 
 * This script helps convert CSS Grid Designer output into the template registry format.
 * Usage: node scripts/grid-template-generator.js --template <name> --css <css-string>
 */

import fs from 'fs-extra';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const TEMPLATES_FILE = path.join(ROOT, 'layouts', 'grid-templates.js');

function parseArguments() {
  const args = process.argv.slice(2);
  const params = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      params[key] = value;
    }
  }

  const normalizedParams = {};
  Object.entries(params).forEach(([key, value]) => {
    const normalizedKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    normalizedParams[normalizedKey] = value;
  });
  
  return normalizedParams;
}

function extractGridProperties(cssString) {
  const properties = {};
  const declarations = cssString.split(';').filter(decl => decl.trim());
  
  declarations.forEach(decl => {
    const [property, value] = decl.split(':').map(s => s.trim());
    if (property && value && property.includes('grid')) {
      properties[property] = value;
    }
  });
  
  return properties;
}

function extractGridTemplateAreas(cssString) {
  const match = cssString.match(/grid-template-areas\s*:\s*([^;]+);?/m);
  if (!match) {
    return [];
  }

  const raw = match[1];
  const rows = raw
    .split(/"/)
    .map(segment => segment.trim())
    .filter((segment, index) => index % 2 === 1 && segment.length > 0);

  if (rows.length === 0) {
    return [];
  }

  return rows.map(row => row.replace(/\s+/g, ' ').trim());
}

function createSemanticScaffold(areaRows) {
  if (!areaRows || areaRows.length === 0) {
    return {};
  }

  const names = new Set();
  areaRows.forEach(row => {
    row.split(/\s+/)
      .map(name => name.trim())
      .filter(name => name.length && name !== '.')
      .forEach(name => names.add(name));
  });

  const scaffold = {};
  names.forEach(name => {
    scaffold[name] = {
      accepts: ['primary-title', 'secondary-title', 'supporting-text', 'key-data', 'visual-aid'],
      maxContent: 4,
      priority: 'medium',
      description: `${name} area generated from cssgr.id import`
    };
  });

  return scaffold;
}

function resolveCSSInput(params) {
  if (params.cssFile) {
    const cssPath = path.isAbsolute(params.cssFile)
      ? params.cssFile
      : path.join(ROOT, params.cssFile);

    if (!fs.existsSync(cssPath)) {
      console.error(`CSS file not found: ${cssPath}`);
      return null;
    }

    return fs.readFileSync(cssPath, 'utf8');
  }

  if (params.css) {
    return params.css;
  }

  return null;
}

function generateTemplateObject(name, cssString, responsive = {}) {
  const areaRows = extractGridTemplateAreas(cssString);
  const semanticScaffold = createSemanticScaffold(areaRows);

  const template = {
    css: cssString,
    areas: areaRows,
    responsive: responsive
  };

  if (Object.keys(semanticScaffold).length > 0) {
    template.semanticAreas = semanticScaffold;
  }

  return template;
}

function addTemplateToRegistry(templateName, templateObject) {
  try {
    const content = fs.readFileSync(TEMPLATES_FILE, 'utf8');
    
    // Find the gridTemplates object
    const templateStart = content.indexOf('export const gridTemplates = {');
    const templateEnd = content.indexOf('};', templateStart) + 2;
    
    if (templateStart === -1 || templateEnd === -1) {
      console.error('Could not find gridTemplates object in registry file');
      return false;
    }
    
    // Generate template code
    const templateCode = `  // ${templateName} - Generated from CSS Grid Designer\n  '${templateName}': ${JSON.stringify(templateObject, null, 2)},\n\n`;
    
    // Insert before closing brace
    const beforeClosing = content.lastIndexOf('}', templateEnd - 2);
    const newContent = content.slice(0, beforeClosing) + templateCode + content.slice(beforeClosing);
    
    fs.writeFileSync(TEMPLATES_FILE, newContent, 'utf8');
    console.log(`✅ Added template '${templateName}' to registry`);
    return true;
    
  } catch (error) {
    console.error('Error updating template registry:', error);
    return false;
  }
}

function listAvailableTemplates() {
  try {
    const content = fs.readFileSync(TEMPLATES_FILE, 'utf8');
    const templates = [];
    
    // Extract template names using more precise regex
    const templateRegex = /'([^']+)':\s*\{/g;
    let match;
    
    while ((match = templateRegex.exec(content)) !== null) {
      const name = match[1];
      // Skip media queries and other non-template matches
      if (!name.startsWith('@media') && !name.includes('max-width')) {
        templates.push(name);
      }
    }
    
    console.log('Available grid templates:');
    templates.forEach(name => console.log(`  - ${name}`));
    return templates;
    
  } catch (error) {
    console.error('Error reading template registry:', error);
    return [];
  }
}

function validateTemplate(templateName) {
  try {
    const content = fs.readFileSync(TEMPLATES_FILE, 'utf8');
    return content.includes(`'${templateName}':`);
  } catch (error) {
    return false;
  }
}

function main() {
  const params = parseArguments();
  
  if (params.list) {
    listAvailableTemplates();
    return;
  }
  
  if (params.validate) {
    const isValid = validateTemplate(params.validate);
    console.log(`Template '${params.validate}' is ${isValid ? 'valid' : 'not found'}`);
    return;
  }
  
  if (params.template) {
    const cssInput = resolveCSSInput(params);

    if (!cssInput) {
      console.log('❌ CSS input missing. Provide --css "..." or --css-file <path>.');
      return;
    }

    const templateObject = generateTemplateObject(params.template, cssInput);
    const success = addTemplateToRegistry(params.template, templateObject);
    
    if (success) {
      console.log(`\n📝 Template '${params.template}' added successfully!`);
      console.log('📝 Next steps:');
      console.log(`   1. Define grid areas for '${params.template}' in the registry`);
      console.log(`   2. Add responsive breakpoints if needed`);
      console.log(`   3. Test with a sample slide`);
      console.log(`   4. Update documentation`);
    }
    return;
  }
  
  // Show help
  console.log(`
Grid Template Generator Utility

Usage:
  node scripts/grid-template-generator.js [options]

Options:
  --template <name>     Template name to add
  --css <css-string>    CSS grid properties from CSS Grid Designer
  --list                List all available templates
  --validate <name>     Check if template exists

Examples:
  # Add new template from CSS Grid Designer output
  node scripts/grid-template-generator.js --template "custom-2x3" --css "display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;"

  # List available templates
  node scripts/grid-template-generator.js --list

  # Validate template exists
  node scripts/grid-template-generator.js --validate "dual-panel"
`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateTemplateObject, addTemplateToRegistry, listAvailableTemplates, validateTemplate };
