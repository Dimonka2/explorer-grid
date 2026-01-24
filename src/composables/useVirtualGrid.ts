import { computed, ref, watch, onMounted, onUnmounted, toValue } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import type { UseVirtualGridOptions, UseVirtualGridReturn, VirtualRow, VirtualItem } from '../types'

export function useVirtualGrid(options: UseVirtualGridOptions): UseVirtualGridReturn {
  const { containerRef, containerHeight, items, columnCount, rowHeight, gap = 0, overscan = 3, headerOffset = 0 } = options

  const scrollOffset = ref(0)

  // Reactive row height, gap, and header offset
  const rowHeightValue = computed(() => toValue(rowHeight))
  const gapValue = computed(() => toValue(gap))
  const headerOffsetValue = computed(() => toValue(headerOffset))

  // Calculate total row count
  const rowCount = computed(() => {
    return Math.ceil(items.value.length / columnCount.value)
  })

  // Create virtualizer for rows
  const rowVirtualizer = useVirtualizer(
    computed(() => ({
      count: rowCount.value,
      getScrollElement: () => containerRef.value,
      estimateSize: () => rowHeightValue.value + gapValue.value,
      overscan,
    }))
  )

  // Total height for the scroll container
  const totalHeight = computed(() => {
    return rowVirtualizer.value.getTotalSize()
  })

  // Visible row count (for page navigation) - uses reactive containerHeight
  const visibleRowCount = computed(() => {
    if (containerHeight.value === 0) return 5
    return Math.ceil(containerHeight.value / (rowHeightValue.value + gapValue.value))
  })

  // Map virtual rows to our format with item indices
  const virtualRows = computed<VirtualRow[]>(() => {
    const virtualItems = rowVirtualizer.value.getVirtualItems()
    const cols = columnCount.value
    const totalItems = items.value.length

    return virtualItems.map((vRow) => {
      const rowItems: VirtualItem[] = []
      const rowStartIndex = vRow.index * cols

      for (let col = 0; col < cols; col++) {
        const itemIndex = rowStartIndex + col
        if (itemIndex < totalItems) {
          rowItems.push({
            index: itemIndex,
            columnIndex: col,
          })
        }
      }

      return {
        index: vRow.index,
        start: vRow.start,
        size: vRow.size,
        items: rowItems,
      }
    })
  })

  const scrollToIndex = (index: number, align: 'start' | 'center' | 'end' | 'auto' = 'auto') => {
    const rowIndex = Math.floor(index / columnCount.value)
    const container = containerRef.value
    if (!container) return

    // Calculate actual item position (items are rendered at rowStart + gap + headerOffset)
    const rowStart = rowIndex * (rowHeightValue.value + gapValue.value)
    const itemTop = rowStart + gapValue.value + headerOffsetValue.value
    const itemBottom = itemTop + rowHeightValue.value

    const scrollTop = container.scrollTop
    const viewportHeight = container.clientHeight

    if (align === 'auto') {
      // Only scroll if item is not fully visible
      if (itemTop < scrollTop) {
        // Item is above viewport - scroll up to show it at top
        container.scrollTop = itemTop
      } else if (itemBottom > scrollTop + viewportHeight) {
        // Item is below viewport - scroll down to show it at bottom
        container.scrollTop = itemBottom - viewportHeight
      }
      // Otherwise item is visible, don't scroll
    } else if (align === 'start') {
      container.scrollTop = itemTop
    } else if (align === 'center') {
      container.scrollTop = itemTop - (viewportHeight - rowHeightValue.value) / 2
    } else if (align === 'end') {
      container.scrollTop = itemBottom - viewportHeight
    }
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

  // Watch for column count, row height, gap, or header offset changes to remeasure
  watch([columnCount, rowHeightValue, gapValue, headerOffsetValue], () => {
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
    scrollToIndex,
    scrollToOffset,
  }
}
