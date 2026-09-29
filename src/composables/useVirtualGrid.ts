import { computed, ref, watch, onMounted, onUnmounted, toValue } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { buildUniformLayout, scrollTopForItem, scrollTopForSection } from '../layout/gridLayout'
import type { ScrollAlign } from '../layout/gridLayout'
import type {
  GridLayout,
  SectionKey,
  UseVirtualGridOptions,
  UseVirtualGridReturn,
  VirtualRow,
  VirtualItem,
} from '../types'

export function useVirtualGrid(options: UseVirtualGridOptions): UseVirtualGridReturn {
  const {
    containerRef,
    containerHeight,
    items,
    columnCount,
    rowHeight = 0,
    gap = 0,
    overscan = 3,
    headerOffset = 0,
    stickyHeaderHeight = 0,
  } = options

  const scrollOffset = ref(0)

  // Reactive gap, header offset and sticky header height
  const gapValue = computed(() => toValue(gap))
  const headerOffsetValue = computed(() => toValue(headerOffset))
  const stickyHeightValue = computed(() => toValue(stickyHeaderHeight))

  // The row layout: given by the caller, or the uniform grid over the items.
  const layout = computed<GridLayout>(() => {
    if (options.layout) return options.layout.value
    return buildUniformLayout(items?.value.length ?? 0, columnCount?.value ?? 1, toValue(rowHeight), gapValue.value)
  })

  // Offset of the first row inside the scroll content
  const margin = computed(() => headerOffsetValue.value + gapValue.value)

  // Create virtualizer for rows. scrollMargin tells the virtualizer that the
  // header slot (plus the leading gap) sits before the rows inside the same
  // scroll container — without it the visible range is computed from the raw
  // scrollTop and ends up displaced by the header height, unmounting rows that
  // are actually on screen once the header outgrows overscan * rowSize.
  const rowVirtualizer = useVirtualizer(
    computed(() => {
      const l = layout.value
      return {
        count: l.rowCount,
        getScrollElement: () => containerRef.value,
        estimateSize: (i: number) => l.rowHeightAt(i),
        overscan,
        scrollMargin: margin.value,
      }
    })
  )

  // Total height for the scroll container
  const totalHeight = computed(() => {
    return rowVirtualizer.value.getTotalSize()
  })

  // Visible row count (for page navigation) - uses reactive containerHeight
  const visibleRowCount = computed(() => {
    const l = layout.value
    if (containerHeight.value === 0) return 5
    return Math.ceil(containerHeight.value / (l.rowHeight + l.gap))
  })

  // Page size in px. Without sections it is whole item rows, which keeps
  // PageUp/PageDown identical to the classic `±cols × visibleRows`.
  const pageSize = computed(() => {
    const l = layout.value
    const rowSize = l.rowHeight + l.gap
    if (!l.sectioned) return visibleRowCount.value * rowSize
    if (containerHeight.value === 0) return 5 * rowSize
    return Math.max(rowSize, containerHeight.value - stickyHeightValue.value)
  })

  // Map virtual rows to our format with item indices
  const virtualRows = computed<VirtualRow[]>(() => {
    const l = layout.value
    const virtualItems = rowVirtualizer.value.getVirtualItems()
    const rows: VirtualRow[] = []

    for (const vRow of virtualItems) {
      // The virtualizer can lag one tick behind a shrinking layout
      if (vRow.index >= l.rowCount) continue
      const row = l.getRow(vRow.index)
      const rowItems: VirtualItem[] = []
      if (row.kind === 'items') {
        for (let i = row.first; i <= row.last; i++) {
          rowItems.push({ index: i, columnIndex: i - row.first })
        }
      }
      rows.push({
        index: vRow.index,
        start: vRow.start,
        size: vRow.size,
        items: rowItems,
        key: row.key,
        kind: row.kind,
        section: row.section,
      })
    }
    return rows
  })

  const applyScrollTop = (target: number | null) => {
    const container = containerRef.value
    if (!container || target === null) return
    container.scrollTop = target
  }

  const scrollToIndex = (index: number, align: ScrollAlign = 'auto') => {
    const container = containerRef.value
    if (!container) return
    applyScrollTop(
      scrollTopForItem(layout.value, index, align, {
        scrollTop: container.scrollTop,
        viewportHeight: container.clientHeight,
        margin: margin.value,
        stickyHeight: layout.value.sectioned ? stickyHeightValue.value : 0,
      })
    )
  }

  const scrollToSection = (key: SectionKey, align: ScrollAlign = 'start') => {
    const container = containerRef.value
    if (!container) return
    applyScrollTop(
      scrollTopForSection(layout.value, key, align, {
        scrollTop: container.scrollTop,
        viewportHeight: container.clientHeight,
        margin: margin.value,
      })
    )
  }

  const scrollToOffset = (offset: number) => {
    rowVirtualizer.value.scrollToOffset(offset)
  }

  // Track scroll position
  const handleScroll = () => {
    if (containerRef.value) {
      scrollOffset.value = containerRef.value.scrollTop
    }
  }

  // Remeasure whenever the rows change (new runs, a collapse, a column change,
  // a height change) or the header offset moves them.
  watch([layout, headerOffsetValue], () => {
    rowVirtualizer.value.measure()
  })

  // Set up scroll listener
  onMounted(() => {
    containerRef.value?.addEventListener('scroll', handleScroll, { passive: true })
  })

  onUnmounted(() => {
    containerRef.value?.removeEventListener('scroll', handleScroll)
  })

  return {
    virtualRows,
    totalHeight,
    visibleRowCount,
    pageSize,
    scrollTop: scrollOffset,
    layout,
    scrollToIndex,
    scrollToSection,
    scrollToOffset,
  }
}
