import { ref, computed } from 'vue'
import { buildUniformLayout } from '../layout/gridLayout'
import type { ItemId, NavigationDirection, UseFocusOptions, UseFocusReturn } from '../types'

export function useFocus<T>(options: UseFocusOptions<T>): UseFocusReturn {
  const { items, getId, columnCount, onFocusChange } = options

  // Without an explicit layout, navigate a uniform grid whose rows are 1 unit
  // tall: the page argument of moveFocus is then a number of rows, as before.
  const layout = options.layout ?? computed(() => buildUniformLayout(items.value.length, columnCount?.value ?? 1, 1, 0))

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

  /**
   * Move focus. `page` is the PageUp/PageDown distance in layout units: rows
   * for the default uniform layout, pixels when a `layout` option is given.
   */
  const moveFocus = (direction: NavigationDirection, page?: number): number => {
    const totalItems = items.value.length
    if (totalItems === 0) return -1

    const currentIndex = focusedIndex.value
    const targetIndex = layout.value.navigate(currentIndex, direction, page)

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
