#!/usr/bin/env node

import { build } from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = process.cwd();
const STUDIO_DIR = path.join(ROOT, 'template-studio');
const SRC_DIR = path.join(STUDIO_DIR, 'src');
const DIST_DIR = path.join(STUDIO_DIR, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

const entryPoint = path.join(SRC_DIR, 'main.js');
const workerEntryPoint = path.join(SRC_DIR, 'llm-worker.js');

if (!fs.existsSync(entryPoint)) {
  console.error('❌ template-studio/src/main.js not found.');
  process.exit(1);
}

async function buildStudio() {
  try {
    // Build main application
    const result = await build({
      entryPoints: [entryPoint],
      bundle: true,
      outfile: path.join(DIST_DIR, 'main.js'),
      format: 'esm',
      target: 'es2022',
      minify: true,
      sourcemap: true,
      treeShaking: true,
      platform: 'browser',
      external: [
        '*.mdx',
        'fs-extra',
        'ajv',
        'node:path',
        'node:fs',
        'node:url',
        'path',
        'fs',
        'assert',
        'util',
        'stream',
        'constants',
        'jsdom',
        'url',
        'perf_hooks'
      ], // Don't bundle MDX files or Node-only deps used by shared loader / lint tooling
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      loader: {
        '.js': 'js'
      },
      logLevel: 'info'
    });

    if (result.errors.length > 0) {
      console.error('❌ Main build failed with errors:');
      result.errors.forEach(error => console.error(error.text));
      process.exit(1);
    }

    // Build worker separately
    const workerResult = await build({
      entryPoints: [workerEntryPoint],
      bundle: true,
      outfile: path.join(DIST_DIR, 'llm-worker.js'),
      external: [
        'url',
        'path',
        'fs',
        'perf_hooks'
      ],
      format: 'esm',
      target: 'es2022',
      minify: true,
      sourcemap: true,
      treeShaking: true,
      platform: 'browser',
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      logLevel: 'info'
    });

    if (workerResult.errors.length > 0) {
      console.error('❌ Worker build failed with errors:');
      workerResult.errors.forEach(error => console.error(error.text));
      process.exit(1);
    }

    if (result.warnings.length > 0) {
      console.warn('⚠️  Build warnings:');
      result.warnings.forEach(warning => console.warn(warning.text));
    }

    const stats = fs.statSync(path.join(DIST_DIR, 'main.js'));
    const mapStats = fs.statSync(path.join(DIST_DIR, 'main.js.map'));
    const workerStats = fs.statSync(path.join(DIST_DIR, 'llm-worker.js'));
    
    console.log(`  template-studio/dist/main.js       ${(stats.size / 1024).toFixed(1)}kb`);
    console.log(`  template-studio/dist/main.js.map  ${(mapStats.size / 1024).toFixed(1)}kb`);
    console.log(`  template-studio/dist/llm-worker.js ${(workerStats.size / 1024).toFixed(1)}kb`);
    console.log('\n⚡ Done in ' + (Date.now() - startTime) + 'ms');
    console.log('✅ Template Studio bundle and worker built: template-studio/dist/');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

const startTime = Date.now();
buildStudio();
