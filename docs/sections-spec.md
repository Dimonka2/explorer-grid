# Spec: Sections (grouped grid with section headers)

**Status:** 2026-09-29, built (S1–S5, version 0.2.0). The §2.1 API is
implemented as specced; §4 tests pass (`tests/unit/gridLayout.test.ts`,
`sections.composables.test.ts`, `ExplorerGrid.sections.test.ts`); the
playground has a "Photos by month" page (50k items, `#photos`). **The
manual gate (§6) is pending**: it needs a real browser and has not been
run. First consumer: Timeprint DB's Place tab, grouped by year or month
(`collect-v/docs/places/place-date-sections-spec.md`).

Implementation notes where the build refines the text below:

- Header rows (and the pinned copy) are `role="presentation"` **and
  `aria-hidden="true"`**: axe's `aria-required-children` flags any button
  inside a presentation row of a listbox, and the live region already
  announces sections (§2.6).
- The composable changes of §2.8 are additive: every new option (`layout`,
  `pageSize`, `isVisible`, `stickyHeaderHeight`) is optional and defaults to
  the uniform layout, so existing composable calls keep compiling and
  working. 0.2.0 and the migration note in `docs/api.md` cover the one
  semantic change (the `moveFocus` page argument is in layout units).
- The "append extends the last run" optimisation (§2.2 Cost) is not built;
  a full rebuild of 100k items / 500 sections stays well under the 10 ms
  budget, and the test pins the result, not the incremental path.
- When the pinned section is collapsed from its sticky header, the grid
  scrolls that header to the top, so the view does not land mid-way into
  the following section.

## 0. Verified facts

What the grid does today, checked before writing (paths relative to this repo).

- **Uniform layout only.**
  - Column count is `floor((width + gap) / (itemWidth + gap))` (`src/components/ExplorerGrid.vue:76-79`).
  - Row count is `ceil(items.length / columnCount)` (`src/composables/useVirtualGrid.ts:16-18`).
  - Every row has the same size, `rowHeight + gap` (`useVirtualGrid.ts:29`).
  - An item's row and column come from its index (`useVirtualGrid.ts:48-72`).
  - Items are absolutely positioned at `row.start` (`ExplorerGrid.vue:285-294`).
- **Virtualization** uses `@tanstack/vue-virtual` over rows. Its `scrollMargin` covers the optional `#header` slot plus the leading gap (`headerOffset`, `useVirtualGrid.ts:25-32`, commit 4486f5d).
- **Arithmetic that assumes uniform rows:**
  - `scrollToIndex` (`useVirtualGrid.ts:75-105`), and through it `scrollToId` and the scroll to the focused item (`ExplorerGrid.vue:249-257, 350-355`).
  - `visibleRowCount`, used by PageUp/PageDown (`useVirtualGrid.ts:41-44`).
  - Keyboard targets in `useFocus.calculateTargetIndex`: up/down are `±cols`; Home/End are row start/end by `index % cols`; PageUp/PageDown are `±cols × visibleRows` (`src/composables/useFocus.ts:38-83`).
- **Already layout-independent:**
  - Marquee hit-tests `[data-eg-item]` in the DOM (`ExplorerGrid.vue:155-167`, `useMarquee.ts`).
  - Pointer hit-testing uses `closest('[data-eg-item]')` (`ExplorerGrid.vue:199-210`).
  - Selection works on ids.
  - Typeahead works on item order.
- **ARIA:** the root is `role="listbox"` with `aria-activedescendant`; items are `role="option"` with global `aria-setsize` / `aria-posinset` (`ExplorerGrid.vue:375-415`). The `#header` slot is the only non-item content.
- **Roadmap:** variable height is listed as "Later … (harder; may need measurement + reflow)" (`docs/specs-corrections.md:61`). Sections do not need measurement: header rows and item rows each have a known height.

## 1. Goal and non-goals

**Goal.** Optional sections: the items split into consecutive runs, and each run is drawn under a full-width header row. For example:

```
┌ June 2019 · 214 ─────────────────────────────── ▾ ┐
│ [ ][ ][ ][ ][ ]                                   │
│ [ ][ ][ ]            ← a section ends on a partial row
├ May 2019 · 38 ───────────────────────────────── ▾ ┤
│ [ ][ ][ ][ ][ ]                                   │
```

