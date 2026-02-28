#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const STUDIO_SCRIPT = path.join(ROOT_DIR, 'scripts', 'template-studio.js');
const STUDIO_PORT = 4175;
const STUDIO_URL = `http://localhost:${STUDIO_PORT}`;
const OUTPUT_DIR = path.join(ROOT_DIR, 'template-studio', 'test-output');
const PREVIEW_IMG = path.join(OUTPUT_DIR, 'preview-surface.png');
const PRODUCTION_IMG = path.join(OUTPUT_DIR, 'production-surface.png');
const DIFF_IMG = path.join(OUTPUT_DIR, 'pixel-diff.png');

const VIEWPORT = { width: 1440, height: 900 };

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function waitForStudio(page) {
  await page.waitForFunction(() => typeof window !== 'undefined' && !!window.TemplateStudio && !!window.TemplateStudio.renderSlidePreview, {
    timeout: 30000
  });
}

async function configureState(page) {
  await page.evaluate(async () => {
    const { TemplateStudio } = window;
    const state = TemplateStudio.state;
    state.canvasWidth = 1920;
    state.canvasHeight = 1080;
    state.columns = 80;
    state.rows = 45;
    state.brand = { id: 'default', variant: 'dark' };
    state.pagination = { pageNumber: 1, totalSlides: 12, label: 'Page' };
    state.previewFlags = {
      previewChrome: true,
      showRegionOutlines: true,
      detectDomOverflow: true
    };
    if (typeof TemplateStudio.hydrateMasterTemplate === 'function') {
      await TemplateStudio.hydrateMasterTemplate({ force: true });
    }
    TemplateStudio.applyBrandTheme(state.brand.id, state.brand.variant);
  });
}

async function captureElement(page, selector, outputPath) {
  const element = await page.$(selector);
  if (!element) {
    throw new Error(`Unable to locate element for selector: ${selector}`);
  }
  const box = await element.boundingBox();
  if (!box) {
    throw new Error(`Failed to compute bounding box for selector: ${selector}`);
  }
  await page.screenshot({
    path: outputPath,
    clip: {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height
    }
  });
}

function readPng(buffer) {
  return PNG.sync.read(buffer);
}

async function normalizeSurfaces(page) {
  await page.addStyleTag({
    content: `
      #capturePreview,
      #captureProduction,
      #capturePreview *,
      #captureProduction * {
        background: #050505 !important;
        border-color: rgba(255,255,255,0.15) !important;
        box-shadow: none !important;
      }
      #capturePreview,
      #captureProduction {
        border: 1px solid rgba(255,255,255,0.15) !important;
        border-radius: 0 !important;
        width: 960px !important;
        height: 540px !important;
        margin: 0 !important;
        padding: 0 !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        transform: none !important;
        contain: strict;
        overflow: hidden !important;
        z-index: 9999 !important;
      }
    `
  });
}

async function renderCaptureBoards(page) {
  await page.evaluate(async () => {
    const { TemplateStudio } = window;
    const removeIfExists = (id) => {
      const existing = document.getElementById(id);
      if (existing) existing.remove();
    };
    removeIfExists('capturePreview');
    removeIfExists('captureProduction');

    const baseStyle = 'width:960px;height:540px;background:#050505;position:absolute;top:0;left:0;overflow:hidden;';

    const previewContainer = document.createElement('div');
    previewContainer.id = 'capturePreview';
    previewContainer.style.cssText = baseStyle;
    document.body.appendChild(previewContainer);

    const productionContainer = document.createElement('div');
    productionContainer.id = 'captureProduction';
    productionContainer.style.cssText = baseStyle;
    productionContainer.style.top = '600px';
    document.body.appendChild(productionContainer);

    TemplateStudio.renderSlidePreview(previewContainer);
    TemplateStudio.renderProductionSlide(productionContainer);

    await new Promise((resolve) => setTimeout(resolve, 500));
  });
}

async function cleanupCaptureBoards(page) {
  await page.evaluate(() => {
    document.getElementById('capturePreview')?.remove();
    document.getElementById('captureProduction')?.remove();
  });
}

async function canReachStudio() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(STUDIO_URL, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function startStudioServer() {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [STUDIO_SCRIPT], {
      cwd: ROOT_DIR,
      env: {
        ...process.env,
        STUDIO_NO_OPEN: '1',
        STUDIO_PORT: String(STUDIO_PORT)
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let resolved = false;

    const handleReady = () => {
      if (!resolved) {
        resolved = true;
        resolve(child);
      }
    };

    child.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);
      if (text.includes('Template Studio running')) {
        handleReady();
      }
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    child.on('error', (error) => {
      if (!resolved) {
        reject(error);
      }
    });

    child.on('exit', (code) => {
      if (!resolved) {
        reject(new Error(`Template Studio server exited with code ${code}`));
      }
    });
  });
}

async function stopStudioServer(child) {
  if (!child) return;
  return new Promise((resolve) => {
    child.once('exit', () => resolve());
    child.kill('SIGINT');
    setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    }, 2000);
  });
}

async function createPixelDiff() {
  await ensureOutputDir();

  let serverProcess = null;
  const alreadyRunning = await canReachStudio();
  if (alreadyRunning) {
    console.log(`Detected existing Template Studio server at ${STUDIO_URL}, reusing it for capture.`);
  } else {
    serverProcess = await startStudioServer();
  }
  const browser = await puppeteer.launch({ headless: 'new', defaultViewport: VIEWPORT });
  try {
    const page = await browser.newPage();
    await page.goto(STUDIO_URL, { waitUntil: 'networkidle0' });
    await waitForStudio(page);
    await configureState(page);
    await renderCaptureBoards(page);
    await normalizeSurfaces(page);

    await captureElement(page, '#capturePreview', PREVIEW_IMG);
    await captureElement(page, '#captureProduction', PRODUCTION_IMG);
  } finally {
    await browser.close();
    await cleanupCaptureBoards(page);
    await stopStudioServer(serverProcess);
  }

  const previewPng = readPng(await fs.readFile(PREVIEW_IMG));
  const productionPng = readPng(await fs.readFile(PRODUCTION_IMG));

  if (previewPng.width !== productionPng.width || previewPng.height !== productionPng.height) {
    throw new Error(`Image dimensions differ. Preview ${previewPng.width}x${previewPng.height}, Production ${productionPng.width}x${productionPng.height}`);
  }

  const { width, height } = previewPng;
  const diffPng = new PNG({ width, height });
  const mismatchedPixels = pixelmatch(
    previewPng.data,
    productionPng.data,
    diffPng.data,
    width,
    height,
    { threshold: 0.1 }
  );

  await fs.writeFile(DIFF_IMG, PNG.sync.write(diffPng));

  const totalPixels = width * height;
  const mismatchPercent = (mismatchedPixels / totalPixels) * 100;

  console.log('🖼️  Preview surface saved to:', PREVIEW_IMG);
  console.log('🖼️  Production surface saved to:', PRODUCTION_IMG);
  console.log('📊  Pixel diff saved to:', DIFF_IMG);
  console.log(`⚖️  Mismatched pixels: ${mismatchedPixels} (${mismatchPercent.toFixed(4)}%)`);
}

createPixelDiff().catch((error) => {
  console.error('Pixel diff capture failed:', error);
  process.exitCode = 1;
});
