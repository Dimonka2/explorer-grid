// Components
export { ExplorerGrid } from './components'

// Composables
export {
  useExplorerGrid,
  useSelection,
  useFocus,
  useKeyboard,
  useTypeahead,
  useMarquee,
  useVirtualGrid,
  useUniformLayout,
} from './composables'
export type { UseUniformLayoutOptions } from './composables'

// Layout (pure functions)
export {
  buildGridLayout,
  buildUniformLayout,
  computeSectionRuns,
  scrollTopForItem,
  scrollTopForSection,
  stickyHeaderState,
  DEFAULT_SECTION_HEADER_HEIGHT,
} from './layout/gridLayout'
export type { ScrollAlign, ScrollTargetOptions, StickyHeaderState } from './layout/gridLayout'

// Types
export type {
  ItemId,
  ExplorerGridItem,
  GridPosition,
  GridDimensions,
  SelectionMode,
  NavigationDirection,
  SelectionState,
  HitTestResult,
  MarqueeRect,
  VirtualItem,
  VirtualRow,
  UseExplorerGridOptions,
  UseExplorerGridReturn,
  UseSelectionOptions,
  UseSelectionReturn,
  UseFocusOptions,
  UseFocusReturn,
  UseKeyboardOptions,
  UseKeyboardReturn,
  UseTypeaheadOptions,
  UseTypeaheadReturn,
  UseMarqueeOptions,
  UseMarqueeReturn,
  UseVirtualGridOptions,
  UseVirtualGridReturn,
  SectionKey,
  GridSection,
  SectionRun,
  GridRowKind,
  GridLayoutRow,
  GridLayout,
  BuildGridLayoutOptions,
} from './types'

// Styles (import separately: import 'explorer-grid/styles')
