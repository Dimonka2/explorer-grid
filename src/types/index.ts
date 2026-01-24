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
  type: 'item' | 'empty'
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
}

// Composable options
export interface UseExplorerGridOptions<T extends ExplorerGridItem> {
  items: Ref<T[]> | ComputedRef<T[]>
  getId: (item: T) => ItemId
  getLabel?: (item: T) => string
  columnCount: number | Ref<number> | (() => number)

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
  columnCount: Ref<number>
  onFocusChange?: (id: ItemId | null) => void
}

export interface UseFocusReturn {
  focusedId: Ref<ItemId | null>
  focusedIndex: ComputedRef<number>

  setFocusById: (id: ItemId) => void
  setFocusByIndex: (index: number) => void
  moveFocus: (direction: NavigationDirection, visibleRows?: number) => number
  clearFocus: () => void
}

// Keyboard composable types
export interface UseKeyboardOptions {
  focus: UseFocusReturn
  selection: UseSelectionReturn
  items: Ref<unknown[]>
  getId: (item: unknown) => ItemId
  columnCount: Ref<number>
  selectionMode: SelectionMode
  selectOnFocus: boolean
  visibleRows: Ref<number>
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
  items: Ref<unknown[]>
  columnCount: Ref<number>
  rowHeight: Ref<number> | number
  gap?: Ref<number> | number
  overscan?: number
  headerOffset?: Ref<number> | number
}

export interface UseVirtualGridReturn {
  virtualRows: ComputedRef<VirtualRow[]>
  totalHeight: ComputedRef<number>
  visibleRowCount: ComputedRef<number>
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end' | 'auto') => void
  scrollToOffset: (offset: number) => void
}
