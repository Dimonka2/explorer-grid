import { shallowRef, triggerRef } from 'vue'
import type { ItemId, UseSelectionOptions, UseSelectionReturn } from '../types'

export function useSelection(options: UseSelectionOptions): UseSelectionReturn {
  const { mode, onSelectionChange } = options

  const selectedIds = shallowRef<Set<ItemId>>(new Set())
  const anchorId = shallowRef<ItemId | null>(null)

  const notifyChange = () => {
    onSelectionChange?.(selectedIds.value)
  }

  const isSelected = (id: ItemId): boolean => {
    return selectedIds.value.has(id)
  }

  const select = (id: ItemId) => {
    if (mode === 'none') return
    if (selectedIds.value.has(id)) return

    if (mode === 'single') {
      selectedIds.value = new Set([id])
    } else {
      selectedIds.value.add(id)
      triggerRef(selectedIds)
    }
    notifyChange()
  }

  const deselect = (id: ItemId) => {
    if (!selectedIds.value.has(id)) return

    selectedIds.value.delete(id)
    triggerRef(selectedIds)
    notifyChange()
  }

  const toggle = (id: ItemId) => {
    if (mode === 'none') return

    if (selectedIds.value.has(id)) {
      deselect(id)
    } else {
      if (mode === 'single') {
        selectedIds.value = new Set([id])
        notifyChange()
      } else {
        select(id)
      }
    }
  }

  const selectOnly = (id: ItemId) => {
    if (mode === 'none') return

    selectedIds.value = new Set([id])
    notifyChange()
  }

  const selectMultiple = (ids: ItemId[]) => {
    if (mode === 'none') return
    if (mode === 'single' && ids.length > 0) {
      selectedIds.value = new Set([ids[ids.length - 1]])
    } else {
      for (const id of ids) {
        selectedIds.value.add(id)
      }
      triggerRef(selectedIds)
    }
    notifyChange()
  }

  const selectRange = (ids: ItemId[]) => {
    if (mode === 'none') return
    if (mode === 'single' && ids.length > 0) {
      selectedIds.value = new Set([ids[ids.length - 1]])
    } else {
      selectedIds.value = new Set(ids)
    }
    notifyChange()
  }

  const selectAll = (ids: ItemId[]) => {
    if (mode === 'none' || mode === 'single') return

    selectedIds.value = new Set(ids)
    notifyChange()
  }

  const clear = () => {
    if (selectedIds.value.size === 0) return

    selectedIds.value = new Set()
    notifyChange()
  }

  const setAnchor = (id: ItemId | null) => {
    anchorId.value = id
  }

  return {
    selectedIds,
    anchorId,
    isSelected,
    select,
    deselect,
    toggle,
    selectOnly,
    selectMultiple,
    selectRange,
    selectAll,
    clear,
    setAnchor,
  }
}
