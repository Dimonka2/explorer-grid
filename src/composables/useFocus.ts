import { ref, computed } from 'vue'
import type { ItemId, NavigationDirection, UseFocusOptions, UseFocusReturn } from '../types'

export function useFocus<T>(options: UseFocusOptions<T>): UseFocusReturn {
  const { items, getId, columnCount, onFocusChange } = options

  const focusedId = ref<ItemId | null>(null)

  const focusedIndex = computed(() => {
    if (focusedId.value === null) return -1
    return items.value.findIndex((item) => getId(item) === focusedId.value)
  })

  const notifyChange = () => {
    onFocusChange?.(focusedId.value)
  }

  const setFocusById = (id: ItemId) => {
    const exists = items.value.some((item) => getId(item) === id)
    if (exists) {
      focusedId.value = id
      notifyChange()
    }
  }

  const setFocusByIndex = (index: number) => {
    if (index >= 0 && index < items.value.length) {
      focusedId.value = getId(items.value[index])
      notifyChange()
    }
  }

  const clearFocus = () => {
    focusedId.value = null
    notifyChange()
  }

  const calculateTargetIndex = (
    currentIndex: number,
    direction: NavigationDirection,
    cols: number,
    totalItems: number,
    visibleRows: number = 5
  ): number => {
    if (totalItems === 0) return -1
    if (currentIndex < 0) return 0

    switch (direction) {
      case 'left':
        return Math.max(0, currentIndex - 1)

      case 'right':
        return Math.min(totalItems - 1, currentIndex + 1)

      case 'up':
        return Math.max(0, currentIndex - cols)

      case 'down':
        return Math.min(totalItems - 1, currentIndex + cols)

      case 'home':
        // Start of current row
        return currentIndex - (currentIndex % cols)

      case 'end': {
        // End of current row
        const rowStart = currentIndex - (currentIndex % cols)
        return Math.min(totalItems - 1, rowStart + cols - 1)
      }

      case 'home-global':
        return 0

      case 'end-global':
        return totalItems - 1

      case 'pageUp':
        return Math.max(0, currentIndex - cols * visibleRows)

      case 'pageDown':
        return Math.min(totalItems - 1, currentIndex + cols * visibleRows)

      default:
        return currentIndex
    }
  }

  const moveFocus = (direction: NavigationDirection, visibleRows: number = 5): number => {
    const totalItems = items.value.length
    if (totalItems === 0) return -1

    const currentIndex = focusedIndex.value
    const cols = columnCount.value

    const targetIndex = calculateTargetIndex(currentIndex, direction, cols, totalItems, visibleRows)

    if (targetIndex !== currentIndex && targetIndex >= 0) {
      setFocusByIndex(targetIndex)
    }

    return targetIndex
  }

  return {
    focusedId,
    focusedIndex,
    setFocusById,
    setFocusByIndex,
    moveFocus,
    clearFocus,
  }
}
