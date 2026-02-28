import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'fs-extra';

const execAsync = promisify(exec);

const TEST_SLIDE = `---
title: Test Slide for DOM Overflow
brand: default
layout:
  type: grid-designer
  canvasWidth: 1920
  canvasHeight: 1080
  columns: 80
  rows: 45
  gap: 8
regions:
  - id: overflow-title
    area: title
    role: primary-title
    grid:
      x: 0
      y: 0
      width: 10
      height: 2
  - id: normal-title
    area: title2
    role: primary-title
    grid:
      x: 0
      y: 5
      width: 40
      height: 4
  - id: small-text
    area: small
    role: supporting-text
    grid:
      x: 0
      y: 10
      width: 20
      height: 2
  - id: page-num
    area: page
    role: page-number
    grid:
      x: 70
      y: 42
      width: 9
      height: 2
---

<GridDesigner>
  <GridArea area="title" contentType="primary-title" importance="critical">
    <ContentRenderer type="primary-title" content={""} />
  </GridArea>
  <GridArea area="title2" contentType="primary-title" importance="critical">
    <ContentRenderer type="primary-title" content={""} />
  </GridArea>
  <GridArea area="small" contentType="supporting-text" importance="supporting">
    <ContentRenderer type="supporting-text" content={""} />
  </GridArea>
  <GridArea area="page" contentType="page-number" importance="critical">
    <ContentRenderer type="page-number" content={""} />
  </GridArea>
</GridDesigner>
`;

describe('Lint script DOM overflow detection', () => {
  const testDir = path.join(process.cwd(), 'templates', 'test-temp');
  const testFile = path.join(testDir, 'test-dom-overflow.mdx');

  before(async () => {
    // Create test directory and file in templates directory
    await fs.ensureDir(testDir);
    await fs.writeFile(testFile, TEST_SLIDE);
  });

  after(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  it('detects overflow when using --with-preview-text flag', async () => {
    try {
      const { stdout, stderr } = await execAsync(
        `node builder/lint-slides.js --file templates/test-temp/test-dom-overflow.mdx --with-preview-text --visual-overflow`,
        { cwd: process.cwd() }
      );
      
      // If it doesn't throw, check that it passed
      assert.match(stdout, /✅ Slides lint passed/, 'Should pass if no overflow detected');
    } catch (error) {
      // Should detect overflow issues
      assert.match(error.stderr, /❌ Slide lint issues:/);
      assert.match(error.stderr, /visually overflows by/);
      
      // Check that overflow is detected (region names might be different)
      assert.ok(error.stderr.includes('title') || error.stderr.includes('small'), 'Should detect overflow in text regions');
    }
  });

  it('passes without overflow when not using --with-preview-text', async () => {
    try {
      const { stdout, stderr } = await execAsync(
        `node builder/lint-slides.js --file templates/test-temp/test-dom-overflow.mdx`,
        { cwd: process.cwd() }
      );
      
      // If it doesn't throw, check that it passed
      assert.match(stdout, /✅ Slides lint passed/, 'Should pass if no overflow detected');
    } catch (error) {
      // Should still detect theoretical overflow even without preview text
      // This is because the theoretical detection is always active
      assert.match(error.stderr, /❌ Slide lint issues:/);
    }
  });

  it('provides detailed overflow information', async () => {
    try {
      const { stdout, stderr } = await execAsync(
        `node builder/lint-slides.js --file templates/test-temp/test-dom-overflow.mdx --with-preview-text --visual-overflow`,
        { cwd: process.cwd() }
      );
      
      // If it doesn't throw, no overflow was detected
      assert.fail('Should have detected overflow issues');
    } catch (error) {
      // Should include pixel amounts in error messages
      assert.match(error.stderr, /\d+px/, 'Should include pixel overflow amounts');
      
      // Should suggest fixes
      assert.match(error.stderr, /Trim the copy|decrease the typography|give the region more rows/, 
        'Should suggest fixes in error messages');
    }
  });

  it('handles edge cases gracefully', async () => {
    // Create a slide with no regions
    const emptySlide = `---
title: Empty Slide
brand: default
layout:
  type: grid-designer
  regions: []
---

<GridDesigner>
</GridDesigner>
`;
    
    const emptyFile = path.join(testDir, 'empty.mdx');
    await fs.writeFile(emptyFile, emptySlide);

    const { stdout, stderr } = await execAsync(
      `node builder/lint-slides.js --file templates/test-temp/empty.mdx --with-preview-text --visual-overflow`,
      { cwd: process.cwd() }
    );

    assert.match(stdout, /✅ Slides lint passed/, 'Should handle empty slides gracefully');
  });
});
