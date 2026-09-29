import { describe, it, expect } from 'vitest'
import {
  buildGridLayout,
  buildUniformLayout,
  computeSectionRuns,
  scrollTopForItem,
  scrollTopForSection,
  stickyHeaderState,
} from '../../src/layout/gridLayout'
import type { GridLayout, NavigationDirection, SectionKey } from '../../src/types'

const ROW = 100
const GAP = 8
const HH = 36
const RS = ROW + GAP

/** Runs from a list of section sizes, keyed 'A', 'B', ... */
const runsOf = (...sizes: number[]) => {
  let start = 0
  return sizes.map((count, i) => {
    const run = { key: String.fromCharCode(65 + i), start, count }
    start += count
    return run
  })
}

const sectioned = (sizes: number[], cols: number, collapsed: SectionKey[] = []) =>
  buildGridLayout({
    runs: runsOf(...sizes),
    columnCount: cols,
    collapsed: new Set(collapsed),
    headerHeight: HH,
    rowHeight: ROW,
    gap: GAP,
  })

const rowsOf = (layout: GridLayout) => Array.from({ length: layout.rowCount }, (_, i) => layout.getRow(i))

describe('computeSectionRuns', () => {
  it('splits items into consecutive runs', () => {
    const items = ['a', 'a', 'b', 'b', 'b', 'a']
    expect(computeSectionRuns(items, (x) => x)).toEqual([
      { key: 'a', start: 0, count: 2 },
      { key: 'b', start: 2, count: 3 },
      { key: 'a', start: 5, count: 1 },
    ])
  })

  it('returns no runs for no items', () => {
    expect(computeSectionRuns([], (x: string) => x)).toEqual([])
  })
})

describe('buildGridLayout — uniform', () => {
  it('equals the classic index / columnCount row math', () => {
    const n = 10
    const cols = 4
    const layout = buildUniformLayout(n, cols, ROW, GAP)
    expect(layout.sectioned).toBe(false)
    expect(layout.rowCount).toBe(Math.ceil(n / cols))
    expect(layout.totalHeight).toBe(Math.ceil(n / cols) * RS)
    for (let r = 0; r < layout.rowCount; r++) {
      const row = layout.getRow(r)
      expect(row.kind).toBe('items')
      expect(row.key).toBe(r)
      expect(row.start).toBe(r * RS)
      expect(row.height).toBe(RS)
      expect(row.first).toBe(r * cols)
      expect(row.last).toBe(Math.min(n, (r + 1) * cols) - 1)
    }
    for (let i = 0; i < n; i++) expect(layout.rowOfItem(i)).toBe(Math.floor(i / cols))
    expect(layout.headerHeight).toBe(0)
  })

  it('ignores collapsed keys without headers', () => {
    const layout = buildGridLayout({
      runs: [{ key: 0, start: 0, count: 5 }],
      columnCount: 2,
      rowHeight: ROW,
      collapsed: new Set([0]),
      headers: false,
    })
    expect(layout.rowCount).toBe(3)
    expect(layout.rowOfItem(4)).toBe(2)
  })

  it('handles zero items', () => {
    const layout = buildUniformLayout(0, 4, ROW, GAP)
    expect(layout.rowCount).toBe(0)
    expect(layout.firstItem()).toBe(-1)
    expect(layout.navigate(0, 'right')).toBe(-1)
  })
})

