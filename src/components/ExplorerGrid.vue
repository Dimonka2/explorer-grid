<script setup lang="ts" generic="T extends ExplorerGridItem">
import { ref, computed, toRef, watch, onMounted, onUnmounted } from 'vue'
import { useExplorerGrid } from '../composables/useExplorerGrid'
import { useVirtualGrid } from '../composables/useVirtualGrid'
import { useMarquee } from '../composables/useMarquee'
import type { ItemId, ExplorerGridItem, SelectionMode, HitTestResult } from '../types'

// Props
const props = withDefaults(
  defineProps<{
    items: T[]
    getId: (item: T) => ItemId
    getLabel?: (item: T) => string
    itemHeight?: number
    itemWidth?: number
    gap?: number
    overscan?: number
    selectionMode?: SelectionMode
    marqueeEnabled?: boolean
    typeaheadEnabled?: boolean
    selectOnFocus?: boolean
    clearSelectionOnEmptyClick?: boolean
    rightClickSelect?: boolean
  }>(),
  {
    itemHeight: 100,
    itemWidth: 100,
    gap: 8,
    overscan: 3,
    selectionMode: 'multiple',
    marqueeEnabled: true,
    typeaheadEnabled: true,
    selectOnFocus: true,
    clearSelectionOnEmptyClick: true,
    rightClickSelect: true,
  }
)

