# Development Roadmap

## Phase 0: Project Setup

### 0.1 Initialize Project
- [ ] Initialize npm package with `package.json`
- [ ] Configure TypeScript (`tsconfig.json`)
- [ ] Set up Vite for library build (`vite.config.ts`)
- [ ] Configure ESLint + Prettier
- [ ] Set up Vitest for testing
- [ ] Create directory structure

### 0.2 Package Configuration
```json
{
  "name": "@anthropic/explorer-grid",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./styles": "./dist/style.css"
  },
  "peerDependencies": {
    "vue": "^3.4.0"
  }
}
```

### 0.3 Directory Structure
```
src/
├── composables/
├── components/
├── types/
├── utils/
├── styles/
└── index.ts
tests/
├── unit/
└── integration/
playground/          # Dev/demo app
```

**Deliverables:**
- Working dev environment
- Build produces ESM + CJS + types
- Playground app running

---

## Phase 1: MVP Core

### 1.1 Type Definitions
- [ ] Create `src/types/index.ts` with all interfaces
- [ ] Export types from package entry point

### 1.2 useSelection Composable
- [ ] Implement `selectedIds` as shallowRef<Set>
- [ ] Implement `anchorId` ref
- [ ] Implement methods: `isSelected`, `select`, `deselect`, `toggle`
- [ ] Implement methods: `selectOnly`, `selectMultiple`, `clear`
- [ ] Implement `selectRange` (receives pre-computed ID array)
- [ ] Add `onSelectionChange` callback
- [ ] Write unit tests

### 1.3 useFocus Composable
- [ ] Implement `focusedId` and `focusedIndex`
- [ ] Implement `setFocusById`, `setFocusByIndex`
- [ ] Implement `moveFocus` with direction calculations
- [ ] Handle basic directions: up, down, left, right
- [ ] Add `onFocusChange` callback
- [ ] Write unit tests

### 1.4 useKeyboard Composable (Basic)
- [ ] Arrow key navigation
- [ ] Enter for "open" action
- [ ] Space for toggle selection
- [ ] Basic click handling (select on click)
- [ ] Ctrl/Cmd+click for toggle
- [ ] Shift+click for range selection
- [ ] Write unit tests

### 1.5 useVirtualGrid Composable
- [ ] Integrate @tanstack/vue-virtual or implement custom
- [ ] Calculate virtual rows based on columnCount
- [ ] Implement `scrollToIndex`
- [ ] Handle container resize (update columnCount)
- [ ] Expose `virtualRows`, `totalHeight`
- [ ] Write unit tests

### 1.6 useExplorerGrid (Main Composable)
- [ ] Compose all sub-composables
- [ ] Wire up inter-composable communication
- [ ] Expose unified API
- [ ] Implement `getItemById`, `getIndexById`, `getIdByIndex` utilities
- [ ] Write integration tests

### 1.7 ExplorerGrid Component (Basic)
- [ ] Create component with props/emits
- [ ] Implement template with virtualization
- [ ] Add item slot
- [ ] Add basic CSS classes
- [ ] Wire keyboard/pointer events
- [ ] Test with 1000+ items

**Deliverables:**
- Working grid with virtualization
- Arrow key navigation
- Click/Ctrl+click/Shift+click selection
- Playground demo with sample data

---

## Phase 2: Navigation Parity

### 2.1 Extended Keyboard Navigation
- [ ] Home: first item in current row
- [ ] End: last item in current row
- [ ] Ctrl/Cmd+Home: first item (global)
- [ ] Ctrl/Cmd+End: last item (global)
- [ ] PageUp: move up by visible page
- [ ] PageDown: move down by visible page
- [ ] Write unit tests for each

### 2.2 Shift+Arrow Range Extension
- [ ] Track range extension state
- [ ] Shift+Arrow extends selection from anchor
- [ ] Maintain selection direction (for shrinking range)
- [ ] Handle wrap-around at row boundaries
- [ ] Write unit tests

### 2.3 Ctrl+Arrow Focus Movement
- [ ] Ctrl/Cmd+Arrow moves focus without selecting
- [ ] Preserve existing selection
- [ ] Space selects/deselects at new position
- [ ] Write unit tests

### 2.4 Select All (Ctrl+A)
- [ ] Implement efficient select all
- [ ] Consider inversion model for 100k+ items
- [ ] Escape clears selection
- [ ] Write unit tests

### 2.5 Auto-scroll on Focus Change
- [ ] When focus moves to off-screen item, scroll into view
- [ ] Configurable alignment: 'start', 'center', 'end', 'nearest'
- [ ] Smooth scroll option
- [ ] Test with virtualization

**Deliverables:**
- Full keyboard navigation parity with Windows Explorer
- Shift+Arrow range selection
- Ctrl+Arrow focus-only movement
- Select all with large datasets

---

## Phase 3: Typeahead

### 3.1 useTypeahead Composable
- [ ] Implement keystroke buffer
- [ ] Configurable debounce timeout (default 500ms)
- [ ] Clear buffer on timeout or non-printable key
- [ ] Write unit tests

### 3.2 Match Finding
- [ ] Case-insensitive prefix match
- [ ] Start search from item after current focus
- [ ] Wrap around to beginning
- [ ] Handle no-match gracefully
- [ ] Write unit tests

### 3.3 Integration
- [ ] Wire into useKeyboard
- [ ] Distinguish printable keys from navigation keys
- [ ] Focus matched item
- [ ] Optional: highlight matched prefix
- [ ] Write integration tests

**Deliverables:**
- Type to jump to items by label prefix
- Configurable debounce
- Works with any label accessor

