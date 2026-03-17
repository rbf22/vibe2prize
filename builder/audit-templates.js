#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';
import { validateFrontmatter } from '../core/mdx/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.resolve(REPO_ROOT, 'Accenture Template.mdx');
const TEMPLATES_DIR = path.resolve(REPO_ROOT, 'templates/mdx');
const REPORT_DIR = path.resolve(REPO_ROOT, 'builder', 'reports');
const REPORT_PATH = path.join(REPORT_DIR, 'template-audit.json');

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath);
}

async function ensureFileExists(filePath, label) {
  try {
    await fs.access(filePath);
  } catch (error) {
    throw new Error(`Missing ${label} at ${filePath}`);
  }
}

async function parseFrontmatter(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const { data } = matter(raw);
  return data;
}

function describeComponentShape(components) {
  if (!Array.isArray(components)) return 'missing';
  if (components.length === 0) return 'empty';
  return typeof components[0] === 'string' ? 'string-array' : 'object-array';
}

function collectBaselineDiff(frontmatter, baseline) {
  const diff = {};

  const templateSettingsKeys = ['canvasWidth', 'canvasHeight', 'columns', 'rows', 'columnSize', 'rowSize', 'gap'];
  if (frontmatter.templateSettings && baseline.templateSettings) {
    const gridDiff = {};
    templateSettingsKeys.forEach((key) => {
      const baselineValue = baseline.templateSettings[key];
      const templateValue = frontmatter.templateSettings[key];
      if (baselineValue !== templateValue) {
        gridDiff[key] = { baseline: baselineValue, template: templateValue ?? null };
      }
    });
    if (Object.keys(gridDiff).length) {
      diff.templateSettings = gridDiff;
    }
  } else if (!frontmatter.templateSettings) {
    diff.templateSettings = 'missing';
  }

  if (frontmatter.layout && baseline.layout) {
    if (frontmatter.layout.type !== baseline.layout.type) {
      diff.layoutType = { baseline: baseline.layout.type, template: frontmatter.layout.type ?? null };
    }
    if (frontmatter.layout.gap !== baseline.layout.gap) {
      diff.layoutGap = { baseline: baseline.layout.gap, template: frontmatter.layout.gap ?? null };
    }
  }

  const baselineRoles = new Set((baseline.regions || []).map((region) => region.role));
  const templateRoles = new Set((frontmatter.regions || []).map((region) => region.role));
  const missingRoles = [...baselineRoles].filter((role) => !templateRoles.has(role));
  if (missingRoles.length) {
    diff.missingBaselineRoles = missingRoles;
  }

  return diff;
}

function collectIssues(frontmatter) {
  const issues = [];
  const validation = validateFrontmatter(frontmatter);
  if (!validation.valid) {
    issues.push(...validation.errors);
  }

  if (!frontmatter.templateSettings) {
    issues.push('templateSettings block missing');
  }
  if (!frontmatter.exclusions) {
    issues.push('exclusions block missing');
  }
  if (!frontmatter.brand) {
    issues.push('brand block missing');
  }
  if (!Array.isArray(frontmatter.regions) || !frontmatter.regions.length) {
    issues.push('regions array missing or empty');
  }
  if (!frontmatter.layout) {
    issues.push('layout block missing');
  } else if (!Array.isArray(frontmatter.layout.components)) {
    issues.push('layout.components must be an array of objects');
  } else if (frontmatter.layout.components.some((component) => typeof component !== 'object')) {
    issues.push('layout.components contains non-object entries');
  }

  return [...new Set(issues)];
}

function buildReportEntry(filePath, frontmatter, baseline) {
  const componentShape = describeComponentShape(frontmatter?.layout?.components);
  return {
    file: rel(filePath),
    title: frontmatter.title ?? '',
    layoutTemplate: frontmatter.layout?.template ?? '',
    componentShape,
    componentCount: Array.isArray(frontmatter.layout?.components)
      ? frontmatter.layout.components.length
      : 0,
    regionCount: Array.isArray(frontmatter.regions) ? frontmatter.regions.length : 0,
    hasTemplateSettings: Boolean(frontmatter.templateSettings),
    hasBrand: Boolean(frontmatter.brand),
    hasExclusions: Boolean(frontmatter.exclusions),
    baselineDiff: collectBaselineDiff(frontmatter, baseline),
    issues: collectIssues(frontmatter),
  };
}

async function collectTemplates() {
  const entries = await fs.readdir(TEMPLATES_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.mdx'))
    .map((entry) => path.join(TEMPLATES_DIR, entry.name));
}

async function main() {
  await ensureFileExists(BASELINE_PATH, 'baseline template');
  await ensureFileExists(TEMPLATES_DIR, 'templates directory');

  const baselineFrontmatter = await parseFrontmatter(BASELINE_PATH);
  const templateFiles = await collectTemplates();

  const report = [];
  for (const filePath of templateFiles) {
    try {
      const frontmatter = await parseFrontmatter(filePath);
      report.push(buildReportEntry(filePath, frontmatter, baselineFrontmatter));
    } catch (error) {
      report.push({
        file: rel(filePath),
        error: error.message,
      });
    }
  }

  await fs.mkdir(REPORT_DIR, { recursive: true });
  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));

  const total = report.length;
  const blocking = report.filter((entry) => Array.isArray(entry.issues) && entry.issues.length);
  const missingBaselineSections = report.filter((entry) => entry.baselineDiff?.templateSettings === 'missing');

  console.log('Template Audit Summary');
  console.log('======================');
  console.log(`Templates analyzed: ${total}`);
  console.log(`Templates with schema/baseline issues: ${blocking.length}`);
  console.log(`Templates missing templateSettings: ${missingBaselineSections.length}`);
  console.log(`Detailed report written to ${rel(REPORT_PATH)}`);
}

main().catch((error) => {
  console.error('Failed to audit templates');
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
