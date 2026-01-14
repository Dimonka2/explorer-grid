import { describe, it, expect, vi } from 'vitest'
import { useSelection } from '../../src/composables/useSelection'

describe('useSelection', () => {
  describe('single mode', () => {
    it('should select a single item', () => {
      const { selectedIds, selectOnly } = useSelection({ mode: 'single' })

      selectOnly('item-1')
      expect(selectedIds.value.has('item-1')).toBe(true)
      expect(selectedIds.value.size).toBe(1)
    })

    it('should replace selection when selecting another item', () => {
      const { selectedIds, selectOnly } = useSelection({ mode: 'single' })

      selectOnly('item-1')
      selectOnly('item-2')

      expect(selectedIds.value.has('item-1')).toBe(false)
      expect(selectedIds.value.has('item-2')).toBe(true)
      expect(selectedIds.value.size).toBe(1)
    })

    it('should toggle correctly in single mode', () => {
      const { selectedIds, toggle } = useSelection({ mode: 'single' })

      toggle('item-1')
      expect(selectedIds.value.has('item-1')).toBe(true)

      toggle('item-1')
      expect(selectedIds.value.has('item-1')).toBe(false)
    })
  })

  describe('multiple mode', () => {
    it('should allow multiple selections', () => {
      const { selectedIds, select } = useSelection({ mode: 'multiple' })

      select('item-1')
      select('item-2')
      select('item-3')

      expect(selectedIds.value.size).toBe(3)
      expect(selectedIds.value.has('item-1')).toBe(true)
      expect(selectedIds.value.has('item-2')).toBe(true)
      expect(selectedIds.value.has('item-3')).toBe(true)
    })

    it('should toggle items independently', () => {
      const { selectedIds, toggle } = useSelection({ mode: 'multiple' })

      toggle('item-1')
      toggle('item-2')
      expect(selectedIds.value.size).toBe(2)

      toggle('item-1')
      expect(selectedIds.value.size).toBe(1)
      expect(selectedIds.value.has('item-1')).toBe(false)
      expect(selectedIds.value.has('item-2')).toBe(true)
    })

    it('should select range of items', () => {
      const { selectedIds, selectRange } = useSelection({ mode: 'multiple' })

      selectRange(['a', 'b', 'c', 'd'])

      expect(selectedIds.value.size).toBe(4)
      expect(Array.from(selectedIds.value)).toEqual(['a', 'b', 'c', 'd'])
    })

    it('should select all items', () => {
      const { selectedIds, selectAll } = useSelection({ mode: 'multiple' })

      selectAll(['1', '2', '3', '4', '5'])

      expect(selectedIds.value.size).toBe(5)
    })
  })

  describe('none mode', () => {
    it('should not allow any selection', () => {
      const { selectedIds, select, selectOnly, toggle } = useSelection({ mode: 'none' })

      select('item-1')
      expect(selectedIds.value.size).toBe(0)

      selectOnly('item-2')
      expect(selectedIds.value.size).toBe(0)

      toggle('item-3')
      expect(selectedIds.value.size).toBe(0)
    })
  })

  describe('callbacks', () => {
    it('should call onSelectionChange when selection changes', () => {
      const onSelectionChange = vi.fn()
      const { selectOnly } = useSelection({ mode: 'multiple', onSelectionChange })

      selectOnly('item-1')
      expect(onSelectionChange).toHaveBeenCalledTimes(1)
      expect(onSelectionChange).toHaveBeenCalledWith(expect.any(Set))
    })
  })

  describe('anchor', () => {
    it('should set and get anchor', () => {
      const { anchorId, setAnchor } = useSelection({ mode: 'multiple' })

      expect(anchorId.value).toBe(null)

      setAnchor('item-1')
      expect(anchorId.value).toBe('item-1')

      setAnchor(null)
      expect(anchorId.value).toBe(null)
    })
  })

  describe('clear', () => {
    it('should clear all selections', () => {
      const { selectedIds, select, clear } = useSelection({ mode: 'multiple' })

      select('item-1')
      select('item-2')
      expect(selectedIds.value.size).toBe(2)

      clear()
      expect(selectedIds.value.size).toBe(0)
    })
  })

  describe('isSelected', () => {
    it('should return correct selection state', () => {
      const { isSelected, select } = useSelection({ mode: 'multiple' })

      expect(isSelected('item-1')).toBe(false)

      select('item-1')
      expect(isSelected('item-1')).toBe(true)
      expect(isSelected('item-2')).toBe(false)
    })
  })
})
