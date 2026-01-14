# PRD: Vue “Explorer Grid” Package

## 1) Summary

Build a Vue 3 package that provides an **Explorer-like, virtualized grid of items (cards)** supporting:

* Smooth virtualization for **thousands to 100k+ items**
* **Keyboard navigation** (arrows, Home/End, PageUp/Down)
* **Selection model** (single, multi, range, toggle)
* **Focus management** aligned with native Explorer expectations
* Mouse behaviors: click, ctrl/meta click, shift click, drag-marquee selection
* Optional type-to-select and incremental search

Package should be **headless-first** (logic composables) with an optional **reference UI component**.

## 2) Goals

1. **Explorer-like interaction parity** for grid browsing:

   * One “active/focused” item
   * Independent selection set
   * Range selection anchored by last focused/selected item
2. **Performance**:

   * Keep DOM nodes bounded (virtualization)
   * O(1) or amortized near-O(1) navigation/selection operations
3. **Accessibility**:

   * Works with screen readers and keyboard-only usage
   * Clear ARIA strategy (grid or listbox, documented)
4. **Integratability**:

   * Consumers render their own card markup via slots/render functions
   * Works with async data loading and dynamic item sizes (within constraints)

## 3) Non-goals

* File operations (copy/move/rename/delete), breadcrumbs, tree navigation
* Drag-and-drop reordering (can be layered on later)
* Complex “details table view” (that’s a separate component/model)

## 4) Users & Use cases

* Media libraries, dataset browsers, document repositories, model catalogs
* “Select many cards, navigate quickly, apply bulk actions”
* Works with touchpad/mouse + keyboard power users

## 5) Key UX requirements

### Keyboard navigation

* Arrow keys move focus logically in the grid (left/right/up/down)
* Home/End jump to first/last item in row (or global with modifiers)
* PageUp/PageDown moves by viewport “page”
* Enter triggers “open” / primary action callback
* Space toggles selection of focused item (configurable)
* Ctrl/Cmd+A selects all (when enabled)
* Type-to-select:

  * Buffer keystrokes for N ms
  * Jump focus to next item matching prefix (by label accessor)

### Selection rules (Explorer-like)

* **Single click**: selects item, sets focus, clears previous selection (unless config says otherwise)
* **Ctrl/Cmd+click**: toggles item selection without clearing others
* **Shift+click**: selects range from anchor to clicked item
* **Shift+arrow**: extends selection range as focus moves
* **Ctrl/Cmd+arrow**: moves focus without changing selection (optional mode)
* **Rubber-band marquee**: click-drag empty space to select intersecting items
* Maintain:

  * `focusedId`
  * `anchorId` (for range)
  * `selectedIds` (Set)

### Mouse & pointer behavior

* Hover does not change focus by default
* Clicking empty space clears selection (configurable)
* Right click:

  * If target not selected: select it (optional)
  * Emit `contextmenu` event with selection snapshot

### Virtualization + “virtual navigation”

* When focus moves to an item not rendered, component **scrolls it into view** and ensures it’s mounted.
* Provide `scrollToIndex`, `scrollToId`, `ensureVisible(id, align)` API.

## 6) API design

### Package exports

**A) Headless composables (core)**

* `useExplorerGrid(options)`

  * Inputs:

    * `items: Ref<T[]>`
    * `getId(item): string | number`
    * `getLabel?(item): string` (for typeahead)
    * `columnCount` (fixed or computed callback)
    * Feature flags: `multiSelect`, `marquee`, `typeahead`, `selectOnFocus`, etc.
  * Outputs:

    * State refs: `focusedId`, `anchorId`, `selectedIds`
    * Helpers:

      * `isSelected(id)`, `toggle(id)`, `selectOnly(id)`, `selectRange(a,b)`, `selectAll()`, `clearSelection()`
      * `moveFocus(direction)`, `focusByIndex(i)`, `focusById(id)`
      * `handleKeydown(e)`, `handlePointerDown(e, hit)`, `handlePointerMove(e)`, `handlePointerUp(e)`
    * Events (emit callbacks): `onOpen`, `onSelectionChange`, `onFocusChange`

**B) Virtualized grid component (reference implementation)**

* `<ExplorerGrid />`

  * Props:

    * `items`, `getId`, `estimateSize` (or fixed card size)
    * `overscan`
    * `selectionMode`: `"single" | "multiple"`
    * `modelValueSelectedIds` + `update:modelValueSelectedIds`
    * `modelValueFocusedId` + `update:modelValueFocusedId`
  * Slots:

    * `#item="{ item, index, selected, focused }"`
    * `#empty`
  * Emits:

    * `open`, `selection-change`, `focus-change`, `contextmenu`

### Styling & theming

* Headless: no styles
* Component: minimal default styles, class hooks:

  * `eg-root`, `eg-item`, `eg-item--selected`, `eg-item--focused`, `eg-marquee`

## 7) Accessibility (A11y) requirements

* Provide a documented mode:

  * **ARIA grid** (roving tabindex on cells) *or*
  * **listbox + options** (if you choose 1D semantics even for a grid layout)
* Visible focus ring for keyboard focus
* Announce selection count changes (optional live region helper)
* Ensure no “tab trap”: Tab exits the grid; arrows navigate внутри

## 8) Performance requirements

* Must keep DOM node count bounded:

  * Visible rows/cols + overscan only
* No per-item watchers when dealing with huge lists
* `selectedIds` must support:

  * Efficient toggles (Set)
  * Efficient “select all” (use an inversion model for very large sets as an optional advanced mode: `allSelected + exceptions`)

## 9) Edge cases

* Dynamic resize (container width changes → column count changes)

  * Preserve focused item by id
  * Recompute focused index mapping
* Filtering/sorting items changes

  * If focused id disappears, move focus to nearest neighbor
  * Keep selection only for ids still present (configurable)
* Async loading / infinite scroll

  * Allow placeholder items; keep navigation stable by index until ids known (optional)

## 10) Milestones

1. **MVP (2–3 weeks equivalent effort)**

   * Virtualized grid + focus + arrow navigation + click/shift/ctrl selection
2. **Parity features**

   * Shift+arrow extend range, Home/End/PageUp/PageDown, typeahead
3. **Marquee selection**

   * Rubber-band select with virtualization-aware hit testing
4. **A11y hardening**

   * ARIA strategy finalized, screen reader testing notes
5. **Docs + examples**

   * “Media gallery”, “Asset browser”, “Searchable catalog”
