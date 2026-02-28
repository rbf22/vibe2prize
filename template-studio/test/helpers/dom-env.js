import { JSDOM, VirtualConsole } from 'jsdom';

const GLOBAL_KEY = Symbol.for('templateStudioDomEnvironment');
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

function ensureDomEnvironment() {
  if (globalScope[GLOBAL_KEY]) {
    return globalScope[GLOBAL_KEY];
  }

  let dom;
  let virtualConsole = null;

  const hasExistingWindow = typeof globalScope.window !== 'undefined' && globalScope.window.document;
  if (hasExistingWindow) {
    dom = { window: globalScope.window };
  } else {
    virtualConsole = new VirtualConsole();
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable',
      virtualConsole
    });
  }

  globalScope.alert = globalScope.alert || (() => {});
  globalScope.confirm = globalScope.confirm || (() => true);
  globalScope.prompt = globalScope.prompt || (() => '');

  globalScope[GLOBAL_KEY] = { dom, virtualConsole };
  return globalScope[GLOBAL_KEY];
}

export function installGlobalDom(html) {
  const { dom } = ensureDomEnvironment();
  const { document, navigator } = dom.window;
  if (typeof html === 'string') {
    document.documentElement.innerHTML = html;
  }
  dom.window.alert = dom.window.alert || (() => {});
  dom.window.confirm = dom.window.confirm || (() => true);
  dom.window.prompt = dom.window.prompt || (() => '');
  setGlobalReference('window', dom.window);
  setGlobalReference('document', document);
  setGlobalReference('navigator', navigator);
  setGlobalValue('HTMLElement', dom.window.HTMLElement);
  setGlobalValue('Element', dom.window.Element);
  setGlobalValue('Node', dom.window.Node);
  setGlobalValue('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  setGlobalValue('CustomEvent', dom.window.CustomEvent);
  setGlobalValue('Event', dom.window.Event);
  setGlobalValue('alert', dom.window.alert);
  setGlobalValue('confirm', dom.window.confirm);
  setGlobalValue('prompt', dom.window.prompt);
  return { window: dom.window, document, defaultView: dom.window };
}

export function resetGlobalDom(html = '<!DOCTYPE html><html><body></body></html>') {
  const { dom } = ensureDomEnvironment();
  if (dom?.window?.document) {
    dom.window.document.documentElement.innerHTML = html;
  }
  return { window: dom.window, document: dom.window.document, defaultView: dom.window };
}

const { dom, virtualConsole } = ensureDomEnvironment();

export { dom, virtualConsole };
