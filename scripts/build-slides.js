#!/usr/bin/env node

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import fs from 'fs-extra';
import matter from 'gray-matter';
import { evaluate } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const ROOT = path.resolve(process.cwd());
const SLIDES_DIR = path.join(ROOT, 'slides');
const LAYOUTS_DIR = path.join(ROOT, 'layouts');
const DEFAULT_CONFIG_PATHS = [
  path.join(ROOT, 'config', 'slides.json'),
  path.join(ROOT, 'slide_sets', 'slides.json'),
];
let resolvedConfigPath = null;
const DIST_DIR = path.join(ROOT, 'dist');
const OUTPUT_FILE = path.join(DIST_DIR, 'slides.html');

const args = process.argv.slice(2);
const watchMode = args.includes('--watch');
const configArgPath = extractConfigArgPath(args);

async function build() {
  try {
    await fs.ensureDir(SLIDES_DIR);
    const config = await loadConfig();
    const sections = [];

    for (const [index, slide] of (config.slides || []).entries()) {
      const absolutePath = path.join(SLIDES_DIR, slide.file);
      if (!(await fs.pathExists(absolutePath))) {
        throw new Error(`Slide file not found: ${slide.file}`);
      }

      const source = await fs.readFile(absolutePath, 'utf8');
      const { content, data } = matter(source);
      let module;
      try {
        module = await evaluate(content, {
          Fragment,
          jsx,
          jsxs,
          development: false,
          useDynamicImport: true,
          baseUrl: pathToFileURL(absolutePath),
          remarkPlugins: [remarkGfm],
        });
      } catch (error) {
        throw new Error(`Failed to compile MDX for ${slide.file}: ${error.message}`);
      }
      const Component = module.default;

      const element = React.createElement(Component, data);
      const html = renderToStaticMarkup(element);
      const resolvedTitle = data.title || slide.title || '';
      const sectionLabel = data.sectionTitle || data.section || data.phase || resolvedTitle;
      const shouldRenderLabel = sectionLabel && data.phase !== 'title';
      const sectionAttributes = [
        `data-slide-index="${index}"`,
        `data-title="${escapeHtml(resolvedTitle)}"`,
      ];

      if (data.phase) {
        sectionAttributes.push(`data-phase="${escapeHtml(data.phase)}"`);
      }

      if (sectionLabel && shouldRenderLabel) {
        sectionAttributes.push(`data-section-title="${escapeHtml(sectionLabel)}"`);
      }

      const labelMarkup = shouldRenderLabel
        ? `<div class="section-label" aria-hidden="true">${escapeHtml(sectionLabel)}</div>`
        : '';

      sections.push(`<section ${sectionAttributes.join(' ')}>${labelMarkup}${html}</section>`);
    }

    await fs.ensureDir(DIST_DIR);
    await fs.writeFile(OUTPUT_FILE, sections.join('\n'), 'utf8');
    console.log(`Built ${sections.length} slide(s) → ${path.relative(ROOT, OUTPUT_FILE)}`);
  } catch (error) {
    console.error('[build-slides]', error);
    if (!watchMode) {
      process.exitCode = 1;
    }
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function loadConfig() {
  const configPath = await resolveConfigPath();
  const raw = await fs.readFile(configPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.slides)) {
    parsed.slides = [];
  }
  return parsed;
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
    `Missing configuration file. Looked in: ${searchPaths
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

async function start() {
  await build();

  if (watchMode) {
    console.log('Watching slides and config for changes...');
    const scheduleBuild = debounce(build, 200);

    const configPath = await resolveConfigPath();
    fs.watch(configPath, scheduleBuild);
    fs.watch(SLIDES_DIR, { recursive: true }, scheduleBuild);
    fs.watch(LAYOUTS_DIR, { recursive: true }, scheduleBuild);
  }
}

function debounce(fn, delay) {
  let timer = null;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn().catch((error) => console.error('[watch build]', error));
    }, delay);
  };
}

start();
