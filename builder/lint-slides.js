#!/usr/bin/env node

import path from 'node:path';
import fs from 'fs-extra';
import matter from 'gray-matter';
import { evaluateTextOverflow } from '../core/layout/overflow-metrics.js';
import { collectDiagnostics } from '../core/layout/diagnostics.js';
import { getBrandSnapshot } from '../core/brand/loader.js';
import { collectDomOverflowIssuesNode } from '../core/layout/dom-overflow.js';

const GRID_AREA_REGEX = /<GridArea\s+[^>]*area=\"([^\"]+)\"/g;

const ROOT = path.resolve(process.cwd());
const SLIDES_DIR = path.join(ROOT, 'templates');
const DEFAULT_CONFIG_PATHS = [
  path.join(ROOT, 'templates', 'slide_sets', 'slides.json'),
  path.join(ROOT, 'slide_sets', 'slides.json'),
  path.join(ROOT, 'config', 'slides.json'),
];
let resolvedConfigPath = null;

const args = process.argv.slice(2);
const configArgPath = extractConfigArgPath(args);
const fileFilterArgs = extractFileFilters(args);
const visualOverflowEnabled = extractVisualOverflowFlag(args);
const withPreviewTextEnabled = extractWithPreviewTextFlag(args);

const MAX_TABLE_COLUMNS = 4;
const MAX_TABLE_ROWS = 8;
const DEFAULT_MAX_WORDS = 400;

async function main() {
  const errors = [];
  const fileFilters = collectNormalizedFileFilters(fileFilterArgs, errors);

  const configRequired = Boolean(configArgPath) || fileFilters.length === 0;
  const config = await loadConfig(errors, { optional: !configRequired });
  if (!config && configRequired) {
    report(errors);
    process.exitCode = 1;
    return;
  }

  await fs.ensureDir(SLIDES_DIR);

  const slidesToLint = await resolveSlidesToLint(config?.slides ?? [], fileFilters, errors);

  if (!slidesToLint.length) {
    if (!errors.length) {
      errors.push('No slides available to lint. Provide a slide config or use --file to target specific files.');
    }
    report(errors);
    process.exitCode = 1;
    return;
  }

  if (fileFilters.length) {
    const descriptor = slidesToLint.length === 1 ? 'slide' : 'slides';
    console.log(`🔍 Linting ${slidesToLint.length} ${descriptor} via --file filter.`);
  }

  for (const slide of slidesToLint) {
    const absolutePath = path.join(SLIDES_DIR, slide.file);
    if (!(await fs.pathExists(absolutePath))) {
      errors.push(`Missing slide file: ${slide.file}`);
      continue;
    }

    const raw = await fs.readFile(absolutePath, 'utf8');
    const { content, data } = matter(raw);

    if (!data.title && !slide.title) {
      errors.push(`${slide.file}: missing title in frontmatter or config`);
    }

    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const maxWords = slide.maxWords ?? DEFAULT_MAX_WORDS;
    if (wordCount > maxWords) {
      errors.push(`${slide.file}: ${wordCount} words (limit ${maxWords})`);
    }

    detectOverflowTables(content, slide.file, errors);
    await runSharedDiagnostics({
      file: slide.file,
      frontmatter: data,
      content,
      includeVisual: visualOverflowEnabled,
      withPreviewText: withPreviewTextEnabled,
      errors
    });
    detectPotentialWidows(content, slide.file, errors);
    detectGridOverlap(content, slide.file, data?.layout, errors);
  }

  report(errors);
  if (errors.length) {
    process.exitCode = 1;
  }
}

function detectGridOverlap(content, file, layoutData, errors) {
  if (!layoutData || layoutData.type !== 'grid-designer') {
    return;
  }

  const areaCounts = new Map();
  let match;

  while ((match = GRID_AREA_REGEX.exec(content))) {
    const areaName = match[1];
    areaCounts.set(areaName, (areaCounts.get(areaName) || 0) + 1);
  }

  for (const [area, count] of areaCounts.entries()) {
    if (count > 1) {
      errors.push(`${file}: Grid area "${area}" used ${count} times – potential overlap. Consider using unique regions or stacked content.`);
    }
  }

  if (layoutData.regions) {
    const declaredAreas = new Set(layoutData.regions.map((region) => region.area));
    for (const [area] of areaCounts.entries()) {
      if (!declaredAreas.has(area)) {
        errors.push(`${file}: Grid area "${area}" is rendered but not declared in frontmatter regions.`);
      }
    }
  }
}


function detectOverflowTables(content, file, errors) {
  detectHtmlTables(content, file, errors);
  detectMarkdownTables(content, file, errors);
}

