# Vibe2Prize Slide System

This repo contains the Accenture "Vibe-to-Enterprise" deck plus the tools used to design grids, lint content, and generate static presentation bundles. The project has been reorganized into four focused areas:

| Directory | Purpose |
|-----------|---------|
| `core/` | Shared engines and helpers (layout registry, semantic vocab, MDX helpers, LLM placement utilities, compact format support). |
| `templates/` | Source MDX slides for reference and inspiration. |
| `builder/` | Lint and content-analysis CLI tools for validating slide templates. |
| `template-studio/` | Offline-first grid designer (`grid-template-studio.html`) for authoring layouts with local AI Composer. |

## Compact MDX Format

The system now supports a compact MDX format that reduces verbosity by ~60% while maintaining full compatibility:

- **Compact grid notation**: `grid: "3,4,48x3"` instead of nested x/y/width/height
- **Shortened fields**: `hint` instead of `llmHint`, `req` instead of `required`
- **Inline objects**: Settings, exclusions, and brand can use compact notation
- **Auto-inference**: `inputType` inferred from `role`, `area` defaults to `id`

See `templates/mdx/compact-example.mdx` and `templates/mdx/ultra-compact.mdx` for examples, or `docs/compact-mdx-format.md` for the full specification.

## Commands

```bash
npm run studio         # Serve template-studio/ at http://localhost:4174 (auto-opens browser)
npm run lint:slides    # Validate slide configs and MDX frontmatter/content
npm run analyze:content# Generate semantic/content analysis reports
```

Single-slide linting is now supported: `bun run lint:slides -- --file=mdx/accenture-quote-leadership.mdx`. You can pass the flag multiple times or provide comma-separated values; paths are resolved relative to `templates/`.

The linter now surfaces the same semantic/visual overflow diagnostics as Template Studio. Pass `--visual-overflow` (or the short `--visual`) to enable approximate pixel-overflow checks from Node, mirroring the preview badges.

### Development Workflow
1. Open `template-studio/grid-template-studio.html` in your browser (completely offline)
2. Design layouts and generate content with the AI Composer
3. Export slides as MDX templates
4. Optionally: Run `npm run lint:slides` to validate your templates

## Template Studio & Local AI Composer (Offline-First)

Template Studio is a **completely offline** tool for designing slide layouts:

- **Option 1**: Run `npm run studio` for a convenient server (auto-opens at http://localhost:4174)
- **Option 2**: Open `template-studio/grid-template-studio.html` directly in your browser - no server needed!
- **Features**:
  - Visual grid designer with drag-and-drop regions
  - **Composer tab** with local LLM running in your browser (Web Worker)
  - Private, on-device content generation - no external API calls
  - Export layouts as JSON or MDX templates
  - Works without an internet connection once loaded

Designed regions can be exported as JSON/MDX and moved into `core/layout/grid-templates.js` & `templates/mdx/`.

## Slide Authoring Flow
1. Open Template Studio and design your slide layout
2. Use the AI Composer to generate content or add your own
3. Export as MDX for reference or sharing
4. Optionally: Run `npm run lint:slides` to validate your MDX templates

## Notes
- All shared logic should live under `core/` to avoid duplication.
- **Template Studio works completely offline** - open `template-studio/grid-template-studio.html` directly in your browser.
- No build process required - slides are rendered directly in the browser.
- Dead code removed: `manos/` directory, `example/` directory, `scripts/dev-static.js`, `scripts/build-template-studio.js`, `builder/build-slides.js`, `dist/` directory, `slides/` directory, `template-studio/dist/` directory, and unused exports from `core/mdx/helpers.js`.
