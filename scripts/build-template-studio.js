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

if (!fs.existsSync(entryPoint)) {
  console.error('❌ template-studio/src/main.js not found.');
  process.exit(1);
}

async function buildStudio() {
  try {
    const result = await build({
      entryPoints: [entryPoint],
      bundle: true,
      outfile: path.join(DIST_DIR, 'main.js'),
      format: 'esm',
      target: 'es2020',
      minify: true,
      sourcemap: true,
      treeShaking: true,
      platform: 'browser',
      external: ['*.mdx'], // Don't bundle MDX files
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      loader: {
        '.js': 'js'
      },
      logLevel: 'info'
    });

    if (result.errors.length > 0) {
      console.error('❌ Build failed with errors:');
      result.errors.forEach(error => console.error(error.text));
      process.exit(1);
    }

    if (result.warnings.length > 0) {
      console.warn('⚠️  Build warnings:');
      result.warnings.forEach(warning => console.warn(warning.text));
    }

    const stats = fs.statSync(path.join(DIST_DIR, 'main.js'));
    const mapStats = fs.statSync(path.join(DIST_DIR, 'main.js.map'));
    
    console.log(`  template-studio/dist/main.js       ${(stats.size / 1024).toFixed(1)}kb`);
    console.log(`  template-studio/dist/main.js.map  ${(mapStats.size / 1024).toFixed(1)}kb`);
    console.log('\n⚡ Done in ' + (Date.now() - startTime) + 'ms');
    console.log('✅ Template Studio bundle built: template-studio/dist/main.js');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

const startTime = Date.now();
buildStudio();
