import { describe, it, expect } from 'vitest'
import { ref, computed } from 'vue'
import { useFocus } from '../../src/composables/useFocus'
import { useExplorerGrid } from '../../src/composables/useExplorerGrid'
import { useUniformLayout } from '../../src/composables/useUniformLayout'
import { buildGridLayout, computeSectionRuns } from '../../src/layout/gridLayout'
import type { SectionKey } from '../../src/types'

interface Item {
  id: number
  name: string
  month: string
}

// A: ids 1-6, B: id 7, C: ids 8-17
const makeItems = (): Item[] => [
  ...Array.from({ length: 6 }, (_, i) => ({ id: i + 1, name: `a${i + 1}`, month: 'A' })),
  { id: 7, name: 'b7', month: 'B' },
  ...Array.from({ length: 10 }, (_, i) => ({ id: i + 8, name: `c${i + 8}`, month: 'C' })),
]

const setup = (collapsedKeys: SectionKey[] = []) => {
  const items = ref(makeItems())
  const collapsed = ref(new Set<SectionKey>(collapsedKeys))
  const layout = computed(() =>
    buildGridLayout({
      runs: computeSectionRuns(items.value, (x) => x.month),
      columnCount: 4,
      collapsed: collapsed.value,
      headerHeight: 36,
      rowHeight: 100,
      gap: 8,
    })
  )
  const grid = useExplorerGrid({
    items,
    getId: (x: Item) => x.id,
    getLabel: (x: Item) => x.name,
    columnCount: 4,
    layout,
  })
  return { items, collapsed, layout, grid }
}

/** A keydown event with a real target (handleKeydown inspects e.target). */
const key = (k: string, extra: Partial<KeyboardEventInit> = {}) => {
  const e = new KeyboardEvent('keydown', { key: k, ...extra })
  Object.defineProperty(e, 'target', { value: document.createElement('div') })
  return e
}

describe('useFocus with a layout', () => {
  it('navigates through the layout', () => {
    const items = ref(makeItems())
    const layout = computed(() =>
      buildGridLayout({ runs: computeSectionRuns(items.value, (x) => x.month), columnCount: 4, rowHeight: 100 })
    )
    const focus = useFocus({ items, getId: (x) => x.id, layout })
    focus.setFocusByIndex(3)
    focus.moveFocus('down')
    expect(focus.focusedIndex.value).toBe(5) // clamped into the short row
    focus.moveFocus('down')
    expect(focus.focusedIndex.value).toBe(6) // into section B
  })

  it('useUniformLayout matches the default navigation', () => {
    const items = ref(makeItems())
    const layout = useUniformLayout({ items, columnCount: 4 })
    const withLayout = useFocus({ items, getId: (x) => x.id, layout })
    const classic = useFocus({ items, getId: (x) => x.id, columnCount: ref(4) })
    withLayout.setFocusByIndex(1)
    classic.setFocusByIndex(1)
    for (const dir of ['down', 'down', 'end', 'up', 'pageDown', 'left'] as const) {
      withLayout.moveFocus(dir, 2)
      classic.moveFocus(dir, 2)
      expect(withLayout.focusedIndex.value).toBe(classic.focusedIndex.value)
    }
  })
})

describe('useExplorerGrid with sections', () => {
  it('arrow keys cross sections and skip collapsed ones', () => {
    const { grid } = setup(['B'])
    grid.focusById(6)
    grid.handleKeydown(key('ArrowRight'))
    expect(grid.focusedId.value).toBe(8)
    grid.handleKeydown(key('ArrowLeft'))
    expect(grid.focusedId.value).toBe(6)
  })

  it('shift ranges exclude items in collapsed sections', () => {
    const { grid } = setup(['B'])
    grid.focusById(5)
    grid.selectOnly(5)
    grid.handleKeydown(key('ArrowRight', { shiftKey: true })) // 6
    grid.handleKeydown(key('ArrowRight', { shiftKey: true })) // 8, skipping 7
    expect([...grid.selectedIds.value].sort((a, b) => Number(a) - Number(b))).toEqual([5, 6, 8])
  })

  it('shift+click ranges exclude items in collapsed sections', () => {
    const { grid } = setup(['B'])
    grid.selectOnly(6)
    grid.handlePointerDown(new PointerEvent('pointerdown', { shiftKey: true }) as PointerEvent, {
      type: 'item',
      itemId: 9,
      index: 8,
    })
    expect([...grid.selectedIds.value].sort((a, b) => Number(a) - Number(b))).toEqual([6, 8, 9])
  })

  it('ctrl+A selects all items, collapsed sections included', () => {
    const { grid, items } = setup(['A', 'C'])
    grid.handleKeydown(key('a', { ctrlKey: true }))
    expect(grid.selectedIds.value.size).toBe(items.value.length)
  })

  it('typeahead only matches visible items', () => {
    const { grid } = setup(['B'])
    grid.focusById(1)
    grid.handleKeydown(key('b'))
    expect(grid.focusedId.value).toBe(1) // b7 is hidden
  })

  it('page down uses the pixel page size', () => {
    const { grid } = setup()
    ;(grid as unknown as { _setPageSize: (n: number) => void })._setPageSize(216)
    grid.focusById(2) // row 1 (y=36), col 1
    grid.handleKeydown(key('PageDown')) // y=252 = header B → last row of A within the page
    expect(grid.focusedId.value).toBe(6)
  })

  it('a section header hit does not touch the selection', () => {
    const { grid } = setup()
    grid.selectOnly(3)
    grid.handlePointerDown(new PointerEvent('pointerdown') as PointerEvent, { type: 'section-header' })
    expect([...grid.selectedIds.value]).toEqual([3])
  })
})
