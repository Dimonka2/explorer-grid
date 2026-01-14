# Explorer Grid

A high-performance, accessible Vue 3 grid component with Windows Explorer-like keyboard navigation, selection, and marquee selection. Handles 100k+ items with virtualization.

## Features

- **Virtualized rendering** - Efficiently renders only visible items using @tanstack/vue-virtual
- **Full keyboard navigation** - Arrow keys, Home/End, Page Up/Down, Ctrl+Arrow for focus-only movement
- **Multiple selection modes** - Single, multiple, or none
- **Selection patterns** - Click, Ctrl+Click (toggle), Shift+Click (range), Ctrl+A (select all)
- **Marquee selection** - Click and drag in empty space to select multiple items
- **Edge auto-scroll** - Marquee selection auto-scrolls when dragging near container edges
- **Type-to-select** - Start typing to jump to matching items
- **Accessible** - ARIA listbox pattern with screen reader announcements
- **Customizable** - CSS custom properties for theming, slots for custom item rendering

## Installation

```bash
npm install explorer-grid
```

## Quick Start

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { ExplorerGrid } from 'explorer-grid'
import 'explorer-grid/styles'

interface Item {
  id: number
  name: string
}

const items = ref<Item[]>([
  { id: 1, name: 'Document.pdf' },
  { id: 2, name: 'Image.png' },
  { id: 3, name: 'Video.mp4' },
  // ... more items
])

const selectedIds = ref<Set<number>>(new Set())

const handleOpen = (id: number, item: Item) => {
  console.log('Opened:', item.name)
}
</script>

<template>
  <ExplorerGrid
    v-model:selectedIds="selectedIds"
    :items="items"
    :get-id="(item) => item.id"
    :get-label="(item) => item.name"
    :item-width="120"
    :item-height="100"
    @open="handleOpen"
  >
    <template #item="{ item, selected, focused }">
      <div class="my-item" :class="{ selected, focused }">
        {{ item.name }}
      </div>
    </template>
  </ExplorerGrid>
</template>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `T[]` | required | Array of items to display |
| `getId` | `(item: T) => ItemId` | required | Function to get unique ID from item |
| `getLabel` | `(item: T) => string` | `getId` | Function to get label for typeahead |
| `itemWidth` | `number` | `100` | Width of each item in pixels |
| `itemHeight` | `number` | `100` | Height of each item in pixels |
| `gap` | `number` | `8` | Gap between items in pixels |
| `overscan` | `number` | `3` | Number of rows to render outside viewport |
| `selectionMode` | `'single' \| 'multiple' \| 'none'` | `'multiple'` | Selection behavior |
| `marqueeEnabled` | `boolean` | `true` | Enable marquee (rubber-band) selection |
| `typeaheadEnabled` | `boolean` | `true` | Enable type-to-select |
| `selectOnFocus` | `boolean` | `true` | Auto-select item when focused via keyboard |
| `clearSelectionOnEmptyClick` | `boolean` | `true` | Clear selection when clicking empty space |
| `rightClickSelect` | `boolean` | `true` | Select item on right-click if not selected |
| `ariaLabel` | `string` | `'Item grid'` | Accessible label for the grid |

## v-model

| Model | Type | Description |
|-------|------|-------------|
| `selectedIds` | `Set<ItemId>` | Currently selected item IDs |
| `focusedId` | `ItemId \| null` | Currently focused item ID |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `open` | `(id: ItemId, item: T)` | Item opened (Enter or double-click) |
| `selectionChange` | `(ids: Set<ItemId>)` | Selection changed |
| `focusChange` | `(id: ItemId \| null)` | Focus changed |
| `contextmenu` | `(event: MouseEvent, selection: Set<ItemId>)` | Right-click context menu |

## Slots

### `#item`

Custom item rendering. Receives:

```ts
{
  item: T           // The item data
  index: number     // Item index in array
  selected: boolean // Is item selected
  focused: boolean  // Is item focused
}
```

### `#empty`

Custom empty state when no items.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Arrow keys` | Navigate between items |
| `Shift + Arrow` | Extend selection |
| `Ctrl + Arrow` | Move focus without selecting |
| `Home` | First item in row |
| `End` | Last item in row |
| `Ctrl + Home` | First item (global) |
| `Ctrl + End` | Last item (global) |
| `Page Up/Down` | Move by visible page |
| `Space` | Toggle selection |
| `Enter` | Open item |
| `Ctrl + A` | Select all |
| `Escape` | Clear selection |
| `Type letters` | Jump to matching item |

## Exposed Methods

Access via template ref:

```vue
<script setup>
const gridRef = ref()

// Scroll to specific item
gridRef.value?.scrollToId(itemId)
gridRef.value?.scrollToIndex(42)

// Selection
gridRef.value?.selectAll()
gridRef.value?.clearSelection()

// Focus
gridRef.value?.focusById(itemId)
</script>

<template>
  <ExplorerGrid ref="gridRef" ... />
</template>
```

## Styling

### CSS Custom Properties

```css
.eg-root {
  /* Focus ring on container */
  --eg-focus-ring-color: #0066cc;

  /* Item focus outline */
  --eg-focus-color: #0078d4;

  /* Selected item styles */
  --eg-selected-border: #0078d4;
  --eg-selected-bg: rgba(0, 120, 212, 0.3);

  /* Marquee styles */
  --eg-marquee-border: #0066cc;
  --eg-marquee-bg: rgba(0, 102, 204, 0.1);

  /* Empty state */
  --eg-empty-color: #666;
}
```

### CSS Classes

| Class | Description |
|-------|-------------|
| `.eg-root` | Main container |
| `.eg-item` | Item wrapper |
| `.eg-item--selected` | Selected item |
| `.eg-item--focused` | Focused item |
| `.eg-marquee` | Marquee selection overlay |
| `.eg-empty` | Empty state container |

## Headless Usage

For complete control, use the composables directly:

```ts
import { useExplorerGrid } from 'explorer-grid'

const grid = useExplorerGrid({
  items: itemsRef,
  getId: (item) => item.id,
  getLabel: (item) => item.name,
  columnCount: 4,
  onOpen: (id, item) => console.log('Opened', item),
  onSelectionChange: (ids) => console.log('Selected', ids.size),
})

// Use grid.handleKeydown, grid.handlePointerDown, etc.
```

## Performance

- Virtualized rendering handles 100,000+ items smoothly
- O(1) item lookup via ID-to-index map
- Efficient selection using Set operations
- Debounced screen reader announcements

## Accessibility

- ARIA listbox pattern with `role="listbox"` and `role="option"`
- `aria-activedescendant` for focus management (works with virtualization)
- `aria-selected`, `aria-setsize`, `aria-posinset` on items
- Live region announces selection changes
- High contrast mode support
- Full keyboard navigation

## Browser Support

- Chrome/Edge 88+
- Firefox 78+
- Safari 14+

## License

MIT
