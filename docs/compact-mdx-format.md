# Compact MDX Format Specification

## Overview

The compact MDX format reduces verbosity by ~60% while maintaining all essential information for slide templates. This makes it easier for LLMs to understand and generate slide layouts.

## Key Improvements

### 1. Eliminated Duplication
- Removed `layout.components` - derived from `regions` at runtime
- Removed redundant `fieldTypes` arrays
- Removed `area` when it matches `id`

### 2. Compact Notations

#### Grid Coordinates
```yaml
# Verbose:
grid:
  x: 3
  y: 4
  width: 48
  height: 3

# Compact:
grid: "3,4,48x3"
```

#### Settings
```yaml
# Verbose:
templateSettings:
  canvasWidth: 1920
  canvasHeight: 1080
  columns: 80
  rows: 45
  gap: "0.5rem"

# Compact:
settings:
  canvas: "1920x1080"
  grid: "80x45"
  gap: "0.5rem"
```

#### Exclusions
```yaml
# Verbose:
exclusions:
  top: 4
  bottom: 4
  left: 3
  right: 3

# Compact:
exclusions: "4,4,3,3"
```

#### Brand
```yaml
# Verbose:
brand:
  id: "default"
  variant: "dark"

# Compact:
brand: "default dark"
```

### 3. Shortened Field Names
- `llmHint` → `hint`
- `required` → `req`
- `inputType` → `type`

### 4. Inline Object Format
For simple objects, use inline YAML:
```yaml
regions:
  - { id: "title", role: "primary-title", req: true, grid: "3,4,48x3" }
  - { id: "logo", role: "logo", type: "image", grid: "3,42,10x2" }
```

### 5. Defaults and Inference
- `required` defaults to `false`
- `inputType` inferred from `role`
- `area` defaults to `id` if not specified

## Example Comparison

### Verbose Format (325 lines)
```yaml
---
title: "Grid Blueprint: Narrative Slide"
maxWords: 280
phase: "draft"
templateSettings:
  canvasWidth: 1920
  canvasHeight: 1080
  columns: 80
  rows: 45
  columnSize: "1fr"
  rowSize: "1fr"
  gap: "0.5rem"
layout:
  type: "grid-designer"
  template: "Grid Blueprint: Narrative Slide"
  components:
    - type: "GridArea"
      id: "section-label"
      role: "section-title"
      area: "section-label"
      maxWords: 12
    # ... more components
regions:
  - id: "section-label"
    area: "section-label"
    role: "section-title"
    required: false
    inputType: "text"
    type: "section-title"
    fieldTypes:
      - "section-title"
    llmHint: "Eyebrow or track name anchoring the narrative."
    grid:
      x: 3
      y: 2
      width: 26
      height: 1
  # ... more regions
---
```

### Compact Format (45 lines)
```yaml
---
title: "Compact Narrative Slide"
maxWords: 280
phase: "draft"
settings:
  canvas: "1920x1080"
  grid: "80x45"
  gap: "0.5rem"
exclusions: "4,4,3,3"
brand: "default dark"
regions:
  - id: "section-label" role: "section-title" hint: "Eyebrow or track name"
    grid: "3,2,26x1"
  - id: "hero-title" role: "primary-title" req: true hint: "Primary headline"
    grid: "3,4,48x3" maxWords: 18
  - id: "hero-subtitle" role: "secondary-title" hint: "Subtitle framing"
    grid: "3,7,42x2" maxWords: 28
layout:
  type: "grid-designer"
  template: "Compact Narrative Slide"
  rows: 45
  columns: 80
  gap: "0.5rem"
---
```

### Ultra-Compact Format (25 lines)
```yaml
---
title: "Simple Slide"
maxWords: 200
phase: "draft"
settings: { canvas: "1920x1080", grid: "80x45" }
exclusions: "4,4,3,3"
brand: "accenture light"
regions:
  - { id: "title", role: "primary-title", req: true, grid: "3,4,48x3" }
  - { id: "subtitle", role: "secondary-title", grid: "3,7,42x2" }
  - { id: "body", role: "supporting-text", req: true, grid: "3,10,46x12" }
  - { id: "logo", role: "logo", type: "image", grid: "3,42,10x2" }
  - { id: "page", role: "page-number", req: true, grid: "68,42,9x2" }
  - { id: "footer", role: "footer", req: true, grid: "22,43,32x1" }
layout: { type: "grid-designer", template: "Simple Slide", rows: 45, columns: 80 }
---
```

## Implementation

The transformation is handled by:
- `core/mdx/compact-format.js` - Conversion utilities
- `core/mdx/schema.js` - Validates both formats
- `template-studio/src/persistence/importer.js` - Auto-expands compact on import
- `template-studio/src/persistence/mdx.js` - Writes compact format on export

## Benefits for LLMs

1. **Reduced Token Usage**: ~60% fewer tokens means more context for understanding
2. **Clearer Structure**: Less nesting makes relationships more obvious
3. **Consistent Patterns**: Compact notations are easier to learn and predict
4. **Focus on Essentials**: Removes boilerplate, highlights what matters

## Backward Compatibility

- All existing verbose templates continue to work
- Importer automatically detects and expands compact format
- Exporter can write either format (defaults to compact when possible)
- Schema validation works for both formats
