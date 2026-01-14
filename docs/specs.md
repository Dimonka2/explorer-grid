# Technical Specifications

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Consumer Application                      │
├─────────────────────────────────────────────────────────────┤
│  <ExplorerGrid />          │    useExplorerGrid()           │
│  (Reference Component)      │    (Headless Composable)       │
├─────────────────────────────┴───────────────────────────────┤
│                     Core Composables                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ useSelection │ │ useFocus     │ │ useVirtualGrid       │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ useKeyboard  │ │ useMarquee   │ │ useTypeahead         │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                     Utilities & Types                        │
└─────────────────────────────────────────────────────────────┘
```

## 2. Dependencies

### Required
- `vue` ^3.4.0 (peer dependency)

### Recommended
- `@tanstack/vue-virtual` ^3.x - Battle-tested virtualization
  - Alternatively: Custom implementation for full control

### Dev Dependencies
- `typescript` ^5.x
- `vite` ^5.x
- `vitest` - Testing
- `vue-tsc` - Type checking
- `eslint` + `@typescript-eslint/*`

## 3. Type Definitions

```typescript
// src/types/index.ts

export type ItemId = string | number

export interface ExplorerGridItem {
  [key: string]: unknown
}

export interface GridPosition {
  row: number
  col: number
}

export interface GridDimensions {
  columnCount: number
  rowCount: number
  itemWidth: number
  itemHeight: number
  gap: number
}

export type SelectionMode = 'single' | 'multiple' | 'none'

export type NavigationDirection = 'up' | 'down' | 'left' | 'right' |
  'home' | 'end' | 'pageUp' | 'pageDown' |
  'home-global' | 'end-global'

export interface SelectionState {
  focusedId: ItemId | null
  anchorId: ItemId | null
  selectedIds: Set<ItemId>
}

export interface HitTestResult {
  type: 'item' | 'empty'
  itemId?: ItemId
  index?: number
}

export interface MarqueeRect {
  startX: number
  startY: number
  endX: number
  endY: number
}

// Composable Options
export interface UseExplorerGridOptions<T extends ExplorerGridItem> {
  items: Ref<T[]> | ComputedRef<T[]>
  getId: (item: T) => ItemId
  getLabel?: (item: T) => string
  columnCount: number | Ref<number> | (() => number)

  // Feature flags
  selectionMode?: SelectionMode
  multiSelect?: boolean
  marqueeEnabled?: boolean
  typeaheadEnabled?: boolean
  selectOnFocus?: boolean
  clearSelectionOnEmptyClick?: boolean

  // Callbacks
  onOpen?: (id: ItemId, item: T) => void
  onSelectionChange?: (ids: Set<ItemId>) => void
  onFocusChange?: (id: ItemId | null) => void
}

export interface UseExplorerGridReturn<T extends ExplorerGridItem> {
  // State
  focusedId: Ref<ItemId | null>
  anchorId: Ref<ItemId | null>
  selectedIds: Ref<Set<ItemId>>
  focusedIndex: ComputedRef<number>

  // Selection helpers
  isSelected: (id: ItemId) => boolean
  toggle: (id: ItemId) => void
  selectOnly: (id: ItemId) => void
  selectRange: (fromId: ItemId, toId: ItemId) => void
  selectAll: () => void
  clearSelection: () => void

  // Focus helpers
  moveFocus: (direction: NavigationDirection) => void
  focusByIndex: (index: number) => void
  focusById: (id: ItemId) => void

  // Event handlers
  handleKeydown: (e: KeyboardEvent) => void
  handlePointerDown: (e: PointerEvent, hit: HitTestResult) => void
  handlePointerMove: (e: PointerEvent) => void
  handlePointerUp: (e: PointerEvent) => void

  // Utilities
  getItemById: (id: ItemId) => T | undefined
  getIndexById: (id: ItemId) => number
  getIdByIndex: (index: number) => ItemId | undefined
}
```

## 4. Composable Specifications

### 4.1 useSelection

Manages selection state with efficient Set operations.

```typescript
interface UseSelectionOptions {
  mode: SelectionMode
  onSelectionChange?: (ids: Set<ItemId>) => void
}

interface UseSelectionReturn {
  selectedIds: Ref<Set<ItemId>>
  anchorId: Ref<ItemId | null>

  isSelected: (id: ItemId) => boolean
  select: (id: ItemId) => void
  deselect: (id: ItemId) => void
  toggle: (id: ItemId) => void
  selectOnly: (id: ItemId) => void
  selectMultiple: (ids: ItemId[]) => void
  selectRange: (ids: ItemId[]) => void  // Receives pre-computed range
  selectAll: (ids: ItemId[]) => void
  clear: () => void
  setAnchor: (id: ItemId | null) => void
}
```

**Implementation notes:**
- Use `shallowRef` for `selectedIds` to avoid deep reactivity
- Trigger updates via `triggerRef()` after Set mutations
- For "select all" with 100k+ items, consider inversion model:
  ```typescript
  interface InvertedSelection {
    inverted: boolean  // true = "all selected except..."
    ids: Set<ItemId>   // exceptions
  }
  ```

### 4.2 useFocus

Manages focused item and provides navigation primitives.

```typescript
interface UseFocusOptions<T> {
  items: Ref<T[]>
  getId: (item: T) => ItemId
  columnCount: Ref<number>
  onFocusChange?: (id: ItemId | null) => void
}

interface UseFocusReturn {
  focusedId: Ref<ItemId | null>
  focusedIndex: ComputedRef<number>

  setFocusById: (id: ItemId) => void
  setFocusByIndex: (index: number) => void
  moveFocus: (direction: NavigationDirection) => number // Returns new index
  clearFocus: () => void
}
```

**Navigation logic:**
```typescript
function calculateTargetIndex(
  currentIndex: number,
  direction: NavigationDirection,
  columnCount: number,
  totalItems: number
): number {
  switch (direction) {
    case 'left':
      return Math.max(0, currentIndex - 1)
    case 'right':
      return Math.min(totalItems - 1, currentIndex + 1)
    case 'up':
      return Math.max(0, currentIndex - columnCount)
    case 'down':
      return Math.min(totalItems - 1, currentIndex + columnCount)
    case 'home':
      return currentIndex - (currentIndex % columnCount)  // Start of row
    case 'end':
      return Math.min(
        totalItems - 1,
        currentIndex - (currentIndex % columnCount) + columnCount - 1
      )  // End of row
    case 'home-global':
      return 0
    case 'end-global':
      return totalItems - 1
    case 'pageUp':
      // Move up by visible rows (provided externally)
      return Math.max(0, currentIndex - columnCount * visibleRows)
    case 'pageDown':
      return Math.min(totalItems - 1, currentIndex + columnCount * visibleRows)
  }
}
```

### 4.3 useKeyboard

Interprets keyboard events and coordinates focus/selection.

```typescript
interface UseKeyboardOptions {
  focus: UseFocusReturn
  selection: UseSelectionReturn
  items: Ref<unknown[]>
  getId: (item: unknown) => ItemId
  columnCount: Ref<number>
  multiSelect: boolean
  selectOnFocus: boolean
  onOpen?: (id: ItemId) => void
}

interface UseKeyboardReturn {
  handleKeydown: (e: KeyboardEvent) => void
}
```

**Key mappings:**
| Key | Action |
|-----|--------|
| Arrow keys | Move focus |
| Shift + Arrow | Extend selection range |
| Ctrl/Cmd + Arrow | Move focus without selection |
| Home | First item in row |
| End | Last item in row |
| Ctrl/Cmd + Home | First item |
| Ctrl/Cmd + End | Last item |
| PageUp/PageDown | Move by viewport page |
| Space | Toggle selection |
| Enter | Trigger open callback |
| Ctrl/Cmd + A | Select all |
| Escape | Clear selection |

### 4.4 useTypeahead

Buffer keystrokes and jump to matching items.

```typescript
interface UseTypeaheadOptions<T> {
  items: Ref<T[]>
  getLabel: (item: T) => string
  getId: (item: T) => ItemId
  focus: UseFocusReturn
  debounceMs?: number  // Default: 500
}

interface UseTypeaheadReturn {
  handleKeypress: (e: KeyboardEvent) => void
  clearBuffer: () => void
  currentBuffer: Ref<string>
}
```

**Algorithm:**
1. Accumulate printable characters into buffer
2. Reset buffer after `debounceMs` of inactivity
3. On each keystroke, find next item (after current focus) whose label starts with buffer (case-insensitive)
4. Wrap around to beginning if no match found after current position

### 4.5 useMarquee

Rubber-band selection with pointer tracking.

```typescript
interface UseMarqueeOptions {
  containerRef: Ref<HTMLElement | null>
  getItemElements: () => HTMLElement[]
  getItemId: (element: HTMLElement) => ItemId
  selection: UseSelectionReturn
  enabled: Ref<boolean>
}

interface UseMarqueeReturn {
  isActive: Ref<boolean>
  rect: Ref<MarqueeRect | null>

  startMarquee: (e: PointerEvent) => void
  updateMarquee: (e: PointerEvent) => void
  endMarquee: (e: PointerEvent) => void
}
```

**Hit testing:**
```typescript
function getIntersectingItems(
  marqueeRect: DOMRect,
  itemElements: HTMLElement[]
): ItemId[] {
  return itemElements
    .filter(el => rectsIntersect(marqueeRect, el.getBoundingClientRect()))
    .map(el => getItemId(el))
}

function rectsIntersect(a: DOMRect, b: DOMRect): boolean {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  )
}
```

**Virtualization consideration:**
- Only test visible/rendered items
- During drag, track marquee in scroll-adjusted coordinates
- Re-test on scroll events during active marquee

### 4.6 useVirtualGrid

Virtualization layer (wraps @tanstack/vue-virtual or custom).

```typescript
interface UseVirtualGridOptions {
  containerRef: Ref<HTMLElement | null>
  items: Ref<unknown[]>
  columnCount: Ref<number>
  rowHeight: number | ((index: number) => number)
  gap?: number
  overscan?: number  // Default: 3 rows
}

interface UseVirtualGridReturn {
  virtualRows: ComputedRef<VirtualRow[]>
  totalHeight: ComputedRef<number>
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void
  scrollToOffset: (offset: number) => void

  // For rendering
  containerProps: ComputedRef<{
    style: CSSProperties
  }>
  wrapperProps: ComputedRef<{
    style: CSSProperties
  }>
}

interface VirtualRow {
  index: number        // Row index
  start: number        // Y offset
  size: number         // Row height
  items: VirtualItem[] // Items in this row
}

interface VirtualItem {
  index: number        // Item index in flat list
  columnIndex: number  // Column position (0 to columnCount-1)
}
```

## 5. Component Specification

### ExplorerGrid.vue

```vue
<script setup lang="ts" generic="T extends ExplorerGridItem">
import { useExplorerGrid } from '../composables/useExplorerGrid'
import { useVirtualGrid } from '../composables/useVirtualGrid'

// Props
const props = withDefaults(defineProps<{
  items: T[]
  getId: (item: T) => ItemId
  getLabel?: (item: T) => string
  itemHeight?: number
  itemWidth?: number
  gap?: number
  overscan?: number
  selectionMode?: SelectionMode
  multiSelect?: boolean
  marqueeEnabled?: boolean
  typeaheadEnabled?: boolean
}>(), {
  itemHeight: 100,
  itemWidth: 100,
  gap: 8,
  overscan: 3,
  selectionMode: 'multiple',
  multiSelect: true,
  marqueeEnabled: true,
  typeaheadEnabled: true
})

// v-model bindings
const selectedIds = defineModel<Set<ItemId>>('selectedIds', {
  default: () => new Set()
})
const focusedId = defineModel<ItemId | null>('focusedId', {
  default: null
})

// Emits
const emit = defineEmits<{
  open: [id: ItemId, item: T]
  selectionChange: [ids: Set<ItemId>]
  focusChange: [id: ItemId | null]
  contextmenu: [event: MouseEvent, selection: Set<ItemId>]
}>()

// Template refs
const containerRef = ref<HTMLElement | null>(null)

// Computed column count based on container width
const columnCount = computed(() => {
  if (!containerRef.value) return 1
  const width = containerRef.value.clientWidth
  return Math.max(1, Math.floor((width + props.gap) / (props.itemWidth + props.gap)))
})

// Composables
const grid = useExplorerGrid({
  items: toRef(props, 'items'),
  getId: props.getId,
  getLabel: props.getLabel,
  columnCount,
  selectionMode: props.selectionMode,
  multiSelect: props.multiSelect,
  marqueeEnabled: props.marqueeEnabled,
  typeaheadEnabled: props.typeaheadEnabled,
  onOpen: (id) => emit('open', id, props.getId(id)),
  onSelectionChange: (ids) => {
    selectedIds.value = ids
    emit('selectionChange', ids)
  },
  onFocusChange: (id) => {
    focusedId.value = id
    emit('focusChange', id)
  }
})

const virtual = useVirtualGrid({
  containerRef,
  items: toRef(props, 'items'),
  columnCount,
  rowHeight: props.itemHeight,
  gap: props.gap,
  overscan: props.overscan
})

// Expose for parent access
defineExpose({
  scrollToIndex: virtual.scrollToIndex,
  scrollToId: (id: ItemId) => {
    const index = grid.getIndexById(id)
    if (index >= 0) virtual.scrollToIndex(index)
  },
  selectAll: grid.selectAll,
  clearSelection: grid.clearSelection,
  focusById: grid.focusById
})
</script>
```

**Template structure:**
```vue
<template>
  <div
    ref="containerRef"
    class="eg-root"
    tabindex="0"
    role="grid"
    :aria-rowcount="rowCount"
    :aria-colcount="columnCount"
    @keydown="grid.handleKeydown"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @contextmenu="onContextMenu"
  >
    <div class="eg-scroll-container" :style="virtual.containerProps.value.style">
      <div class="eg-wrapper" :style="virtual.wrapperProps.value.style">
        <template v-for="row in virtual.virtualRows.value" :key="row.index">
          <div
            v-for="vItem in row.items"
            :key="vItem.index"
            :class="[
              'eg-item',
              {
                'eg-item--selected': grid.isSelected(getId(items[vItem.index])),
                'eg-item--focused': focusedId === getId(items[vItem.index])
              }
            ]"
            :style="getItemStyle(vItem)"
            :data-index="vItem.index"
            :data-id="getId(items[vItem.index])"
            role="gridcell"
            :aria-selected="grid.isSelected(getId(items[vItem.index]))"
          >
            <slot
              name="item"
              :item="items[vItem.index]"
              :index="vItem.index"
              :selected="grid.isSelected(getId(items[vItem.index]))"
              :focused="focusedId === getId(items[vItem.index])"
            />
          </div>
        </template>
      </div>
    </div>

    <!-- Marquee overlay -->
    <div
      v-if="grid.marquee?.isActive.value"
      class="eg-marquee"
      :style="marqueeStyle"
    />

    <!-- Empty state -->
    <slot v-if="items.length === 0" name="empty">
      <div class="eg-empty">No items</div>
    </slot>
  </div>
</template>
```

## 6. ARIA Strategy

Using **ARIA grid** pattern:

```html
<div role="grid" aria-rowcount="100" aria-colcount="4">
  <div role="row" aria-rowindex="1">
    <div role="gridcell" aria-colindex="1" aria-selected="true" tabindex="0">
      <!-- Item content -->
    </div>
    <div role="gridcell" aria-colindex="2" aria-selected="false" tabindex="-1">
      <!-- Item content -->
    </div>
  </div>
</div>
```

**Roving tabindex:**
- Only focused item has `tabindex="0"`
- All other items have `tabindex="-1"`
- Tab key exits grid; arrow keys navigate within

**Live region for selection count:**
```html
<div aria-live="polite" aria-atomic="true" class="sr-only">
  {{ selectedIds.size }} items selected
</div>
```

## 7. CSS Architecture

```css
/* Base styles (minimal) */
.eg-root {
  position: relative;
  overflow: auto;
  outline: none;
}

