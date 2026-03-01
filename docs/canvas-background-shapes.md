# Canvas Background Placeholder Shapes
This document proposes a shared approach for adding non-blocking SVG placeholder shapes behind the region layer so the LLM can compose richer layouts without affecting existing region interactions.

## 1. Layering + insertion points
- **Preview DOM flow** – `renderSlidePreview` builds the `.slide-preview-grid`, sets CSS grid sizing, and appends one `.slide-preview-region` per box before wiring diagnostics tooltips.@template-studio/src/canvas/rendered-view.js#198-326
- **Visual treatment** – the grid and regions already sit inside `.slide-preview-surface`, which owns the teal/magenta border and background texture, while regions apply blur/opacity to stay legible.@template-studio/styles/main.css#611-770
- **React/production parity** – `production-renderer` mirrors preview output (React JSX) and already serializes SVG placeholders for image roles, so any new layer must be consumable from both DOM + React renderers.@template-studio/src/canvas/production-renderer.js#276-580
- **Insertion slot** – add a dedicated `backgroundShapesLayer` element (`<svg class="slide-preview-background-shapes">`) appended to the board **before** the region loop, z-indexed beneath `.slide-preview-region` and set to `pointer-events: none` so it never blocks selections.

## 2. Data model surfaced to the LLM
- Extend Template Studio state with `backgroundShapes: []` so tooling, undo/redo, and serialization can track shapes alongside boxes.@template-studio/src/state.js#3-133
- Recommended schema for each shape:
  ```ts
  type BackgroundShape = {
    id: string;
    kind: 'rect' | 'circle' | 'path' | 'blob';
    coords: { x: number; y: number; width?: number; height?: number; r?: number; d?: string };
    style: { fill?: string; stroke?: string; strokeWidth?: number; opacity?: number };
    gridSpan?: { columns: [number, number]; rows: [number, number] };
    zIndex?: number; // default < 0 so it always sits under regions
  };
  ```
- Store the list inside template metadata/MDX frontmatter (`background_shapes`) so prompts/build scripts can seed default compositions; hydrate it into `state.backgroundShapes` when loading a template and emit alongside `boxes` when exporting.

## 3. Rendering strategy
1. **Preview DOM:**
   - After creating `board`, inject a wrapper element (e.g., `<div class="slide-preview-background-layer">`) that can host either an `<svg>` root or arbitrary HTML nodes, letting templates mix decorative SVG paths with richer HTML-based treatments (blur blobs, masks, etc.).
   - When shapes are SVG-based, mount a canvas-sized `<svg>` inside the wrapper, using the same `scale` factor, and map every `BackgroundShape` to primitives. When shapes come as HTML snippets, simply append them as children; the wrapper enforces shared transforms and positioning.
   - Apply a CSS class that enforces `position:absolute; inset:0; z-index:0; pointer-events:none; mix-blend-mode: screen` (theme-dependent) while `.slide-preview-region` keeps `z-index:1`.
   - Provide helper `renderBackgroundShapes({ board, shapes, scale })` colocated with `renderSlidePreview` so diagnostics/tooltips remain unchanged.
2. **React preview/build:**
   - Mirror the helper inside `production-renderer`, returning the same wrapper element that conditionally nests `<svg>` content or sanitized HTML fragments before region React nodes to keep parity.
   - When exporting static builds (grid interface + builder scripts), forward `backgroundShapes` through the shared renderer flags so the final MDX/HTML gets identical decorations.
3. **LLM authoring:**
   - Allow the LLM to emit shape instructions via template metadata or region `metadata.backgroundShapes`, which the editor normalizes into `state.backgroundShapes`. Use schema validation to prevent malformed SVG, defaulting to an empty array if invalid.

## 4. Integration, toggles, and QA
- **Editor controls:** add a Preview toggle (e.g., “Show placeholder shapes”) next to diagnostics toggles so designers can hide the layer while editing; tie it to `state.previewFlags.showBackgroundShapes` and guard the renderer helper.
- **Persistence:** update importer/exporter so shapes survive MDX round trips (Template Studio `persistence/mdx.js`, builder `content-analyzer.js`). Emit them as JSON blocks that the build renderer hydrates using the same helper to avoid drift.
- **Lint & diagnostics:** shapes sit outside region overflow logic, but add a lint rule ensuring no shape extends beyond the canvas bounds and that z-index stays negative so they never overlap region hit areas. Wire tests under `template-studio/test/` to snapshot SVG output (DOM + React) for at least one template using multiple shape types.
- **Brand safety:** gate color tokens through the brand theme (reuse `getBrandSnapshot` palettes) so placeholders respect dark/light variants without extra overrides.

With this foundation, the LLM can position decorative SVG blobs, gradients, or frames as a separate layer, while preview/build renderers stay in lockstep and diagnostics remain unaffected.
