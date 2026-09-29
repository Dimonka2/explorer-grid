<script setup lang="ts" generic="T extends ExplorerGridItem">
import { ref, computed, toRef, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useExplorerGrid } from '../composables/useExplorerGrid'
import { useVirtualGrid } from '../composables/useVirtualGrid'
import { useMarquee } from '../composables/useMarquee'
import {
  buildGridLayout,
  buildUniformLayout,
  computeSectionRuns,
  DEFAULT_SECTION_HEADER_HEIGHT,
} from '../layout/gridLayout'
import type { ScrollAlign } from '../layout/gridLayout'
import type {
  ItemId,
  ExplorerGridItem,
  SelectionMode,
  HitTestResult,
  GridLayout,
  GridSection,
  SectionKey,
} from '../types'

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
    /** Section of an item. Consecutive items with an equal key form one section. Omitted = no sections. */
    sectionKey?: (item: T) => SectionKey
    /** Height of a section header row in px. */
    sectionHeaderHeight?: number
    /** Pin the current section's header at the top while scrolling. */
    stickySectionHeaders?: boolean
    /** Label announced when focus moves into a section (default: the key). */
    getSectionLabel?: (section: GridSection) => string
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
    sectionKey: undefined,
    sectionHeaderHeight: DEFAULT_SECTION_HEADER_HEIGHT,
    stickySectionHeaders: true,
    getSectionLabel: undefined,
  }
)

