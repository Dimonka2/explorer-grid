import { computed, ref, toValue, watch, type ComputedRef } from 'vue'
import { useSelection } from './useSelection'
import { useFocus } from './useFocus'
import { useKeyboard } from './useKeyboard'
import { useTypeahead } from './useTypeahead'
import type {
  ItemId,
  ExplorerGridItem,
  UseExplorerGridOptions,
  UseExplorerGridReturn,
  HitTestResult,
  NavigationDirection,
} from '../types'

export function useExplorerGrid<T extends ExplorerGridItem>(
  options: UseExplorerGridOptions<T>
): UseExplorerGridReturn<T> {
  const {
    items,
    getId,
    getLabel = (item: T) => String(getId(item)),
    columnCount: columnCountOption,
    selectionMode = 'multiple',
    selectOnFocus = true,
    typeaheadEnabled = true,
    clearSelectionOnEmptyClick = true,
    rightClickSelect = true,
    onOpen,
    onSelectionChange,
    onFocusChange,
  } = options

  // Normalize columnCount to a ref
  const columnCount = computed(() => {
    if (typeof columnCountOption === 'function') {
      return columnCountOption()
    }
    return toValue(columnCountOption)
  })

  // Id → Index map for O(1) lookups (rebuilt when items change)
  const idToIndexMap = ref<Map<ItemId, number>>(new Map())

  const rebuildIdIndexMap = () => {
    const map = new Map<ItemId, number>()
    const itemsValue = toValue(items)
    for (let i = 0; i < itemsValue.length; i++) {
      map.set(getId(itemsValue[i]), i)
    }
    idToIndexMap.value = map
  }

  // Watch items and rebuild map
  watch(
    () => toValue(items),
    () => rebuildIdIndexMap(),
    { immediate: true, deep: false }
  )

  // Utilities using the map
  const getIndexById = (id: ItemId): number => {
    return idToIndexMap.value.get(id) ?? -1
  }

  const getIdByIndex = (index: number): ItemId | undefined => {
    const itemsValue = toValue(items)
    if (index >= 0 && index < itemsValue.length) {
      return getId(itemsValue[index])
    }
    return undefined
  }

  const getItemById = (id: ItemId): T | undefined => {
    const index = getIndexById(id)
    if (index >= 0) {
      return toValue(items)[index]
    }
    return undefined
  }

  // Selection composable
  const selection = useSelection({
    mode: selectionMode,
    onSelectionChange,
  })

  // Focus composable with optimized index lookup
  const focusInternal = useFocus({
    items: computed(() => toValue(items)),
    getId,
    columnCount,
    onFocusChange,
  })

  // Optimized focusedIndex using map
  const focusedIndex: ComputedRef<number> = computed(() => {
    if (focusInternal.focusedId.value === null) return -1
    return getIndexById(focusInternal.focusedId.value)
  })

  // Visible rows (placeholder - will be set by component)
  const visibleRows = ref(5)

  // Keyboard composable
  const keyboard = useKeyboard({
    focus: focusInternal,
    selection,
    items: computed(() => toValue(items)),
    getId: getId as (item: unknown) => ItemId,
    columnCount,
    selectionMode,
    selectOnFocus,
    visibleRows,
    onOpen: (id) => {
      const item = getItemById(id)
      if (item) {
        onOpen?.(id, item)
      }
    },
  })

  // Typeahead composable (optional)
  const typeahead = typeaheadEnabled
    ? useTypeahead({
        items: computed(() => toValue(items)),
        getLabel,
        getId,
        focus: focusInternal,
      })
    : null

  // Combined keydown handler
  const handleKeydown = (e: KeyboardEvent) => {
    // Let typeahead handle printable characters first
    if (typeahead && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== ' ') {
      typeahead.handleKeypress(e)
      return
    }
    keyboard.handleKeydown(e)
  }

  // Pointer handlers
  const handlePointerDown = (e: PointerEvent, hit: HitTestResult) => {
    if (hit.type === 'empty') {
      if (clearSelectionOnEmptyClick && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        selection.clear()
      }
      return
    }

    if (hit.itemId === undefined) return

    const id = hit.itemId
    const isRightClick = e.button === 2

    if (isRightClick) {
      // Right click behavior
      if (rightClickSelect && !selection.isSelected(id)) {
        selection.selectOnly(id)
        selection.setAnchor(id)
      }
      focusInternal.setFocusById(id)
      return
    }

    // Left click behavior
    if (e.shiftKey && selectionMode === 'multiple') {
      // Shift+click: range selection
      const anchorId = selection.anchorId.value
      if (anchorId !== null) {
        const anchorIndex = getIndexById(anchorId)
        const targetIndex = getIndexById(id)
        if (anchorIndex >= 0 && targetIndex >= 0) {
          const rangeIds = getIdsInRange(anchorIndex, targetIndex)
          selection.selectRange(rangeIds)
        }
      } else {
        selection.selectOnly(id)
        selection.setAnchor(id)
      }
    } else if ((e.ctrlKey || e.metaKey) && selectionMode === 'multiple') {
      // Ctrl/Cmd+click: toggle
      selection.toggle(id)
      selection.setAnchor(id)
    } else {
      // Plain click: select only
      selection.selectOnly(id)
      selection.setAnchor(id)
    }

    focusInternal.setFocusById(id)
  }

  const handlePointerMove = (_e: PointerEvent) => {
    // Marquee handling is done in useMarquee, called from component
  }

  const handlePointerUp = (_e: PointerEvent) => {
    // Marquee handling is done in useMarquee, called from component
  }

  // Helper to get IDs in a range
  const getIdsInRange = (fromIndex: number, toIndex: number): ItemId[] => {
    const start = Math.min(fromIndex, toIndex)
    const end = Math.max(fromIndex, toIndex)
    const ids: ItemId[] = []
    const itemsValue = toValue(items)
    for (let i = start; i <= end; i++) {
      ids.push(getId(itemsValue[i]))
    }
    return ids
  }

  // Public selection methods
  const isSelected = (id: ItemId): boolean => selection.isSelected(id)

  const toggle = (id: ItemId) => {
    selection.toggle(id)
  }

  const selectOnly = (id: ItemId) => {
    selection.selectOnly(id)
    selection.setAnchor(id)
  }

  const selectRange = (fromId: ItemId, toId: ItemId) => {
    const fromIndex = getIndexById(fromId)
    const toIndex = getIndexById(toId)
    if (fromIndex >= 0 && toIndex >= 0) {
      const ids = getIdsInRange(fromIndex, toIndex)
      selection.selectRange(ids)
    }
  }

  const selectAll = () => {
    if (selectionMode !== 'multiple') return
    const allIds = toValue(items).map((item) => getId(item))
    selection.selectAll(allIds)
  }

  const clearSelection = () => {
    selection.clear()
  }

  // Public focus methods
  const moveFocus = (direction: NavigationDirection) => {
    return focusInternal.moveFocus(direction, visibleRows.value)
  }

  const focusByIndex = (index: number) => {
    focusInternal.setFocusByIndex(index)
  }

  const focusById = (id: ItemId) => {
    focusInternal.setFocusById(id)
  }

  // Handle items changing - preserve focus/selection where possible
  watch(
    () => toValue(items),
    (newItems, oldItems) => {
      if (!oldItems) return

      // If focused item no longer exists, move to nearest neighbor
      const focusedId = focusInternal.focusedId.value
      if (focusedId !== null && !idToIndexMap.value.has(focusedId)) {
        // Find the old index
        const oldIndex = oldItems.findIndex((item) => getId(item) === focusedId)
        if (oldIndex >= 0) {
          // Try to focus item at same index, or closest
          const newIndex = Math.min(oldIndex, newItems.length - 1)
          if (newIndex >= 0) {
            focusInternal.setFocusByIndex(newIndex)
          } else {
            focusInternal.clearFocus()
          }
        }
      }

      // Prune selection to existing items
      const currentSelection = selection.selectedIds.value
      const prunedSelection: ItemId[] = []
      for (const id of currentSelection) {
        if (idToIndexMap.value.has(id)) {
          prunedSelection.push(id)
        }
      }
      if (prunedSelection.length !== currentSelection.size) {
        selection.selectRange(prunedSelection)
      }
    },
    { deep: false }
  )

  return {
    // State
    focusedId: focusInternal.focusedId,
    anchorId: selection.anchorId,
    selectedIds: selection.selectedIds,
    focusedIndex,

    // Selection helpers
    isSelected,
    toggle,
    selectOnly,
    selectRange,
    selectAll,
    clearSelection,

    // Focus helpers
    moveFocus,
    focusByIndex,
    focusById,

    // Event handlers
    handleKeydown,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,

    // Utilities
    getItemById,
    getIndexById,
    getIdByIndex,

    // Internal: for component to set visible rows
    _setVisibleRows: (rows: number) => {
      visibleRows.value = rows
    },
  } as UseExplorerGridReturn<T> & { _setVisibleRows: (rows: number) => void }
}
