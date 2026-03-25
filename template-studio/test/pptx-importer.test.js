import { test } from 'node:test';
import assert from 'node:assert';
import { mapPptxToGrid } from '../src/pptx-importer.js';

test('mapPptxToGrid correctly maps widescreen EMUs to an 80x45 grid', () => {
    // 12192000 x 6858000 EMUs = 13.333 x 7.5 inches
    const pptxData = {
        slides: [
            {
                title: "Test Slide",
                shapes: [
                    {
                        type: "title",
                        x: 0,
                        y: 0,
                        w: 12192000,
                        h: 6858000 / 2, // Half height
                        text: "My Presentation"
                    },
                    {
                        type: "content",
                        x: 12192000 / 2, // Middle X
                        y: 6858000 / 2, // Middle Y
                        w: 12192000 / 2,
                        h: 6858000 / 4,
                        text: "Content Box"
                    }
                ]
            }
        ]
    };

    const result = mapPptxToGrid(pptxData);
    
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, "Test Slide");
    
    const regions = result[0].regions;
    assert.strictEqual(regions.length, 2);

    // Title Shape
    assert.strictEqual(regions[0].role, "primary-title");
    assert.strictEqual(regions[0].x, 0);
    assert.strictEqual(regions[0].y, 0);
    assert.strictEqual(regions[0].w, 80);
    assert.strictEqual(regions[0].h, 22);

    // Content Shape
    assert.strictEqual(regions[1].role, "supporting-text");
    assert.strictEqual(regions[1].x, 40); // 80 / 2
    assert.strictEqual(regions[1].y, 22); // math floor of 45 / 2
    assert.strictEqual(regions[1].w, 40);
    assert.strictEqual(regions[1].h, 11);
});

test('mapPptxToGrid constrains bounds correctly', () => {
    // Bounds out of standard size
    const pptxData = {
        slides: [
            {
                shapes: [
                    {
                        type: "content",
                        x: 13000000, // beyond grid width
                        y: 7000000, // beyond grid height
                        w: -100, // too small
                        h: 100, // too small
                        text: ""
                    }
                ]
            }
        ]
    };

    const result = mapPptxToGrid(pptxData);
    const region = result[0].regions[0];
    
    assert.strictEqual(region.x, 80); // Capped at max X
    assert.strictEqual(region.y, 45); // Capped at max Y
    assert.strictEqual(region.w, 4);  // Minimum width
    assert.strictEqual(region.h, 2);  // Minimum height
});
