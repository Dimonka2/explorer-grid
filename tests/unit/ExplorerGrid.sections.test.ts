import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick, h } from 'vue'
import { axe } from 'vitest-axe'
import { toHaveNoViolations } from 'vitest-axe/matchers'
import ExplorerGrid from '../../src/components/ExplorerGrid.vue'
import type { GridSection, ItemId, SectionKey } from '../../src/types'

expect.extend({ toHaveNoViolations })

interface Photo {
  id: number
  name: string
  month: string
}

// 2019-06: ids 1-5, 2019-05: ids 6-8, 2019-04: ids 9-12
const photos: Photo[] = [
  ...Array.from({ length: 5 }, (_, i) => ({ id: i + 1, name: `june ${i + 1}`, month: '2019-06' })),
  ...Array.from({ length: 3 }, (_, i) => ({ id: i + 6, name: `may ${i + 6}`, month: '2019-05' })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: i + 9, name: `april ${i + 9}`, month: '2019-04' })),
]

// Give jsdom a viewport so the virtualizer renders rows: 400 x 2000 px
// (itemWidth 100 + gap 8 → 3 columns).
const WIDTH = 400
const HEIGHT = 2000
const saved: Record<string, PropertyDescriptor | undefined> = {}
beforeAll(() => {
  for (const prop of ['clientWidth', 'clientHeight', 'offsetWidth', 'offsetHeight']) {
    saved[prop] = Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop)
    Object.defineProperty(HTMLElement.prototype, prop, {
      configurable: true,
      get: () => (prop.endsWith('Width') ? WIDTH : HEIGHT),
    })
  }
  saved.rect = Object.getOwnPropertyDescriptor(Element.prototype, 'getBoundingClientRect')
  Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ x: 0, y: 0, top: 0, left: 0, right: WIDTH, bottom: HEIGHT, width: WIDTH, height: HEIGHT, toJSON() {} }),
  })
})
afterAll(() => {
  for (const [prop, desc] of Object.entries(saved)) {
    const target = prop === 'rect' ? Element.prototype : HTMLElement.prototype
    const name = prop === 'rect' ? 'getBoundingClientRect' : prop
    if (desc) Object.defineProperty(target, name, desc)
    else delete (target as unknown as Record<string, unknown>)[name]
  }
})

const baseProps = {
  items: photos,
  getId: (p: Photo) => p.id,
  getLabel: (p: Photo) => p.name,
  itemWidth: 100,
  itemHeight: 100,
  gap: 8,
  sectionKey: (p: Photo) => p.month,
}

type GridExposed = {
  focusById: (id: ItemId) => void
  setSectionCollapsed: (key: SectionKey, collapsed: boolean) => void
  scrollToSection: (key: SectionKey, align?: 'start' | 'center' | 'end' | 'auto') => void
  getSections: () => GridSection[]
}

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

const mountGrid = async (props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) => {
  wrapper = mount(ExplorerGrid as never, { props: { ...baseProps, ...props }, slots, attachTo: document.body })
  // mount → size observed → virtualizer renders
  await nextTick()
  await nextTick()
  return wrapper
}

const exposed = (w: VueWrapper) => w.vm as unknown as GridExposed
const press = async (w: VueWrapper, init: KeyboardEventInit) => {
  await w.find('.eg-root').trigger('keydown', init)
  await nextTick()
}
const focusedIds = (w: VueWrapper) => w.emitted('focusChange')?.map((e) => e[0]) ?? []

