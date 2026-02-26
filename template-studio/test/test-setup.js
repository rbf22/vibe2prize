// Test setup for Template Studio regression tests
// This file sets up the browser environment for Node.js testing

import { JSDOM } from 'jsdom';

// Create and configure DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><head><title>Test</title></head><body></body></html>', {
  url: 'http://localhost:8080',
  pretendToBeVisual: true,
  resources: 'usable',
  runScripts: 'dangerously',
  virtualConsole: new (require('jsdom').VirtualConsole)()
});

// Set up global browser APIs
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = dom.window.requestAnimationFrame;
global.cancelAnimationFrame = dom.window.cancelAnimationFrame;

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
