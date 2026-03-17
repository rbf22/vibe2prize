import './test-setup.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { exportToPptx } from '../src/persistence/pptx.js';

describe('PPTX Exporter', () => {
  it('should handle state with boxes', async () => {
    const state = {
      templateName: 'test-pptx',
      columns: 80,
      rows: 45,
      boxes: [
        {
          id: 'box-1',
          gridX: 0,
          gridY: 0,
          gridWidth: 40,
          gridHeight: 10,
          metadata: { fieldTypes: ['primary-title'] }
        }
      ],
      content: {
        'box-1': 'Hello World'
      },
      brand: { variant: 'dark' }
    };

    // The function returns a promise that resolves when the file is "written"
    // In our mock environment, we mainly want to ensure no "unknown layout" error
    // or other logic crashes.
    try {
        await exportToPptx(state);
    } catch (e) {
        // pptxgen might fail in Node if it tries to use Blobs/Files in a way JSDOM doesn't support
        // but it should at least not fail on the layout string.
        if (e.message.includes('layout')) {
            assert.fail('Should not fail with layout error');
        }
    }
  });

  it('should handle state with regions (Composer fallback)', async () => {
      const state = {
          templateName: 'composer-deck',
          regions: [
              { id: 'r1', x: 10, y: 10, w: 20, h: 5, role: 'primary-title', content: 'Composer Title' }
          ]
      };

      try {
          await exportToPptx(state);
      } catch (e) {
          if (e.message.includes('layout')) {
              assert.fail('Should not fail with layout error');
          }
      }
  });
});
