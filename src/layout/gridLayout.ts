import type {
  BuildGridLayoutOptions,
  GridLayout,
  GridLayoutRow,
  GridRowKind,
  GridSection,
  NavigationDirection,
  SectionKey,
  SectionRun,
} from '../types'

const KIND_ITEMS = 0
const KIND_HEADER = 1

export const DEFAULT_SECTION_HEADER_HEIGHT = 36

/**
 * Split items into consecutive runs of equal section key. One O(n) pass; the
 * grid never sorts, so a key that reappears later starts a new run.
 */
export function computeSectionRuns<T>(items: readonly T[], sectionKey: (item: T) => SectionKey): SectionRun[] {
  const runs: SectionRun[] = []
  let current: SectionRun | null = null
  for (let i = 0; i < items.length; i++) {
    const key = sectionKey(items[i])
    if (current !== null && current.key === key) {
      current.count++
    } else {
      current = { key, start: i, count: 1 }
      runs.push(current)
    }
  }
  return runs
}

/**
 * Build the row layout of a (possibly sectioned) grid. Pure: the same inputs
 * always give the same rows, starts and keys.
 */
export function buildGridLayout(options: BuildGridLayoutOptions): GridLayout {
  const {
    runs,
    collapsed,
    headerHeight = DEFAULT_SECTION_HEADER_HEIGHT,
    rowHeight,
    gap = 0,
    headers = true,
  } = options
  const columnCount = Math.max(1, Math.floor(options.columnCount) || 1)
  const itemRowSize = rowHeight + gap

  // Sections (non-empty runs only)
  const sections: GridSection[] = []
  let itemCount = 0
  for (const run of runs) {
    if (run.count <= 0) continue
    sections.push({ key: run.key, index: sections.length, start: run.start, count: run.count })
    itemCount = Math.max(itemCount, run.start + run.count)
  }
  const sectionCount = sections.length

  const sectionCollapsed = new Uint8Array(sectionCount)
  if (headers && collapsed && collapsed.size > 0) {
    for (let s = 0; s < sectionCount; s++) {
      if (collapsed.has(sections[s].key)) sectionCollapsed[s] = 1
    }
  }

  // Row count
  let rowCount = 0
  for (let s = 0; s < sectionCount; s++) {
    if (headers) rowCount++
    if (!sectionCollapsed[s]) rowCount += Math.ceil(sections[s].count / columnCount)
  }

  const rowKind = new Uint8Array(rowCount)
  const rowSection = new Int32Array(rowCount)
  const rowFirst = new Int32Array(rowCount)
  const rowLast = new Int32Array(rowCount)
  const rowInSection = new Int32Array(rowCount)
  const rowStartArr = new Float64Array(rowCount + 1)
  const rowOfItemArr = new Int32Array(itemCount).fill(-1)
  const sectionHeaderRow = new Int32Array(sectionCount).fill(-1)

  // Row keys must stay unique even if a consumer repeats a key in two runs.
  const keySuffix: string[] = new Array(sectionCount)
  const seenKeys = new Map<SectionKey, number>()
  for (let s = 0; s < sectionCount; s++) {
    const key = sections[s].key
    const seen = seenKeys.get(key) ?? 0
    seenKeys.set(key, seen + 1)
    keySuffix[s] = seen === 0 ? String(key) : `${String(key)}~${seen}`
  }

  let r = 0
  let y = 0
  for (let s = 0; s < sectionCount; s++) {
    const section = sections[s]
    if (headers) {
      rowKind[r] = KIND_HEADER
      rowSection[r] = s
      rowFirst[r] = -1
      rowLast[r] = -1
      rowStartArr[r] = y
      sectionHeaderRow[s] = r
      y += headerHeight
      r++
    }
    if (sectionCollapsed[s]) continue
    const end = section.start + section.count
    let inSection = 0
    for (let first = section.start; first < end; first += columnCount) {
      const last = Math.min(end, first + columnCount) - 1
      rowKind[r] = KIND_ITEMS
      rowSection[r] = s
      rowFirst[r] = first
      rowLast[r] = last
      rowInSection[r] = inSection++
      rowStartArr[r] = y
      for (let i = first; i <= last; i++) rowOfItemArr[i] = r
      y += itemRowSize
      r++
    }
  }
  rowStartArr[rowCount] = y
  const totalHeight = y

  // Section lookup by item index (binary search over starts)
  const sectionIndexOfItem = (index: number): number => {
    let lo = 0
    let hi = sectionCount - 1
    let found = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (sections[mid].start <= index) {
        found = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    if (found < 0) return -1
    const sec = sections[found]
    return index < sec.start + sec.count ? found : -1
  }

  const rowOfItem = (index: number): number => (index >= 0 && index < itemCount ? rowOfItemArr[index] : -1)
  const inRange = (row: number) => row >= 0 && row < rowCount
  const rowStart = (row: number): number => rowStartArr[Math.max(0, Math.min(rowCount, row))]
  const rowHeightAt = (row: number): number =>
    inRange(row) ? (rowKind[row] === KIND_HEADER ? headerHeight : itemRowSize) : 0
  const rowKindOf = (row: number): GridRowKind => (rowKind[row] === KIND_HEADER ? 'header' : 'items')

  const rowKey = (row: number): string | number => {
    if (!headers) return row
    const s = rowSection[row]
    return rowKind[row] === KIND_HEADER ? `h:${keySuffix[s]}` : `r:${keySuffix[s]}:${rowInSection[row]}`
  }

  const getRow = (row: number): GridLayoutRow => ({
    index: row,
    kind: rowKindOf(row),
    key: rowKey(row),
    start: rowStartArr[row],
    height: rowHeightAt(row),
    section: sections[rowSection[row]],
    first: rowFirst[row],
    last: rowLast[row],
  })

  const itemAt = (row: number, col: number): number => {
    if (!inRange(row) || rowKind[row] === KIND_HEADER) return -1
    return Math.min(rowFirst[row] + Math.max(0, col), rowLast[row])
  }

  const rowAtOffset = (offset: number): number => {
    if (rowCount === 0) return -1
    let lo = 0
    let hi = rowCount - 1
    let found = 0
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (rowStartArr[mid] <= offset) {
        found = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    return found
  }

  const sectionAtOffset = (offset: number): GridSection | undefined => {
    const row = rowAtOffset(offset)
    return row < 0 ? undefined : sections[rowSection[row]]
  }

  const nextItemRow = (row: number): number => {
    for (let i = row + 1; i < rowCount; i++) if (rowKind[i] === KIND_ITEMS) return i
    return -1
  }
  const prevItemRow = (row: number): number => {
    for (let i = row - 1; i >= 0; i--) if (rowKind[i] === KIND_ITEMS) return i
    return -1
  }

  const firstItem = (): number => {
    const row = nextItemRow(-1)
    return row < 0 ? -1 : rowFirst[row]
  }
  const lastItem = (): number => {
    const row = prevItemRow(rowCount)
    return row < 0 ? -1 : rowLast[row]
  }

  /** Next visible item after `index` (skips collapsed sections), or -1. */
  const nextVisibleItem = (index: number): number => {
    let i = index + 1
    while (i < itemCount) {
      if (rowOfItemArr[i] >= 0) return i
      const s = sectionIndexOfItem(i)
      i = s < 0 ? i + 1 : sections[s].start + sections[s].count
    }
    return -1
  }
  /** Previous visible item before `index`, or -1. */
  const prevVisibleItem = (index: number): number => {
    let i = index - 1
    while (i >= 0) {
      if (rowOfItemArr[i] >= 0) return i
      const s = sectionIndexOfItem(i)
      i = s < 0 ? i - 1 : sections[s].start - 1
    }
    return -1
  }

  const navigate = (index: number, direction: NavigationDirection, page?: number): number => {
    if (itemCount === 0) return -1
    const first = firstItem()
    if (first < 0) return -1
    if (index < 0 || index >= itemCount) return first

    const row = rowOfItemArr[index]
    if (row < 0) {
      // Current item is hidden in a collapsed section: step out to the nearest visible item.
      const next = nextVisibleItem(index)
      return next >= 0 ? next : prevVisibleItem(index)
    }
    const col = index - rowFirst[row]
    const pageSize = page ?? 5 * itemRowSize

    switch (direction) {
      case 'left': {
        const prev = prevVisibleItem(index)
        return prev >= 0 ? prev : index
      }
      case 'right': {
        const next = nextVisibleItem(index)
        return next >= 0 ? next : index
      }
      case 'up': {
        const target = prevItemRow(row)
        return target < 0 ? first : itemAt(target, col)
      }
      case 'down': {
        const target = nextItemRow(row)
        return target < 0 ? lastItem() : itemAt(target, col)
      }
      case 'home':
        return rowFirst[row]
      case 'end':
        return rowLast[row]
      case 'home-global':
        return first
      case 'end-global':
        return lastItem()
      case 'pageDown': {
        const y = rowStartArr[row] + pageSize
        if (y >= totalHeight) return lastItem()
        let target = rowAtOffset(y)
        if (rowKind[target] === KIND_HEADER) {
          // Prefer the item row still within the page, but always move at least one row.
          const before = prevItemRow(target)
          target = before > row ? before : nextItemRow(target)
        } else if (target <= row) {
          target = nextItemRow(row)
        }
        return target < 0 ? lastItem() : itemAt(target, col)
      }
      case 'pageUp': {
        const y = rowStartArr[row] - pageSize
        if (y < 0) return first
        let target = rowAtOffset(y)
        if (rowKind[target] === KIND_HEADER) {
          const after = nextItemRow(target)
          target = after >= 0 && after < row ? after : prevItemRow(target)
        } else if (target >= row) {
          target = prevItemRow(row)
        }
        return target < 0 ? first : itemAt(target, col)
      }
      default:
        return index
    }
  }

  return {
    sectioned: headers,
    sections,
    itemCount,
    rowCount,
    columnCount,
    rowHeight,
    gap,
    headerHeight: headers ? headerHeight : 0,
    totalHeight,
    getRow,
    rowStart,
    rowHeightAt,
    rowKind: rowKindOf,
    rowOfItem,
    itemAt,
    rowAtOffset,
    sectionAtOffset,
    sectionOfItem: (index) => {
      const s = sectionIndexOfItem(index)
      return s < 0 ? undefined : sections[s]
    },
    sectionByKey: (key) => sections.find((s) => s.key === key),
    headerRowOf: (sectionIndex) =>
      sectionIndex >= 0 && sectionIndex < sectionCount ? sectionHeaderRow[sectionIndex] : -1,
    isCollapsed: (sectionIndex) => sectionCollapsed[sectionIndex] === 1,
    firstItem,
    lastItem,
    navigate,
  }
}

/**
 * The layout of a grid without sections: one implicit section, no header row.
 * Rows, starts and keys equal the classic `index / columnCount` grid.
 */
export function buildUniformLayout(itemCount: number, columnCount: number, rowHeight: number, gap = 0): GridLayout {
  return buildGridLayout({
    runs: itemCount > 0 ? [{ key: 0, start: 0, count: itemCount }] : [],
    columnCount,
    rowHeight,
    gap,
    headers: false,
  })
}

export type ScrollAlign = 'start' | 'center' | 'end' | 'auto'

export interface ScrollTargetOptions {
  /** Current scrollTop of the container. */
  scrollTop: number
  /** Container client height. */
  viewportHeight: number
  /** Offset of the first row in the scroll content (header slot + leading gap). */
  margin: number
  /** Height covered at the top by a pinned section header (0 when none). */
  stickyHeight?: number
}

/**
 * The scrollTop that brings an item into view, or `null` when no scroll is
 * needed (or the item is hidden in a collapsed section).
 */
export function scrollTopForItem(
  layout: GridLayout,
  index: number,
  align: ScrollAlign,
  options: ScrollTargetOptions
): number | null {
  const row = layout.rowOfItem(index)
  if (row < 0) return null
  const { scrollTop, viewportHeight, margin, stickyHeight = 0 } = options
  const itemTop = layout.rowStart(row) + margin
  const itemBottom = itemTop + layout.rowHeight

  switch (align) {
    case 'auto':
      if (itemTop < scrollTop + stickyHeight) return itemTop - stickyHeight
      if (itemBottom > scrollTop + viewportHeight) return itemBottom - viewportHeight
      return null
    case 'start':
      return itemTop - stickyHeight
    case 'center':
      return itemTop - (viewportHeight - layout.rowHeight) / 2
    case 'end':
      return itemBottom - viewportHeight
  }
}

/** The scrollTop that puts a section's header row at the top (or `null`). */
export function scrollTopForSection(
  layout: GridLayout,
  key: SectionKey,
  align: ScrollAlign,
  options: ScrollTargetOptions
): number | null {
  const section = layout.sectionByKey(key)
  if (!section) return null
  const headerRow = layout.headerRowOf(section.index)
  const row = headerRow >= 0 ? headerRow : layout.rowOfItem(section.start)
  if (row < 0) return null
  const { scrollTop, viewportHeight, margin } = options
  const top = layout.rowStart(row) + margin
  const bottom = top + layout.rowHeightAt(row)
  switch (align) {
    case 'auto':
      if (top < scrollTop) return top
      if (bottom > scrollTop + viewportHeight) return bottom - viewportHeight
      return null
    case 'start':
      return top
    case 'center':
      return top - (viewportHeight - layout.rowHeightAt(row)) / 2
    case 'end':
      return bottom - viewportHeight
  }
}

export interface StickyHeaderState {
  section: GridSection
  /** Upward shift in px while the next header pushes this one out (>= 0). */
  offset: number
}

/**
 * Which section header is pinned at content offset `y` (relative to the first
 * row), and how far the next header has pushed it up. `null` when nothing is
 * pinned: no sections, or the current section's own header is at or below the top.
 */
export function stickyHeaderState(layout: GridLayout, y: number): StickyHeaderState | null {
  if (!layout.sectioned || layout.rowCount === 0 || y <= 0) return null
  const section = layout.sectionAtOffset(y)
  if (!section) return null
  const headerRow = layout.headerRowOf(section.index)
  if (headerRow < 0 || layout.rowStart(headerRow) >= y) return null
  let offset = 0
  const nextHeaderRow = layout.headerRowOf(section.index + 1)
  if (nextHeaderRow >= 0) {
    const distance = layout.rowStart(nextHeaderRow) - y
    if (distance < layout.headerHeight) offset = layout.headerHeight - distance
  }
  return { section, offset }
}
