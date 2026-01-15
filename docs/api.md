# API Reference

## Components

### ExplorerGrid

The main component that provides a virtualized, accessible grid with selection and navigation.

```vue
<ExplorerGrid
  v-model:selectedIds="selectedIds"
  v-model:focusedId="focusedId"
  :items="items"
  :get-id="getId"
  :get-label="getLabel"
  :item-width="120"
  :item-height="100"
  :gap="8"
  :overscan="3"
  :selection-mode="'multiple'"
  :marquee-enabled="true"
  :typeahead-enabled="true"
  :select-on-focus="true"
  :clear-selection-on-empty-click="true"
  :right-click-select="true"
  :aria-label="'File browser'"
  :header-offset="40"
  @open="handleOpen"
  @selection-change="handleSelectionChange"
  @focus-change="handleFocusChange"
  @contextmenu="handleContextMenu"
  @scroll="handleScroll"
  @marquee-start="handleMarqueeStart"
  @marquee-end="handleMarqueeEnd"
>
  <template #header>
    <!-- Optional header content -->
  </template>
  <template #item="{ item, index, selected, focused }">
    <!-- Custom item content -->
  </template>
  <template #empty>
    <!-- Custom empty state -->
  </template>
</ExplorerGrid>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `T[]` | **required** | Array of items to display in the grid |
| `getId` | `(item: T) => ItemId` | **required** | Function that returns a unique identifier for each item |
| `getLabel` | `(item: T) => string` | Uses `getId` | Function that returns a string label for typeahead matching |
| `itemWidth` | `number` | `100` | Width of each grid item in pixels |
| `itemHeight` | `number` | `100` | Height of each grid item in pixels |
| `gap` | `number` | `8` | Gap between items in pixels |
| `overscan` | `number` | `3` | Number of extra rows to render outside the visible viewport |
| `selectionMode` | `SelectionMode` | `'multiple'` | Selection behavior: `'single'`, `'multiple'`, or `'none'` |
| `marqueeEnabled` | `boolean` | `true` | Enable rubber-band (marquee) selection by dragging |
| `typeaheadEnabled` | `boolean` | `true` | Enable type-to-select functionality |
| `selectOnFocus` | `boolean` | `true` | Automatically select items when focused via keyboard |
| `clearSelectionOnEmptyClick` | `boolean` | `true` | Clear selection when clicking empty space |
| `rightClickSelect` | `boolean` | `true` | Select item on right-click if not already selected |
| `ariaLabel` | `string` | `'Item grid'` | Accessible label for the grid container |
| `headerOffset` | `number` | `0` | Height of header slot content (for proper item positioning) |

#### v-model Bindings

| Model | Type | Description |
|-------|------|-------------|
| `selectedIds` | `Set<ItemId>` | Two-way binding for selected item IDs |
| `focusedId` | `ItemId \| null` | Two-way binding for the focused item ID |

#### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `open` | `(id: ItemId, item: T)` | Emitted when an item is opened (Enter key or double-click) |
| `selectionChange` | `(ids: Set<ItemId>)` | Emitted when selection changes |
| `focusChange` | `(id: ItemId \| null)` | Emitted when focus changes |
| `contextmenu` | `(event: MouseEvent, selection: Set<ItemId>)` | Emitted on right-click, provides current selection |
| `scroll` | `(event: Event)` | Emitted when container is scrolled |
| `marqueeStart` | `()` | Emitted when marquee selection starts |
| `marqueeEnd` | `()` | Emitted when marquee selection ends |

#### Slots

##### `#header`

Optional slot for header content rendered above the grid items. When using this slot, set the `headerOffset` prop to match the header's height for proper item positioning.

```vue
<template #header>
  <div class="grid-toolbar" style="height: 40px">
    <span>{{ selectedCount }} items selected</span>
  </div>
</template>
```

##### `#item`

Slot for custom item rendering.

