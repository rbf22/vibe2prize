#!/usr/bin/env node

import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { promisify } from 'node:util';

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

const ROOT = path.resolve(process.cwd());
const STUDIO_DIR = path.join(ROOT, 'template-studio');
const ENTRY_FILE = path.join(STUDIO_DIR, 'grid-template-studio.html');
const DEFAULT_PORT = 4174;
const port = Number(process.env.STUDIO_PORT || process.env.PORT) || DEFAULT_PORT;

if (!fs.existsSync(ENTRY_FILE)) {
  console.error('❌ template-studio/grid-template-studio.html not found.');
  process.exit(1);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function safeJoin(base, relativePath) {
  const resolved = path.join(base, relativePath);
  if (!resolved.startsWith(base)) {
    return null;
  }
  return resolved;
}

function resolveRequestPath(urlPath) {
  const normalized = decodeURIComponent(urlPath.split('?')[0] || '/');
  if (normalized === '/' || normalized === '') {
    return ENTRY_FILE;
  }

  const relative = normalized.replace(/^\/+/, '');
  if (relative.length === 0) {
    return ENTRY_FILE;
  }

  // Check if request is for the core directory
  if (relative.startsWith('core/')) {
    return safeJoin(ROOT, relative);
  }

  // Allow loading brand assets/configs directly from templates/
  if (relative.startsWith('templates/')) {
    return safeJoin(ROOT, relative);
  }

  return safeJoin(STUDIO_DIR, relative);
}

function sendNotFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}

function serveFile(filePath, res) {
  const stream = fs.createReadStream(filePath);
  stream.on('open', () => {
    res.writeHead(200, { 
      'Content-Type': getMimeType(filePath),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    stream.pipe(res);
  });

  stream.on('error', () => {
    sendNotFound(res);
  });
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  if (req.method === 'POST' && req.url === '/__logs') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const level = typeof payload.level === 'string' ? payload.level : 'log';
        const args = Array.isArray(payload.args) ? payload.args : [];
        const tag = '[StudioConsole]';
        if (typeof console[level] === 'function') {
          console[level](tag, ...args);
        } else {
          console.log(tag, ...args);
        }
      } catch (error) {
        console.warn('[StudioConsole] Failed to parse payload:', error.message);
      }
      res.writeHead(204).end();
    });
    req.on('error', () => {
      res.writeHead(500).end();
    });
    return;
  }

  if (req.url === '/api/templates' && req.method === 'GET') {
    (async () => {
      try {
        const mdxDir = path.join(ROOT, 'templates', 'mdx');
        if (!fs.existsSync(mdxDir)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify([]));
        }

        const files = await readdir(mdxDir);
        const mdxFiles = files.filter(f => f.endsWith('.mdx'));
        const templates = [];

        for (const file of mdxFiles) {
          const content = await readFile(path.join(mdxDir, file), 'utf8');
          // simple frontmatter parsing since we don't have gray-matter here
          const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
          if (match) {
            let title = file;
            let regions = [];
            // Parse title
            const titleMatch = match[1].match(/title:\s*["']([^"']+)["']/);
            if (titleMatch) title = titleMatch[1];
            
            // basic yaml parsing for regions
            const regionsMatch = match[1].split('\\n');
            let inRegions = false;
            let currentRegion = null;
            for(const line of regionsMatch) {
                if (line.trim().startsWith('regions:')) { inRegions = true; continue; }
                if (inRegions && line.trim().startsWith('- id:')) {
                    if (currentRegion) regions.push(currentRegion);
                    currentRegion = { id: line.split(':')[1].trim() };
                } else if (inRegions && currentRegion && line.trim().startsWith('name:')) {
                    currentRegion.name = line.split(':')[1].trim();
                } else if (inRegions && currentRegion && line.trim().startsWith('area:')) {
                    currentRegion.name = line.split(':')[1].trim();
                } else if (inRegions && currentRegion && line.trim().startsWith('role:')) {
                    currentRegion.role = line.split(':')[1].trim();
                } else if (inRegions && !line.startsWith(' ')) {
                    inRegions = false; // exit regions array
                }
            }
            if (currentRegion) regions.push(currentRegion);

            templates.push({
              name: title,
              file: file,
              regions: regions.length ? regions : [
                {name: 'Title', role: 'primary-title', x: 2, y: 2, w: 76, h: 6},
                {name: 'Content', role: 'supporting-text', x: 2, y: 10, w: 76, h: 30}
              ] // fallback
            });
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(templates));
      } catch (err) {
        console.error(err);
        res.writeHead(500).end('Failed to list templates');
      }
    })();
    return;
  }

  if (req.url === '/api/save-template' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const mdxDir = path.join(ROOT, 'templates', 'mdx');
        await mkdir(mdxDir, { recursive: true });
        
        let filename = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.mdx';
        await writeFile(path.join(mdxDir, filename), payload.content, 'utf8');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, file: filename }));
      } catch (e) {
        res.writeHead(500).end(e.message);
      }
    });
    return;
  }

  if (req.url === '/api/save-deck' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body); // { name: "my-deck", slides: [...] }
        const deckName = payload.name || 'presentation';
        const deckDir = path.join(ROOT, 'decks', deckName);
        await mkdir(deckDir, { recursive: true });

        const manifestSlides = [];
        for (let i = 0; i < payload.slides.length; i++) {
          const slide = payload.slides[i];
          const filename = `slide-${String(i+1).padStart(2, '0')}.mdx`;
          await writeFile(path.join(deckDir, filename), slide.mdxContent, 'utf8');
          
          manifestSlides.push({
            file: `../decks/${deckName}/${filename}`, // Relative to templates/ slide_sets/
            title: slide.name || `Slide ${i+1}`
          });
        }

        // Save manifest to templates/slide_sets/
        const slideSetsDir = path.join(ROOT, 'templates', 'slide_sets');
        await mkdir(slideSetsDir, { recursive: true });
        const manifestData = { slides: manifestSlides };
        await writeFile(
            path.join(slideSetsDir, `${deckName}.json`), 
            JSON.stringify(manifestData, null, 2), 
            'utf8'
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500).end(e.message);
      }
    });
    return;
  }

  const targetPath = resolveRequestPath(req.url);
  if (!targetPath) {
    sendNotFound(res);
    return;
  }

  fs.stat(targetPath, (err, stats) => {
    if (err || !stats.isFile()) {
      sendNotFound(res);
      return;
    }

    serveFile(targetPath, res);
  });
});

server.listen(port, () => {
  const url = `http://localhost:${port}`;
  console.log(`\n🟣 Template Studio running at ${url}`);
  console.log('Serving template-studio/ as a standalone static tool.');
  console.log('Press Ctrl+C to stop.\n');

  if (!process.env.STUDIO_NO_OPEN) {
    openBrowser(url);
  }
});

function openBrowser(url) {
  let command;
  let args;

  if (process.platform === 'darwin') {
    command = 'open';
    args = [url];
  } else if (process.platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '""', url];
  } else {
    command = 'xdg-open';
    args = [url];
  }

  const child = spawn(command, args, { stdio: 'ignore', detached: true });
  child.on('error', () => {
    console.warn('⚠️  Unable to auto-open browser. Please open the URL manually.');
  });
  child.unref();
}

function shutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down Template Studio server...`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