- Each section starts on a new row.
- Headers can stay pinned to the top while their section scrolls ("sticky").
- Sections can be collapsed.
- Keyboard, selection, marquee, typeahead, scroll-to and ARIA stay correct.
- **Without sections the grid is unchanged:** same positions, same keys, same behaviour. Every current consumer keeps working without edits.

**Non-goals.**

- The grid does not sort or group. The consumer supplies items already ordered so that each section is one consecutive run. The grid only finds where runs start and end.
- No variable item heights inside a section, and no per-section column counts.
- No nested sections. Year → month nesting is out of scope; a consumer picks one level.
- Section headers are not focusable options in the listbox (§2.6).

## 2. Design

### 2.1 API

New props (all optional):

```ts
/** Section of an item. Consecutive items with an equal key form one section. Omitted = no sections. */
sectionKey?: (item: T) => SectionKey          // SectionKey = string | number
/** Height of a header row in px (default 36). */
sectionHeaderHeight?: number
/** Pin the current section's header at the top while scrolling (default true). */
stickySectionHeaders?: boolean
```

New v-model:

```ts
/** Keys of collapsed sections. A key that matches no section is kept (it may load later). */
v-model:collapsedSections: Set<SectionKey>    // default: empty
```

New slot:

```ts
#section-header="{
  section: GridSection,   // { key, index, start, count }: items [start, start + count)
  collapsed: boolean,
  selectedCount: number,  // how many of the section's items are selected
  sticky: boolean,        // true when this is the pinned copy
  toggle: () => void,     // collapse / expand
  selectSection: (mode: 'replace' | 'add' | 'remove') => void,
}"
```

If the slot is not provided, a minimal header shows `String(key)`, the count and a chevron.

New events: `sectionToggle(key, collapsed)`.

New exposed methods:
- `setSectionCollapsed(key, collapsed)`
- `scrollToSection(key, align?)`
- `getSections(): GridSection[]`

Changed exposed methods:
- `scrollToIndex` and `scrollToId` use the layout (§2.3).
- `focusById` on an item inside a collapsed section **expands that section first**, as Windows Explorer does when you reveal a file in a collapsed group.

### 2.2 Layout: one pure function

```ts
buildGridLayout({ runs, columnCount, collapsed, headerHeight, rowHeight, gap }) → GridLayout
```

- `runs` is `{ key, start, count }[]`. It is computed in one O(n) pass over `items` with `sectionKey`, and only when `items` or `sectionKey` change.
- `GridLayout.rows` holds each row's kind, where it starts and its height:
  - `{ kind: 'header', section }` with height `headerHeight`.
  - `{ kind: 'items', section, first, last }` with height `rowHeight + gap`.
  - A collapsed section contributes only its header row.
- **Lookup tables** (typed arrays):
  - `rowStart[]`: prefix sums of row heights.
  - `rowOfItem[]`: the row of each item, or `-1` when its section is collapsed.
- **Queries:**
  - `rowOfItem(i)`
  - `itemAt(row, col)`: clamped to the row's last item.
  - `rowAtOffset(y)`: binary search over `rowStart`.
  - `sectionAtOffset(y)`
  - `firstItem()` / `lastItem()`: first and last *visible* item.
- **Uniform layout:** with no `sectionKey` there is one implicit section with no header row, so rows, starts and keys match today's grid exactly. A unit test pins this.
- **Cost:** 100k items at 5 columns give about 20k rows plus the headers. The build is one O(n) pass. Appending a page (the common case for paged consumers) could extend the last run instead of rebuilding. Optional, and measured first (§4).

The virtualizer gets:
- `count = rows.length`
- `estimateSize(i) = rows[i].height`
- `measure()` whenever the layout changes: new runs, a collapse, a column change, or a height prop change.

Row keys are stable across layout changes: `h:<sectionKey>` for a header row and `r:<sectionKey>:<rowInSection>` for an item row. They are not the virtual index, which would change meaning when a section above collapses.

### 2.3 Scrolling

- `scrollToIndex(i, align)`: row `rowOfItem(i)`, top `rowStart[row] + headerOffset + gap`, then the same `auto` / `start` / `center` / `end` rules as today.
  - **With sticky headers,** an item under the pinned header counts as hidden. `auto` scrolls so the item sits below the header.
- `scrollToSection(key)`: puts that section's header row at the top.
- Paging:
  - `visibleRowCount` is replaced by a pixel page: the viewport height minus one header height when headers are sticky.
  - PageUp/PageDown move by that many pixels (§2.5).
