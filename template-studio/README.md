# Template Studio

A browser-based visual designer for creating CSS Grid layout templates that export to valid MDX frontmatter for use with the Vibe-to-Enterprise framework.

## Architecture

Template Studio is now organized as a modular ESM application:

```
template-studio/
├── grid-template-studio.html    # Main HTML entry point
├── styles/
│   └── main.css               # Extracted styles
├── src/
│   ├── main.js                 # Module bootstrap and API
│   ├── state.js                # State and history management
│   ├── persistence/
│   │   ├── mdx.js             # MDX export functionality
│   │   └── importer.js        # MDX import functionality
│   ├── canvas/
│   │   ├── renderer.js        # Canvas rendering logic
│   │   ├── interactions.js     # Mouse/drag/resize handlers
│   │   └── guides.js          # Grid guides and exclusions
│   ├── ui/
│   │   ├── controls.js        # UI control handlers
│   │   └── regions-table.js   # Regions table management
│   └── utils/
│       ├── grid-math.js       # Grid coordinate utilities
│       └── snippet.js         # CSS snippet generation
└── test/
    ├── importer.test.js        # MDX importer tests
    ├── exporter.test.js        # MDX exporter tests
    └── schema-validation.test.js # Shared schema tests
```

## Key Features

- **Visual Grid Design**: Click and drag to create grid regions
- **Real-time Preview**: See your CSS Grid layout update as you work
- **MDX Export**: Generate valid MDX frontmatter compatible with the shared schema
- **MDX Import**: Load existing MDX templates and continue editing
- **Brand-aware UI**: Brand selectors, typography tokens, and diagnostics pull from `templates/<brand>/brand.json`
- **Guides & Exclusions**: Visual guides and exclusion zones for precise layouts
- **Region Metadata**: Configure input types, field types, and LLM hints per region
- **Undo/Redo**: Full history support for design iterations
- **Responsive Preview**: See how regions adapt to different screen sizes

## Getting Started

### Development Server

```bash
# Start the Template Studio development server
npm run studio

# Or run the static server directly
cd template-studio
python3 -m http.server 8080
```

Open `http://localhost:4174` in your browser.

### Production Build

```bash
# Build Template Studio for production
npm run build:studio

# This creates template-studio/dist/main.js - a bundled, minified version
# suitable for deployment or inclusion in other projects
```

### Testing

```bash
# Run all MDX-related tests
npm run test:mdx

# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch
```

## Usage

1. **Create Regions**: Click and drag on the canvas to create grid regions
2. **Configure Metadata**: Select regions to set required fields, input types, and LLM hints
3. **Adjust Grid**: Modify columns, rows, gaps, and canvas dimensions
4. **Use Guides**: Enable visual guides (center, thirds, quarters, etc.) for alignment
5. **Export MDX**: Save your template as valid MDX frontmatter
6. **Import MDX**: Load existing templates to continue editing

### Brand Configuration

Brands are defined outside of Template Studio under `templates/<brand>/brand.json`. The Studio reads these files at runtime (via `/core/brand/loader.js`) and applies the selected brand’s typography, palette, master template pointer, and logos. To register a new brand:

1. Create `templates/<brand>/brand.json` following `core/brand/brand-schema.json` (typography, copy, `assets.logo.dark/light`, `variants`, etc.).
2. Place any referenced assets under `templates/<brand>/assets/...` so the dev server can serve them.
3. Append `{ "id": "<brand>", "label": "Display Name", "version": <number> }` to `templates/brands.json`.

Template Studio’s dev server already exposes `/templates`, so brand configs and assets are available to the browser with no bundling.

## MDX Schema

Template Studio exports MDX files that conform to the shared schema defined in `core/mdx/schema.js`:

```yaml
---
title: "Template Name"
maxWords: 120
phase: "concept"
layout:
  type: "grid-designer"
  template: "template-name"
  components:
    - "GridDesigner"
    - "GridArea" 
    - "ContentRenderer"
regions:
  - id: "header"
    role: "header"
    area: "header"
    maxWords: 20
    required: true
    inputType: "text"
    llmHint: "Main title area"
---
```

### Region Metadata Guidelines

Even when you design highly customized masters, keep these guardrails in mind so Template Studio, the preview renderer, and downstream tooling stay in sync:

1. **Required per-region fields** – Every region should still define `id`, `role`, `area`, and a `grid` block (`x`, `y`, `width`, `height`). Include `required`, `inputType`, `fieldTypes`, and `type` when you care about validation or data-entry widgets (images, tables, etc.). Optional helpers like `llmHint`, `maxWords`, or `previewText` can vary freely.
2. **Brand-mandatory regions** – EPAM masters must retain `brand-logo`, `page-number`, and `footer` regions so assets, pagination, and footer copy stay aligned with brand policy. If you omit them, Studio will fall back to generic boxes or flag the template as incomplete.
3. **Visual overrides** – Typography and padding come from the brand role styles. If you need per-region overrides, add new metadata keys (e.g., `paddingOverride`, `fontSize`) and update the renderers accordingly, but keep brand roles as the default to ensure parity between preview and production renders.

Sticking to those rules lets you trim or expand any template without breaking hydration, while keeping the brand-specific guarantees intact.

## Module API

The modular architecture exposes the following API through `src/main.js`:

```javascript
import * as TemplateStudio from './src/main.js';

// State management
TemplateStudio.state
TemplateStudio.pushHistory()
TemplateStudio.handleUndo()
TemplateStudio.handleRedo()

// Canvas operations
TemplateStudio.renderPreview(canvas, callback)
TemplateStudio.renderGuides(guideLayer, canvas)
TemplateStudio.handleMouseMove(event, canvas, callback)
TemplateStudio.handleMouseUp(event, canvas, ...callbacks)

// UI operations
TemplateStudio.attachControlHandlers(controls, ...callbacks)
TemplateStudio.renderRegionsTable()
TemplateStudio.updateSelectionControls(controls)

// MDX operations
TemplateStudio.importMDXFile(file)
TemplateStudio.downloadMdxFile(state)

// Utilities
TemplateStudio.isEditableTarget(event)
TemplateStudio.getBoxAtGrid(x, y)
TemplateStudio.deleteSelectedRegion()
```

## Shared Dependencies

Template Studio integrates with the core MDX utilities:

- **Schema Validation**: Uses `core/mdx/schema.js` for frontmatter validation
- **Import/Export**: Leverages shared parsing and validation logic
- **Type Safety**: Consistent data structures across the application

## Development Notes

- **ESM Modules**: All code uses native ES modules
- **No Build Step**: Direct browser module loading
- **CSS Extraction**: Styles moved to `styles/main.css` for maintainability  
- **Event-Driven**: Uses custom events for UI updates
- **Browser APIs**: Uses FileReader, Blob, and URL APIs for file operations

## Browser Compatibility

Template Studio requires a modern browser with ES module support:
- Chrome 61+
- Firefox 60+
- Safari 10.1+
- Edge 16+

## Contributing

When adding new features:

1. Keep modules focused and single-purpose
2. Use the shared MDX schema for any frontmatter operations
3. Add tests for new functionality
4. Update this README for API changes

## License

MIT
