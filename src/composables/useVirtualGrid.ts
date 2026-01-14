import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import type { UseVirtualGridOptions, UseVirtualGridReturn, VirtualRow, VirtualItem } from '../types'

export function useVirtualGrid(options: UseVirtualGridOptions): UseVirtualGridReturn {
  const { containerRef, items, columnCount, rowHeight, gap = 0, overscan = 3 } = options

  const scrollOffset = ref(0)

  // Calculate total row count
  const rowCount = computed(() => {
    return Math.ceil(items.value.length / columnCount.value)
  })

  // Create virtualizer for rows
  const rowVirtualizer = useVirtualizer(
    computed(() => ({
      count: rowCount.value,
      getScrollElement: () => containerRef.value,
      estimateSize: () => rowHeight + gap,
      overscan,
    }))
  )

  // Total height for the scroll container
  const totalHeight = computed(() => {
    return rowVirtualizer.value.getTotalSize()
  })

  // Visible row count (for page navigation)
  const visibleRowCount = computed(() => {
    if (!containerRef.value) return 5
    return Math.ceil(containerRef.value.clientHeight / (rowHeight + gap))
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

  const scrollToIndex = (index: number, align: 'start' | 'center' | 'end' = 'center') => {
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

  // Watch for column count changes to remeasure
  watch(columnCount, () => {
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
