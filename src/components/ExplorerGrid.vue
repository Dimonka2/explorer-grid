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
    ariaLabel?: string
    headerOffset?: number
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
    ariaLabel: 'Item grid',
    headerOffset: 0,
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
  scroll: [event: Event]
  marqueeStart: []
  marqueeEnd: []
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
  headerOffset: toRef(props, 'headerOffset'),
})

// Sync visible rows to grid
watch(
  virtual.visibleRowCount,
  (rows) => {
    ;(grid as unknown as { _setVisibleRows: (r: number) => void })._setVisibleRows(rows)
  },
  { immediate: true }
)

// Sync external selectedIds changes to internal grid state
watch(
  selectedIds,
  (newIds) => {
    // Only sync if the external state differs from internal state
    const internalIds = grid.selectedIds.value
    if (newIds.size !== internalIds.size || ![...newIds].every(id => internalIds.has(id))) {
      // Use selectRange to set selection without triggering onSelectionChange callback loop
      grid.selectedIds.value = new Set(newIds)
    }
  },
  { immediate: true }
)

// Sync external focusedId changes to internal grid state
watch(
  focusedId,
  (newId) => {
    if (newId !== grid.focusedId.value) {
      if (newId !== null) {
        grid.focusById(newId)
      }
    }
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
      // Set the selection to only these specific IDs
      const newSelection = new Set(ids)
      grid.selectedIds.value = newSelection
      // Update v-model and emit event (bypassed when setting directly)
      selectedIds.value = newSelection
      emit('selectionChange', newSelection)
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
    emit('marqueeStart')
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
    emit('marqueeEnd')
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

const onScroll = (e: Event) => {
  emit('scroll', e)
}

onMounted(() => {
  updateContainerSize()

  resizeObserver = new ResizeObserver(() => {
    updateContainerSize()
  })

  if (containerRef.value) {
    resizeObserver.observe(containerRef.value)
    containerRef.value.addEventListener('scroll', onScroll)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  if (containerRef.value) {
    containerRef.value.removeEventListener('scroll', onScroll)
  }
})

// Get item style - computed based on current props
// Adds gap offset at top and left to allow marquee selection from before first item
// Also adds headerOffset to account for header slot content
const getItemStyle = (rowStart: number, colIndex: number) => {
  const { itemWidth, itemHeight, gap, headerOffset } = props
  return {
    position: 'absolute' as const,
    top: `${rowStart + gap + headerOffset}px`,
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

// Live region announcement - debounced to avoid spamming screen readers
const announcement = ref('')
let announcementTimeout: ReturnType<typeof setTimeout> | null = null

watch(
  () => grid.selectedIds.value.size,
  (newSize, oldSize) => {
    if (newSize === oldSize) return

    // Clear previous pending announcement
    if (announcementTimeout) {
      clearTimeout(announcementTimeout)
    }

    // Debounce announcement by 150ms to batch rapid changes
    announcementTimeout = setTimeout(() => {
      if (newSize === 0) {
        announcement.value = 'Selection cleared'
      } else if (newSize === 1) {
        announcement.value = '1 item selected'
      } else {
        announcement.value = `${newSize} items selected`
      }
    }, 150)
  }
)

onUnmounted(() => {
  if (announcementTimeout) {
    clearTimeout(announcementTimeout)
  }
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
  getScrollPosition: () => containerRef.value?.scrollTop ?? 0,
  setScrollPosition: (position: number) => {
    if (containerRef.value) {
      containerRef.value.scrollTop = position
    }
  },
})
</script>

<template>
  <div class="eg-wrapper">
    <!-- Screen reader announcement - outside listbox to avoid aria-required-children violation -->
    <div class="eg-sr-only" aria-live="polite" aria-atomic="true">
      {{ announcement }}
    </div>

    <div
      ref="containerRef"
      class="eg-root"
      tabindex="0"
      role="listbox"
      :aria-label="ariaLabel"
      :aria-multiselectable="selectionMode === 'multiple'"
      :aria-activedescendant="activeDescendantId"
      @keydown="grid.handleKeydown"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @contextmenu="onContextMenu"
    >
    <!-- Virtual scroll container -->
    <div class="eg-scroll-container" :style="{ height: `${virtual.totalHeight.value + gap + headerOffset}px` }">
      <!-- Header slot - rendered above the virtual items -->
      <slot name="header" />

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
          :aria-setsize="items.length"
          :aria-posinset="vItem.index + 1"
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
  </div>
</template>
