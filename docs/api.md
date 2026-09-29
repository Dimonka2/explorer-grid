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
| `sectionKey` | `(item: T) => SectionKey` | — | Section of an item. Consecutive items with an equal key form one section. Omitted = no sections (see [Sections](#sections)) |
| `sectionHeaderHeight` | `number` | `36` | Height of a section header row in px |
| `stickySectionHeaders` | `boolean` | `true` | Pin the current section's header at the top while scrolling |
| `getSectionLabel` | `(section: GridSection) => string` | the key | Label announced by the live region when focus moves into a section |

#### v-model Bindings

| Model | Type | Description |
|-------|------|-------------|
| `selectedIds` | `Set<ItemId>` | Two-way binding for selected item IDs |
| `focusedId` | `ItemId \| null` | Two-way binding for the focused item ID |
| `collapsedSections` | `Set<SectionKey>` | Keys of collapsed sections (default: empty). A key that matches no section is kept (it may load later) |

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
| `sectionToggle` | `(key: SectionKey, collapsed: boolean)` | Emitted when a section is collapsed or expanded (header, keyboard or `setSectionCollapsed`) |

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

##### `#section-header`

Content of a section header row (only with `sectionKey`). Rendered for each header row and, with `sticky: true`, for the pinned copy.

```vue
<template #section-header="{ section, collapsed, selectedCount, sticky, toggle, selectSection }">
  <button tabindex="-1" @click="toggle">{{ collapsed ? '▸' : '▾' }}</button>
  <span>{{ section.key }} · {{ section.count }}</span>
  <button tabindex="-1" @click="selectSection(selectedCount === section.count ? 'remove' : 'add')">
    Select all
  </button>
</template>
```

| Property | Type | Description |
|----------|------|-------------|
| `section` | `GridSection` | `{ key, index, start, count }`: items `[start, start + count)` |
| `collapsed` | `boolean` | Whether the section is collapsed |
| `selectedCount` | `number` | How many of the section's items are selected |
| `sticky` | `boolean` | `true` for the pinned copy at the top |
| `toggle` | `() => void` | Collapse / expand |
| `selectSection` | `(mode: 'replace' \| 'add' \| 'remove') => void` | Replace the selection with the section, add it, or remove it (multiple selection mode only) |

Without the slot a minimal header shows `String(key)`, the count and a chevron button. Header rows are `role="presentation"` and `aria-hidden="true"` (a listbox may own only options), so give buttons inside them `tabindex="-1"`: they are mouse affordances; the keyboard route is numpad `-` / `+` and your own menus.

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

// Focus methods (an item in a collapsed section expands that section first)
gridRef.value?.focusById(id: ItemId)

// Scroll position (for saving/restoring scroll state)
const pos = gridRef.value?.getScrollPosition()  // Returns number
gridRef.value?.setScrollPosition(pos)

// Sections (only meaningful with sectionKey)
gridRef.value?.setSectionCollapsed(key: SectionKey, collapsed: boolean)
gridRef.value?.scrollToSection(key: SectionKey, align?: 'start' | 'center' | 'end' | 'auto') // default 'start'
gridRef.value?.getSections()  // GridSection[], collapsed ones included
```

`scrollToIndex` / `scrollToId` use the row layout: with sticky headers an item under the pinned header counts as hidden, and an item in a collapsed section is not scrolled to (use `focusById` to reveal it).

#### Sections

Pass `sectionKey` to split the items into consecutive runs, each drawn under a full-width header row. The grid does **not** sort or group: order the items so that each section is one consecutive run (a key that reappears later starts a new section).

- Each section starts on a new row; a section may end on a partial row.
- Collapsed sections contribute only their header row.
- Keyboard: ←/→ move to the previous / next visible item across sections; ↑/↓ keep the column in the previous / next item row (clamped to a short row's last item); Home/End stay in the item row; Ctrl+Home/End go to the first / last visible item; PageUp/PageDown move by the viewport height (minus a sticky header). Shift ranges skip collapsed sections; **Ctrl+A selects everything, collapsed sections included**. Numpad `-` / `+` collapse / expand the focused item's section; a collapse that hides the focused item moves focus to the first item of the next visible section, or else the previous one.
- Typeahead only matches visible items. Marquee selects the items under the rectangle across sections; collapsed sections have no rendered items, so they are never marquee-selected.
- A press on a header (or the pinned header) neither changes the selection nor starts a marquee.
- Screen readers: options keep global `aria-setsize` / `aria-posinset`; when focus moves into another section, the live region announces `getSectionLabel(section)`.
- Header height is fixed per grid (`sectionHeaderHeight`); headers are not measured.

Without `sectionKey` the grid behaves and positions exactly as before.

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
  layout?: Ref<GridLayout>  // Row layout for navigation; default: uniform over items + columnCount
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
  // page: PageUp/PageDown distance in layout units — rows for the default
  // uniform layout, px when a `layout` option is given. Default: 5 item rows.
  moveFocus: (direction: NavigationDirection, page?: number) => number
  clearFocus: () => void
}
```

Options also accept `layout?: Ref<GridLayout>`; then `columnCount` is not needed and every move goes through `layout.navigate`.

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
  isVisible?: (index: number) => boolean  // Skip items (e.g. in collapsed sections)
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

Or drive it with a layout (for sections):

```ts
const virtual = useVirtualGrid({
  containerRef,
  containerHeight,
  layout: layoutRef,          // Ref<GridLayout>, e.g. from buildGridLayout
  gap: 8,
  headerOffset: 0,
  stickyHeaderHeight: 36,     // pinned header height, 0 = none
})
```

#### Return Value

```ts
interface UseVirtualGridReturn {
  virtualRows: ComputedRef<VirtualRow[]>
  totalHeight: ComputedRef<number>
  visibleRowCount: ComputedRef<number>
  pageSize: ComputedRef<number>        // PageUp/PageDown distance in px
  scrollTop: Ref<number>
  layout: ComputedRef<GridLayout>
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end' | 'auto') => void
  scrollToSection: (key: SectionKey, align?: 'start' | 'center' | 'end' | 'auto') => void
  scrollToOffset: (offset: number) => void
}

interface VirtualRow {
  index: number
  start: number  // Y position
  size: number   // Row height
  items: VirtualItem[]  // empty for a header row
  key: string | number  // stable row key
  kind: 'header' | 'items'
  section: GridSection
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
  type: 'item' | 'empty' | 'section-header'  // header hits are ignored
  itemId?: ItemId
  index?: number
}
```

### SectionKey, GridSection

```ts
type SectionKey = string | number

interface GridSection {
  key: SectionKey
  index: number  // position in getSections()
  start: number  // first item index
  count: number  // items [start, start + count)
}
```

---

## Layout

The row layout is a pure function, exported for headless use and tests.

```ts
import { buildGridLayout, buildUniformLayout, computeSectionRuns } from 'vue-explorer-grid'

const runs = computeSectionRuns(items, (p) => p.month)   // one O(n) pass
const layout = buildGridLayout({
  runs,                 // { key, start, count }[]
  columnCount: 5,
  collapsed: new Set(['2019-05']),
  headerHeight: 36,
  rowHeight: 100,
  gap: 8,
  headers: true,        // false = the uniform, header-less grid
})

layout.rowCount; layout.totalHeight; layout.sections
layout.getRow(r)        // { index, kind, key, start, height, section, first, last }
layout.rowOfItem(i)     // -1 when the item's section is collapsed
layout.itemAt(r, col)   // clamped to the row's last item
layout.rowAtOffset(y); layout.sectionAtOffset(y)
layout.firstItem(); layout.lastItem()
layout.navigate(index, direction, pagePx)
```

Row keys are the row index for a uniform layout and `h:<key>` / `r:<key>:<rowInSection>` with sections, so they stay stable when a section above collapses. `buildUniformLayout(count, columnCount, rowHeight, gap)` reproduces the classic `index / columnCount` grid exactly. Also exported: `scrollTopForItem`, `scrollTopForSection`, `stickyHeaderState` and the `useUniformLayout` composable.

---

## Migrating to 0.2.0

The `ExplorerGrid` component's props, events and slots do not break; sections are opt-in through `sectionKey`.

For direct composable callers, 0.2.0 moves keyboard navigation and virtualization onto a `GridLayout`. Every new option is optional and defaults to the uniform layout, so existing calls keep working. What changed:

- `useFocus().moveFocus(direction, page?)`: the second argument is now a page size in **layout units**. With the default layout (no `layout` option) a unit is one row, exactly as `visibleRows` was. If you pass a pixel `layout`, pass pixels.
- `useKeyboard`: `columnCount` and `visibleRows` are optional; prefer `pageSize` (same units as above) and pass `layout` so Shift ranges skip collapsed sections.
- `useVirtualGrid`: `items`, `columnCount` and `rowHeight` are optional when you pass `layout`; it now also returns `pageSize`, `scrollTop`, `layout` and `scrollToSection`.
- `VirtualRow` gained `key`, `kind` and `section`; key your row `v-for` by `row.key`.
- `HitTestResult.type` gained `'section-header'`.

To share one layout between the composables, build it once:

```ts
import { useUniformLayout, useFocus, useVirtualGrid } from 'vue-explorer-grid'

// px layout for the virtualizer and navigation
const layout = useUniformLayout({ items, columnCount, rowHeight: 100, gap: 8 })
// or: computed(() => buildGridLayout({ runs: [{ key: 0, start: 0, count: items.value.length }],
//                                        columnCount: cols.value, rowHeight: 100, gap: 8, headers: false }))

const focus = useFocus({ items, getId, layout })
const virtual = useVirtualGrid({ containerRef, containerHeight, layout, gap: 8 })
focus.moveFocus('pageDown', virtual.pageSize.value)  // px, because the layout is in px
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