// v-model bindings
const selectedIds = defineModel<Set<ItemId>>('selectedIds', {
  default: () => new Set(),
})
const focusedId = defineModel<ItemId | null>('focusedId', {
  default: null,
})
/** Keys of collapsed sections. A key that matches no section is kept (it may load later). */
const collapsedSections = defineModel<Set<SectionKey>>('collapsedSections', {
  default: () => new Set(),
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
  sectionToggle: [key: SectionKey, collapsed: boolean]
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

// Sections: runs are recomputed only when the items or sectionKey change;
// the layout also follows collapse state, columns and heights.
const runs = computed(() => (props.sectionKey ? computeSectionRuns(props.items, props.sectionKey) : null))

const layout = computed<GridLayout>(() => {
  const r = runs.value
  if (!r) return buildUniformLayout(props.items.length, columnCount.value, props.itemHeight, props.gap)
  return buildGridLayout({
    runs: r,
    columnCount: columnCount.value,
    collapsed: collapsedSections.value,
    headerHeight: props.sectionHeaderHeight,
    rowHeight: props.itemHeight,
    gap: props.gap,
  })
})

const isSectioned = computed(() => layout.value.sectioned)
const stickyHeight = computed(() =>
  isSectioned.value && props.stickySectionHeaders ? props.sectionHeaderHeight : 0
)

// Main grid composable
const grid = useExplorerGrid({
  items: toRef(props, 'items'),
  getId: props.getId,
  getLabel: props.getLabel,
  columnCount,
  layout,
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
  layout,
  gap: toRef(props, 'gap'),
  overscan: props.overscan,
  headerOffset: toRef(props, 'headerOffset'),
  stickyHeaderHeight: stickyHeight,
})

// Sync the PageUp/PageDown distance (px) to the grid
watch(
  virtual.pageSize,
  (size) => {
    ;(grid as unknown as { _setPageSize: (s: number) => void })._setPageSize(size)
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
        focusByIdRevealing(newId)
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
  // Section headers first: they are neither items nor empty space
  if (target.closest('[data-eg-section-header]')) {
    return { type: 'section-header' }
  }

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

  // A header click neither selects, clears the selection, nor starts a marquee
  if (hit.type === 'section-header') return

  // Check if click is on scrollbar (not in content area)
  const container = containerRef.value
  const isOnScrollbar = container && (
    e.clientX >= container.getBoundingClientRect().right - (container.offsetWidth - container.clientWidth) ||
    e.clientY >= container.getBoundingClientRect().bottom - (container.offsetHeight - container.clientHeight)
  )

  // Start marquee if clicking empty space (but not scrollbar)
  if (hit.type === 'empty' && marqueeEnabled.value && e.button === 0 && !isOnScrollbar) {
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
      if (layout.value.rowOfItem(index) < 0) {
        // Hidden in a collapsed section that is being expanded: scroll once it renders
        pendingRevealId = id
        return
      }
      // Use 'auto' alignment - only scrolls if item is outside viewport
      virtual.scrollToIndex(index, 'auto')
    }
  }
})

// ---- Sections ----

let pendingRevealId: ItemId | null = null

const setSectionCollapsed = (key: SectionKey, collapsed: boolean) => {
  const current = collapsedSections.value
  if (current.has(key) === collapsed) return

  // Collapsing the section we are scrolled into (its header is above the top):
  // bring its header to the top afterwards, so the view does not land in the
  // middle of whatever section follows.
  let scrollHeaderIntoView = false
  const section = layout.value.sectionByKey(key)
  const container = containerRef.value
  if (collapsed && section && container) {
    const headerRow = layout.value.headerRowOf(section.index)
    const headerTop = layout.value.rowStart(headerRow) + props.headerOffset + props.gap
    scrollHeaderIntoView = headerRow >= 0 && headerTop < container.scrollTop
  }

  const next = new Set(current)
  if (collapsed) next.add(key)
  else next.delete(key)
  collapsedSections.value = next
  emit('sectionToggle', key, collapsed)

  if (scrollHeaderIntoView) {
    nextTick(() => virtual.scrollToSection(key, 'start'))
  }
}

const toggleSection = (key: SectionKey) => {
  setSectionCollapsed(key, !collapsedSections.value.has(key))
}

/** Focus an item; an item inside a collapsed section expands that section first. */
const focusByIdRevealing = (id: ItemId) => {
  const index = grid.getIndexById(id)
  if (index >= 0 && layout.value.rowOfItem(index) < 0) {
    const section = layout.value.sectionOfItem(index)
    if (section) setSectionCollapsed(section.key, false)
  }
  grid.focusById(id)
}

// When the layout changes: finish a pending reveal, and move focus out of a
// section that was just collapsed (first item of the next visible section,
// else of the previous one). The anchor is kept.
watch(
  layout,
  (l) => {
    if (pendingRevealId !== null) {
      const revealIndex = grid.getIndexById(pendingRevealId)
      if (revealIndex < 0 || l.rowOfItem(revealIndex) >= 0) {
        pendingRevealId = null
        if (revealIndex >= 0) virtual.scrollToIndex(revealIndex, 'auto')
      } else if (grid.focusedId.value === pendingRevealId) {
        return // still waiting for the section to expand
      }
    }
    const index = grid.focusedIndex.value
    if (index < 0 || l.rowOfItem(index) >= 0) return
    const section = l.sectionOfItem(index)
    if (!section) return
    let target = -1
    for (let s = section.index + 1; s < l.sections.length && target < 0; s++) {
      if (!l.isCollapsed(s)) target = l.sections[s].start
    }
    for (let s = section.index - 1; s >= 0 && target < 0; s--) {
      if (!l.isCollapsed(s)) target = l.sections[s].start
    }
    if (target >= 0) grid.focusByIndex(target)
  },
  { flush: 'post' }
)

// How many of each section's items are selected
const sectionSelectedCounts = computed(() => {
  const l = layout.value
  const counts = new Array<number>(l.sections.length).fill(0)
  if (!l.sectioned) return counts
  for (const id of grid.selectedIds.value) {
    const section = l.sectionOfItem(grid.getIndexById(id))
    if (section) counts[section.index]++
  }
  return counts
})

const setSelection = (next: Set<ItemId>) => {
  grid.selectedIds.value = next
  selectedIds.value = next
  emit('selectionChange', next)
}

const selectSection = (section: GridSection, mode: 'replace' | 'add' | 'remove') => {
  if (props.selectionMode !== 'multiple') return
  const ids: ItemId[] = []
  for (let i = section.start; i < section.start + section.count; i++) ids.push(props.getId(props.items[i]))
  let next: Set<ItemId>
  if (mode === 'replace') {
    next = new Set(ids)
  } else if (mode === 'add') {
    next = new Set(grid.selectedIds.value)
    for (const id of ids) next.add(id)
  } else {
    next = new Set(grid.selectedIds.value)
    for (const id of ids) next.delete(id)
  }
  setSelection(next)
}

const sectionHeaderProps = (section: GridSection, sticky: boolean) => ({
  section,
  collapsed: layout.value.isCollapsed(section.index),
  selectedCount: sectionSelectedCounts.value[section.index] ?? 0,
  sticky,
  toggle: () => toggleSection(section.key),
  selectSection: (mode: 'replace' | 'add' | 'remove') => selectSection(section, mode),
})

const getSectionHeaderStyle = (rowStart: number) => ({
  position: 'absolute' as const,
  top: `${rowStart}px`,
  left: `${props.gap}px`,
  right: `${props.gap}px`,
  height: `${props.sectionHeaderHeight}px`,
})

const isEditableTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  if (!el || !el.tagName) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
}