describe('buildGridLayout — sections', () => {
  it('puts a header before each section and starts each section on a new row', () => {
    // A: 6 items (rows of 4 + 2), B: 1 item, C: 4 items
    const layout = sectioned([6, 1, 4], 4)
    const rows = rowsOf(layout)
    expect(rows.map((r) => r.kind)).toEqual(['header', 'items', 'items', 'header', 'items', 'header', 'items'])
    expect(rows.map((r) => r.key)).toEqual(['h:A', 'r:A:0', 'r:A:1', 'h:B', 'r:B:0', 'h:C', 'r:C:0'])
    expect(rows.map((r) => [r.first, r.last])).toEqual([
      [-1, -1],
      [0, 3],
      [4, 5],
      [-1, -1],
      [6, 6],
      [-1, -1],
      [7, 10],
    ])
    expect(rows.map((r) => r.start)).toEqual([0, HH, HH + RS, HH + 2 * RS, 2 * HH + 2 * RS, 2 * HH + 3 * RS, 3 * HH + 3 * RS])
    expect(layout.totalHeight).toBe(3 * HH + 4 * RS)
    expect(layout.sections).toEqual([
      { key: 'A', index: 0, start: 0, count: 6 },
      { key: 'B', index: 1, start: 6, count: 1 },
      { key: 'C', index: 2, start: 7, count: 4 },
    ])
  })

  it('gives a collapsed section only its header row', () => {
    const layout = sectioned([6, 1, 4], 4, ['A'])
    const rows = rowsOf(layout)
    expect(rows.map((r) => r.key)).toEqual(['h:A', 'h:B', 'r:B:0', 'h:C', 'r:C:0'])
    for (let i = 0; i < 6; i++) expect(layout.rowOfItem(i)).toBe(-1)
    expect(layout.rowOfItem(6)).toBe(2)
    expect(layout.isCollapsed(0)).toBe(true)
    expect(layout.firstItem()).toBe(6)
  })

  it('handles all sections collapsed', () => {
    const layout = sectioned([3, 3], 2, ['A', 'B'])
    expect(layout.rowCount).toBe(2)
    expect(layout.totalHeight).toBe(2 * HH)
    expect(layout.firstItem()).toBe(-1)
    expect(layout.lastItem()).toBe(-1)
    expect(layout.navigate(0, 'right')).toBe(-1)
  })

  it('row keys are stable when a section above collapses', () => {
    const open = rowsOf(sectioned([6, 5], 4)).filter((r) => r.section.key === 'B').map((r) => r.key)
    const collapsed = rowsOf(sectioned([6, 5], 4, ['A'])).filter((r) => r.section.key === 'B').map((r) => r.key)
    expect(collapsed).toEqual(open)
  })

  it('keeps row keys unique when a key repeats in two runs', () => {
    const layout = buildGridLayout({
      runs: [
        { key: 'x', start: 0, count: 1 },
        { key: 'y', start: 1, count: 1 },
        { key: 'x', start: 2, count: 1 },
      ],
      columnCount: 3,
      rowHeight: ROW,
    })
    const keys = rowsOf(layout).map((r) => r.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('a column change rebuilds the rows', () => {
    const narrow = sectioned([6, 1], 2)
    const wide = sectioned([6, 1], 6)
    expect(narrow.rowCount).toBe(2 + 3 + 1)
    expect(wide.rowCount).toBe(2 + 1 + 1)
    expect(wide.rowOfItem(5)).toBe(1)
  })

  it('an append extends the last run', () => {
    const items = ['a', 'a', 'b']
    const before = buildGridLayout({ runs: computeSectionRuns(items, (x) => x), columnCount: 2, rowHeight: ROW })
    const after = buildGridLayout({
      runs: computeSectionRuns([...items, 'b', 'b'], (x) => x),
      columnCount: 2,
      rowHeight: ROW,
    })
    expect(before.sections).toHaveLength(2)
    expect(after.sections).toHaveLength(2)
    expect(after.sections[1]).toEqual({ key: 'b', index: 1, start: 2, count: 3 })
    expect(after.rowCount).toBe(before.rowCount + 1)
  })

  it('rowAtOffset / sectionAtOffset at boundaries', () => {
    const layout = sectioned([6, 1], 4)
    // rows: h:A [0,36) r:A:0 [36,144) r:A:1 [144,252) h:B [252,288) r:B:0 [288,396)
    expect(layout.rowAtOffset(-10)).toBe(0)
    expect(layout.rowAtOffset(0)).toBe(0)
    expect(layout.rowAtOffset(35.9)).toBe(0)
    expect(layout.rowAtOffset(36)).toBe(1)
    expect(layout.rowAtOffset(251)).toBe(2)
    expect(layout.rowAtOffset(252)).toBe(3)
    expect(layout.rowAtOffset(10_000)).toBe(4)
    expect(layout.sectionAtOffset(251)?.key).toBe('A')
    expect(layout.sectionAtOffset(252)?.key).toBe('B')
    expect(layout.sectionOfItem(6)?.key).toBe('B')
    expect(layout.sectionOfItem(99)).toBeUndefined()
  })

  it('itemAt clamps to the last item of a short row', () => {
    const layout = sectioned([6], 4)
    expect(layout.itemAt(2, 3)).toBe(5)
    expect(layout.itemAt(0, 0)).toBe(-1)
  })
})

describe('navigate', () => {
  describe('uniform equals the classic arithmetic', () => {
    const classic = (i: number, dir: NavigationDirection, cols: number, n: number, rows: number) => {
      switch (dir) {
        case 'left': return Math.max(0, i - 1)
        case 'right': return Math.min(n - 1, i + 1)
        case 'up': return Math.max(0, i - cols)
        case 'down': return Math.min(n - 1, i + cols)
        case 'home': return i - (i % cols)
        case 'end': return Math.min(n - 1, i - (i % cols) + cols - 1)
        case 'home-global': return 0
        case 'end-global': return n - 1
        case 'pageUp': return Math.max(0, i - cols * rows)
        case 'pageDown': return Math.min(n - 1, i + cols * rows)
      }
    }
    const dirs: NavigationDirection[] = [
      'left', 'right', 'up', 'down', 'home', 'end', 'home-global', 'end-global', 'pageUp', 'pageDown',
    ]

    it('matches for every item, direction and page size', () => {
      for (const [n, cols] of [[10, 4], [23, 5], [1, 3], [7, 1]]) {
        const layout = buildUniformLayout(n, cols, ROW, GAP)
        for (const rows of [1, 2, 5]) {
          for (let i = 0; i < n; i++) {
            for (const dir of dirs) {
              expect(layout.navigate(i, dir, rows * RS), `${n}/${cols} i=${i} ${dir} rows=${rows}`).toBe(
                classic(i, dir, cols, n, rows)
              )
            }
          }
        }
      }
    })

    it('starts at the first item when nothing is focused', () => {
      expect(buildUniformLayout(5, 2, ROW).navigate(-1, 'down')).toBe(0)
    })
  })

  describe('with sections', () => {
    // 4 columns. A: 0..5 (rows [0-3], [4-5]); B: 6 (row [6]); C: 7..16 (rows [7-10], [11-14], [15-16])
    const layout = sectioned([6, 1, 10], 4)

    it('left / right cross section boundaries', () => {
      expect(layout.navigate(5, 'right')).toBe(6)
      expect(layout.navigate(6, 'right')).toBe(7)
      expect(layout.navigate(7, 'left')).toBe(6)
      expect(layout.navigate(0, 'left')).toBe(0)
      expect(layout.navigate(16, 'right')).toBe(16)
    })

    it('down keeps the column and clamps into a short row', () => {
      expect(layout.navigate(3, 'down')).toBe(5) // col 3 into [4-5] → 5
      expect(layout.navigate(5, 'down')).toBe(6) // col 1 into [6] → 6
      expect(layout.navigate(6, 'down')).toBe(7) // col 0 into C's first row
      expect(layout.navigate(13, 'down')).toBe(16) // col 2 into [15-16] → 16
      expect(layout.navigate(16, 'down')).toBe(16) // last row → last item
    })

    it('up skips header rows and clamps', () => {
      expect(layout.navigate(10, 'up')).toBe(6) // col 3 into [6]
      expect(layout.navigate(6, 'up')).toBe(4) // col 0 into [4-5]
      expect(layout.navigate(2, 'up')).toBe(0) // first row → first item
    })

    it('home / end stay in the item row', () => {
      expect(layout.navigate(5, 'home')).toBe(4)
      expect(layout.navigate(12, 'end')).toBe(14)
      expect(layout.navigate(15, 'end')).toBe(16)
    })

    it('ctrl+home / ctrl+end go to the first / last visible item', () => {
      expect(layout.navigate(9, 'home-global')).toBe(0)
      expect(layout.navigate(3, 'end-global')).toBe(16)
      const collapsedEnds = sectioned([6, 1, 10], 4, ['A', 'C'])
      expect(collapsedEnds.navigate(6, 'home-global')).toBe(6)
      expect(collapsedEnds.navigate(6, 'end-global')).toBe(6)
    })

    // Row starts: h:A 0, A 36, A 144, h:B 252, B 288, h:C 396, C 432, C 540, C 648
    it('page down lands on the item row within the page, or the next one', () => {
      // From row 1 (y=36), page 216 → y=252 = h:B; previous item row is row 2 (> row 1) → col 1 → 5
      expect(layout.navigate(1, 'pageDown', 216)).toBe(5)
      // From row 2 (y=144), page 150 → y=294 = r:B:0 → 6
      expect(layout.navigate(4, 'pageDown', 150)).toBe(6)
      // From row 4 (y=288), page 110 → y=398 = h:C; previous item row is row 4 (not > 4) → next: C's first row
      expect(layout.navigate(6, 'pageDown', 110)).toBe(7)
      // Past the end → last item
      expect(layout.navigate(0, 'pageDown', 100_000)).toBe(16)
    })

    it('page up lands on the item row within the page, or the previous one', () => {
      // From C row 2 (y=648, item 15) page 400 → y=248 = r:A:1 → col 0 → 4
      expect(layout.navigate(15, 'pageUp', 400)).toBe(4)
      // From C row 0 (y=432, item 8) page 40 → y=392 = r:B:0 (row 4 < 6) → col 1 clamped → 6
      expect(layout.navigate(8, 'pageUp', 40)).toBe(6)
      // Before the start → first item
      expect(layout.navigate(9, 'pageUp', 100_000)).toBe(0)
    })

    it('skips collapsed sections', () => {
      const l = sectioned([6, 1, 10], 4, ['B'])
      expect(l.navigate(5, 'right')).toBe(7)
      expect(l.navigate(7, 'left')).toBe(5)
      expect(l.navigate(5, 'down')).toBe(8) // col 1 of C's first row
      expect(l.navigate(8, 'up')).toBe(5) // col 1 of A's last row
    })

    it('steps out of a hidden current item', () => {
      const l = sectioned([6, 1, 10], 4, ['A'])
      expect(l.navigate(2, 'down')).toBe(6)
      const last = sectioned([6, 1, 10], 4, ['C'])
      expect(last.navigate(9, 'up')).toBe(6)
    })
  })
})

describe('scrollTopForItem', () => {
  const layout = sectioned([6, 1, 10], 4)
  const margin = GAP // no header slot

  it('uniform auto matches the classic rule', () => {
    const u = buildUniformLayout(100, 4, ROW, GAP)
    // row 10 → top = 10*108 + 8 = 1088
    expect(scrollTopForItem(u, 40, 'auto', { scrollTop: 0, viewportHeight: 500, margin })).toBe(1088 + ROW - 500)
    expect(scrollTopForItem(u, 40, 'auto', { scrollTop: 2000, viewportHeight: 500, margin })).toBe(1088)
    expect(scrollTopForItem(u, 40, 'auto', { scrollTop: 1000, viewportHeight: 500, margin })).toBeNull()
    expect(scrollTopForItem(u, 40, 'start', { scrollTop: 0, viewportHeight: 500, margin })).toBe(1088)
    expect(scrollTopForItem(u, 40, 'center', { scrollTop: 0, viewportHeight: 500, margin })).toBe(1088 - 200)
    expect(scrollTopForItem(u, 40, 'end', { scrollTop: 0, viewportHeight: 500, margin })).toBe(1088 + ROW - 500)
  })

  it('treats an item under the pinned header as hidden', () => {
    // item 8 is in C's first row: start 432 + margin 8 = 440
    const opts = { viewportHeight: 500, margin, stickyHeight: HH }
    expect(scrollTopForItem(layout, 8, 'auto', { ...opts, scrollTop: 430 })).toBe(440 - HH)
    expect(scrollTopForItem(layout, 8, 'auto', { ...opts, scrollTop: 440 - HH })).toBeNull()
    // without sticky headers the same scrollTop leaves it alone
    expect(scrollTopForItem(layout, 8, 'auto', { viewportHeight: 500, margin, scrollTop: 430 })).toBeNull()
  })

  it('returns null for an item in a collapsed section', () => {
    const l = sectioned([6, 1, 10], 4, ['A'])
    expect(scrollTopForItem(l, 0, 'start', { scrollTop: 0, viewportHeight: 500, margin })).toBeNull()
  })
})

describe('scrollTopForSection', () => {
  it('puts the header row at the top', () => {
    const layout = sectioned([6, 1, 10], 4)
    expect(scrollTopForSection(layout, 'C', 'start', { scrollTop: 0, viewportHeight: 300, margin: 8 })).toBe(396 + 8)
    expect(scrollTopForSection(layout, 'nope', 'start', { scrollTop: 0, viewportHeight: 300, margin: 8 })).toBeNull()
  })
})

describe('stickyHeaderState', () => {
  const layout = sectioned([6, 1, 10], 4)
  // h:A 0, h:B 252, h:C 396

  it('is hidden at the top and without sections', () => {
    expect(stickyHeaderState(layout, 0)).toBeNull()
    expect(stickyHeaderState(buildUniformLayout(10, 2, ROW), 500)).toBeNull()
  })

  it('pins the current section', () => {
    expect(stickyHeaderState(layout, 100)).toEqual({ section: layout.sections[0], offset: 0 })
    expect(stickyHeaderState(layout, 300)).toEqual({ section: layout.sections[1], offset: 0 })
  })

  it('is pushed out by the next header', () => {
    // next header B at 252; at y=230 the distance is 22 → pushed up 14
    expect(stickyHeaderState(layout, 230)).toEqual({ section: layout.sections[0], offset: HH - 22 })
    // exactly at the boundary the real header of B is at the top → hidden
    expect(stickyHeaderState(layout, 252)).toBeNull()
  })
})

describe('performance', () => {
  it('builds 100k items / 500 sections at 5 columns in < 10 ms', () => {
    const items = Array.from({ length: 100_000 }, (_, i) => ({ id: i, month: Math.floor(i / 200) }))
    const build = () =>
      buildGridLayout({
        runs: computeSectionRuns(items, (x) => x.month),
        columnCount: 5,
        rowHeight: ROW,
        gap: GAP,
        headerHeight: HH,
      })
    build() // warm up the JIT
    let best = Infinity
    for (let k = 0; k < 5; k++) {
      const t0 = performance.now()
      const layout = build()
      best = Math.min(best, performance.now() - t0)
      expect(layout.sections).toHaveLength(500)
      expect(layout.rowCount).toBe(500 + 500 * 40)
    }
    expect(best).toBeLessThan(10)
  })
})
