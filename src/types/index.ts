import type { Ref, ComputedRef } from 'vue'

// Core types
export type ItemId = string | number

// Base type for grid items - use with your own interface
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ExplorerGridItem {}

export interface GridPosition {
  row: number
  col: number
}

export interface GridDimensions {
  columnCount: number
  rowCount: number
  itemWidth: number
  itemHeight: number
  gap: number
}

// Selection types
export type SelectionMode = 'single' | 'multiple' | 'none'

export interface SelectionState {
  focusedId: ItemId | null
  anchorId: ItemId | null
  selectedIds: Set<ItemId>
}

// Navigation types
export type NavigationDirection =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'home'
  | 'end'
  | 'pageUp'
  | 'pageDown'
  | 'home-global'
  | 'end-global'

// Hit testing
export interface HitTestResult {
  /** 'section-header' hits are ignored by the pointer logic (no selection change, no marquee). */
  type: 'item' | 'empty' | 'section-header'
  itemId?: ItemId
  index?: number
}

// Marquee
export interface MarqueeRect {
  startX: number
  startY: number
  endX: number
  endY: number
}

// Virtualization
export interface VirtualItem {
  index: number
  columnIndex: number
}

export interface VirtualRow {
  index: number
  start: number
  size: number
  items: VirtualItem[]
  /** Stable row key (see GridLayoutRow.key). */
  key: string | number
  kind: GridRowKind
  section: GridSection
}

// Composable options
export interface UseExplorerGridOptions<T extends ExplorerGridItem> {
  items: Ref<T[]> | ComputedRef<T[]>
  getId: (item: T) => ItemId
  getLabel?: (item: T) => string
  columnCount: number | Ref<number> | (() => number)
  /** Row layout used for navigation. Default: a uniform grid over items and columnCount. */
  layout?: Ref<GridLayout>

  // Feature flags
  // selectionMode: 'none' = no selection, 'single' = one item, 'multiple' = multi-select
  selectionMode?: SelectionMode
  marqueeEnabled?: boolean
  typeaheadEnabled?: boolean
  // selectOnFocus: automatically select item when focused via keyboard (Explorer-like)
  selectOnFocus?: boolean
  clearSelectionOnEmptyClick?: boolean
  // rightClickSelect: select item on right-click if not already selected
  rightClickSelect?: boolean

  // Callbacks
  onOpen?: (id: ItemId, item: T) => void
  onSelectionChange?: (ids: Set<ItemId>) => void
  onFocusChange?: (id: ItemId | null) => void
}

// Composable return type
export interface UseExplorerGridReturn<T extends ExplorerGridItem> {
  // State
  focusedId: Ref<ItemId | null>
  anchorId: Ref<ItemId | null>
  selectedIds: Ref<Set<ItemId>>
  focusedIndex: ComputedRef<number>

  // Selection helpers
  isSelected: (id: ItemId) => boolean
  toggle: (id: ItemId) => void
  selectOnly: (id: ItemId) => void
  selectRange: (fromId: ItemId, toId: ItemId) => void
  selectAll: () => void
  clearSelection: () => void

  // Focus helpers
  moveFocus: (direction: NavigationDirection) => void
  focusByIndex: (index: number) => void
  focusById: (id: ItemId) => void

  // Event handlers
  handleKeydown: (e: KeyboardEvent) => void
  handlePointerDown: (e: PointerEvent, hit: HitTestResult) => void
  handlePointerMove: (e: PointerEvent) => void
  handlePointerUp: (e: PointerEvent) => void

  // Utilities
  getItemById: (id: ItemId) => T | undefined
  getIndexById: (id: ItemId) => number
  getIdByIndex: (index: number) => ItemId | undefined
}

// Selection composable types
export interface UseSelectionOptions {
  mode: SelectionMode
  onSelectionChange?: (ids: Set<ItemId>) => void
}

export interface UseSelectionReturn {
  selectedIds: Ref<Set<ItemId>>
  anchorId: Ref<ItemId | null>

  isSelected: (id: ItemId) => boolean
  select: (id: ItemId) => void
  deselect: (id: ItemId) => void
  toggle: (id: ItemId) => void
  selectOnly: (id: ItemId) => void
  selectMultiple: (ids: ItemId[]) => void
  selectRange: (ids: ItemId[]) => void
  selectAll: (ids: ItemId[]) => void
  clear: () => void
  setAnchor: (id: ItemId | null) => void
}

// Focus composable types
export interface UseFocusOptions<T> {
  items: Ref<T[]>
  getId: (item: T) => ItemId
  /** Used for the default uniform layout when `layout` is not given. */
  columnCount?: Ref<number>
  /** Row layout used for navigation; its units define the moveFocus page size. */
  layout?: Ref<GridLayout>
  onFocusChange?: (id: ItemId | null) => void
}

export interface UseFocusReturn {
  focusedId: Ref<ItemId | null>
  focusedIndex: ComputedRef<number>

  setFocusById: (id: ItemId) => void
  setFocusByIndex: (index: number) => void
  /** `page`: PageUp/PageDown distance in layout units (rows for the default uniform layout, px for a pixel layout). */
  moveFocus: (direction: NavigationDirection, page?: number) => number
  clearFocus: () => void
}

// Keyboard composable types
export interface UseKeyboardOptions {
  focus: UseFocusReturn
  selection: UseSelectionReturn
  items: Ref<unknown[]>
  getId: (item: unknown) => ItemId
  columnCount?: Ref<number>
  selectionMode: SelectionMode
  selectOnFocus: boolean
  /** Page size passed to focus.moveFocus. Prefer `pageSize`. */
  visibleRows?: Ref<number>
  /** Page size passed to focus.moveFocus (layout units); undefined = 5 item rows. */
  pageSize?: Ref<number | undefined>
  /** When given, Shift ranges skip items hidden in collapsed sections. */
  layout?: Ref<GridLayout>
  onOpen?: (id: ItemId) => void
}

