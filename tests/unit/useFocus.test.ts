import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useFocus } from '../../src/composables/useFocus'

describe('useFocus', () => {
  const createItems = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }))

  const getId = (item: { id: number }) => item.id

  describe('basic focus', () => {
    it('should start with no focus', () => {
      const items = ref(createItems(10))
      const columnCount = ref(4)
      const { focusedId, focusedIndex } = useFocus({ items, getId, columnCount })

      expect(focusedId.value).toBe(null)
      expect(focusedIndex.value).toBe(-1)
    })

    it('should set focus by id', () => {
      const items = ref(createItems(10))
      const columnCount = ref(4)
      const { focusedId, focusedIndex, setFocusById } = useFocus({ items, getId, columnCount })

      setFocusById(5)
      expect(focusedId.value).toBe(5)
      expect(focusedIndex.value).toBe(4) // 0-indexed
    })

    it('should set focus by index', () => {
      const items = ref(createItems(10))
      const columnCount = ref(4)
      const { focusedId, focusedIndex, setFocusByIndex } = useFocus({ items, getId, columnCount })

      setFocusByIndex(3)
      expect(focusedId.value).toBe(4) // id is 1-indexed
      expect(focusedIndex.value).toBe(3)
    })

    it('should clear focus', () => {
      const items = ref(createItems(10))
      const columnCount = ref(4)
      const { focusedId, setFocusById, clearFocus } = useFocus({ items, getId, columnCount })

      setFocusById(5)
      clearFocus()
      expect(focusedId.value).toBe(null)
    })
  })

  describe('navigation', () => {
    // Grid layout with 4 columns, 10 items:
    // [1] [2] [3] [4]
    // [5] [6] [7] [8]
    // [9] [10]

    it('should move right', () => {
      const items = ref(createItems(10))
      const columnCount = ref(4)
      const { focusedId, setFocusByIndex, moveFocus } = useFocus({ items, getId, columnCount })

      setFocusByIndex(0) // Item 1
      moveFocus('right')
      expect(focusedId.value).toBe(2)
    })

    it('should move left', () => {
      const items = ref(createItems(10))
      const columnCount = ref(4)
      const { focusedId, setFocusByIndex, moveFocus } = useFocus({ items, getId, columnCount })

      setFocusByIndex(2) // Item 3
      moveFocus('left')
      expect(focusedId.value).toBe(2)
    })

    it('should move down', () => {
      const items = ref(createItems(10))
      const columnCount = ref(4)
      const { focusedId, setFocusByIndex, moveFocus } = useFocus({ items, getId, columnCount })

      setFocusByIndex(1) // Item 2
      moveFocus('down')
      expect(focusedId.value).toBe(6) // Item at index 5
    })

    it('should move up', () => {
      const items = ref(createItems(10))
      const columnCount = ref(4)
      const { focusedId, setFocusByIndex, moveFocus } = useFocus({ items, getId, columnCount })

      setFocusByIndex(5) // Item 6
      moveFocus('up')
      expect(focusedId.value).toBe(2)
    })

    it('should not move left past first item', () => {
      const items = ref(createItems(10))
      const columnCount = ref(4)
      const { focusedIndex, setFocusByIndex, moveFocus } = useFocus({ items, getId, columnCount })

      setFocusByIndex(0)
      moveFocus('left')
      expect(focusedIndex.value).toBe(0)
    })

    it('should not move right past last item', () => {
      const items = ref(createItems(10))
      const columnCount = ref(4)
      const { focusedIndex, setFocusByIndex, moveFocus } = useFocus({ items, getId, columnCount })

      setFocusByIndex(9) // Last item
      moveFocus('right')
      expect(focusedIndex.value).toBe(9)
    })

    it('should move to start of row with home', () => {
      const items = ref(createItems(10))
      const columnCount = ref(4)
      const { focusedIndex, setFocusByIndex, moveFocus } = useFocus({ items, getId, columnCount })

      setFocusByIndex(6) // Item 7 (row 2, col 3)
      moveFocus('home')
      expect(focusedIndex.value).toBe(4) // First item of row 2
    })

    it('should move to end of row with end', () => {
      const items = ref(createItems(10))
      const columnCount = ref(4)
      const { focusedIndex, setFocusByIndex, moveFocus } = useFocus({ items, getId, columnCount })

      setFocusByIndex(4) // Item 5 (row 2, col 1)
      moveFocus('end')
      expect(focusedIndex.value).toBe(7) // Last item of row 2
    })

    it('should move to first item with home-global', () => {
      const items = ref(createItems(10))
      const columnCount = ref(4)
      const { focusedIndex, setFocusByIndex, moveFocus } = useFocus({ items, getId, columnCount })

      setFocusByIndex(7)
      moveFocus('home-global')
      expect(focusedIndex.value).toBe(0)
    })

    it('should move to last item with end-global', () => {
      const items = ref(createItems(10))
      const columnCount = ref(4)
      const { focusedIndex, setFocusByIndex, moveFocus } = useFocus({ items, getId, columnCount })

      setFocusByIndex(0)
      moveFocus('end-global')
      expect(focusedIndex.value).toBe(9)
    })

    it('should handle pageDown', () => {
      const items = ref(createItems(100))
      const columnCount = ref(4)
      const { focusedIndex, setFocusByIndex, moveFocus } = useFocus({ items, getId, columnCount })

      setFocusByIndex(0)
      moveFocus('pageDown', 5) // 5 visible rows
      expect(focusedIndex.value).toBe(20) // 4 cols * 5 rows
    })

    it('should handle pageUp', () => {
      const items = ref(createItems(100))
      const columnCount = ref(4)
      const { focusedIndex, setFocusByIndex, moveFocus } = useFocus({ items, getId, columnCount })

      setFocusByIndex(40)
      moveFocus('pageUp', 5)
      expect(focusedIndex.value).toBe(20)
    })
  })

  describe('callbacks', () => {
    it('should call onFocusChange when focus changes', () => {
      const items = ref(createItems(10))
      const columnCount = ref(4)
      const onFocusChange = vi.fn()
      const { setFocusById } = useFocus({ items, getId, columnCount, onFocusChange })

      setFocusById(5)
      expect(onFocusChange).toHaveBeenCalledWith(5)
    })
  })
})
