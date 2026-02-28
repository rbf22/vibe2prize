import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { installGlobalDom, dom } from './helpers/dom-env.js';

import { renderSlidePreview } from '../src/canvas/rendered-view.js';
import { state, resetState } from '../src/state.js';
import { applyFrontmatterToState } from '../src/persistence/importer.js';
import { getBrandSnapshot } from '../src/branding/brands.js';
import { collectDiagnostics } from '../../core/layout/diagnostics.js';

const diagnosticsFixture = {
  frontmatter: {
    title: 'Diagnostics Fixture',
    brand: 'default',
    brandTheme: 'light',
    layout: {
      rows: 2,
      columns: 2,
      gap: 0
    },
    regions: [
      { id: 'box-1', x: 0, y: 0, w: 1, h: 1, role: 'section-title', content: 'Section Title' },
      { id: 'box-2', x: 1, y: 0, w: 1, h: 1, role: 'body', content: 'Body content' },
      { id: 'box-3', x: 0, y: 1, w: 1, h: 1, role: 'caption', content: 'Caption' },
      { id: 'box-4', x: 1, y: 1, w: 1, h: 1, role: 'footer', content: 'Footer' }
    ],
    templateSettings: {
      rows: 2,
      columns: 2,
      gap: 0
    }
  }
};

function setPreviewDimensions(element, width = 1200, height = 675) {
  Object.defineProperty(element, 'clientWidth', {
    value: width,
    configurable: true
  });
  Object.defineProperty(element, 'clientHeight', {
    value: height,
    configurable: true
  });
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => ({ width, height, top: 0, left: 0, right: width, bottom: height }),
    configurable: true
  });
}

if (typeof global.CustomEvent !== 'function') {
  global.CustomEvent = dom.window.CustomEvent;
}

function seedPreviewText(regionCopyMap = new Map()) {
  state.boxes.forEach((box) => {
    const copy = regionCopyMap.get(box.name) || regionCopyMap.get(box.id);
    if (!copy) return;
    box.metadata = box.metadata || {};
    box.metadata.previewText = copy;
    state.metadata[box.id] = {
      ...(state.metadata[box.id] || {}),
      previewText: copy
    };
  });
}

function buildRegionCopyMap() {
  const copyEntries = [
    ['headline', 'Invent the future by disrupting yourself first'],
    [
      'narrative',
      'EPAM helps enterprises challenge habits, discover non-obvious leverage, and move faster than the market. We deliver multidisciplinary squads, engineered platforms, and AI copilots that translate intent into measurable value across every customer and employee touchpoint.'
    ],
    ['footer', 'Internal / EPAM Continuum']
  ];
  return new Map(copyEntries);
}

function collectCliDiagnostics() {
  const textByArea = buildRegionCopyMap();
  return collectDiagnostics({
    regions: diagnosticsFixture.frontmatter.regions,
    textByArea,
    templateSettings: diagnosticsFixture.frontmatter.templateSettings,
    brandSnapshot: getBrandSnapshot(diagnosticsFixture.frontmatter.brand.id, diagnosticsFixture.frontmatter.brand.variant),
    pagination: diagnosticsFixture.frontmatter.pagination,
    options: { includeVisual: true }
  });
}

function indexIssues(issues = []) {
  return issues.reduce((map, issue) => {
    const key = issue.type && issue.role ? `${issue.type}:${issue.role}` : `${issue.type}:${issue.area || 'unknown'}`;
    map.set(key, issue);
    return map;
  }, new Map());
}

describe('Diagnostics parity (Template Studio vs CLI)', () => {
  let documentRef;

  beforeEach(() => {
    resetState();
    ({ document: documentRef } = installGlobalDom('<div id="previewRoot"></div>'));
  });

  it('produces equivalent semantic + visual diagnostics', () => {
    applyFrontmatterToState(diagnosticsFixture.frontmatter);
    state.previewFlags = { ...(state.previewFlags || {}), showDiagnostics: true };
    seedPreviewText(buildRegionCopyMap());

    const previewRoot = documentRef.getElementById('previewRoot');
    setPreviewDimensions(previewRoot);

    renderSlidePreview(previewRoot);

    const studioIssues = state.diagnostics?.overflow || [];
    assert.ok(studioIssues.length > 0, 'Studio diagnostics should produce issues for the fixture');

    const previewDomIssues = studioIssues.filter((issue) => issue.metrics?.origin === 'preview-dom');
    const comparableStudioIssues = studioIssues.filter((issue) => issue.metrics?.origin !== 'preview-dom');

    const cliDiagnostics = collectCliDiagnostics();
    const cliIssues = cliDiagnostics.issues;

    console.log('CLI issues:', cliIssues.map(i => ({ type: i.type, area: i.area, role: i.role, message: i.message })));
    console.log('Studio comparable issues:', comparableStudioIssues.map(i => ({ type: i.type, area: i.area, role: i.role, message: i.message })));

    assert.strictEqual(
      cliIssues.length,
      comparableStudioIssues.length,
      `CLI diagnostics count should match Template Studio heuristic issues (CLI=${cliIssues.length}, Studio=${comparableStudioIssues.length})`
    );

    const studioIndex = indexIssues(comparableStudioIssues);
    const cliIndex = indexIssues(cliIssues);

    assert.strictEqual(
      cliIndex.size,
      studioIndex.size,
      'CLI diagnostics keys should match Template Studio results'
    );

    studioIndex.forEach((studioIssue, key) => {
      assert.ok(cliIndex.has(key), `CLI diagnostics missing issue ${key}`);
    });

    cliIndex.forEach((cliIssue, key) => {
      assert.ok(studioIndex.has(key), `Template Studio diagnostics missing issue ${key}`);
    });

    studioIndex.forEach((studioIssue, key) => {
      const cliIssue = cliIndex.get(key);
      assert.strictEqual(cliIssue.role, studioIssue.role, `Role mismatch for ${key}`);
      assert.strictEqual(cliIssue.type, studioIssue.type, `Type mismatch for ${key}`);
      assert.ok(cliIssue.message.includes('exceeds capacity'), `Message should mention overflow for ${key}`);
    });

    previewDomIssues.forEach((issue) => {
      assert.strictEqual(issue.metrics?.origin, 'preview-dom', 'Preview DOM issues should be labeled correctly');
    });
  });
});