export interface UseKeyboardReturn {
  handleKeydown: (e: KeyboardEvent) => void
}

// Typeahead composable types
export interface UseTypeaheadOptions<T> {
  items: Ref<T[]>
  getLabel: (item: T) => string
  getId: (item: T) => ItemId
  focus: UseFocusReturn
  debounceMs?: number
  /** Only items for which this returns true are matched (e.g. not in a collapsed section). */
  isVisible?: (index: number) => boolean
}

export interface UseTypeaheadReturn {
  handleKeypress: (e: KeyboardEvent) => void
  clearBuffer: () => void
  currentBuffer: Ref<string>
}

// Marquee composable types
export interface UseMarqueeOptions {
  containerRef: Ref<HTMLElement | null>
  getItemElements: () => HTMLElement[]
  getItemId: (element: HTMLElement) => ItemId
  selection: UseSelectionReturn
  enabled: Ref<boolean>
}

export interface UseMarqueeReturn {
  isActive: Ref<boolean>
  rect: Ref<MarqueeRect | null>
  scrollOffset: Ref<{ x: number; y: number }>

  startMarquee: (e: PointerEvent) => void
  updateMarquee: (e: PointerEvent) => void
  endMarquee: (e: PointerEvent) => void
}

// Virtual grid composable types
export interface UseVirtualGridOptions {
  containerRef: Ref<HTMLElement | null>
  containerHeight: Ref<number>
  /** Row layout (px). When omitted, a uniform layout is built from items, columnCount, rowHeight and gap. */
  layout?: Ref<GridLayout>
  items?: Ref<unknown[]>
  columnCount?: Ref<number>
  rowHeight?: Ref<number> | number
  gap?: Ref<number> | number
  overscan?: number
  headerOffset?: Ref<number> | number
  /** Height covered by a pinned section header (0 = none). Items under it count as hidden. */
  stickyHeaderHeight?: Ref<number> | number
}

export interface UseVirtualGridReturn {
  virtualRows: ComputedRef<VirtualRow[]>
  totalHeight: ComputedRef<number>
  visibleRowCount: ComputedRef<number>
  /** PageUp/PageDown distance in px: whole rows without sections, the viewport minus a sticky header with them. */
  pageSize: ComputedRef<number>
  /** Current scrollTop of the container. */
  scrollTop: Ref<number>
  layout: ComputedRef<GridLayout>
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end' | 'auto') => void
  scrollToSection: (key: SectionKey, align?: 'start' | 'center' | 'end' | 'auto') => void
  scrollToOffset: (offset: number) => void
}

// Sections / layout
export type SectionKey = string | number

/** A section of the grid: items `[start, start + count)` share one `sectionKey`. */
export interface GridSection {
  key: SectionKey
  /** Position of the section in `getSections()` order. */
  index: number
  /** Index of the section's first item in `items`. */
  start: number
  /** Number of items in the section. */
  count: number
}

/** A consecutive run of items with the same section key. */
export interface SectionRun {
  key: SectionKey
  start: number
  count: number
}

export type GridRowKind = 'header' | 'items'

/** One row of a grid layout, as returned by `GridLayout.getRow`. */
export interface GridLayoutRow {
  index: number
  kind: GridRowKind
  /** Stable key: the row index for a uniform layout, `h:<key>` / `r:<key>:<rowInSection>` for sections. */
  key: string | number
  /** Top of the row, relative to the first row (excludes header slot and leading gap). */
  start: number
  height: number
  section: GridSection
  /** First / last item index of an item row; -1 for a header row. */
  first: number
  last: number
}

export interface BuildGridLayoutOptions {
  runs: SectionRun[]
  columnCount: number
  /** Keys of collapsed sections (ignored when `headers` is false). */
  collapsed?: ReadonlySet<SectionKey>
  /** Height of a section header row in px (default 36). */
  headerHeight?: number
  rowHeight: number
  gap?: number
  /** Emit a header row per section (default true). False gives the uniform, header-less grid. */
  headers?: boolean
}

/** Pure description of the grid's rows: headers, item rows and where each starts. */
export interface GridLayout {
  /** True when the layout has section header rows. */
  readonly sectioned: boolean
  readonly sections: readonly GridSection[]
  readonly itemCount: number
  readonly rowCount: number
  readonly columnCount: number
  readonly rowHeight: number
  readonly gap: number
  readonly headerHeight: number
  /** Sum of all row heights. */
  readonly totalHeight: number

  getRow(row: number): GridLayoutRow
  rowStart(row: number): number
  rowHeightAt(row: number): number
  rowKind(row: number): GridRowKind
  /** Row of an item, or -1 when its section is collapsed (or the index is out of range). */
  rowOfItem(index: number): number
  /** Item at a column of an item row, clamped to the row's last item; -1 for a header row. */
  itemAt(row: number, col: number): number
  /** Row containing offset `y` (relative to the first row), clamped to the rows. */
  rowAtOffset(y: number): number
  sectionAtOffset(y: number): GridSection | undefined
  sectionOfItem(index: number): GridSection | undefined
  sectionByKey(key: SectionKey): GridSection | undefined
  /** Header row of a section, or -1 in a header-less layout. */
  headerRowOf(sectionIndex: number): number
  isCollapsed(sectionIndex: number): boolean
  /** First / last visible item, or -1 when there is none. */
  firstItem(): number
  lastItem(): number
  /** Target item index for a keyboard move; `page` is the page height in layout px. */
  navigate(index: number, direction: NavigationDirection, page?: number): number
}
