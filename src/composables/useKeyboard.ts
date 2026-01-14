import type { ItemId, UseKeyboardOptions, UseKeyboardReturn } from '../types'

export function useKeyboard(options: UseKeyboardOptions): UseKeyboardReturn {
  const { focus, selection, items, getId, selectionMode, selectOnFocus, visibleRows, onOpen } = options

  const multiSelect = selectionMode === 'multiple'

  const getIdsInRange = (fromIndex: number, toIndex: number): ItemId[] => {
    const start = Math.min(fromIndex, toIndex)
    const end = Math.max(fromIndex, toIndex)
    const ids: ItemId[] = []
    for (let i = start; i <= end; i++) {
      ids.push(getId(items.value[i]))
    }
    return ids
  }

  const handleKeydown = (e: KeyboardEvent) => {
    const { key, shiftKey, ctrlKey, metaKey } = e
    const modKey = ctrlKey || metaKey

    // Navigation keys
    const navigationKeys = [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Home',
      'End',
      'PageUp',
      'PageDown',
    ]

    if (navigationKeys.includes(key)) {
      e.preventDefault()

      const currentIndex = focus.focusedIndex.value
      const anchorIndex =
        selection.anchorId.value !== null
          ? items.value.findIndex((item) => getId(item) === selection.anchorId.value)
          : currentIndex

      // Map key to direction
      let direction: string
      switch (key) {
        case 'ArrowUp':
          direction = 'up'
          break
        case 'ArrowDown':
          direction = 'down'
          break
        case 'ArrowLeft':
          direction = 'left'
          break
        case 'ArrowRight':
          direction = 'right'
          break
        case 'Home':
          direction = modKey ? 'home-global' : 'home'
          break
        case 'End':
          direction = modKey ? 'end-global' : 'end'
          break
        case 'PageUp':
          direction = 'pageUp'
          break
        case 'PageDown':
          direction = 'pageDown'
          break
        default:
          return
      }

      const newIndex = focus.moveFocus(
        direction as Parameters<typeof focus.moveFocus>[0],
        visibleRows.value
      )

      if (newIndex < 0) return

      const newId = getId(items.value[newIndex])

      if (shiftKey && multiSelect) {
        // Extend selection from anchor
        const rangeIds = getIdsInRange(anchorIndex >= 0 ? anchorIndex : 0, newIndex)
        selection.selectRange(rangeIds)
      } else if (modKey) {
        // Move focus without changing selection
        // Anchor stays where it was
      } else {
        // Normal navigation - select only focused item
        if (selectOnFocus) {
          selection.selectOnly(newId)
          selection.setAnchor(newId)
        }
      }

      return
    }

    // Enter - open item
    if (key === 'Enter') {
      const focusedId = focus.focusedId.value
      if (focusedId !== null) {
        e.preventDefault()
        onOpen?.(focusedId)
      }
      return
    }

    // Space - toggle selection
    if (key === ' ') {
      e.preventDefault()
      const focusedId = focus.focusedId.value
      if (focusedId !== null) {
        if (multiSelect) {
          selection.toggle(focusedId)
        } else {
          selection.selectOnly(focusedId)
        }
        selection.setAnchor(focusedId)
      }
      return
    }

    // Ctrl/Cmd+A - select all
    if (key === 'a' && modKey && multiSelect) {
      e.preventDefault()
      const allIds = items.value.map((item) => getId(item))
      selection.selectAll(allIds)
      return
    }

    // Escape - clear selection
    if (key === 'Escape') {
      e.preventDefault()
      selection.clear()
      return
    }
  }

  return {
    handleKeydown,
  }
}
