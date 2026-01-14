import { computed, ref, watch, onMounted, onUnmounted, toValue } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import type { UseVirtualGridOptions, UseVirtualGridReturn, VirtualRow, VirtualItem } from '../types'

export function useVirtualGrid(options: UseVirtualGridOptions): UseVirtualGridReturn {
  const { containerRef, containerHeight, items, columnCount, rowHeight, gap = 0, overscan = 3 } = options

  const scrollOffset = ref(0)

  // Reactive row height and gap
  const rowHeightValue = computed(() => toValue(rowHeight))
  const gapValue = computed(() => toValue(gap))

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
    rowVirtualizer.value.scrollToIndex(rowIndex, { align })
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

  // Watch for column count, row height, or gap changes to remeasure
  watch([columnCount, rowHeightValue, gapValue], () => {
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
