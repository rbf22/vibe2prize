# Vibe2Prize Slide System

This repo contains the EPAM "Vibe-to-Enterprise" deck plus the tools used to design grids, lint content, and generate static presentation bundles. The project has been reorganized into four focused areas:

| Directory | Purpose |
|-----------|---------|
| `core/` | Shared engines and helpers (layout registry, semantic vocab, MDX helpers, LLM placement utilities). |
| `templates/` | Source MDX slides under `templates/mdx/` plus slide-set manifests in `templates/slide_sets/`. |
| `builder/` | Build, lint, and content-analysis CLIs that consume the core helpers and templates. |
| `template-studio/` | Browser-only grid designer (`grid-template-studio.html`) for authoring new layouts and exporting metadata. |

## Commands

```bash
npm run build:slides   # Compile templates/slide_sets → dist/slides.html
npm run dev            # Builder watch mode (rebuilds dist/slides.html)
npm run dev:static     # Builder watch + lightweight static server (index.html + dist/)
npm run studio         # Serve template-studio/ at http://localhost:4174 (auto-opens browser)
npm run lint:slides    # Validate slide configs and MDX frontmatter/content
npm run analyze:content# Generate semantic/content analysis reports
```

Single-slide linting is now supported: `bun run lint:slides -- --file=mdx/epam-quote-leadership.mdx`. You can pass the flag multiple times or provide comma-separated values; paths are resolved relative to `templates/`.

The linter now surfaces the same semantic/visual overflow diagnostics as Template Studio. Pass `--visual-overflow` (or the short `--visual`) to enable approximate pixel-overflow checks from Node, mirroring the preview badges.

### Static Dev Workflow
1. Run `npm run dev:static`.
2. Visit the printed `http://localhost:<port>` (defaults to `4173`).
   - `index.html` loads from the repo root.
   - `dist/slides.html` is kept fresh by `builder/build-slides.js --watch`.
3. Stop with `Ctrl+C` (shuts down both the watcher and the server).

### Production Build / Hosting
1. `npm run build:slides` → outputs `dist/slides.html`.
2. Deploy `index.html`, `style.css`, assets, and the `dist/` folder to any static host (S3, Vercel, GitHub Pages, etc.).
3. Serve `index.html` as the entry point; it fetches `dist/slides.html` at runtime.

## Template Studio
- Run `npm run studio` to start a lightweight static server (defaults to `http://localhost:4174`) that auto-opens the Studio UI.
- Alternatively, open `template-studio/grid-template-studio.html` directly in a browser for an offline experience.
- Designed regions can be exported as JSON/MDX and moved into `core/layout/grid-templates.js` & `templates/mdx/`.

## Slide Authoring Flow
1. Duplicate an MDX template from `templates/mdx/` and update frontmatter (title, phase, layout, regions, etc.).
2. Register the file in a slide-set JSON under `templates/slide_sets/`.
3. Build/lint/analyze using the scripts above.

## Notes
- All shared logic should live under `core/` to avoid duplication.
- The builder and linter resolve templates relative to `templates/`—keep all MDX sources there.
- `template-studio` is intentionally self-contained so it can be hosted separately or opened locally without a build step.
