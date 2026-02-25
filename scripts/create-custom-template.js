#!/usr/bin/env node

/**
 * Custom Template Creator - Interactive template creation tool
 * Usage: node scripts/create-custom-template.js
 */

import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const TEMPLATES_FILE = path.join(ROOT, 'layouts/grid-templates.js');

// Template creation wizard
class TemplateCreator {
  constructor() {
    this.templates = this.loadExistingTemplates();
  }

  loadExistingTemplates() {
    try {
      const content = fs.readFileSync(TEMPLATES_FILE, 'utf8');
      // Simple extraction of template names
      const matches = content.match(/'([^']+)':\s*{/g);
      return matches ? matches.map(m => m.match(/'([^']+)'/)[1]) : [];
    } catch (error) {
      console.log('Could not load existing templates');
      return [];
    }
  }

  async createTemplate() {
    console.log('🎨 CSS Grid Designer - Template Creation Wizard\n');

    // Get template name
    const templateName = await this.prompt('Template name (e.g., "hero-layout"): ');
    if (!templateName) {
      console.log('❌ Template name is required');
      return;
    }

    if (this.templates.includes(templateName)) {
      console.log(`❌ Template "${templateName}" already exists`);
      return;
    }

    // Get grid layout type
    console.log('\n📐 Choose grid layout type:');
    console.log('1. Two-column (1fr 1fr)');
    console.log('2. Three-column (1fr 2fr 1fr)');
    console.log('3. Hero section (auto 1fr auto)');
    console.log('4. Asymmetric (2fr 1fr 1fr)');
    console.log('5. Custom CSS');

    const layoutType = await this.prompt('Layout type (1-5): ');
    
    let css = '';
    let areas = {};
    let responsive = {};

    switch (layoutType) {
      case '1':
        css = this.generateTwoColumnCSS(templateName);
        areas = { left: 'left', right: 'right' };
        responsive = this.generateTwoColumnResponsive();
        break;
      case '2':
        css = this.generateThreeColumnCSS(templateName);
        areas = { left: 'left', center: 'center', right: 'right' };
        responsive = this.generateThreeColumnResponsive();
        break;
      case '3':
        css = this.generateHeroCSS(templateName);
        areas = { header: 'header', main: 'main', footer: 'footer' };
        responsive = this.generateHeroResponsive();
        break;
      case '4':
        css = this.generateAsymmetricCSS(templateName);
        areas = { main: 'main', sidebar: 'sidebar', aside: 'aside' };
        responsive = this.generateAsymmetricResponsive();
        break;
      case '5':
        css = await this.prompt('Enter custom CSS: ');
        areas = await this.promptForAreas();
        responsive = await this.promptForResponsive();
        break;
      default:
        console.log('❌ Invalid layout type');
        return;
    }

    // Get semantic areas
    console.log('\n🏷️  Define semantic areas (press Enter to skip):');
    const semanticAreas = await this.promptForSemanticAreas(Object.keys(areas));

    // Generate template object
    const template = {
      css,
      areas,
      responsive,
      ...(semanticAreas && Object.keys(semanticAreas).length > 0 && { semanticAreas })
    };

    // Add to templates file
    await this.addToTemplatesFile(templateName, template);
    
    console.log(`\n✅ Template "${templateName}" created successfully!`);
    console.log('\n📝 Usage in your slide:');
    console.log(`<GridDesigner template="${templateName}">`);
    console.log(`  <GridArea area="${Object.keys(areas)[0]}" contentType="primary-title">`);
    console.log('    <ContentRenderer type="primary-title" content="Your Title" />');
    console.log('  </GridArea>');
    console.log('</GridDesigner>');
  }

  generateTwoColumnCSS(name) {
    return `display: grid;
grid-template-columns: 1fr 1fr;
grid-template-areas:
  "left right";
gap: 1.5rem;
align-items: start;`;
  }

  generateThreeColumnCSS(name) {
    return `display: grid;
grid-template-columns: 1fr 2fr 1fr;
grid-template-areas:
  "left center right";
gap: 1.5rem;
align-items: start;`;
  }

  generateHeroCSS(name) {
    return `display: grid;
grid-template-rows: auto 1fr auto;
grid-template-columns: 1fr;
grid-template-areas:
  "header"
  "main"
  "footer";
gap: 1.5rem;
align-items: start;`;
  }

  generateAsymmetricCSS(name) {
    return `display: grid;
grid-template-columns: 2fr 1fr 1fr;
grid-template-rows: 1fr;
grid-template-areas:
  "main sidebar aside";
gap: 1.5rem;
align-items: start;`;
  }

  generateTwoColumnResponsive() {
    return {
      tablet: {
        css: `grid-template-columns: 1fr;
grid-template-areas:
  "left"
  "right";`
      },
      mobile: {
        css: `grid-template-columns: 1fr;
gap: 1rem;`
      }
    };
  }

  generateThreeColumnResponsive() {
    return {
      tablet: {
        css: `grid-template-columns: 1fr 2fr;
grid-template-areas:
  "left center"
  "right right";`
      },
      mobile: {
        css: `grid-template-columns: 1fr;
grid-template-areas:
  "left"
  "center"
  "right";
gap: 1rem;`
      }
    };
  }

  generateHeroResponsive() {
    return {
      tablet: {
        css: `gap: 1rem;`
      },
      mobile: {
        css: `gap: 0.75rem;`
      }
    };
  }

  generateAsymmetricResponsive() {
    return {
      tablet: {
        css: `grid-template-columns: 1fr 1fr;
grid-template-areas:
  "main sidebar"
  "main aside";`
      },
      mobile: {
        css: `grid-template-columns: 1fr;
grid-template-areas:
  "main"
  "sidebar"
  "aside";
gap: 1rem;`
      }
    };
  }

  async promptForAreas() {
    const areasStr = await this.prompt('Enter areas (e.g., "header main footer"): ');
    if (!areasStr) return {};

    const areas = {};
    areasStr.split(' ').forEach(area => {
      areas[area] = area;
    });
    return areas;
  }

  async promptForResponsive() {
    console.log('Responsive breakpoints (press Enter to skip):');
    const tabletCSS = await this.prompt('Tablet CSS: ');
    const mobileCSS = await this.prompt('Mobile CSS: ');

    const responsive = {};
    if (tabletCSS) responsive.tablet = { css: tabletCSS };
    if (mobileCSS) responsive.mobile = { css: mobileCSS };
    return responsive;
  }

  async promptForSemanticAreas(areaNames) {
    const semanticAreas = {};
    
    for (const area of areaNames) {
      console.log(`\n📍 Semantic configuration for "${area}" area:`);
      
      const accepts = await this.prompt(`Accepted content types (comma-separated, e.g., "primary-title,supporting-text"): `);
      const maxContent = await this.prompt(`Max content items (default: 5): `) || '5';
      const priority = await this.prompt(`Priority (critical/high/medium/low, default: medium): `) || 'medium';
      const description = await this.prompt(`Description (optional): `);

      if (accepts) {
        semanticAreas[area] = {
          accepts: accepts.split(',').map(t => t.trim()),
          maxContent: parseInt(maxContent),
          priority,
          ...(description && { description })
        };
      }
    }

    return Object.keys(semanticAreas).length > 0 ? semanticAreas : null;
  }

  async addToTemplatesFile(templateName, template) {
    try {
      const content = fs.readFileSync(TEMPLATES_FILE, 'utf8');
      
      // Find where to insert the new template (before the closing brace of gridTemplates)
      const insertIndex = content.lastIndexOf('};');
      
      const templateStr = `  '${templateName}': {
    css: \`${template.css.replace(/`/g, '\\`')}\`,
    areas: ${JSON.stringify(template.areas, null, 6)},
    responsive: ${JSON.stringify(template.responsive, null, 6)}${template.semanticAreas ? `,
    semanticAreas: ${JSON.stringify(template.semanticAreas, null, 6)}` : ''}
  },`;

      const newContent = content.slice(0, insertIndex) + templateStr + '\n' + content.slice(insertIndex);
      
      fs.writeFileSync(TEMPLATES_FILE, newContent);
      console.log(`📝 Template added to ${TEMPLATES_FILE}`);
    } catch (error) {
      console.error('❌ Error adding template:', error.message);
    }
  }

  prompt(question) {
    return new Promise(resolve => {
      process.stdout.write(question);
      process.stdin.setEncoding('utf8');
      process.stdin.once('data', data => {
        resolve(data.toString().trim());
      });
    });
  }
}

// Run the creator
if (import.meta.url === `file://${process.argv[1]}`) {
  const creator = new TemplateCreator();
  creator.createTemplate().catch(console.error);
}

export default TemplateCreator;
