import { JSDOM, VirtualConsole } from 'jsdom';

const GLOBAL_KEY = Symbol.for('templateStudioDomEnvironment');
const globalScope = globalThis;

function defineGlobal(name, value) {
  Object.defineProperty(globalScope, name, {
    value,
    writable: false,
    configurable: true
  });
}

if (!globalScope[Symbol.for('templateStudioDomEnvironment')]) {
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

    defineGlobal('window', dom.window);
    defineGlobal('document', dom.window.document);
    defineGlobal('navigator', dom.window.navigator);
    defineGlobal('HTMLElement', dom.window.HTMLElement);
    defineGlobal('Element', dom.window.Element);
    defineGlobal('Node', dom.window.Node);
    defineGlobal('getComputedStyle', dom.window.getComputedStyle);
  }

  globalScope.alert = () => {};
  globalScope.confirm = () => true;
  globalScope.prompt = () => '';

  globalScope[Symbol.for('templateStudioDomEnvironment')] = { dom, virtualConsole };
}

const { dom, virtualConsole } = globalScope[Symbol.for('templateStudioDomEnvironment')];

export { dom, virtualConsole };