async function runSharedDiagnostics({ file, frontmatter, content, includeVisual, withPreviewText, errors }) {
  if (!frontmatter?.layout || frontmatter.layout.type !== 'grid-designer') {
    return;
  }

  const regions = Array.isArray(frontmatter.regions) ? frontmatter.regions : [];
  if (!regions.length) {
    return;
  }

  const textByArea = extractRegionContentMap(content, withPreviewText);
  const brandSnapshot = resolveBrandSnapshot(frontmatter.brand);
  const templateSettings = frontmatter.templateSettings || frontmatter.layout || {};
  const pagination = frontmatter.pagination || null;

  const diagnostics = collectDiagnostics({
    regions,
    textByArea,
    templateSettings,
    brandSnapshot,
    pagination,
    options: { includeVisual }
  });

  diagnostics.semantic.forEach((issue) => {
    errors.push(`${file}: ${issue.message}`);
  });

  // Add DOM-based overflow detection if withPreviewText is enabled
  if (withPreviewText && includeVisual) {
    try {
      const domIssues = await collectDomOverflowIssuesNode({
        regions,
        textByArea,
        templateSettings,
        brandSnapshot
      });
      
      domIssues.forEach((issue) => {
        errors.push(`${file}: ${issue.message}`);
      });
    } catch (error) {
      console.error(`Error in DOM overflow detection for ${file}:`, error);
      errors.push(`${file}: DOM overflow detection failed - ${error.message}`);
    }
  } else if (includeVisual) {
    diagnostics.visual.forEach((issue) => {
      errors.push(`${file}: ${issue.message}`);
    });
  }
}

function extractRegionContentMap(content, withPreviewText = false) {
  const map = new Map();
  // Use a more flexible regex that matches attributes in any order
  // This regex captures area, contentType, and content regardless of attribute order
  const areaRegex = /<GridArea[^>]*\barea="([^"]+)"[^>]*\bcontentType="([^"]*)"[^>]*>([\s\S]*?)<\/GridArea>/gi;
  let match;
  
  // Use same preview text as Template Studio
  const LOREM_SHORT = 'Lorem ipsum dolor sit amet.';
  const LOREM_MEDIUM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer dictum porta at sapien.';
  const LOREM_LONG = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec vitae lacus cursus, auctor arcu eget, aliquet ipsum.';
  const LOREM_LIST = '\u2022 Lorem ipsum dolor sit amet.\n\u2022 Consectetur adipiscing elit.\n\u2022 Integer dictum porta sapien.';
  
  const ROLE_COPY = {
    'primary-title': LOREM_SHORT,
    'secondary-title': LOREM_SHORT,
    'supporting-text': LOREM_LONG,
    'criteria-list': LOREM_LIST,
    'key-data': LOREM_SHORT,
    'context-info': LOREM_SHORT,
    'logo': LOREM_SHORT,
    'page-number': LOREM_SHORT,
    'footer': LOREM_MEDIUM,
    'section-title': LOREM_SHORT,
    'data-table': '',
    'visual-aid': LOREM_SHORT,
    'supporting-data': LOREM_SHORT
  };
  
  while ((match = areaRegex.exec(content))) {
    const [, area, contentType, inner] = match;
    if (!area) continue;
    
    let text = inner
      .replace(/<ContentRenderer[^>]*content={"([^"]*)"}[^>]*\/>/gi, (_, value) => value || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // If text is empty and withPreviewText is enabled, use preview text
    if (!text && withPreviewText) {
      if (contentType === 'page-number') {
        // Use same format as Template Studio
        text = '01 / 12'; // Matches Template Studio's formatPageNumberLabel
      } else {
        text = ROLE_COPY[contentType] || ROLE_COPY['supporting-text'];
      }
    }
    
    map.set(area, text);
  }
  return map;
}

function resolveBrandSnapshot(brandFrontmatter) {
  if (!brandFrontmatter) {
    return getBrandSnapshot('default');
  }
  const brandId = brandFrontmatter.id || 'default';
  const variant = brandFrontmatter.variant;
  return getBrandSnapshot(brandId, variant);
}

function detectPotentialWidows(content, file, errors) {
  // Check for short lines that might end with a single word
  const lines = content.split(/\r?\n/);
  let lineNumber = 0;
  let inTable = false;
  
  for (const line of lines) {
    lineNumber++;
    const trimmedLine = line.trim();

    // Skip empty lines, frontmatter, and code blocks
    if (!trimmedLine || trimmedLine.startsWith('---') || trimmedLine.startsWith('```')) {
      continue;
    }

    // Detect if we're in a markdown table
    if (trimmedLine.includes('|')) {
      inTable = true;
    } else if (inTable && trimmedLine === '') {
      inTable = false;
    }

    // Skip table content
    if (inTable) {
      continue;
    }

    // Skip headers
    if (trimmedLine.startsWith('#')) {
      continue;
    }

    // Skip JSX/HTML component lines which generate false positives
    if (trimmedLine.startsWith('<')) {
      continue;
    }

    // Check for lines that end with a short word (potential widow)
    const words = trimmedLine.split(/\s+/);
    if (words.length >= 3) {
      const lastWord = words[words.length - 1];
      const secondToLastWord = words[words.length - 2];
      
      // Only flag if the last word is very short (1-3 characters) and not a number/symbol
      // and if we have meaningful content (not just table markers)
      if (lastWord.length <= 3 && 
          !/^\d+$/.test(lastWord) && 
          !/^[|>]+$/.test(lastWord) &&
          !lastWord.includes('|') &&
          secondToLastWord.length >= 4) {
        errors.push(`${file}: line ${lineNumber}: potential widow: "${secondToLastWord} ${lastWord}" - consider rephrasing`);
      }
    }
  }
}

function detectHtmlTables(content, file, errors) {
  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  const tables = content.match(tableRegex) || [];
  tables.forEach((table, index) => {
    const rowMatches = table.match(/<tr\b/gi) || [];
    const firstRowMatch = table.match(/<tr[\s\S]*?<\/tr>/i);
    const columnMatches = firstRowMatch ? String(firstRowMatch).match(/<t[hd]\b/gi) || [] : [];

    reportIfOversized({
      file,
      tableType: 'HTML',
      index,
      rows: rowMatches.length,
      columns: columnMatches.length,
      errors,
    });
  });
}

function detectMarkdownTables(content, file, errors) {
  const lines = content.split(/\r?\n/);
  let index = 0;
  let tableCount = 0;

  while (index < lines.length) {
    if (!/^\s*\|.*\|\s*$/.test(lines[index])) {
      index += 1;
      continue;
    }

    const block = [];
    while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
      block.push(lines[index]);
      index += 1;
    }

    if (block.length < 2 || !/\|\s*-{3,}/.test(block[1])) {
      continue;
    }

    tableCount += 1;

    const headerColumns = block[0]
      .split('|')
      .map((segment) => segment.trim())
      .filter(Boolean).length;
    const dataRows = Math.max(block.length - 2, 0);

    reportIfOversized({
      file,
      tableType: 'Markdown',
      index: tableCount - 1,
      rows: dataRows,
      columns: headerColumns,
      errors,
    });
  }
}