// v-model bindings
const selectedIds = defineModel<Set<ItemId>>('selectedIds', {
  default: () => new Set(),
})
const focusedId = defineModel<ItemId | null>('focusedId', {
  default: null,
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

// Track container dimensions for responsive layout
const containerWidth = ref(0)
const containerHeight = ref(0)

const updateContainerSize = () => {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth
    containerHeight.value = containerRef.value.clientHeight
  }
}

const columnCount = computed(() => {
  if (containerWidth.value === 0) return 1
  return Math.max(1, Math.floor((containerWidth.value + props.gap) / (props.itemWidth + props.gap)))
})

// Main grid composable
const grid = useExplorerGrid({
  items: toRef(props, 'items'),
  getId: props.getId,
  getLabel: props.getLabel,
  columnCount,
  selectionMode: props.selectionMode,
  marqueeEnabled: props.marqueeEnabled,
  typeaheadEnabled: props.typeaheadEnabled,
  selectOnFocus: props.selectOnFocus,
  clearSelectionOnEmptyClick: props.clearSelectionOnEmptyClick,
  rightClickSelect: props.rightClickSelect,
  onOpen: (id, item) => emit('open', id, item as T),
  onSelectionChange: (ids) => {
    selectedIds.value = ids
    emit('selectionChange', ids)
  },
  onFocusChange: (id) => {
    focusedId.value = id
    emit('focusChange', id)
  },
})

// Virtualization
const virtual = useVirtualGrid({
  containerRef,
  containerHeight,
  items: toRef(props, 'items'),
  columnCount,
  rowHeight: toRef(props, 'itemHeight'),
  gap: toRef(props, 'gap'),
  overscan: props.overscan,
})

// Sync visible rows to grid
watch(
  virtual.visibleRowCount,
  (rows) => {
    ;(grid as unknown as { _setVisibleRows: (r: number) => void })._setVisibleRows(rows)
  },
  { immediate: true }
)

// Marquee selection
const marqueeEnabled = computed(() => props.marqueeEnabled && props.selectionMode === 'multiple')

const getItemElements = (): HTMLElement[] => {
  if (!containerRef.value) return []
  return Array.from(containerRef.value.querySelectorAll('[data-eg-item]'))
}

const getItemIdFromElement = (el: HTMLElement): ItemId => {
  const id = el.dataset.egId
  // Try to parse as number if it looks like one
  if (id && /^\d+$/.test(id)) {
    return parseInt(id, 10)
  }
  return id ?? ''
}

const marquee = useMarquee({
  containerRef,
  getItemElements,
  getItemId: getItemIdFromElement,
  selection: {
    selectedIds: grid.selectedIds,
    anchorId: grid.anchorId,
    isSelected: grid.isSelected,
    select: (id) => grid.selectOnly(id),
    deselect: () => {},
    toggle: grid.toggle,
    selectOnly: grid.selectOnly,
    selectMultiple: () => {},
    // For marquee: select exactly these IDs, not a range between them
    selectRange: (ids) => {
      // Directly set the selection to only these specific IDs
      grid.selectedIds.value = new Set(ids)
    },
    selectAll: grid.selectAll,
    clear: grid.clearSelection,
    setAnchor: () => {},
  },
  enabled: marqueeEnabled,
})

// Event handlers
const hitTest = (e: PointerEvent): HitTestResult => {
  const target = e.target as HTMLElement
  const itemEl = target.closest('[data-eg-item]') as HTMLElement | null

  if (itemEl) {
    const id = getItemIdFromElement(itemEl)
    const index = grid.getIndexById(id)
    return { type: 'item', itemId: id, index }
  }

  return { type: 'empty' }
}

const onPointerDown = (e: PointerEvent) => {
  const hit = hitTest(e)

  // Start marquee if clicking empty space
  if (hit.type === 'empty' && marqueeEnabled.value && e.button === 0) {
    marquee.startMarquee(e)
  }

  grid.handlePointerDown(e, hit)
}

const onPointerMove = (e: PointerEvent) => {
  if (marquee.isActive.value) {
    marquee.updateMarquee(e)
  }
}

const onPointerUp = (e: PointerEvent) => {
  if (marquee.isActive.value) {
    marquee.endMarquee(e)
  }
}

const onContextMenu = (e: MouseEvent) => {
  emit('contextmenu', e, new Set(grid.selectedIds.value))
}

// Scroll to focused item when it changes - only if not fully visible
watch(grid.focusedId, (id) => {
  if (id !== null && containerRef.value) {
    const index = grid.getIndexById(id)
    if (index >= 0) {
      // Use 'auto' alignment - only scrolls if item is outside viewport
      virtual.scrollToIndex(index, 'auto')
    }
  }
})

// Resize observer
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  updateContainerSize()

  resizeObserver = new ResizeObserver(() => {
    updateContainerSize()
  })

  if (containerRef.value) {
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

// Get item style - computed based on current props
// Adds gap offset at top and left to allow marquee selection from before first item
const getItemStyle = (rowStart: number, colIndex: number) => {
  const { itemWidth, itemHeight, gap } = props
  return {
    position: 'absolute' as const,
    top: `${rowStart + gap}px`,
    left: `${colIndex * (itemWidth + gap) + gap}px`,
    width: `${itemWidth}px`,
    height: `${itemHeight}px`,
  }
}

// Marquee style - now uses content coordinates directly since marquee is inside scroll container
const marqueeStyle = computed(() => {
  if (!marquee.rect.value) return {}

  const r = marquee.rect.value

  return {
    left: `${Math.min(r.startX, r.endX)}px`,
    top: `${Math.min(r.startY, r.endY)}px`,
    width: `${Math.abs(r.endX - r.startX)}px`,
    height: `${Math.abs(r.endY - r.startY)}px`,
  }
})

// Active descendant ID for ARIA
const activeDescendantId = computed(() => {
  if (grid.focusedId.value === null) return undefined
  return `eg-item-${grid.focusedId.value}`
})

// Expose methods
defineExpose({
  scrollToIndex: virtual.scrollToIndex,
  scrollToId: (id: ItemId) => {
    const index = grid.getIndexById(id)
    if (index >= 0) virtual.scrollToIndex(index)
  },
  selectAll: grid.selectAll,
  clearSelection: grid.clearSelection,
  focusById: grid.focusById,
})
</script>

<template>
  <div
    ref="containerRef"
    class="eg-root"
    tabindex="0"
    role="listbox"
    :aria-multiselectable="selectionMode === 'multiple'"
    :aria-activedescendant="activeDescendantId"
    @keydown="grid.handleKeydown"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @contextmenu="onContextMenu"
  >
    <!-- Screen reader announcement -->
    <div class="eg-sr-only" aria-live="polite" aria-atomic="true">
      {{ grid.selectedIds.value.size }} items selected
    </div>

    <!-- Virtual scroll container -->
    <div class="eg-scroll-container" :style="{ height: `${virtual.totalHeight.value + gap}px` }">
      <template v-for="row in virtual.virtualRows.value" :key="row.index">
        <div
          v-for="vItem in row.items"
          :key="vItem.index"
          :id="`eg-item-${getId(items[vItem.index])}`"
          :class="[
            'eg-item',
            {
              'eg-item--selected': grid.isSelected(getId(items[vItem.index])),
              'eg-item--focused': grid.focusedId.value === getId(items[vItem.index]),
            },
          ]"
          :style="getItemStyle(row.start, vItem.columnIndex)"
          :data-eg-item="true"
          :data-eg-id="getId(items[vItem.index])"
          :data-index="vItem.index"
          role="option"
          :aria-selected="grid.isSelected(getId(items[vItem.index]))"
        >
          <slot
            name="item"
            :item="items[vItem.index]"
            :index="vItem.index"
            :selected="grid.isSelected(getId(items[vItem.index]))"
            :focused="grid.focusedId.value === getId(items[vItem.index])"
          />
        </div>
      </template>

      <!-- Marquee overlay - inside scroll container so it scrolls with content -->
      <div v-if="marquee.isActive.value" class="eg-marquee" :style="marqueeStyle" />
    </div>

    <!-- Empty state -->
    <slot v-if="items.length === 0" name="empty">
      <div class="eg-empty">No items</div>
    </slot>
  </div>
</template>