.eg-root:focus-visible {
  outline: 2px solid var(--eg-focus-ring-color, #0066cc);
  outline-offset: -2px;
}

.eg-scroll-container {
  position: relative;
  width: 100%;
}

.eg-wrapper {
  position: relative;
}

.eg-item {
  position: absolute;
  box-sizing: border-box;
}

.eg-item--selected {
  /* Consumer styles via CSS custom properties */
  background: var(--eg-selected-bg, rgba(0, 102, 204, 0.1));
}

.eg-item--focused {
  outline: 2px solid var(--eg-focus-color, #0066cc);
  outline-offset: -2px;
}

.eg-marquee {
  position: absolute;
  border: 1px solid var(--eg-marquee-border, #0066cc);
  background: var(--eg-marquee-bg, rgba(0, 102, 204, 0.1));
  pointer-events: none;
  z-index: 10;
}

.eg-empty {
  padding: 2rem;
  text-align: center;
  color: var(--eg-empty-color, #666);
}

/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
```

## 8. Testing Strategy

### Unit Tests (Vitest)

**useSelection:**
- Single select mode behavior
- Multi-select toggle
- Range selection
- Select all / clear
- Anchor management

**useFocus:**
- Navigation calculations (all directions)
- Boundary conditions (first/last item, row edges)
- Column count changes

**useKeyboard:**
- Key event interpretation
- Modifier key handling (Ctrl, Shift, Cmd)
- Focus + selection coordination

**useTypeahead:**
- Buffer accumulation
- Debounce behavior
- Match finding and wrap-around

**useMarquee:**
- Rect intersection calculations
- Coordinate transformations

### Integration Tests

- Full keyboard navigation flow
- Click + modifier combinations
- Virtualization scroll behavior
- Dynamic item changes

### E2E Tests (Playwright/Cypress)

- Real browser keyboard navigation
- Marquee selection visual behavior
- Performance with 10k+ items
- Accessibility audit (axe-core)