---

## Phase 4: Marquee Selection

### 4.1 useMarquee Composable
- [ ] Track pointer down/move/up state
- [ ] Calculate marquee rect in container coordinates
- [ ] Handle scroll offset during drag
- [ ] Expose `isActive`, `rect`
- [ ] Write unit tests

### 4.2 Hit Testing
- [ ] Get bounding rects of visible items
- [ ] Implement rect intersection logic
- [ ] Return intersecting item IDs
- [ ] Performance optimization for many items
- [ ] Write unit tests

### 4.3 Selection Integration
- [ ] Start marquee on pointerdown in empty space
- [ ] Update selection during drag
- [ ] Handle modifier keys (Ctrl adds, Shift extends)
- [ ] End marquee on pointerup
- [ ] Write integration tests

### 4.4 Visual Feedback
- [ ] Render marquee overlay
- [ ] Style with CSS custom properties
- [ ] Handle edge cases (drag outside container)
- [ ] Write visual tests

### 4.5 Virtualization Compatibility
- [ ] Re-test visible items on scroll during marquee
- [ ] Handle items scrolling in/out of view
- [ ] Performance with rapid updates
- [ ] Write stress tests

**Deliverables:**
- Rubber-band selection working with virtualization
- Modifier key support
- Smooth visual feedback

---

## Phase 5: Accessibility

### 5.1 ARIA Grid Implementation
- [ ] Add `role="grid"` to container
- [ ] Add `role="row"` and `role="gridcell"` to items
- [ ] Implement `aria-rowcount`, `aria-colcount`
- [ ] Implement `aria-rowindex`, `aria-colindex`
- [ ] Implement `aria-selected`
- [ ] Test with screen readers

### 5.2 Roving Tabindex
- [ ] Focused item: `tabindex="0"`
- [ ] All other items: `tabindex="-1"`
- [ ] Tab exits grid, arrows navigate within
- [ ] Maintain focus on blur/refocus
- [ ] Write unit tests

### 5.3 Live Regions
- [ ] Add selection count announcements
- [ ] Announce focus changes (optional)
- [ ] Debounce rapid changes
- [ ] Make configurable (enable/disable)
- [ ] Test with screen readers

### 5.4 Focus Ring
- [ ] Visible focus indicator
- [ ] High contrast mode support
- [ ] Customizable via CSS variables
- [ ] Test visibility

### 5.5 Screen Reader Testing
- [ ] Test with NVDA (Windows)
- [ ] Test with VoiceOver (macOS)
- [ ] Document findings and workarounds
- [ ] Fix identified issues

**Deliverables:**
- ARIA grid pattern implementation
- Screen reader compatible
- Documented a11y strategy

---

## Phase 6: Polish & Edge Cases

### 6.1 Dynamic Item Changes
- [ ] Handle items array replacement
- [ ] Preserve focus when item still exists
- [ ] Move focus to nearest if focused item removed
- [ ] Prune selection to existing items (configurable)
- [ ] Write unit tests

### 6.2 Container Resize
- [ ] Recalculate columnCount on resize
- [ ] Preserve focused item by ID
- [ ] Update virtual positions
- [ ] ResizeObserver integration
- [ ] Write integration tests

### 6.3 Context Menu
- [ ] Right-click handling
- [ ] Select item if not selected (configurable)
- [ ] Emit event with selection snapshot
- [ ] Don't interfere with native context menu
- [ ] Write unit tests

### 6.4 Empty State
- [ ] Render empty slot when no items
- [ ] Handle focus when items become empty
- [ ] Write tests

### 6.5 Performance Optimization
- [ ] Profile with 100k items
- [ ] Optimize selection operations
- [ ] Reduce unnecessary re-renders
- [ ] Document performance characteristics
- [ ] Write benchmark tests

**Deliverables:**
- Robust edge case handling
- Performance validated at scale
- Production-ready stability

---

## Phase 7: Documentation & Examples

### 7.1 API Documentation
- [ ] Document all composable options and returns
- [ ] Document component props, slots, emits
- [ ] Document CSS custom properties
- [ ] TypeDoc or VitePress setup

### 7.2 Usage Examples
- [ ] Basic usage example
- [ ] Media gallery example
- [ ] Asset browser example
- [ ] Searchable catalog example
- [ ] Custom rendering example

### 7.3 Guides
- [ ] Getting started guide
- [ ] Styling guide
- [ ] Accessibility guide
- [ ] Performance tips
- [ ] Migration guide (if needed)

### 7.4 Playground
- [ ] Interactive demo site
- [ ] Configuration toggles
- [ ] Performance stress test mode
- [ ] Deploy to GitHub Pages / Netlify

**Deliverables:**
- Complete API documentation
- Working examples
- Deployed demo site

---

## Summary: Milestone Mapping

| Phase | PRD Milestone | Key Outcome |
|-------|---------------|-------------|
| 0 | - | Project setup |
| 1 | MVP | Virtualized grid + basic navigation + selection |
| 2 | Parity features | Full keyboard navigation, Shift+arrow |
| 3 | Parity features | Type-to-select |
| 4 | Marquee selection | Rubber-band selection |
| 5 | A11y hardening | Screen reader support |
| 6 | - | Edge cases, polish |
| 7 | Docs + examples | Documentation, demos |

---

## Definition of Done (Each Phase)

- [ ] All tasks completed
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] No TypeScript errors
- [ ] Linting passes
- [ ] Playground demo works
- [ ] CHANGELOG updated
- [ ] PR reviewed and merged
