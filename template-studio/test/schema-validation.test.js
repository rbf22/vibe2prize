import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateFrontmatter } from '../../core/mdx/schema.js';

describe('Shared MDX Schema Validation', () => {
  it('should validate complete, valid frontmatter', () => {
    const valid = {
      title: 'Test Template',
      maxWords: 120,
      phase: 'concept',
      layout: {
        type: 'grid',
        template: 'cssgrid',
        components: [
          {
            type: 'region',
            id: 'header',
            role: 'header',
            area: 'header',
            maxWords: 20
          },
          {
            type: 'region',
            id: 'content',
            role: 'content',
            area: 'content',
            maxWords: 80
          }
        ]
      },
      regions: [
        {
          id: 'header',
          role: 'header',
          area: 'header',
          maxWords: 20
        },
        {
          id: 'content',
          role: 'content',
          area: 'content',
          maxWords: 80
        }
      ]
    };

    const result = validateFrontmatter(valid);
    assert(result.valid);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should reject missing required top-level fields', () => {
    const invalid = {
      title: 'Test Template'
      // missing maxWords, phase, layout, regions
    };

    const result = validateFrontmatter(invalid);
    assert(!result.valid);
    assert(result.errors.length > 0);
    assert(result.errors.some(e => e.includes('maxWords')));
    assert(result.errors.some(e => e.includes('phase')));
    assert(result.errors.some(e => e.includes('layout')));
    assert(result.errors.some(e => e.includes('regions')));
  });

  it('should reject invalid layout structure', () => {
    const invalid = {
      title: 'Test Template',
      maxWords: 100,
      phase: 'concept',
      layout: {
        type: 'grid'
        // missing template, components
      },
      regions: []
    };

    const result = validateFrontmatter(invalid);
    assert(!result.valid);
    assert(result.errors.some(e => e.includes('template')));
    assert(result.errors.some(e => e.includes('components')));
  });

  it('should reject invalid layout components', () => {
    const invalid = {
      title: 'Test Template',
      maxWords: 100,
      phase: 'concept',
      layout: {
        type: 'grid',
        template: 'cssgrid',
        components: [
          {
            type: 'region',
            id: 'header'
            // missing role, area, maxWords
          }
        ]
      },
      regions: [
        {
          id: 'header',
          role: 'header',
          area: 'header',
          maxWords: 20
        }
      ]
    };

    const result = validateFrontmatter(invalid);
    assert(!result.valid);
    assert(result.errors.some(e => e.includes('role')));
    assert(result.errors.some(e => e.includes('area')));
  });

  it('should reject invalid regions structure', () => {
    const invalid = {
      title: 'Test Template',
      maxWords: 100,
      phase: 'concept',
      layout: {
        type: 'grid',
        template: 'cssgrid',
        components: [
          {
            type: 'region',
            id: 'header',
            role: 'header',
            area: 'header',
            maxWords: 20
          }
        ]
      },
      regions: [
        {
          id: 'header'
          // missing role, area, maxWords
        }
      ]
    };

    const result = validateFrontmatter(invalid);
    assert(!result.valid);
    assert(result.errors.some(e => e.includes('role')));
  });

  it('should ensure layout components and regions have matching IDs', () => {
    const mismatched = {
      title: 'Test Template',
      maxWords: 100,
      phase: 'concept',
      layout: {
        type: 'grid',
        template: 'cssgrid',
        components: [
          {
            type: 'region',
            id: 'header',
            role: 'header',
            area: 'header',
            maxWords: 20
          }
        ]
      },
      regions: [
        {
          id: 'footer', // different ID
          role: 'footer',
          area: 'footer',
          maxWords: 20
        }
      ]
    };

    const result = validateFrontmatter(mismatched);
    assert(!result.valid);
    assert(result.errors.some(e => e.includes('matching')));
  });

  it('should validate numeric constraints', () => {
    const invalidNumbers = {
      title: 'Test Template',
      maxWords: -10, // negative
      phase: 'concept',
      layout: {
        type: 'grid',
        template: 'cssgrid',
        components: [
          {
            type: 'region',
            id: 'header',
            role: 'header',
            area: 'header',
            maxWords: 0 // zero
          }
        ]
      },
      regions: [
        {
          id: 'header',
          role: 'header',
          area: 'header',
          maxWords: 0 // zero
        }
      ]
    };

    const result = validateFrontmatter(invalidNumbers);
    assert(!result.valid);
    assert(result.errors.some(e => e.includes('positive')));
  });

  it('should validate string fields are non-empty', () => {
    const emptyStrings = {
      title: '', // empty
      maxWords: 100,
      phase: 'concept',
      layout: {
        type: 'grid',
        template: 'cssgrid',
        components: [
          {
            type: 'region',
            id: 'header',
            role: 'header',
            area: 'header',
            maxWords: 20
          }
        ]
      },
      regions: [
        {
          id: 'header',
          role: 'header',
          area: 'header',
          maxWords: 20
        }
      ]
    };

    const result = validateFrontmatter(emptyStrings);
    assert(!result.valid);
    assert(result.errors.some(e => e.includes('non-empty')));
  });

  it('should validate allowed phase values', () => {
    const invalidPhase = {
      title: 'Test Template',
      maxWords: 100,
      phase: 'invalid-phase',
      layout: {
        type: 'grid',
        template: 'cssgrid',
        components: [
          {
            type: 'region',
            id: 'header',
            role: 'header',
            area: 'header',
            maxWords: 20
          }
        ]
      },
      regions: [
        {
          id: 'header',
          role: 'header',
          area: 'header',
          maxWords: 20
        }
      ]
    };

    const result = validateFrontmatter(invalidPhase);
    assert(!result.valid);
    assert(result.errors.some(e => e.includes('phase')));
  });

  it('should validate allowed layout type and template', () => {
    const invalidLayout = {
      title: 'Test Template',
      maxWords: 100,
      phase: 'concept',
      layout: {
        type: 'invalid-type',
        template: 'cssgrid',
        components: [
          {
            type: 'region',
            id: 'header',
            role: 'header',
            area: 'header',
            maxWords: 20
          }
        ]
      },
      regions: [
        {
          id: 'header',
          role: 'header',
          area: 'header',
          maxWords: 20
        }
      ]
    };

    const result = validateFrontmatter(invalidLayout);
    assert(!result.valid);
    assert(result.errors.some(e => e.includes('type')));
  });

  it('should handle null/undefined inputs gracefully', () => {
    const result1 = validateFrontmatter(null);
    assert(!result1.valid);
    assert(result1.errors.length > 0);

    const result2 = validateFrontmatter(undefined);
    assert(!result2.valid);
    assert(result2.errors.length > 0);
  });

  it('should provide detailed error messages', () => {
    const multipleErrors = {
      title: '',
      maxWords: -5,
      phase: 'invalid',
      layout: {
        type: 'grid'
        // missing template, components
      },
      regions: []
    };

    const result = validateFrontmatter(multipleErrors);
    assert(!result.valid);
    assert(result.errors.length >= 4);
    
    // Check that errors are descriptive
    const errorString = result.errors.join(' ');
    assert(errorString.includes('title'));
    assert(errorString.includes('maxWords'));
    assert(errorString.includes('phase'));
    assert(errorString.includes('layout'));
  });
});
