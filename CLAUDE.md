# CLAUDE.md - Explorer Grid Project Guide

## Documentation

- **PRD**: `docs/prd.md` - Product requirements and goals
- **Technical Specs**: `docs/specs.md` - Detailed implementation specifications
- **Roadmap**: `docs/roadmap.md` - Phased development plan with tasks

## Project Overview

Vue 3 package providing an Explorer-like virtualized grid of items (cards) with:
- Virtualization for 100k+ items
- Keyboard navigation (arrows, Home/End, PageUp/PageDown)
- Selection model (single, multi, range, toggle)
- Focus management aligned with native Explorer behavior
- Mouse behaviors: click, ctrl/meta click, shift click, drag-marquee selection
- Optional type-to-select and incremental search

**Architecture**: Headless-first (logic composables) with optional reference UI component.

## Tech Stack

- Vue 3 (Composition API)
- TypeScript
- Vite (build tooling)

## Key Concepts

### Selection Model
- `focusedId`: Currently focused item (keyboard cursor)
- `anchorId`: Anchor point for range selection (set on click/focus change)
- `selectedIds`: Set of selected item IDs

### Selection Behaviors
- **Click**: Select only this item, set focus and anchor
- **Ctrl/Cmd+Click**: Toggle item in selection, move focus
- **Shift+Click**: Select range from anchor to clicked item
- **Shift+Arrow**: Extend selection as focus moves
- **Ctrl/Cmd+Arrow**: Move focus without changing selection

### Virtualization
- Only render visible items + overscan buffer
- `scrollToIndex`, `scrollToId`, `ensureVisible(id, align)` API
- When focus moves to non-rendered item, scroll it into view

## Package Exports

### Headless Composable: `useExplorerGrid(options)`

**Inputs:**
- `items: Ref<T[]>` - Array of items
- `getId(item): string | number` - Unique ID accessor
- `getLabel?(item): string` - Label for typeahead
- `columnCount` - Fixed or computed callback
- Feature flags: `multiSelect`, `marquee`, `typeahead`, `selectOnFocus`

**Outputs:**
- State: `focusedId`, `anchorId`, `selectedIds`
- Helpers: `isSelected(id)`, `toggle(id)`, `selectOnly(id)`, `selectRange(a,b)`, `selectAll()`, `clearSelection()`
- Navigation: `moveFocus(direction)`, `focusByIndex(i)`, `focusById(id)`
- Event handlers: `handleKeydown(e)`, `handlePointerDown(e, hit)`, `handlePointerMove(e)`, `handlePointerUp(e)`

### Reference Component: `<ExplorerGrid />`

**Props:**
- `items`, `getId`, `estimateSize`
- `overscan`, `selectionMode`
- `v-model:selectedIds`, `v-model:focusedId`

**Slots:**
- `#item="{ item, index, selected, focused }"`
- `#empty`

**Emits:**
- `open`, `selection-change`, `focus-change`, `contextmenu`

## CSS Classes

- `eg-root` - Grid container
- `eg-item` - Individual item
- `eg-item--selected` - Selected state
- `eg-item--focused` - Focused state
- `eg-marquee` - Rubber-band selection overlay

## File Structure (Expected)

```
src/
├── composables/
│   ├── useExplorerGrid.ts      # Main composable
│   ├── useSelection.ts         # Selection state management
│   ├── useFocus.ts             # Focus management
│   ├── useKeyboard.ts          # Keyboard navigation
│   ├── useMarquee.ts           # Rubber-band selection
│   └── useTypeahead.ts         # Type-to-select
├── components/
│   └── ExplorerGrid.vue        # Reference UI component
├── types/
│   └── index.ts                # TypeScript types
├── utils/
│   └── index.ts                # Helper utilities
└── index.ts                    # Package entry point
```

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Development server
npm run build        # Build package
npm run test         # Run tests
npm run lint         # Lint code
```

## Performance Requirements

- Keep DOM node count bounded (visible + overscan only)
- No per-item watchers for large lists
- `selectedIds` as Set for O(1) operations
- For very large sets, consider inversion model: `allSelected + exceptions`

## Accessibility (A11y)

- ARIA grid pattern with roving tabindex
- Visible focus ring for keyboard navigation
- Tab exits grid; arrows navigate within
- Optional live region for selection count announcements

## Edge Cases to Handle

1. **Container resize**: Preserve focused item by ID, recompute column mapping
2. **Items change (filter/sort)**: If focused ID disappears, move focus to nearest neighbor
3. **Async loading**: Allow placeholder items, keep navigation stable by index

## Code Style

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use Composition API with `<script setup>`
- Extract reusable logic into composables
- Keep components focused and composable
