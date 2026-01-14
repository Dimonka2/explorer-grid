import { describe, it, expect, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { useExplorerGrid } from '../../src/composables/useExplorerGrid'

interface TestItem {
  id: number
  name: string
}

const createItems = (count: number, startId = 1): TestItem[] =>
  Array.from({ length: count }, (_, i) => ({
    id: startId + i,
    name: `Item ${startId + i}`,
  }))

describe('useExplorerGrid', () => {
  describe('dynamic item changes', () => {
    it('should preserve focus when focused item still exists after items change', async () => {
      const items = ref(createItems(10))
      const grid = useExplorerGrid({
        items,
        getId: (item: TestItem) => item.id,
        columnCount: 4,
      })

      // Focus item 5
      grid.focusById(5)
      expect(grid.focusedId.value).toBe(5)

      // Remove items 1-3, item 5 should still be focused
      items.value = createItems(7, 4) // Items 4-10
      await nextTick()

      expect(grid.focusedId.value).toBe(5)
    })

    it('should move focus to nearest item when focused item is removed', async () => {
      const items = ref(createItems(10))
      const grid = useExplorerGrid({
        items,
        getId: (item: TestItem) => item.id,
        columnCount: 4,
      })

      // Focus item 5
      grid.focusById(5)
      expect(grid.focusedId.value).toBe(5)

      // Remove item 5 specifically - keep items 1-4 and 6-10
      items.value = [...createItems(4), ...createItems(5, 6)]
      await nextTick()

      // Focus should move to the item at the same index (or nearest)
      expect(grid.focusedId.value).not.toBe(5)
      expect(grid.focusedId.value).not.toBeNull()
    })

    it('should clear focus when all items are removed', async () => {
      const items = ref(createItems(10))
      const grid = useExplorerGrid({
        items,
        getId: (item: TestItem) => item.id,
        columnCount: 4,
      })

      // Focus item 5
      grid.focusById(5)
      expect(grid.focusedId.value).toBe(5)

      // Remove all items
      items.value = []
      await nextTick()

      expect(grid.focusedId.value).toBeNull()
    })

    it('should prune selection to existing items', async () => {
      const items = ref(createItems(10))
      const grid = useExplorerGrid({
        items,
        getId: (item: TestItem) => item.id,
        columnCount: 4,
        selectionMode: 'multiple',
      })

      // Select items 3, 5, 7
      grid.selectOnly(3)
      grid.toggle(5)
      grid.toggle(7)
      expect(grid.selectedIds.value.size).toBe(3)
      expect(grid.selectedIds.value.has(3)).toBe(true)
      expect(grid.selectedIds.value.has(5)).toBe(true)
      expect(grid.selectedIds.value.has(7)).toBe(true)

      // Remove item 5
      items.value = [...createItems(4), ...createItems(5, 6)]
      await nextTick()

      // Selection should be pruned - item 5 no longer selected
      expect(grid.selectedIds.value.has(5)).toBe(false)
      expect(grid.selectedIds.value.has(3)).toBe(true)
      expect(grid.selectedIds.value.has(7)).toBe(true)
    })

    it('should handle complete items replacement', async () => {
      const items = ref(createItems(10))
      const grid = useExplorerGrid({
        items,
        getId: (item: TestItem) => item.id,
        columnCount: 4,
      })

      // Focus and select
      grid.focusById(5)
      grid.selectOnly(5)

      // Replace all items with completely new ones
      items.value = createItems(10, 100) // Items 100-109
      await nextTick()

      // Old focus/selection should be cleared since IDs don't exist
      expect(grid.selectedIds.value.size).toBe(0)
    })
  })

  describe('selection operations', () => {
    it('should select all items', () => {
      const items = ref(createItems(10))
      const grid = useExplorerGrid({
        items,
        getId: (item: TestItem) => item.id,
        columnCount: 4,
        selectionMode: 'multiple',
      })

      grid.selectAll()
      expect(grid.selectedIds.value.size).toBe(10)
    })

    it('should not select all in single selection mode', () => {
      const items = ref(createItems(10))
      const grid = useExplorerGrid({
        items,
        getId: (item: TestItem) => item.id,
        columnCount: 4,
        selectionMode: 'single',
      })

      grid.selectAll()
      expect(grid.selectedIds.value.size).toBe(0)
    })

    it('should clear selection', () => {
      const items = ref(createItems(10))
      const grid = useExplorerGrid({
        items,
        getId: (item: TestItem) => item.id,
        columnCount: 4,
        selectionMode: 'multiple',
      })

      grid.selectAll()
      expect(grid.selectedIds.value.size).toBe(10)

      grid.clearSelection()
      expect(grid.selectedIds.value.size).toBe(0)
    })

    it('should select range between two items', () => {
      const items = ref(createItems(10))
      const grid = useExplorerGrid({
        items,
        getId: (item: TestItem) => item.id,
        columnCount: 4,
        selectionMode: 'multiple',
      })

      grid.selectRange(3, 7)
      expect(grid.selectedIds.value.size).toBe(5)
      expect(grid.selectedIds.value.has(3)).toBe(true)
      expect(grid.selectedIds.value.has(4)).toBe(true)
      expect(grid.selectedIds.value.has(5)).toBe(true)
      expect(grid.selectedIds.value.has(6)).toBe(true)
      expect(grid.selectedIds.value.has(7)).toBe(true)
    })
  })

  describe('focus operations', () => {
    it('should focus by ID', () => {
      const items = ref(createItems(10))
      const grid = useExplorerGrid({
        items,
        getId: (item: TestItem) => item.id,
        columnCount: 4,
      })

      grid.focusById(5)
      expect(grid.focusedId.value).toBe(5)
      expect(grid.focusedIndex.value).toBe(4) // 0-indexed
    })

    it('should focus by index', () => {
      const items = ref(createItems(10))
      const grid = useExplorerGrid({
        items,
        getId: (item: TestItem) => item.id,
        columnCount: 4,
      })

      grid.focusByIndex(3)
      expect(grid.focusedId.value).toBe(4) // ID is 1-indexed in our test data
      expect(grid.focusedIndex.value).toBe(3)
    })
  })

  describe('utilities', () => {
    it('should get item by ID', () => {
      const items = ref(createItems(10))
      const grid = useExplorerGrid({
        items,
        getId: (item: TestItem) => item.id,
        columnCount: 4,
      })

      const item = grid.getItemById(5)
      expect(item).toEqual({ id: 5, name: 'Item 5' })
    })

    it('should get index by ID', () => {
      const items = ref(createItems(10))
      const grid = useExplorerGrid({
        items,
        getId: (item: TestItem) => item.id,
        columnCount: 4,
      })

      expect(grid.getIndexById(5)).toBe(4)
      expect(grid.getIndexById(999)).toBe(-1)
    })

    it('should get ID by index', () => {
      const items = ref(createItems(10))
      const grid = useExplorerGrid({
        items,
        getId: (item: TestItem) => item.id,
        columnCount: 4,
      })

      expect(grid.getIdByIndex(4)).toBe(5)
      expect(grid.getIdByIndex(999)).toBeUndefined()
    })
  })

  describe('callbacks', () => {
    it('should call onSelectionChange when selection changes', () => {
      const onSelectionChange = vi.fn()
      const items = ref(createItems(10))
      const grid = useExplorerGrid({
        items,
        getId: (item: TestItem) => item.id,
        columnCount: 4,
        onSelectionChange,
      })

      grid.selectOnly(5)
      expect(onSelectionChange).toHaveBeenCalled()
    })

    it('should call onFocusChange when focus changes', () => {
      const onFocusChange = vi.fn()
      const items = ref(createItems(10))
      const grid = useExplorerGrid({
        items,
        getId: (item: TestItem) => item.id,
        columnCount: 4,
        onFocusChange,
      })

      grid.focusById(5)
      expect(onFocusChange).toHaveBeenCalledWith(5)
    })
  })
})
