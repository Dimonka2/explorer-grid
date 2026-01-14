# CLAUDE.md - Explorer Grid Project Guide

## Project Status: Complete

All 7 phases implemented. Ready for use and publishing.

## Documentation

- **README**: `README.md` - Quick start and overview
- **API Reference**: `docs/api.md` - Full API documentation
- **Examples**: `docs/examples.md` - Usage examples
- **Styling Guide**: `docs/styling.md` - Customization guide
- **PRD**: `docs/prd.md` - Original product requirements
- **Specs**: `docs/specs.md` - Technical specifications
- **Roadmap**: `docs/roadmap.md` - Development phases (all complete)

## Project Overview

Vue 3 package providing an Explorer-like virtualized grid with:
- Virtualization for 100k+ items using @tanstack/vue-virtual
- Full keyboard navigation (arrows, Home/End, PageUp/PageDown, Ctrl+Arrow)
- Selection model (single, multi, range, toggle)
- Marquee (rubber-band) selection with edge auto-scroll
- Type-to-select (typeahead)
- Accessibility (ARIA listbox pattern, screen reader announcements)

**Architecture**: Headless-first (logic composables) with optional reference UI component.

## Tech Stack

- Vue 3.5+ (Composition API)
- TypeScript 5.7+
- Vite 6 (build)
- Vitest (testing)
- @tanstack/vue-virtual (virtualization)

## Quick Start

```vue
<script setup>
import { ref } from 'vue'
import { ExplorerGrid } from 'explorer-grid'
import 'explorer-grid/styles'

const items = ref([{ id: 1, name: 'Item 1' }, ...])
const selectedIds = ref(new Set())
</script>

<template>
  <ExplorerGrid
    v-model:selectedIds="selectedIds"
    :items="items"
    :get-id="(item) => item.id"
    :item-width="100"
    :item-height="100"
  >
    <template #item="{ item }">{{ item.name }}</template>
  </ExplorerGrid>
</template>
```

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Development server (playground)
npm run build        # Build package
npm run test         # Run tests (watch mode)
npm run test:run     # Run tests once
npm run type-check   # TypeScript check
npm run lint         # Lint code
npm run lint:fix     # Fix lint issues
```

## File Structure

```
src/
├── composables/
│   ├── useExplorerGrid.ts      # Main composable (combines all)
│   ├── useSelection.ts         # Selection state management
│   ├── useFocus.ts             # Focus & navigation
│   ├── useKeyboard.ts          # Keyboard event handling
│   ├── useMarquee.ts           # Rubber-band selection
│   ├── useTypeahead.ts         # Type-to-select
│   └── useVirtualGrid.ts       # Virtualization wrapper
├── components/
│   └── ExplorerGrid.vue        # Reference UI component
├── types/
│   └── index.ts                # TypeScript interfaces
├── styles/
│   └── index.css               # Default styles
└── index.ts                    # Package exports

tests/
├── unit/                       # Unit tests for composables
└── a11y/                       # Accessibility tests

playground/                     # Development demo app
docs/                          # Documentation
```

## Key Composables

### useExplorerGrid(options)
Main composable - use for headless implementations.

### useSelection({ mode, onSelectionChange })
Selection state: `selectedIds`, `anchorId`, methods like `toggle`, `selectOnly`, `selectRange`.

### useFocus({ items, getId, columnCount, onFocusChange })
Focus management: `focusedId`, `moveFocus(direction)`, `setFocusById`.

### useVirtualGrid({ containerRef, items, columnCount, rowHeight, gap })
Virtualization: `virtualRows`, `totalHeight`, `scrollToIndex`.

## CSS Classes

| Class | Description |
|-------|-------------|
| `.eg-root` | Main container |
| `.eg-item` | Item wrapper |
| `.eg-item--selected` | Selected state |
| `.eg-item--focused` | Focused state |
| `.eg-marquee` | Selection overlay |
| `.eg-empty` | Empty state |

## CSS Custom Properties

```css
--eg-focus-ring-color    /* Container focus */
--eg-focus-color         /* Item focus outline */
--eg-selected-border     /* Selection border */
--eg-selected-bg         /* Selection background */
--eg-marquee-border      /* Marquee border */
--eg-marquee-bg          /* Marquee background */
```

## Test Coverage

- 54 tests total (unit + a11y)
- Unit tests: useSelection, useFocus, useExplorerGrid
- A11y tests: ARIA attributes, axe-core validation

## Performance

- Virtualized rendering (only visible items + overscan)
- O(1) item lookup via ID-to-index Map
- Set-based selection for efficient operations
- Handles 100k+ items smoothly

## Accessibility Features

- ARIA listbox pattern with `aria-activedescendant`
- `aria-setsize` and `aria-posinset` for virtualization
- Live region for selection announcements (debounced)
- High contrast mode support
- Full keyboard navigation

## License

MIT - See LICENSE file
