import { JSDOM, VirtualConsole } from 'jsdom';

const globalScope = globalThis;

function setGlobalReference(key, value) {
  const descriptor = Object.getOwnPropertyDescriptor(globalScope, key);
  if (!descriptor) {
    globalScope[key] = value;
    return;
  }
  if (descriptor.value === value) {
    return;
  }
  if (typeof descriptor.set === 'function') {
    try {
      descriptor.set.call(globalScope, value);
    } catch {}
    return;
  }
  if (descriptor.writable) {
    try {
      globalScope[key] = value;
    } catch {}
    return;
  }
  if (descriptor.configurable) {
    Object.defineProperty(globalScope, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value
    });
    return;
  }
  // Non-configurable + non-writable with different value: leave as-is.
}

function setGlobalValue(key, value) {
  const descriptor = Object.getOwnPropertyDescriptor(globalScope, key);
  if (!descriptor) {
    globalScope[key] = value;
    return;
  }
  if (descriptor.value === value) {
    return;
  }
  if (descriptor.writable) {
    try {
      globalScope[key] = value;
    } catch {}
    return;
  }
  if (descriptor.configurable) {
    Object.defineProperty(globalScope, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value
    });
  }
}

let currentDom = null;
let currentVirtualConsole = null;
let sharedDom = null;

// Initialize a shared DOM for backward compatibility
function ensureSharedDom() {
  if (!sharedDom) {
    const virtualConsole = new VirtualConsole();
    sharedDom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable',
      virtualConsole
    });
  }
  return sharedDom;
}

// Initialize shared DOM and globals immediately
ensureSharedDom();

function installGlobals(domInstance) {
  const { window } = domInstance;
  const { document, navigator } = window;
  
  // Set up alert/confirm/prompt
  window.alert = window.alert || (() => {});
  window.confirm = window.confirm || (() => true);
  window.prompt = window.prompt || (() => '');

  // Install globals
  setGlobalReference('window', window);
  setGlobalReference('document', document);
  setGlobalReference('navigator', navigator);
  setGlobalValue('HTMLElement', window.HTMLElement);
  setGlobalValue('Element', window.Element);
  setGlobalValue('Node', window.Node);
  setGlobalValue('getComputedStyle', window.getComputedStyle.bind(window));
  setGlobalValue('CustomEvent', window.CustomEvent);
  setGlobalValue('Event', window.Event);
  setGlobalValue('alert', window.alert);
  setGlobalValue('confirm', window.confirm);
  setGlobalValue('prompt', window.prompt);
}

// Install shared DOM globals initially
installGlobals(sharedDom);

export function createFreshDom(html = '<!DOCTYPE html><html><body></body></html>') {
  // Clean up any existing isolated DOM
  if (currentDom) {
    currentDom.window.close();
    currentDom = null;
  }
  if (currentVirtualConsole) {
    currentVirtualConsole = null;
  }

  // Create new DOM instance
  currentVirtualConsole = new VirtualConsole();
  currentDom = new JSDOM(html, {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable',
    virtualConsole: currentVirtualConsole
  });

  // Install globals from the new DOM
  installGlobals(currentDom);

  const { window } = currentDom;
  const { document, navigator } = window;

  return { window, document, defaultView: window };
}

export function installGlobalDom(html) {
  // Always create a fresh DOM
  return createFreshDom(html);
}

export function resetGlobalDom(html = '<!DOCTYPE html><html><body></body></html>') {
  if (!currentDom) {
    return createFreshDom(html);
  }
  
  // Reset the existing DOM's content
  currentDom.window.document.documentElement.innerHTML = html;
  setGlobalReference('document', currentDom.window.document);
  
  return { window: currentDom.window, document: currentDom.window.document, defaultView: currentDom.window };
}

export function cleanupDomEnvironment() {
  // Full cleanup - close and nullify the isolated DOM
  if (currentDom) {
    try {
      currentDom.window.close();
    } catch (e) {
      // Ignore cleanup errors
    }
    currentDom = null;
  }
  currentVirtualConsole = null;
  
  // Restore shared DOM globals
  installGlobals(sharedDom);
}

// Legacy exports for backward compatibility
export const dom = sharedDom;
export const virtualConsole = sharedDom.window.console;