```vue
<template #item="{ item, index, selected, focused }">
  <div :class="{ selected, focused }">
    {{ item.name }}
  </div>
</template>
```

| Property | Type | Description |
|----------|------|-------------|
| `item` | `T` | The item data |
| `index` | `number` | Index of the item in the items array |
| `selected` | `boolean` | Whether the item is selected |
| `focused` | `boolean` | Whether the item is focused |

##### `#empty`

Slot for custom empty state when `items.length === 0`.

```vue
<template #empty>
  <div class="my-empty-state">
    No files found
  </div>
</template>
```

#### Exposed Methods

Access via template ref:

```ts
const gridRef = ref<InstanceType<typeof ExplorerGrid>>()

// Scroll methods
gridRef.value?.scrollToIndex(index: number)
gridRef.value?.scrollToId(id: ItemId)

// Selection methods
gridRef.value?.selectAll()
gridRef.value?.clearSelection()

// Focus methods
gridRef.value?.focusById(id: ItemId)

// Scroll position (for saving/restoring scroll state)
const pos = gridRef.value?.getScrollPosition()  // Returns number
gridRef.value?.setScrollPosition(pos)
```

---

## Composables

### useExplorerGrid

The main composable that combines all grid functionality. Use this for headless implementations.

```ts
import { useExplorerGrid } from 'vue-explorer-grid'

const grid = useExplorerGrid(options)
```

#### Options

```ts
interface UseExplorerGridOptions<T> {
  items: Ref<T[]> | ComputedRef<T[]>
  getId: (item: T) => ItemId
  getLabel?: (item: T) => string
  columnCount: number | Ref<number> | (() => number)
  selectionMode?: SelectionMode
  marqueeEnabled?: boolean
  typeaheadEnabled?: boolean
  selectOnFocus?: boolean
  clearSelectionOnEmptyClick?: boolean
  rightClickSelect?: boolean
  onOpen?: (id: ItemId, item: T) => void
  onSelectionChange?: (ids: Set<ItemId>) => void
  onFocusChange?: (id: ItemId | null) => void
}
```

#### Return Value

```ts
interface UseExplorerGridReturn<T> {
  // Reactive State
  focusedId: Ref<ItemId | null>
  anchorId: Ref<ItemId | null>
  selectedIds: Ref<Set<ItemId>>
  focusedIndex: ComputedRef<number>

  // Selection Methods
  isSelected: (id: ItemId) => boolean
  toggle: (id: ItemId) => void
  selectOnly: (id: ItemId) => void
  selectRange: (fromId: ItemId, toId: ItemId) => void
  selectAll: () => void
  clearSelection: () => void

  // Focus Methods
  moveFocus: (direction: NavigationDirection) => void
  focusByIndex: (index: number) => void
  focusById: (id: ItemId) => void

  // Event Handlers (wire to your template)
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

---

### useSelection

Manages selection state with support for single and multiple selection.

```ts
import { useSelection } from 'vue-explorer-grid'

const selection = useSelection({
  mode: 'multiple',
  onSelectionChange: (ids) => console.log('Selected:', ids.size)
})
```

#### Options

```ts
interface UseSelectionOptions {
  mode: SelectionMode  // 'single' | 'multiple' | 'none'
  onSelectionChange?: (ids: Set<ItemId>) => void
}
```

#### Return Value

```ts
interface UseSelectionReturn {
  selectedIds: Ref<Set<ItemId>>
  anchorId: Ref<ItemId | null>

  isSelected: (id: ItemId) => boolean
  select: (id: ItemId) => void
  deselect: (id: ItemId) => void
  toggle: (id: ItemId) => void
  selectOnly: (id: ItemId) => void
  selectMultiple: (ids: ItemId[]) => void
  selectRange: (ids: ItemId[]) => void
  selectAll: (ids: ItemId[]) => void
  clear: () => void
  setAnchor: (id: ItemId | null) => void
}
```

---

### useFocus

Manages focus state and navigation within the grid.

```ts
import { useFocus } from 'vue-explorer-grid'

