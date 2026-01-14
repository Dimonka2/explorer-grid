import { ref } from 'vue'
import type { UseTypeaheadOptions, UseTypeaheadReturn } from '../types'

export function useTypeahead<T>(options: UseTypeaheadOptions<T>): UseTypeaheadReturn {
  const { items, getLabel, focus, debounceMs = 500 } = options

  const currentBuffer = ref('')
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const clearBuffer = () => {
    currentBuffer.value = ''
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  const resetDebounce = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      clearBuffer()
    }, debounceMs)
  }

  const findMatch = (searchString: string, startIndex: number): number => {
    const itemCount = items.value.length
    if (itemCount === 0) return -1

    const normalizedSearch = searchString.toLowerCase()

    // Search from startIndex to end
    for (let i = startIndex; i < itemCount; i++) {
      const label = getLabel(items.value[i]).toLowerCase()
      if (label.startsWith(normalizedSearch)) {
        return i
      }
    }

    // Wrap around: search from beginning to startIndex
    for (let i = 0; i < startIndex; i++) {
      const label = getLabel(items.value[i]).toLowerCase()
      if (label.startsWith(normalizedSearch)) {
        return i
      }
    }

    return -1
  }

  const handleKeypress = (e: KeyboardEvent) => {
    // Only handle printable characters
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) {
      return
    }

    // Don't intercept space (it's for selection toggle)
    if (e.key === ' ') {
      return
    }

    e.preventDefault()

    // Add to buffer
    currentBuffer.value += e.key
    resetDebounce()

    // Find matching item starting after current focus
    const startIndex = focus.focusedIndex.value + 1
    const matchIndex = findMatch(currentBuffer.value, startIndex >= 0 ? startIndex : 0)

    if (matchIndex >= 0) {
      focus.setFocusByIndex(matchIndex)
    }
  }

  return {
    handleKeypress,
    clearBuffer,
    currentBuffer,
  }
}