function reportIfOversized({ file, tableType, index, rows, columns, errors }) {
  const issues = [];
  if (columns > MAX_TABLE_COLUMNS) {
    issues.push(`columns=${columns} (limit ${MAX_TABLE_COLUMNS})`);
  }
  if (rows > MAX_TABLE_ROWS) {
    issues.push(`rows=${rows} (limit ${MAX_TABLE_ROWS})`);
  }

  if (issues.length) {
    errors.push(`${file}: ${tableType} table #${index + 1} may overflow (${issues.join(', ')})`);
  }
}

async function loadConfig(errors, { optional = false } = {}) {
  try {
    const configPath = await resolveConfigPath();
    const raw = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.slides)) {
      errors.push('config/slides.json must contain a "slides" array');
      return null;
    }

    const seen = new Set();
    for (const slide of parsed.slides) {
      if (!slide.file) {
        errors.push('Each slide entry requires a "file" property');
        continue;
      }
      if (seen.has(slide.file)) {
        errors.push(`Duplicate slide file reference: ${slide.file}`);
      }
      seen.add(slide.file);
    }

    return parsed;
  } catch (error) {
    if (optional && /Missing slide config/i.test(error.message)) {
      return null;
    }
    errors.push(`Unable to parse slide config: ${error.message}`);
    return null;
  }
}

async function resolveConfigPath() {
  if (resolvedConfigPath) {
    return resolvedConfigPath;
  }

  const searchPaths = configArgPath
    ? [resolveConfigArg(configArgPath)]
    : DEFAULT_CONFIG_PATHS;

  for (const candidate of searchPaths) {
    if (await fs.pathExists(candidate)) {
      resolvedConfigPath = candidate;
      return candidate;
    }
  }

  throw new Error(
    `Missing slide config. Looked in: ${searchPaths
      .map((candidate) => path.relative(ROOT, candidate))
      .join(', ')}`,
  );
}

function resolveConfigArg(value) {
  return path.isAbsolute(value) ? value : path.join(ROOT, value);
}

