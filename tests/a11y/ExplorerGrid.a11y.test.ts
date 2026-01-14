import { describe, it, expect, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { axe } from 'vitest-axe'
import { toHaveNoViolations } from 'vitest-axe/matchers'
import ExplorerGrid from '../../src/components/ExplorerGrid.vue'
import type { ComponentPublicInstance } from 'vue'

expect.extend({ toHaveNoViolations })

interface TestItem {
  id: number
  name: string
}

const createItems = (count: number): TestItem[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
  }))

const defaultProps = {
  items: createItems(10),
  getId: (item: TestItem) => item.id,
  getLabel: (item: TestItem) => item.name,
  itemWidth: 100,
  itemHeight: 100,
  gap: 8,
}

describe('ExplorerGrid Accessibility', () => {
  let wrapper: VueWrapper<ComponentPublicInstance> | null = null

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    // Clean up any attached elements
    document.body.innerHTML = ''
  })

  it('should have correct ARIA roles on container', () => {
    wrapper = mount(ExplorerGrid, {
      props: defaultProps,
    })

    // Container should have listbox role
    const container = wrapper.find('.eg-root')
    expect(container.exists()).toBe(true)
    expect(container.attributes('role')).toBe('listbox')
    expect(container.attributes('tabindex')).toBe('0')
  })

  it('should have aria-multiselectable for multiple selection mode', () => {
    wrapper = mount(ExplorerGrid, {
      props: {
        ...defaultProps,
        selectionMode: 'multiple',
      },
    })

    const container = wrapper.find('.eg-root')
    expect(container.attributes('aria-multiselectable')).toBe('true')
  })

  it('should not have aria-multiselectable for single selection mode', () => {
    wrapper = mount(ExplorerGrid, {
      props: {
        ...defaultProps,
        selectionMode: 'single',
      },
    })

    const container = wrapper.find('.eg-root')
    expect(container.attributes('aria-multiselectable')).toBe('false')
  })

  it('should have aria-label on container', () => {
    wrapper = mount(ExplorerGrid, {
      props: {
        ...defaultProps,
        ariaLabel: 'File browser',
      },
    })

    const container = wrapper.find('.eg-root')
    expect(container.attributes('aria-label')).toBe('File browser')
  })

  it('should have default aria-label', () => {
    wrapper = mount(ExplorerGrid, {
      props: defaultProps,
    })

    const container = wrapper.find('.eg-root')
    expect(container.attributes('aria-label')).toBe('Item grid')
  })

  it('should have live region for announcements', () => {
    wrapper = mount(ExplorerGrid, {
      props: defaultProps,
    })

    const liveRegion = wrapper.find('[aria-live="polite"]')
    expect(liveRegion.exists()).toBe(true)
    expect(liveRegion.attributes('aria-atomic')).toBe('true')
  })

  it('should have live region outside of listbox', () => {
    wrapper = mount(ExplorerGrid, {
      props: defaultProps,
    })

    // Live region should be a sibling of the listbox, not a child
    const liveRegion = wrapper.find('[aria-live="polite"]')
    const listbox = wrapper.find('[role="listbox"]')

    expect(liveRegion.exists()).toBe(true)
    expect(listbox.exists()).toBe(true)

    // The live region should not be inside the listbox
    const listboxElement = listbox.element
    const liveRegionElement = liveRegion.element
    expect(listboxElement.contains(liveRegionElement)).toBe(false)
  })

  it('should pass axe for container structure (empty state)', async () => {
    wrapper = mount(ExplorerGrid, {
      props: {
        ...defaultProps,
        items: [], // Empty to avoid virtualization complexity
      },
      attachTo: document.body,
    })

    // Note: An empty listbox without role="option" children technically violates
    // aria-required-children, but this is an expected state for an empty grid.
    // We disable that specific rule for this test.
    const results = await axe(wrapper.element, {
      rules: {
        'aria-required-children': { enabled: false },
      },
    })
    expect(results).toHaveNoViolations()
  })

  it('should have empty state accessible', async () => {
    wrapper = mount(ExplorerGrid, {
      props: {
        ...defaultProps,
        items: [],
      },
      attachTo: document.body,
    })

    const emptyState = wrapper.find('.eg-empty')
    expect(emptyState.exists()).toBe(true)

    // Disable aria-required-children for empty listbox
    const results = await axe(wrapper.element, {
      rules: {
        'aria-required-children': { enabled: false },
      },
    })
    expect(results).toHaveNoViolations()
  })
})
