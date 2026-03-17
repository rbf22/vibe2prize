#!/usr/bin/env node

/**
 * Content Analysis CLI Tool
 * 
 * This script analyzes slide content for semantic classification and placement optimization.
 * Usage: node scripts/content-analyzer.js [options]
 */

import fs from 'fs-extra';
import path from 'node:path';
import { SemanticNormalizer } from '../core/layout/semantic-vocabulary.js';
import { LLMGridPlacer } from '../core/llm/grid-placement-engine.js';
import { TemplateMigrator } from '../core/layout/template-migrator.js';

const ROOT = path.resolve(process.cwd());
const SLIDES_DIR = path.join(ROOT, 'templates', 'mdx');

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
  
  return params;
}

function extractContentFromMDX(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter = frontmatterMatch ? frontmatterMatch[1] : '';
    
    // Extract main content (after frontmatter)
    const mainContent = frontmatterMatch ? content.slice(frontmatterMatch[0].length) : content;
    
    // Parse frontmatter
    const metadata = {};
    frontmatter.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        metadata[key.trim()] = valueParts.join(':').trim();
      }
    });
    
    // Extract content elements
    const elements = [];
    
    // Extract headings
    const headingMatches = mainContent.match(/^(#{1,6})\s+(.+)$/gm);
    if (headingMatches) {
      headingMatches.forEach((match, index) => {
        const [level, text] = match.split(' ');
        const importance = level.length === 1 ? 'primary-title' : 
                         level.length === 2 ? 'secondary-title' : 'supporting-text';
        
        elements.push({
          id: `heading_${index}`,
          type: importance,
          content: text,
          metadata: { headingLevel: level.length }
        });
      });
    }
    
    // Extract paragraphs
    const paragraphs = mainContent.split('\n\n').filter(p => p.trim() && !p.startsWith('#'));
    paragraphs.forEach((paragraph, index) => {
      if (paragraph.trim().length > 20) { // Filter out very short lines
        elements.push({
          id: `paragraph_${index}`,
          type: 'paragraph',
          content: paragraph.trim()
        });
      }
    });
    
    // Extract lists
    const listMatches = mainContent.match(/^[-*+]\s+(.+)$/gm);
    if (listMatches) {
      elements.push({
        id: 'list_1',
        type: 'criteria-list',
        content: listMatches.map(item => item.replace(/^[-*+]\s+/, ''))
      });
    }
    
    return {
      metadata,
      elements,
      filePath
    };
    
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return null;
  }
}

function analyzeContent(content, normalizer, placer) {
  const analysis = {
    summary: {
      totalElements: content.elements.length,
      semanticDistribution: {},
      importanceDistribution: {
        critical: 0,
        important: 0,
        supporting: 0,
        supplementary: 0
      },
      contentCharacteristics: {
        hasVisualElements: 0,
        hasNumericalData: 0,
        averageLength: 0
      }
    },
    elements: [],
    recommendations: []
  };
  
  let totalLength = 0;
  
  content.elements.forEach(element => {
    const normalized = normalizer.normalizeElement(element);
    
    analysis.elements.push({
      id: normalized.id,
      originalType: normalized.originalType,
      semantic: normalized.semantic,
      importance: normalized.importance,
      confidence: 0.8, // Base confidence for manual classification
      metadata: normalized.metadata
    });
    
    // Update summary statistics
    analysis.summary.semanticDistribution[normalized.semantic] = 
      (analysis.summary.semanticDistribution[normalized.semantic] || 0) + 1;
    analysis.summary.importanceDistribution[normalized.importance]++;
    
    if (normalized.metadata.hasVisualElements) {
      analysis.summary.contentCharacteristics.hasVisualElements++;
    }
    
    if (normalized.metadata.hasNumericalData) {
      analysis.summary.contentCharacteristics.hasNumericalData++;
    }
    
    totalLength += normalized.metadata.contentLength;
  });
  
  // Calculate averages
  if (content.elements.length > 0) {
    analysis.summary.contentCharacteristics.averageLength = totalLength / content.elements.length;
  }
  
  // Generate recommendations
  analysis.recommendations = generateRecommendations(analysis);
  
  return analysis;
}

function generateRecommendations(analysis) {
  const recommendations = [];
  const { summary } = analysis;
  
  // Template recommendations
  if (summary.semanticDistribution['criteria-list'] > 1) {
    recommendations.push({
      type: 'template',
      suggestion: 'criteria-matrix',
      reason: 'Multiple criteria lists detected'
    });
  }
  
  if (summary.contentCharacteristics.hasVisualElements > 1) {
    recommendations.push({
      type: 'template',
      suggestion: 'dual-panel',
      reason: 'Multiple visual elements detected'
    });
  }
  
  if (summary.importanceDistribution.critical > 2) {
    recommendations.push({
      type: 'template',
      suggestion: 'presentation-grid',
      reason: 'Multiple critical elements detected'
    });
  }
  
  // Content organization recommendations
  if (summary.contentCharacteristics.averageLength > 300) {
    recommendations.push({
      type: 'content',
      suggestion: 'Consider breaking down long content into smaller elements',
      reason: 'Average content length is high'
    });
  }
  
  if (summary.importanceDistribution.supplementary > summary.importanceDistribution.critical) {
    recommendations.push({
      type: 'content',
      suggestion: 'Review importance hierarchy - more supplementary than critical elements',
      reason: 'Importance distribution seems unbalanced'
    });
  }
  
  return recommendations;
}

