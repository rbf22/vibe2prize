import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = path.resolve(process.cwd());
const SOURCE_DIR = path.join(ROOT, 'templates');
const DEST_DIR = path.join(ROOT, 'template-studio', 'templates');

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyDir(source, destination) {
  await ensureDir(destination);
  const entries = await fs.readdir(source, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath);
    }
  }));
}

function mapRegion(region = {}, index = 0) {
  const defaultName = region.name || region.role || region.id || `Region ${index + 1}`;
  const grid = region.grid || {};
  const normalizeNumber = (value, fallback) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  return {
    id: region.id || `region-${index + 1}`,
    name: defaultName,
    role: region.role || 'supporting-text',
    x: normalizeNumber(grid.x, 2),
    y: normalizeNumber(grid.y, 2),
    w: normalizeNumber(grid.width ?? grid.w, 20),
    h: normalizeNumber(grid.height ?? grid.h, 8)
  };
}

async function buildTemplateManifest(sourceDir) {
  const mdxDir = path.join(sourceDir, 'mdx');
  let entries;
  try {
    entries = await fs.readdir(mdxDir, { withFileTypes: true });
  } catch (error) {
    return [];
  }

  const manifest = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.mdx')) continue;
    const filePath = path.join(mdxDir, entry.name);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const { data } = matter(content);
      const regions = Array.isArray(data?.regions)
        ? data.regions.map(mapRegion)
        : [
            { name: 'Title', role: 'primary-title', x: 2, y: 2, w: 76, h: 6 },
            { name: 'Content', role: 'supporting-text', x: 2, y: 10, w: 76, h: 30 }
          ];

      manifest.push({
        name: data?.title || entry.name,
        file: entry.name,
        regions
      });
    } catch (error) {
      console.warn(`Failed to parse ${entry.name}:`, error.message);
    }
  }

  return manifest;
}

export async function syncPublicTemplates({ silent = false, onComplete } = {}) {
  await fs.rm(DEST_DIR, { recursive: true, force: true });
  await copyDir(SOURCE_DIR, DEST_DIR);
  const manifest = await buildTemplateManifest(DEST_DIR);
  await fs.writeFile(
    path.join(DEST_DIR, 'templates-manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
  if (typeof onComplete === 'function') {
    await onComplete({ manifest });
  }
  if (!silent) {
    console.log(`✅ Copied templates to ${path.relative(ROOT, DEST_DIR)}`);
    console.log(`✅ Generated templates-manifest.json (${manifest.length} entries)`);
  }
}