- `headerOffset` (the `#header` slot) is unchanged. Sections start below it.

### 2.4 Sticky header

- **One overlay element,** rendered first inside the scroll container with `position: sticky; top: 0; height: 0; overflow: visible`, so no scroll listener moves it. It renders the `#section-header` slot for `sectionAtOffset(scrollTop)` with `sticky: true`.
- **Push-out:** when the next section's header is less than `sectionHeaderHeight` below the top, the overlay is shifted up by the overlap (`transform: translateY(-overlap)`). The new header pushes the old one out instead of overlapping it.
- **Hidden** while the real header of the current section is at or below the top, i.e. at the very top of the list.
- **Collapsed sections:** only the header row exists, so the overlay shows it just as briefly as a real header scrolls past.
- **Marquee:** starting a marquee on the pinned header does nothing (§2.7).

### 2.5 Keyboard

All navigation goes through the layout. With one implicit section, the targets equal today's.

| Key | With sections |
|---|---|
| ← / → | Previous / next **visible** item in order. Crosses section boundaries and skips collapsed sections. |
| ↑ / ↓ | Same column in the previous / next **item row**, skipping header rows. Clamped to that row's last item, so ↓ from column 4 into a section's 2-item last row lands on item 2. Explorer does the same. |
| Home / End | Start / end of the current item row. |
| Ctrl+Home / Ctrl+End | First / last visible item. |
| PageUp / PageDown | The item row at `current row top ∓ page height` (§2.3), same column, clamped. |
| Shift + any of these | Range from the anchor, in item order, **excluding items in collapsed sections**. |
| Ctrl+A | Selects **all** items, collapsed sections included (they are loaded, and the header's `selectedCount` shows it). |

**Collapse from the keyboard.** Proposal G-D2 (§7): the numeric keypad's `-` / `+` collapse / expand the focused item's section. When a collapse hides the focused item, focus moves to the first item of the next visible section, or else the previous one. The anchor is kept.

**Typeahead** searches visible items only.

### 2.6 Accessibility

- Header rows are `role="presentation"`. They are not options, so the listbox keeps only `option` children and axe's `aria-required-children` stays green.
  - ARIA `group` inside a virtualized listbox is not reliable across screen readers, and group containers would break the flat absolute positioning.
- **Section changes are announced.** When the focus moves into another section, the live region (the same one that announces selection) says `sectionLabel(section)`, e.g. "June 2019, 214 items". It comes from a new optional prop `getSectionLabel?: (section) => string`, defaulting to the key.
- `aria-setsize` / `aria-posinset` stay global over all items. Items in collapsed sections are not rendered, so the set simply has gaps, as with virtualization today.
- **The header's buttons** (chevron, select-section checkbox) are real `<button>`s with `tabindex="-1"`. They are mouse affordances; the keyboard route is §2.5 plus the consumer's own menus. Proposal G-D2 covers keys.

### 2.7 Pointer and marquee

- A click on a header row calls neither `handlePointerDown` for an item nor the empty-space logic. `clearSelectionOnEmptyClick` does not fire, and no marquee starts. Header rows carry `data-eg-section-header`, and hit-testing checks that first.
- **Marquee over headers:** the marquee rectangle may cross them. Items are still hit-tested by DOM rect, so the selection covers the items in the rectangle across sections. Collapsed sections have no item elements, so they are never marquee-selected.
- **Edge auto-scroll** is unchanged.

### 2.8 Headless composables

- `useVirtualGrid` takes a `layout: Ref<GridLayout>` instead of `items` + `columnCount` + `rowHeight` for sizing.
- `useFocus` / `useKeyboard` take the layout and use it for every target.
- `calculateTargetIndex` becomes `layout.navigate(index, direction, pagePx)`.
- The uniform layout is the default, so direct composable users do not need sections.
- **This is a breaking change for direct composable callers** (option types change). Bump to **0.2.0** and give a migration note in `docs/api.md`: build a layout with `buildGridLayout({ runs: [{ key: 0, start: 0, count: n }], … })`, or use the new `useUniformLayout` helper.
- The `ExplorerGrid` component's props do not break.

### 2.9 Styling

- New classes: `eg-section-header`, `eg-section-header--sticky`, `eg-section-header--collapsed`.
- CSS variables `--eg-section-header-bg` and `--eg-section-header-border` in `src/styles/index.css`, documented in `docs/styling.md`.
- The default header is deliberately plain; consumers are expected to use the slot.

## 3. Scripting / MCP reach

None. This is a UI package; the Timeprint DB consumer spec states its own reach.

## 4. Tests

Vitest, `tests/unit` and `tests/a11y`:

- **`buildGridLayout`:**
  - Uniform (no key) equals today's row math exactly: counts, starts, item ranges, row keys.
  - Runs with partial last rows, a single-item section, a collapsed section (header row only) and all sections collapsed.
  - A column change rebuilds; an append extends the last run.
  - `rowAtOffset` / `sectionAtOffset` at boundaries.
- **Navigation table:** every key in §2.5 across a section boundary, into a partial row, over a collapsed section, and at the first and last item. Shift ranges exclude collapsed items; Ctrl+A includes them.
- **Scrolling:** `scrollToIndex` with and without sticky headers (an item just under the pinned header scrolls); `scrollToSection`.
- **Focus into a collapsed section** via `focusById` expands it.
- **Sticky overlay:** section at offset, push-out distance, hidden at the top.
- **Pointer:** a click on a header does not clear the selection and does not start a marquee.
- **a11y (axe):** a sectioned grid has no violations; the live region announces a section change.
- **Performance:**
  - Build a layout for 100k items / 500 sections at 5 columns in < 10 ms (Node).
  - Scrolling a 50k-item sectioned grid in the playground keeps rendered rows bounded by overscan.

## 5. Steps

1. **S1 — Layout and navigation (pure):** `buildGridLayout`, `navigate` and the tests. No rendering changes.
2. **S2 — Wire the composables:** `useVirtualGrid`, `useFocus` and `useKeyboard` run on the layout; the uniform layout is the default. The existing suite must pass unchanged, which proves nothing moved.
3. **S3 — Component:** props, slot, collapsed v-model, header rows, stable row keys, pointer rules, expose.
4. **S4 — Sticky overlay and live-region announcements.**
5. **S5 — Docs** (`api.md`, `examples.md`, `styling.md`, README), a playground page ("Photos by month", 50k items), version 0.2.0 and `npm run build`. Timeprint DB consumes `dist` via `file:../explorer-grid`, so it needs the rebuilt `dist`.

## 6. Manual gate (playground)

- [ ] Uniform grids in the playground look and behave exactly as before.
- [ ] Sections: headers are full width, each section starts a new row, and partial rows are left-aligned.
- [ ] The sticky header pins and is pushed out by the next one, with no flicker on fast scroll or wheel.
- [ ] Collapse and expand keep the scroll position of what is above; focus leaves a collapsed section as §2.5 says.
- [ ] Keyboard table §2.5, including ↓ into a short row and PageDown across several sections.
- [ ] Marquee across two sections selects the items in both; a click on a header does not clear the selection.
- [ ] Resize the window: columns change and sections re-flow; the focused item stays in view.
- [ ] Screen reader (NVDA): options are read as before, and moving into a new section announces its label.

## 7. Decisions

**Decided by the user (2026-09-29):**

- Grouping is specced as two documents: this one for the grid, plus a consumer add-on for the Place tab.
- The first consumer needs one level only (Year **or** Month), so there is no nesting (§1).

**Adopted as the build default (2026-09-29), pending user confirmation:**

The four proposals below were built with their proposed option. They are
not decided until the user confirms them.

- **G-D1 — Where grouping happens.** Proposed: the consumer orders items and passes `sectionKey`; the grid only detects runs. The alternative (the grid sorts and groups) would fight paged, server-sorted consumers. *Adopted as the build default (2026-09-29), pending user confirmation.*
- **G-D2 — Keyboard collapse.** Proposed: numeric keypad `-` / `+` on the focused item's section. Alternatives: none (mouse only), or Ctrl+Shift+↑ / ↓. *Adopted as the build default (2026-09-29), pending user confirmation: `NumpadSubtract` / `NumpadAdd` by `KeyboardEvent.code`, without Ctrl/Alt/Meta.*
- **G-D3 — Ctrl+A with collapsed sections.** Proposed: select all, collapsed included. The alternative, visible only, matches the Shift-range rule but surprises "select everything, then bulk-tag". *Adopted as the build default (2026-09-29), pending user confirmation.*
- **G-D4 — Header height.** Proposed: fixed per grid (`sectionHeaderHeight`), not measured, to keep the layout pure. *Adopted as the build default (2026-09-29), pending user confirmation.*