function simulateMigration(content, fromTemplate, toTemplate, migrator) {
  try {
    const migration = migrator.migrateTemplate(fromTemplate, toTemplate, content.elements);
    
    return {
      success: true,
      migration,
      summary: {
        fromTemplate,
        toTemplate,
        successRate: migration.summary.successRate,
        averageConfidence: migration.summary.averageConfidence,
        conflicts: migration.summary.conflictCount,
        orphaned: migration.summary.orphanedCount
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      fromTemplate,
      toTemplate
    };
  }
}

function analyzeSlide(filePath, options) {
  const normalizer = new SemanticNormalizer();
  const placer = new LLMGridPlacer();
  const migrator = new TemplateMigrator();
  
  // Extract content from MDX file
  const content = extractContentFromMDX(filePath);
  if (!content) {
    return null;
  }
  
  // Analyze content
  const analysis = analyzeContent(content, normalizer, placer);
  
  // Get placement suggestions
  const placementSuggestions = placer.suggestPlacement(content.elements, options.template);
  
  // Simulate migration if requested
  let migrationSimulation = null;
  if (options.migrateFrom && options.migrateTo) {
    migrationSimulation = simulateMigration(content, options.migrateFrom, options.migrateTo, migrator);
  }
  
  return {
    file: path.basename(filePath),
    metadata: content.metadata,
    analysis,
    placement: placementSuggestions,
    migration: migrationSimulation,
    timestamp: Date.now()
  };
}

function analyzeDirectory(directory, options) {
  const results = [];
  
  if (!fs.existsSync(directory)) {
    console.error(`Directory ${directory} does not exist`);
    return results;
  }
  
  const files = fs.readdirSync(directory).filter(file => file.endsWith('.mdx'));
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const result = analyzeSlide(filePath, options);
    if (result) {
      results.push(result);
    }
  });
  
  return results;
}

function generateReport(results, options) {
  const report = {
    summary: {
      totalSlides: results.length,
      totalElements: results.reduce((sum, r) => sum + r.analysis.summary.totalElements, 0),
      averageConfidence: results.reduce((sum, r) => sum + parseFloat(r.placement.confidence), 0) / results.length,
      commonTemplates: {}
    },
    slides: results,
    recommendations: [],
    warnings: []
  };
  
  // Aggregate template recommendations
  results.forEach(result => {
    if (result.analysis && result.analysis.recommendations) {
      result.analysis.recommendations.forEach(rec => {
        if (rec.type === 'template' && rec.suggestion) {
          if (!report.commonTemplates) {
            report.commonTemplates = {};
          }
          report.commonTemplates[rec.suggestion] = (report.commonTemplates[rec.suggestion] || 0) + 1;
        }
      });
    }
  });
  
  // Generate overall recommendations
  const templateEntries = Object.entries(report.commonTemplates || {});
  if (templateEntries.length > 0) {
    const [topTemplate, count] = templateEntries.sort(([,a], [,b]) => b - a)[0];
    report.recommendations.push(`Most recommended template: ${topTemplate} (${count} slides)`);
  }
  
  if (report.summary.averageConfidence < 0.8) {
    report.recommendations.push('Consider manual review of low-confidence placements');
  }
  
  return report;
}

function main() {
  const params = parseArguments();
  
  if (params.help) {
    console.log(`
Content Analysis CLI Tool

Usage:
  node scripts/content-analyzer.js [options]

Options:
  --file <path>           Analyze specific MDX file
  --directory <path>      Analyze all MDX files in directory (default: templates/mdx)
  --template <name>       Specify target template for placement suggestions
  --migrate-from <name>   Simulate migration from template
  --migrate-to <name>     Simulate migration to template
  --output <path>         Save report to JSON file
  --verbose               Show detailed output
  --help                  Show this help

Examples:
  # Analyze single slide
  node builder/content-analyzer.js --file templates/mdx/accenture-executive-summary.mdx

  # Analyze all slides with template suggestions
  node builder/content-analyzer.js --directory templates/mdx --template dual-panel

  # Simulate template migration
  node builder/content-analyzer.js --directory templates/mdx --migrate-from dual-panel --migrate-to presentation-grid

  # Generate detailed report
  node builder/content-analyzer.js --directory templates/mdx --verbose --output analysis-report.json
`);
    return;
  }
  
  const directory = params.directory || SLIDES_DIR;
  const options = {
    template: params.template,
    migrateFrom: params['migrate-from'],
    migrateTo: params['migrate-to'],
    verbose: params.verbose
  };
  
  let results = [];
  
  if (params.file) {
    const result = analyzeSlide(params.file, options);
    if (result) {
      results.push(result);
    }
  } else {
    results = analyzeDirectory(directory, options);
  }
  
  if (results.length === 0) {
    console.log('No slides found to analyze');
    return;
  }
  
  // Generate report
  const report = generateReport(results, options);
  
  // Output results
  if (params.verbose) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`\n📊 Content Analysis Report`);
    console.log(`========================`);
    console.log(`Total Slides: ${report.summary.totalSlides}`);
    console.log(`Total Elements: ${report.summary.totalElements}`);
    console.log(`Average Confidence: ${report.summary.averageConfidence.toFixed(3)}`);
    
    if (Object.keys(report.commonTemplates).length > 0) {
      console.log(`\n🎯 Template Recommendations:`);
      Object.entries(report.commonTemplates).forEach(([template, count]) => {
        console.log(`  ${template}: ${count} slides`);
      });
    }
    
    if (report.recommendations.length > 0) {
      console.log(`\n💡 Overall Recommendations:`);
      report.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }
  }
  
  // Save report if requested
  if (params.output) {
    fs.writeFileSync(params.output, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to ${params.output}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { analyzeSlide, analyzeDirectory, generateReport };