describe('ExplorerGrid sections', () => {
  it('renders a header row per section above its items', async () => {
    const w = await mountGrid()
    const headers = w.findAll('[data-eg-section-header]')
    expect(headers.map((h) => h.attributes('data-eg-section-header'))).toEqual(['2019-06', '2019-05', '2019-04'])
    expect(headers.every((h) => h.attributes('role') === 'presentation')).toBe(true)
    expect(w.findAll('[role="option"]')).toHaveLength(12)

    // Section B starts on a new row: header top = header A (36) + 2 rows (216) + leading gap (8)
    expect(headers[1].attributes('style')).toContain('top: 260px')
    // may 6 is at column 0 of the row under that header
    const may6 = w.find('[data-eg-id="6"]')
    expect(may6.attributes('style')).toContain('top: 296px')
    expect(may6.attributes('style')).toContain('left: 8px')
  })

  it('without sectionKey renders no headers and the classic positions', async () => {
    const w = await mountGrid({ sectionKey: undefined })
    expect(w.findAll('[data-eg-section-header]')).toHaveLength(0)
    // item 4 → row 1, col 0 at the classic 1 * 108 + 8
    const item4 = w.find('[data-eg-id="4"]')
    expect(item4.attributes('style')).toContain('top: 116px')
    expect(item4.attributes('style')).toContain('left: 8px')
  })

  it('the default header shows key, count and a toggle that collapses', async () => {
    const w = await mountGrid()
    const header = w.findAll('[data-eg-section-header]')[1]
    expect(header.text()).toContain('2019-05')
    expect(header.text()).toContain('3')
    await header.find('button').trigger('click')
    await nextTick()
    expect(w.emitted('sectionToggle')?.[0]).toEqual(['2019-05', true])
    expect(w.emitted('update:collapsedSections')?.[0][0]).toEqual(new Set(['2019-05']))
    // local model (unbound) → section items are gone
    expect(w.find('[data-eg-id="6"]').exists()).toBe(false)
    expect(w.find('.eg-section-header--collapsed').exists()).toBe(true)
  })

  it('a collapsed section renders only its header', async () => {
    const w = await mountGrid({ collapsedSections: new Set(['2019-06']) })
    expect(w.findAll('[data-eg-section-header]')).toHaveLength(3)
    expect(w.find('[data-eg-id="1"]').exists()).toBe(false)
    expect(w.findAll('[role="option"]')).toHaveLength(7)
  })

  it('a pointerdown on a header does not clear the selection or start a marquee', async () => {
    const w = await mountGrid({ selectedIds: new Set([2]) })
    const pointerdown = (el: Element) =>
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 50, clientY: 20 }))
    pointerdown(w.find('[data-eg-section-header] .eg-section-header__label').element)
    await nextTick()
    expect(w.emitted('selectionChange')).toBeUndefined()
    expect(w.emitted('marqueeStart')).toBeUndefined()
    // control: the same press on empty space clears and starts a marquee
    pointerdown(w.find('.eg-scroll-container').element)
    await nextTick()
    expect(w.emitted('selectionChange')).toHaveLength(1)
    expect(w.emitted('marqueeStart')).toHaveLength(1)
  })

  it('focusById on an item in a collapsed section expands it', async () => {
    const w = await mountGrid({ collapsedSections: new Set(['2019-05', '2019-04']) })
    exposed(w).focusById(7)
    await nextTick()
    expect(w.emitted('sectionToggle')?.[0]).toEqual(['2019-05', false])
    expect(focusedIds(w).at(-1)).toBe(7)
    expect(w.find('[data-eg-id="7"]').exists()).toBe(true)
  })

  it('focusById expands through a bound v-model:collapsedSections', async () => {
    const w = await mountGrid({
      collapsedSections: new Set(['2019-04']),
      'onUpdate:collapsedSections': (v: Set<SectionKey>) => wrapper!.setProps({ collapsedSections: v }),
    })
    expect(w.find('[data-eg-id="10"]').exists()).toBe(false)
    exposed(w).focusById(10)
    await nextTick()
    await nextTick()
    expect(w.props('collapsedSections' as never)).toEqual(new Set())
    expect(w.find('[data-eg-id="10"]').exists()).toBe(true)
    expect(focusedIds(w).at(-1)).toBe(10)
  })

  it('numpad - collapses the focused section and moves focus to the next one', async () => {
    const w = await mountGrid()
    exposed(w).focusById(2)
    await nextTick()
    await press(w, { key: '-', code: 'NumpadSubtract' })
    await nextTick()
    expect(w.emitted('sectionToggle')?.[0]).toEqual(['2019-06', true])
    expect(focusedIds(w).at(-1)).toBe(6)
    await press(w, { key: '+', code: 'NumpadAdd' })
    // focus is in 2019-05 now, which is already expanded
    expect(w.emitted('sectionToggle')).toHaveLength(1)
  })

  it('collapsing the last section moves focus to the previous one', async () => {
    const w = await mountGrid()
    exposed(w).focusById(11)
    await nextTick()
    exposed(w).setSectionCollapsed('2019-04', true)
    await nextTick()
    await nextTick()
    expect(focusedIds(w).at(-1)).toBe(6)
  })

  it('arrow keys cross sections', async () => {
    const w = await mountGrid()
    exposed(w).focusById(5)
    await nextTick()
    await press(w, { key: 'ArrowRight' })
    expect(focusedIds(w).at(-1)).toBe(6)
    // 3 columns: june 4,5 are row 2 of June; ↓ from 5 (col 1) → may 7 (col 1)
    exposed(w).focusById(5)
    await nextTick()
    await press(w, { key: 'ArrowDown' })
    expect(focusedIds(w).at(-1)).toBe(7)
  })

  it('ctrl+A selects collapsed sections too', async () => {
    const w = await mountGrid({ collapsedSections: new Set(['2019-05']) })
    await press(w, { key: 'a', ctrlKey: true })
    const last = w.emitted('selectionChange')?.at(-1)?.[0] as Set<ItemId>
    expect(last.size).toBe(12)
  })

  it('the section-header slot gets selectedCount and selectSection', async () => {
    const w = await mountGrid(
      { selectedIds: new Set([1, 6]) },
      {
        'section-header': (p: {
          section: GridSection
          selectedCount: number
          collapsed: boolean
          sticky: boolean
          selectSection: (m: 'replace' | 'add' | 'remove') => void
        }) =>
          h('div', { class: 'custom' }, [
            h('span', { class: 'count' }, `${p.section.key}:${p.selectedCount}/${p.section.count}`),
            h('button', { class: 'add', tabindex: -1, onClick: () => p.selectSection('add') }, 'add'),
            h('button', { class: 'remove', tabindex: -1, onClick: () => p.selectSection('remove') }, 'remove'),
          ]),
      }
    )
    await nextTick()
    expect(w.findAll('.count').map((c) => c.text())).toEqual(['2019-06:1/5', '2019-05:1/3', '2019-04:0/4'])
    await w.findAll('.add')[2].trigger('click')
    let last = w.emitted('selectionChange')?.at(-1)?.[0] as Set<ItemId>
    expect([...last].sort((a, b) => Number(a) - Number(b))).toEqual([1, 6, 9, 10, 11, 12])
    await w.findAll('.remove')[0].trigger('click')
    last = w.emitted('selectionChange')?.at(-1)?.[0] as Set<ItemId>
    expect([...last].sort((a, b) => Number(a) - Number(b))).toEqual([6, 9, 10, 11, 12])
  })

  it('getSections and scrollToSection', async () => {
    const w = await mountGrid()
    expect(exposed(w).getSections()).toEqual([
      { key: '2019-06', index: 0, start: 0, count: 5 },
      { key: '2019-05', index: 1, start: 5, count: 3 },
      { key: '2019-04', index: 2, start: 8, count: 4 },
    ])
    const root = w.find('.eg-root').element as HTMLElement
    exposed(w).scrollToSection('2019-04')
    // header C: 36 + 216 + 36 + 108 = 396, plus leading gap 8
    expect(root.scrollTop).toBe(404)
  })

  it('a sectioned grid has no axe violations', async () => {
    const w = await mountGrid({}, { item: ({ item }: { item: Photo }) => h('span', item.name) })
    const results = await axe(w.element)
    expect(results).toHaveNoViolations()
  })
})