const focus = useFocus({
  items: itemsRef,
  getId: (item) => item.id,
  columnCount: columnCountRef,
  onFocusChange: (id) => console.log('Focused:', id)
})
```

#### Return Value

```ts
interface UseFocusReturn {
  focusedId: Ref<ItemId | null>
  focusedIndex: ComputedRef<number>

  setFocusById: (id: ItemId) => void
  setFocusByIndex: (index: number) => void
  moveFocus: (direction: NavigationDirection, visibleRows?: number) => number
  clearFocus: () => void
}
```

#### Navigation Directions

```ts
type NavigationDirection =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'home'        // First in row
  | 'end'         // Last in row
  | 'pageUp'
  | 'pageDown'
  | 'home-global' // First item
  | 'end-global'  // Last item
```

---

### useTypeahead

Implements type-to-select functionality.

```ts
import { useTypeahead } from 'vue-explorer-grid'

const typeahead = useTypeahead({
  items: itemsRef,
  getLabel: (item) => item.name,
  getId: (item) => item.id,
  focus: focusComposable,
  debounceMs: 500
})
```

#### Options

```ts
interface UseTypeaheadOptions<T> {
  items: Ref<T[]>
  getLabel: (item: T) => string
  getId: (item: T) => ItemId
  focus: UseFocusReturn
  debounceMs?: number  // Default: 500
}
```

#### Return Value

```ts
interface UseTypeaheadReturn {
  handleKeypress: (e: KeyboardEvent) => void
  clearBuffer: () => void
  currentBuffer: Ref<string>
}
```

---

### useMarquee

Implements rubber-band (marquee) selection with edge auto-scroll.

```ts
import { useMarquee } from 'vue-explorer-grid'

const marquee = useMarquee({
  containerRef,
  getItemElements: () => Array.from(container.querySelectorAll('[data-item]')),
  getItemId: (el) => el.dataset.id,
  selection: selectionComposable,
  enabled: marqueeEnabledRef
})
```

#### Return Value

```ts
interface UseMarqueeReturn {
  isActive: Ref<boolean>
  rect: Ref<MarqueeRect | null>
  scrollOffset: Ref<{ x: number; y: number }>

  startMarquee: (e: PointerEvent) => void
  updateMarquee: (e: PointerEvent) => void
  endMarquee: (e: PointerEvent) => void
}

interface MarqueeRect {
  startX: number
  startY: number
  endX: number
  endY: number
}
```

---

### useVirtualGrid

Handles virtualization using @tanstack/vue-virtual.

```ts
import { useVirtualGrid } from 'vue-explorer-grid'

const virtual = useVirtualGrid({
  containerRef,
  containerHeight,
  items: itemsRef,
  columnCount: columnCountRef,
  rowHeight: 100,
  gap: 8,
  overscan: 3
})
```

#### Return Value

```ts
interface UseVirtualGridReturn {
  virtualRows: ComputedRef<VirtualRow[]>
  totalHeight: ComputedRef<number>
  visibleRowCount: ComputedRef<number>
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end' | 'auto') => void
  scrollToOffset: (offset: number) => void
}

interface VirtualRow {
  index: number
  start: number  // Y position
  size: number   // Row height
  items: VirtualItem[]
}

interface VirtualItem {
  index: number       // Item index in array
  columnIndex: number // Column position (0-based)
}
```

---

## Types

### ItemId

```ts
type ItemId = string | number
```

### SelectionMode

```ts
type SelectionMode = 'single' | 'multiple' | 'none'
```

### HitTestResult

```ts
interface HitTestResult {
  type: 'item' | 'empty'
  itemId?: ItemId
  index?: number
}
```

### ExplorerGridItem

Base interface for grid items (empty, extend with your own properties):

```ts
interface ExplorerGridItem {}

// Usage:
interface MyItem extends ExplorerGridItem {
  id: number
  name: string
  thumbnail: string
}
```
