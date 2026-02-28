// Test setup for Template Studio regression tests
// This file sets up the browser environment for Node.js testing

import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'node:fs/promises';
import path from 'node:path';

// Create and configure DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><head><title>Test</title></head><body></body></html>', {
  url: 'http://localhost:8080',
  pretendToBeVisual: true,
  resources: 'usable',
  runScripts: 'dangerously',
  virtualConsole: new VirtualConsole()
});

// Set up global browser APIs
global.window = dom.window;
global.document = dom.window.document;
if (typeof global.navigator === 'undefined') {
  global.navigator = dom.window.navigator;
} else {
  Object.defineProperty(global, 'navigator', {
    configurable: true,
    enumerable: true,
    get: () => dom.window.navigator
  });
}
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = dom.window.requestAnimationFrame;
global.cancelAnimationFrame = dom.window.cancelAnimationFrame;

const ROOT_DIR = process.cwd();
const nativeFetch = global.fetch;

function normalizeFetchInput(input) {
  if (typeof input === 'string') return input;
  if (!input) return '';
  if (typeof input === 'object') {
    if (typeof input.url === 'string') return input.url;
    if (typeof input.href === 'string') return input.href;
    if (typeof input.toString === 'function') {
      const value = input.toString();
      if (typeof value === 'string' && value.length) return value;
    }
  }
  return '';
}

global.fetch = async function testFetch(input, init) {
  const rawUrl = normalizeFetchInput(input);
  if (!rawUrl) {
    const error = new TypeError('Invalid fetch input');
    error.input = input;
    throw error;
  }

  const isFileLike = rawUrl.startsWith('/') || rawUrl.startsWith('./') || rawUrl.startsWith('../');

  if (isFileLike) {
    const relativePath = rawUrl.startsWith('/') ? rawUrl.slice(1) : rawUrl;
    const absolutePath = path.join(ROOT_DIR, relativePath);
    try {
      const buffer = await fs.readFile(absolutePath);
      const textContent = buffer.toString();
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        url: rawUrl,
        json: async () => JSON.parse(textContent),
        text: async () => textContent,
        arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
        blob: async () => buffer,
        headers: new Map(),
        redirected: false,
        type: 'basic'
      };
    } catch (error) {
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        url: rawUrl,
        json: async () => { throw error; },
        text: async () => { throw error; }
      };
    }
  }

  if (typeof nativeFetch === 'function') {
    return nativeFetch(input, init);
  }

  throw new TypeError(`Cannot fetch URL: ${rawUrl}`);
};

// Mock canvas and related APIs
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
global.CanvasRenderingContext2D = dom.window.CanvasRenderingContext2D;

// Mock clipboard API
global.navigator.clipboard = {
  writeText: async (text) => {
    // Mock clipboard write
    console.log('Clipboard write (mocked):', text);
  },
  readText: async () => {
    // Mock clipboard read
    return '';
  }
};

// Mock file APIs
global.File = dom.window.File;
global.FileReader = dom.window.FileReader;
global.Blob = dom.window.Blob;
global.URL = dom.window.URL;

// Mock event APIs
global.CustomEvent = dom.window.CustomEvent;
global.Event = dom.window.Event;
global.MouseEvent = dom.window.MouseEvent;
global.KeyboardEvent = dom.window.KeyboardEvent;

// Mock console for test output
global.console = console;

// Export cleanup function
export function cleanupTestEnvironment() {
  dom.window.document.body.innerHTML = '';
  dom.window.close();
}

// Export DOM for test access
export { dom };