function extractConfigArgPath(argv) {
  for (const arg of argv) {
    if (arg.startsWith('--config=')) {
      return arg.split('=')[1];
    }
    if (arg.startsWith('-c=')) {
      return arg.split('=')[1];
    }
  }

  const longIndex = argv.indexOf('--config');
  if (longIndex !== -1 && argv[longIndex + 1]) {
    return argv[longIndex + 1];
  }

  const shortIndex = argv.indexOf('-c');
  if (shortIndex !== -1 && argv[shortIndex + 1]) {
    return argv[shortIndex + 1];
  }

  return null;
}

function extractFileFilters(argv) {
  const values = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith('--file=')) {
      values.push(arg.slice('--file='.length));
      continue;
    }
    if (arg === '--file') {
      if (argv[index + 1]) {
        values.push(argv[index + 1]);
        index += 1;
      }
      continue;
    }
    if (arg.startsWith('-f=')) {
      values.push(arg.slice('-f='.length));
      continue;
    }
    if (arg === '-f') {
      if (argv[index + 1]) {
        values.push(argv[index + 1]);
        index += 1;
      }
    }
  }

  const flatValues = [];
  for (const value of values) {
    if (!value) continue;
    const splits = value.split(',').map((segment) => segment.trim()).filter(Boolean);
    flatValues.push(...splits);
  }

  return flatValues.map((raw) => ({ raw, normalized: normalizeSlideSpecifier(raw) }));
}

function extractWithPreviewTextFlag(argv) {
  if (!Array.isArray(argv) || !argv.length) {
    return false;
  }

  for (const arg of argv) {
    if (arg === '--with-preview-text' || arg === '--preview-text') {
      return true;
    }
  }

  return false;
}

function extractVisualOverflowFlag(argv) {
  if (!Array.isArray(argv) || !argv.length) {
    return true;
  }

  let enabled = true;
  for (const arg of argv) {
    if (arg === '--no-visual' || arg === '--no-visual-overflow') {
      enabled = false;
    } else if (arg === '--visual-overflow' || arg === '--visual') {
      enabled = true;
    }
  }

  return enabled;
}

function collectNormalizedFileFilters(fileEntries, errors) {
  if (!fileEntries.length) {
    return [];
  }

  const normalized = [];
  const seen = new Set();

  for (const entry of fileEntries) {
    const { raw, normalized: normalizedPath } = entry;
    if (!normalizedPath) {
      errors.push(`--file value must resolve within templates/: ${raw}`);
      continue;
    }
    if (seen.has(normalizedPath)) {
      continue;
    }
    seen.add(normalizedPath);
    normalized.push(normalizedPath);
  }

  return normalized;
}

async function resolveSlidesToLint(configSlides, fileFilters, errors) {
  if (!fileFilters.length) {
    return configSlides;
  }

  const slidesByPath = new Map();
  for (const slide of configSlides) {
    const normalized = normalizeSlideSpecifier(slide.file);
    if (!normalized || slidesByPath.has(normalized)) {
      continue;
    }
    slidesByPath.set(normalized, slide);
  }

  const selected = [];
  const directFileTargets = [];

  for (const filter of fileFilters) {
    if (slidesByPath.has(filter)) {
      selected.push(slidesByPath.get(filter));
      continue;
    }

    const absolutePath = path.join(SLIDES_DIR, filter);
    if (!(await fs.pathExists(absolutePath))) {
      errors.push(`--file "${filter}" does not exist under templates/`);
      continue;
    }

    directFileTargets.push(filter);
    selected.push({
      file: filter,
      maxWords: DEFAULT_MAX_WORDS,
    });
  }

  if (directFileTargets.length) {
    console.warn(
      `⚠️  ${directFileTargets.length} --file entr${directFileTargets.length === 1 ? 'y is' : 'ies are'} not in any slide config; linting directly from file.`,
    );
  }

  return selected;
}

function normalizeSlideSpecifier(value) {
  if (!value) {
    return null;
  }

  let raw = value.trim();
  if (!raw) {
    return null;
  }

  raw = raw.replace(/\\/g, '/');
  raw = raw.replace(/^\.\/+/, '');

  if (path.isAbsolute(raw)) {
    const relative = path.relative(SLIDES_DIR, raw).replace(/\\/g, '/');
    return relative.startsWith('..') ? null : relative;
  }

  if (raw.startsWith('templates/')) {
    raw = raw.slice('templates/'.length);
  }

  const absolute = path.resolve(SLIDES_DIR, raw);
  const relative = path.relative(SLIDES_DIR, absolute).replace(/\\/g, '/');

  return relative.startsWith('..') ? null : relative;
}

function report(errors) {
  if (!errors.length) {
    console.log('✅ Slides lint passed');
    return;
  }

  console.error('❌ Slide lint issues:');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
}

main();