// Keyboard: numpad - / + collapse / expand the focused item's section
const onKeydown = (e: KeyboardEvent) => {
  if (
    isSectioned.value &&
    (e.code === 'NumpadSubtract' || e.code === 'NumpadAdd') &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey &&
    !isEditableTarget(e.target)
  ) {
    const index = grid.focusedIndex.value
    const section = index >= 0 ? layout.value.sectionOfItem(index) : undefined
    if (section) {
      e.preventDefault()
      setSectionCollapsed(section.key, e.code === 'NumpadSubtract')
      return
    }
  }
  grid.handleKeydown(e)
}

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
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

// Get item style - computed based on current props
// Row starts come from the virtualizer, whose scrollMargin already covers the
// header slot and the leading gap; only the left edge still needs the gap.
const getItemStyle = (rowStart: number, colIndex: number) => {
  const { itemWidth, itemHeight, gap } = props
  return {
    position: 'absolute' as const,
    top: `${rowStart}px`,
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
  focusById: focusByIdRevealing,
  setSectionCollapsed,
  scrollToSection: (key: SectionKey, align: ScrollAlign = 'start') => virtual.scrollToSection(key, align),
  getSections: (): GridSection[] => layout.value.sections.slice(),
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
      @keydown="onKeydown"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @contextmenu="onContextMenu"
      @scroll="onScroll"
    >
    <!-- Virtual scroll container -->
    <div class="eg-scroll-container" :style="{ height: `${virtual.totalHeight.value + gap + headerOffset}px` }">
      <!-- Header slot - rendered above the virtual items -->
      <slot name="header" />

      <template v-for="row in virtual.virtualRows.value" :key="row.key">
        <!--
          Section header row: presentation only, not an option. aria-hidden
          because a listbox may own only options (axe aria-required-children
          flags the header's buttons otherwise); section changes are announced
          through the live region instead.
        -->
        <div
          v-if="row.kind === 'header'"
          :class="[
            'eg-section-header',
            { 'eg-section-header--collapsed': layout.isCollapsed(row.section.index) },
          ]"
          :style="getSectionHeaderStyle(row.start)"
          role="presentation"
          aria-hidden="true"
          :data-eg-section-header="String(row.section.key)"
        >
          <slot name="section-header" v-bind="sectionHeaderProps(row.section, false)">
            <span class="eg-section-header__label">{{ String(row.section.key) }}</span>
            <span class="eg-section-header__count">{{ row.section.count }}</span>
            <button
              type="button"
              tabindex="-1"
              class="eg-section-header__toggle"
              :aria-expanded="!layout.isCollapsed(row.section.index)"
              :aria-label="layout.isCollapsed(row.section.index) ? 'Expand section' : 'Collapse section'"
              @click="toggleSection(row.section.key)"
            >
              {{ layout.isCollapsed(row.section.index) ? '▸' : '▾' }}
            </button>
          </slot>
        </div>
        <!-- Item row (a header row has no items) -->
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
